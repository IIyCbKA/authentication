import { describe, expect, it } from "vitest";
import reducer from "./slice";
import {
  deleteAccount,
  emailConfirm,
  loginUser,
  logout,
  refreshAuth,
  registerUser,
  fetchCurrentAccount,
  passwordResetConfirm,
} from "./thunks";
import type { CommonFulfilledResponse } from "./types";

const fullSession: CommonFulfilledResponse = {
  user: { id: 1, username: "test", email: null, isEmailVerified: false },
  accessToken: "access",
  isAuthenticated: true,
};
const credentials = { identifier: "test", password: "password1" };

describe("session state", () => {
  it("honors full sessions without email and pending sessions without refresh", () => {
    const loggedIn = reducer(
      undefined,
      loginUser.fulfilled(fullSession, "login", credentials),
    );
    expect(loggedIn.isAuth).toBe(true);
    const pending = reducer(
      loggedIn,
      registerUser.fulfilled(
        {
          ...fullSession,
          user: { ...fullSession.user, email: "test@example.test" },
          isAuthenticated: false,
        },
        "register",
        { username: "test", email: "test@example.test", password: "password1" },
      ),
    );
    expect(pending.isAuth).toBe(false);
    expect(pending.accessToken).toBe("access");
    const confirmed = reducer(
      pending,
      emailConfirm.fulfilled(fullSession, "confirm", { code: "123456" }),
    );
    expect(confirmed.isAuth).toBe(true);
  });

  it("applies the matching refresh and ignores a late refresh after logout", () => {
    let state = reducer(undefined, refreshAuth.pending("refresh"));
    state = reducer(state, refreshAuth.fulfilled(fullSession, "refresh"));
    expect(state.accessToken).toBe("access");
    state = reducer(state, refreshAuth.pending("old-refresh"));
    state = reducer(state, logout.pending("logout"));
    state = reducer(state, logout.fulfilled(undefined, "logout"));
    state = reducer(state, refreshAuth.fulfilled(fullSession, "old-refresh"));
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("ignores an earlier refresh failure after a newer login", () => {
    let state = reducer(undefined, refreshAuth.pending("old-refresh"));
    state = reducer(state, loginUser.pending("login", credentials));
    state = reducer(
      state,
      loginUser.fulfilled(fullSession, "login", credentials),
    );
    state = reducer(
      state,
      refreshAuth.rejected(new Error("Expired"), "old-refresh"),
    );
    expect(state.accessToken).toBe("access");
  });

  it("clears the session on account deletion and does not restore it from a late GET", () => {
    let state = reducer(
      undefined,
      loginUser.fulfilled(fullSession, "login", credentials),
    );
    state = reducer(state, deleteAccount.fulfilled(undefined, "delete"));
    state = reducer(
      state,
      fetchCurrentAccount.fulfilled(fullSession.user, "get"),
    );
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuth).toBe(false);
  });

  it.each([
    [
      "login",
      loginUser.pending("auth", credentials),
      loginUser.fulfilled(fullSession, "auth", credentials),
    ],
    [
      "register",
      registerUser.pending("auth", {
        username: "test",
        email: "test@example.test",
        password: "password1",
      }),
      registerUser.fulfilled(fullSession, "auth", {
        username: "test",
        email: "test@example.test",
        password: "password1",
      }),
    ],
    [
      "email confirmation",
      emailConfirm.pending("auth", { code: "123456" }),
      emailConfirm.fulfilled(fullSession, "auth", { code: "123456" }),
    ],
    [
      "password reset",
      passwordResetConfirm.pending("auth", {
        uid: "MQ",
        token: "token",
        newPassword: "password1",
      }),
      passwordResetConfirm.fulfilled(fullSession, "auth", {
        uid: "MQ",
        token: "token",
        newPassword: "password1",
      }),
    ],
  ] as const)(
    "does not let a refresh started during %s overwrite its completed session",
    (_name, pending, fulfilled) => {
      let state = reducer(undefined, pending);
      state = reducer(state, refreshAuth.pending("late-refresh"));
      const previousRevision = state.sessionRevision;
      state = reducer(state, fulfilled);
      expect(state.sessionRevision).toBeGreaterThan(previousRevision);
      expect(state.refreshRequestId).toBeNull();
      state = reducer(
        state,
        refreshAuth.fulfilled(
          { ...fullSession, accessToken: "old-refresh-token" },
          "late-refresh",
        ),
      );
      expect(state.accessToken).toBe("access");
      state = reducer(
        state,
        refreshAuth.rejected(new Error("Old refresh failed"), "late-refresh"),
      );
      expect(state.accessToken).toBe("access");
      expect(state.isAuth).toBe(true);
    },
  );
});
