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
const registrationCredentials = {
  username: "test",
  email: "test@example.test",
  password: "password1",
};
const authenticationOperations = [
  [
    "login",
    loginUser.pending("auth", credentials),
    loginUser.fulfilled(fullSession, "auth", credentials),
  ],
  [
    "register",
    registerUser.pending("auth", registrationCredentials),
    registerUser.fulfilled(fullSession, "auth", registrationCredentials),
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
] as const;

function loggedInState() {
  return reducer(
    reducer(undefined, loginUser.pending("login", credentials)),
    loginUser.fulfilled(fullSession, "login", credentials),
  );
}

describe("session state", () => {
  it("honors full sessions without email and pending sessions without refresh", () => {
    const loggedIn = loggedInState();
    expect(loggedIn.isAuth).toBe(true);
    const pending = reducer(
      reducer(
        loggedIn,
        registerUser.pending("register", registrationCredentials),
      ),
      registerUser.fulfilled(
        {
          ...fullSession,
          user: { ...fullSession.user, email: "test@example.test" },
          isAuthenticated: false,
        },
        "register",
        registrationCredentials,
      ),
    );
    expect(pending.isAuth).toBe(false);
    expect(pending.accessToken).toBe("access");
    const confirmed = reducer(
      reducer(pending, emailConfirm.pending("confirm", { code: "123456" })),
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
    let state = loggedInState();
    state = reducer(state, fetchCurrentAccount.pending("get"));
    state = reducer(state, deleteAccount.pending("delete"));
    state = reducer(state, deleteAccount.fulfilled(undefined, "delete"));
    state = reducer(
      state,
      fetchCurrentAccount.fulfilled(fullSession.user, "get"),
    );
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuth).toBe(false);
  });

  it("does not restore a session when email confirmation completes after cancellation", () => {
    let state = reducer(
      reducer(
        undefined,
        registerUser.pending("register", registrationCredentials),
      ),
      registerUser.fulfilled(
        {
          ...fullSession,
          user: { ...fullSession.user, email: "test@example.test" },
          isAuthenticated: false,
        },
        "register",
        registrationCredentials,
      ),
    );
    state = reducer(
      state,
      emailConfirm.pending("confirmation", { code: "123456" }),
    );
    state = reducer(state, logout.pending("cancel"));
    state = reducer(state, logout.fulfilled(undefined, "cancel"));
    state = reducer(
      state,
      emailConfirm.fulfilled(fullSession, "confirmation", { code: "123456" }),
    );

    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuth).toBe(false);
  });

  it("invalidates old requests when the shared refresh cookie belongs to another account", () => {
    let state = loggedInState();
    const originalRevision = state.sessionRevision;
    state = reducer(state, refreshAuth.pending("refresh"));
    state = reducer(
      state,
      refreshAuth.fulfilled(
        {
          ...fullSession,
          user: { ...fullSession.user, id: 2, username: "other-account" },
          accessToken: "other-account-access",
        },
        "refresh",
      ),
    );

    expect(state.sessionRevision).toBeGreaterThan(originalRevision);
  });

  it("does not clear a newer login when an earlier logout finishes", () => {
    let state = loggedInState();
    state = reducer(state, logout.pending("old-logout"));
    const newCredentials = {
      identifier: "other-account",
      password: "password1",
    };
    const newSession = {
      ...fullSession,
      user: { ...fullSession.user, id: 2, username: "other-account" },
      accessToken: "new-session-token",
    };
    state = reducer(state, loginUser.pending("new-login", newCredentials));
    state = reducer(
      state,
      loginUser.fulfilled(newSession, "new-login", newCredentials),
    );
    const revision = state.sessionRevision;
    state = reducer(state, logout.fulfilled(undefined, "old-logout"));

    expect(state.user).toEqual(newSession.user);
    expect(state.accessToken).toBe("new-session-token");
    expect(state.isAuth).toBe(true);
    expect(state.sessionRevision).toBe(revision);
  });

  it("does not mark a newer successful login as failed when an older login rejects", () => {
    let state = reducer(undefined, loginUser.pending("old-login", credentials));
    state = reducer(state, loginUser.pending("new-login", credentials));
    state = reducer(
      state,
      loginUser.fulfilled(fullSession, "new-login", credentials),
    );
    state = reducer(
      state,
      loginUser.rejected(
        new Error("Invalid credentials"),
        "old-login",
        credentials,
      ),
    );

    expect(state.accessToken).toBe("access");
    expect(state.isAuth).toBe(true);
    expect(state.status).toBe("succeeded");
    expect(state.authRequestId).toBeNull();
  });

  it.each(authenticationOperations)(
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

  it.each(authenticationOperations)(
    "allows pending %s to finish after a background refresh fails",
    (_name, pending, fulfilled) => {
      let state = reducer(undefined, pending);
      state = reducer(state, refreshAuth.pending("background-refresh"));
      state = reducer(
        state,
        refreshAuth.rejected(
          new Error("Refresh expired"),
          "background-refresh",
        ),
      );

      expect(state.authRequestId).toBe(pending.meta.requestId);
      expect(state.status).toBe("loading");
      state = reducer(state, fulfilled);
      expect(state.accessToken).toBe("access");
      expect(state.isAuth).toBe(true);
      expect(state.status).toBe("succeeded");
      expect(state.authRequestId).toBeNull();
    },
  );
});
