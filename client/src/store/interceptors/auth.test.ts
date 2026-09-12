import { describe, expect, it, vi } from "vitest";
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import { installAuthInterceptors } from "./auth.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    "Expired access token",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    {
      config,
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: new AxiosHeaders(),
    },
  );
}

function fixture(isAuth = true) {
  const state = {
    accessToken: "old" as string | null,
    isAuth,
    sessionRevision: 0,
  };
  const client = axios.create();
  const refreshGate = deferred<string>();
  const refresh = vi.fn(() =>
    refreshGate.promise.then((token) => {
      if (state.isAuth) state.accessToken = token;
      return token;
    }),
  );
  const clearSession = vi.fn(() => {
    state.accessToken = null;
    state.isAuth = false;
    state.sessionRevision += 1;
  });
  const attempts: InternalAxiosRequestConfig[] = [];
  client.defaults.adapter = async (config) => {
    attempts.push(config);
    if (config.headers.get("Authorization") !== "Bearer new")
      throw unauthorized(config);
    return {
      config,
      data: "ok",
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
    };
  };
  const dispose = installAuthInterceptors(client, {
    getSession: () => state,
    refresh,
    clearSession,
  });
  return {
    state,
    client,
    refreshGate,
    refresh,
    clearSession,
    attempts,
    dispose,
  };
}

describe("access-token refresh", () => {
  it("uses one refresh for concurrent 401 responses and retries each request once", async () => {
    const f = fixture();
    const pending = Promise.all([
      f.client.get("/accounts/me/"),
      f.client.patch("/accounts/username/update/", { username: "name" }),
    ]);
    await vi.waitFor(() => expect(f.refresh).toHaveBeenCalledTimes(1));
    f.refreshGate.resolve("new");
    expect((await pending).map((response) => response.data)).toEqual([
      "ok",
      "ok",
    ]);
    expect(f.attempts).toHaveLength(4);
    expect(f.refresh).toHaveBeenCalledTimes(1);
  });

  it("never refreshes a pending email-verification session", async () => {
    const f = fixture(false);
    await expect(
      f.client.post("/auth/email/confirm/", { code: "123456" }),
    ).rejects.toThrow("Expired access token");
    expect(f.refresh).not.toHaveBeenCalled();
    expect(f.clearSession).toHaveBeenCalledTimes(1);
  });

  it("rejects every waiting request if refresh fails, without leaving a hanging queue", async () => {
    const f = fixture();
    const pending = Promise.allSettled([
      f.client.get("/accounts/me/"),
      f.client.get("/accounts/me/"),
    ]);
    await vi.waitFor(() => expect(f.refresh).toHaveBeenCalledTimes(1));
    const failure = new Error("Refresh expired");
    f.refreshGate.reject(failure);
    expect(await pending).toEqual([
      { status: "rejected", reason: failure },
      { status: "rejected", reason: failure },
    ]);
    expect(f.clearSession).toHaveBeenCalledTimes(1);
    expect(f.attempts).toHaveLength(2);
  });

  it("does not retry forever when the refreshed access token is also rejected", async () => {
    const f = fixture();
    let attempts = 0;
    f.client.defaults.adapter = async (config) => {
      attempts += 1;
      throw unauthorized(config);
    };
    f.refreshGate.resolve("new");
    await expect(f.client.get("/accounts/me/")).rejects.toThrow(
      "Expired access token",
    );
    expect(attempts).toBe(2);
    expect(f.refresh).toHaveBeenCalledTimes(1);
    expect(f.clearSession).toHaveBeenCalledTimes(1);
  });

  it("does not replay an old request after logout during refresh", async () => {
    const f = fixture();
    const pending = f.client.get("/accounts/me/");
    const rejected = expect(pending).rejects.toThrow(
      "Account session changed during refresh",
    );
    await vi.waitFor(() => expect(f.refresh).toHaveBeenCalledTimes(1));
    f.clearSession();
    f.refreshGate.resolve("new");
    await rejected;
    expect(f.state.accessToken).toBeNull();
    expect(f.attempts).toHaveLength(1);
  });

  it("reuses a newer token for a delayed 401 without another refresh", async () => {
    const f = fixture();
    const firstResponse = deferred<void>();
    f.client.defaults.adapter = async (config) => {
      if (config.headers.get("Authorization") === "Bearer old") {
        await firstResponse.promise;
        throw unauthorized(config);
      }
      return {
        config,
        data: "ok",
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
      };
    };
    const pending = f.client.get("/accounts/me/");
    await Promise.resolve();
    await Promise.resolve();
    f.state.accessToken = "new";
    firstResponse.resolve();
    await expect(pending).resolves.toMatchObject({ data: "ok" });
    expect(f.refresh).not.toHaveBeenCalled();
  });

  it("does not share a refresh with a different account session", async () => {
    const f = fixture();
    const oldRefresh = deferred<string>();
    const newRefresh = deferred<string>();
    f.refresh
      .mockImplementationOnce(() => oldRefresh.promise)
      .mockImplementationOnce(() =>
        newRefresh.promise.then((token) => {
          f.state.accessToken = token;
          return token;
        }),
      );
    const oldRequest = f.client.get("/accounts/me/");
    const oldRejected =
      expect(oldRequest).rejects.toThrow("Old refresh failed");
    await vi.waitFor(() => expect(f.refresh).toHaveBeenCalledTimes(1));
    f.state.sessionRevision += 1;
    f.state.accessToken = "another-account";
    const newRequest = f.client.get("/accounts/me/");
    await vi.waitFor(() => expect(f.refresh).toHaveBeenCalledTimes(2));
    oldRefresh.reject(new Error("Old refresh failed"));
    await oldRejected;
    expect(f.clearSession).not.toHaveBeenCalled();
    newRefresh.resolve("new");
    await expect(newRequest).resolves.toMatchObject({ data: "ok" });
  });

  it("does not refresh validation errors or retry a network failure", async () => {
    const f = fixture();
    f.client.defaults.adapter = async () => {
      throw new Error("Network unavailable");
    };
    await expect(f.client.get("/accounts/me/")).rejects.toThrow(
      "Network unavailable",
    );
    expect(f.refresh).not.toHaveBeenCalled();
  });

  it("can dispose both interceptors for hot reload", async () => {
    const f = fixture();
    f.dispose();
    await expect(f.client.get("/accounts/me/")).rejects.toThrow(
      "Expired access token",
    );
    expect(f.attempts[0].headers.has("Authorization")).toBe(false);
    expect(f.refresh).not.toHaveBeenCalled();
  });
});
