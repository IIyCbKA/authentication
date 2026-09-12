import { afterEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { apiClient, publicClient, refreshClient } from "@/shared/http/client";
import { REQUEST_TIMEOUT_MS } from "@/shared/http/config";
import { installAuthInterceptors } from "@/store/interceptors/auth";
import * as auth from "./api";
import { sendSessionRequest } from "./sessionTransport";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function response(
  config: InternalAxiosRequestConfig,
  data: unknown = {},
  status = 200,
): AxiosResponse {
  return {
    config,
    data,
    status,
    statusText: "OK",
    headers: new AxiosHeaders(),
  };
}

const clients = [apiClient, publicClient, refreshClient];
const originalAdapters = clients.map((client) => client.defaults.adapter);

afterEach(() => {
  clients.forEach((client, index) => {
    client.defaults.adapter = originalAdapters[index];
  });
});

describe("session cookie request ordering", () => {
  it.each([false, true])(
    "waits for a predecessor and continues after it settles (failure=%s)",
    async (fails) => {
      const client = axios.create();
      const gate = deferred();
      const started: string[] = [];
      client.defaults.adapter = async (config) => {
        started.push(config.url!);
        if (config.url === "/first") {
          await gate.promise;
          if (fails) throw new Error("First request failed");
        }
        return response(config);
      };
      const pending = Promise.allSettled([
        sendSessionRequest(client, { method: "post", url: "/first" }),
        sendSessionRequest(client, { method: "post", url: "/second" }),
      ]);
      try {
        await vi.waitFor(() => expect(started).toEqual(["/first"]));
        gate.resolve();
        const results = await pending;
        expect(started).toEqual(["/first", "/second"]);
        expect(results.map(({ status }) => status)).toEqual([
          fails ? "rejected" : "fulfilled",
          "fulfilled",
        ]);
      } finally {
        gate.resolve();
        await pending;
      }
    },
  );

  it("releases a pre-adapter failure without bypassing its active predecessor", async () => {
    const client = axios.create();
    const gate = deferred();
    const started: string[] = [];
    client.defaults.adapter = async (config) => {
      started.push(config.url!);
      if (config.url === "/first") await gate.promise;
      return response(config);
    };
    const first = sendSessionRequest(client, { method: "post", url: "/first" });
    const failed = sendSessionRequest(client, {
      method: "post",
      url: "/never-sent",
      transformRequest: [
        () => {
          throw new Error("Serialization failed");
        },
      ],
    });
    const third = sendSessionRequest(client, { method: "post", url: "/third" });
    const pending = Promise.allSettled([first, failed, third]);
    try {
      await expect(failed).rejects.toThrow("Serialization failed");
      expect(started).toEqual(["/first"]);
      gate.resolve();
      expect((await pending).map(({ status }) => status)).toEqual([
        "fulfilled",
        "rejected",
        "fulfilled",
      ]);
      expect(started).toEqual(["/first", "/third"]);
    } finally {
      gate.resolve();
      await pending;
    }
  });

  it.each(["signal", "cancelToken"] as const)(
    "does not send a request cancelled by %s while it waits in the queue",
    async (cancellation) => {
      const client = axios.create();
      const gate = deferred();
      const controller = new AbortController();
      const token = axios.CancelToken.source();
      const started: string[] = [];
      client.defaults.adapter = async (config) => {
        started.push(config.url!);
        if (config.url === "/first") await gate.promise;
        return response(config);
      };
      const first = sendSessionRequest(client, {
        method: "post",
        url: "/first",
      });
      const cancelled = sendSessionRequest(client, {
        method: "post",
        url: "/cancelled",
        ...(cancellation === "signal"
          ? { signal: controller.signal }
          : { cancelToken: token.token }),
      });
      const third = sendSessionRequest(client, {
        method: "post",
        url: "/third",
      });
      const pending = Promise.allSettled([first, cancelled, third]);
      try {
        await vi.waitFor(() => expect(started).toEqual(["/first"]));
        if (cancellation === "signal") controller.abort();
        else token.cancel();
        gate.resolve();
        const results = await pending;
        expect(results.map(({ status }) => status)).toEqual([
          "fulfilled",
          "rejected",
          "fulfilled",
        ]);
        expect(results[1]).toMatchObject({ reason: { code: "ERR_CANCELED" } });
        expect(started).toEqual(["/first", "/third"]);
      } finally {
        gate.resolve();
        await pending;
      }
    },
  );

  it("sends Cancel/logout after confirmation and clears the cookie it issued", async () => {
    const gate = deferred();
    const started: string[] = [];
    let refreshCookie: string | null = null;
    const dispose = installAuthInterceptors(apiClient, {
      getSession: () => ({
        accessToken: "pending-token",
        isAuth: false,
        sessionRevision: 1,
      }),
      refresh: vi.fn(),
      clearSession: vi.fn(),
    });
    apiClient.defaults.adapter = async (config) => {
      started.push(config.url!);
      expect(config.timeout).toBe(REQUEST_TIMEOUT_MS);
      expect(config.headers.get("Authorization")).toBe("Bearer pending-token");
      await gate.promise;
      refreshCookie = "confirmed-refresh-cookie";
      return response(config);
    };
    publicClient.defaults.adapter = async (config) => {
      started.push(config.url!);
      expect(config.timeout).toBe(REQUEST_TIMEOUT_MS);
      expect(refreshCookie).toBe("confirmed-refresh-cookie");
      refreshCookie = null;
      return response(config);
    };
    // Both are invoked in the same turn; public logout must not overtake
    // confirmation's asynchronous authorization interceptor.
    const pending = Promise.allSettled([
      auth.emailConfirm({ code: "123456" }),
      auth.logout(),
    ]);
    try {
      await vi.waitFor(() => expect(started).toEqual(["/auth/email/confirm/"]));
      gate.resolve();
      expect((await pending).map(({ status }) => status)).toEqual([
        "fulfilled",
        "fulfilled",
      ]);
      expect(started).toEqual(["/auth/email/confirm/", "/auth/logout/"]);
      expect(refreshCookie).toBeNull();
    } finally {
      gate.resolve();
      await pending;
      dispose();
    }
  });

  it("allows an expired DELETE to refresh and retry without holding the queue", async () => {
    const started: string[] = [];
    const state = { accessToken: "expired", isAuth: true, sessionRevision: 1 };
    apiClient.defaults.adapter = async (config) => {
      started.push(`delete:${config.headers.get("Authorization")}`);
      expect(config.timeout).toBe(REQUEST_TIMEOUT_MS);
      if (config.headers.get("Authorization") === "Bearer expired") {
        throw new AxiosError(
          "Expired",
          "ERR_BAD_REQUEST",
          config,
          undefined,
          response(config, {}, 401),
        );
      }
      return response(config, undefined, 204);
    };
    refreshClient.defaults.adapter = async (config) => {
      started.push("refresh");
      expect(config.timeout).toBe(REQUEST_TIMEOUT_MS);
      return response(config, {
        accessToken: "fresh",
        isAuthenticated: true,
        user: { id: 1, username: "test", email: null, isEmailVerified: false },
      });
    };
    const refresh = vi.fn(async () => {
      const result = await auth.refresh();
      state.accessToken = result.accessToken;
      return result.accessToken;
    });
    const dispose = installAuthInterceptors(apiClient, {
      getSession: () => state,
      refresh,
      clearSession: vi.fn(),
    });
    try {
      await expect(auth.deleteCurrentAccount()).resolves.toBeUndefined();
      expect(started).toEqual([
        "delete:Bearer expired",
        "refresh",
        "delete:Bearer fresh",
      ]);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });

  it("does not block account reads while a cookie request is in flight", async () => {
    const gate = deferred();
    const started: string[] = [];
    refreshClient.defaults.adapter = async (config) => {
      started.push("refresh");
      await gate.promise;
      return response(config);
    };
    apiClient.defaults.adapter = async (config) => {
      started.push("account");
      return response(config, { id: 1 });
    };
    const pending = auth.refresh();
    try {
      await vi.waitFor(() => expect(started).toEqual(["refresh"]));
      await expect(auth.getCurrentAccount()).resolves.toEqual({ id: 1 });
      expect(started).toEqual(["refresh", "account"]);
    } finally {
      gate.resolve();
      await pending;
    }
  });
});
