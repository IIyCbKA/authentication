import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiClient, publicClient, refreshClient } from "@/shared/http/client";
import { installAuthInterceptors } from "@/store/interceptors/auth.ts";
import * as auth from "./api";

const clients = [apiClient, publicClient, refreshClient];
const adapters = clients.map((client) => client.defaults.adapter);
const user = { id: 1, username: "test", email: null, isEmailVerified: false };
const session = { user, accessToken: "access", isAuthenticated: true };
let requests: InternalAxiosRequestConfig[];

beforeEach(() => {
  requests = [];
  clients.forEach((client) => {
    client.defaults.adapter = async (config) => {
      requests.push(config);
      const data = config.url === "/accounts/me/" ? user : session;
      return {
        data,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        config,
      };
    };
  });
});

afterEach(() => {
  clients.forEach((client, index) => {
    client.defaults.adapter = adapters[index];
  });
});

describe("backend request contracts", () => {
  it.each([
    [
      "login",
      () => auth.login({ identifier: "test", password: "password1" }),
      "/auth/login/",
    ],
    [
      "register",
      () =>
        auth.register({
          username: "test",
          email: "user@example.test",
          password: "password1",
        }),
      "/auth/register/",
    ],
    [
      "confirm email",
      () => auth.emailConfirm({ code: "123456" }),
      "/auth/email/confirm/",
    ],
    ["resend code", () => auth.resendCode(), "/auth/code/resend/"],
    ["refresh", () => auth.refresh(), "/auth/refresh/"],
    ["logout", () => auth.logout(), "/auth/logout/"],
    [
      "request reset",
      () => auth.passwordResetRequest({ email: "user@example.test" }),
      "/auth/password/reset/",
    ],
    [
      "validate reset",
      () => auth.passwordResetValidate({ uid: "MQ", token: "token" }),
      "/auth/password/reset/validate/",
    ],
    [
      "confirm reset",
      () =>
        auth.passwordResetConfirm({
          uid: "MQ",
          token: "token",
          newPassword: "password1",
        }),
      "/auth/password/reset/confirm/",
    ],
  ] as const)("%s uses POST at the server route", async (_name, call, path) => {
    await call();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "post",
      url: path,
      withCredentials: true,
    });
  });

  it("sends camelCase request data and preserves camelCase response data", async () => {
    expect(
      await auth.passwordResetConfirm({
        uid: "MQ",
        token: "token",
        newPassword: "password1",
      }),
    ).toEqual(session);
    expect(JSON.parse(requests[0].data)).toEqual({
      uid: "MQ",
      token: "token",
      newPassword: "password1",
    });
  });

  it("updates the username with PATCH, not the removed auth POST route", async () => {
    await auth.usernameUpdate({ username: "new-name" });
    expect(requests[0]).toMatchObject({
      method: "patch",
      url: "/accounts/username/update/",
    });
    expect(JSON.parse(requests[0].data)).toEqual({ username: "new-name" });
  });

  it("reads the current account with GET and deletes it with DELETE", async () => {
    expect(await auth.getCurrentAccount()).toEqual(user);
    await expect(auth.deleteCurrentAccount()).resolves.toBeUndefined();
    expect(requests.map(({ method, url }) => [method, url])).toEqual([
      ["get", "/accounts/me/"],
      ["delete", "/accounts/me/"],
    ]);
  });

  it("constructs an OAuth login URL without losing nested query parameters", () => {
    const next = "http://localhost:3000/auth/login?tab=one&message=a b";
    const url = new URL(auth.getOAuthLoginUrl("github", next));
    expect(url.origin).toBe("https://api.example.test");
    expect(url.pathname).toBe("/auth/oauth/github/start/");
    expect(url.searchParams.get("flow")).toBe("login");
    expect(url.searchParams.get("next")).toBe(next);
  });

  it("starts linking with authenticated POST and flow=link", async () => {
    await auth.startOAuthLink({
      provider: "google",
      next: "http://localhost:3000/account",
    });
    expect(requests[0]).toMatchObject({
      method: "post",
      url: "/auth/oauth/google/start/",
      params: { flow: "link", next: "http://localhost:3000/account" },
    });
  });

  it("does not refresh or attach an access token for a bad public login", async () => {
    const refresh = vi.fn();
    const dispose = installAuthInterceptors(apiClient, {
      getSession: () => ({
        accessToken: "old",
        isAuth: true,
        sessionRevision: 0,
      }),
      refresh,
      clearSession: vi.fn(),
    });
    publicClient.defaults.adapter = async (config) => {
      requests.push(config);
      throw new AxiosError(
        "Invalid credentials",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        {
          data: { detail: "Invalid credentials" },
          status: 401,
          statusText: "Unauthorized",
          headers: new AxiosHeaders(),
          config,
        },
      );
    };
    try {
      await expect(
        auth.login({ identifier: "wrong", password: "wrong" }),
      ).rejects.toThrow("Invalid credentials");
      expect(requests).toHaveLength(1);
      expect(requests[0].headers.has("Authorization")).toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });
});
