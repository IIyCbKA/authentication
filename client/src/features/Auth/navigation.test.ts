import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { listenerMiddleware } from "@/store/listener";
import { rootReducer } from "@/store/rootReducer";
import { loginUser, refreshAuth } from "@/domain/auth/thunks";
import type { CommonFulfilledResponse } from "@/domain/auth/types";
import { PATHS } from "@/routes/paths";
import { router } from "@/routes/router";
import { setupAuthNavigation } from "./navigation";

vi.mock("@/routes/router", () => ({ router: { navigate: vi.fn() } }));

const fullSession: CommonFulfilledResponse = {
  user: { id: 1, username: "test", email: null, isEmailVerified: false },
  accessToken: "access",
  isAuthenticated: true,
};
const credentials = { identifier: "test", password: "password1" };

function createTestStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault().prepend(listenerMiddleware.middleware),
  });
}

beforeEach(() => {
  listenerMiddleware.clearListeners();
  vi.clearAllMocks();
  setupAuthNavigation();
});

afterEach(() => {
  listenerMiddleware.clearListeners();
});

describe("session navigation", () => {
  it("redirects an active user to login when their background refresh fails", () => {
    const store = createTestStore();
    store.dispatch(loginUser.fulfilled(fullSession, "login", credentials));
    vi.mocked(router.navigate).mockClear();
    store.dispatch(refreshAuth.pending("refresh"));
    store.dispatch(
      refreshAuth.rejected(new Error("Refresh expired"), "refresh"),
    );
    expect(store.getState().auth.accessToken).toBeNull();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(PATHS.SIGN_IN, {
      replace: true,
    });
  });

  it("does not redirect anonymous startup refresh failures away from public pages", () => {
    const store = createTestStore();
    store.dispatch(refreshAuth.pending("bootstrap"));
    store.dispatch(
      refreshAuth.rejected(new Error("No refresh cookie"), "bootstrap"),
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("does not redirect on a stale refresh rejection after a newer login", () => {
    const store = createTestStore();
    store.dispatch(
      loginUser.fulfilled(fullSession, "first-login", credentials),
    );
    store.dispatch(refreshAuth.pending("old-refresh"));
    store.dispatch(loginUser.pending("second-login", credentials));
    store.dispatch(
      loginUser.fulfilled(
        { ...fullSession, accessToken: "new-session" },
        "second-login",
        credentials,
      ),
    );
    vi.mocked(router.navigate).mockClear();
    store.dispatch(
      refreshAuth.rejected(new Error("Old refresh expired"), "old-refresh"),
    );
    expect(store.getState().auth.accessToken).toBe("new-session");
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("uses the server authentication flag for email-less and pending logins", () => {
    const store = createTestStore();
    store.dispatch(loginUser.fulfilled(fullSession, "login", credentials));
    expect(router.navigate).toHaveBeenLastCalledWith(PATHS.DASHBOARD, {
      replace: true,
    });
    store.dispatch(
      loginUser.fulfilled(
        {
          ...fullSession,
          user: { ...fullSession.user, email: "test@example.test" },
          isAuthenticated: false,
        },
        "pending-login",
        credentials,
      ),
    );
    expect(router.navigate).toHaveBeenLastCalledWith(PATHS.EMAIL_CONFIRM);
  });
});
