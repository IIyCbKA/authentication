import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { store } from "@/store/store";
import { setupNotificationListeners } from "./listeners";
import { popNotification } from "@/store/notifications/slice";
import {
  passwordResetConfirm,
  resendVerificationCode,
  refreshAuth,
} from "@/domain/auth/thunks";

let stop: () => void;

beforeEach(() => {
  for (const { id } of store.getState().notifications.items) {
    store.dispatch(popNotification(id));
  }
  stop = setupNotificationListeners();
});

afterEach(() => stop());

describe("application error notifications", () => {
  it("shows password reset confirm errors", () => {
    store.dispatch(
      passwordResetConfirm.rejected(
        null,
        "test-reset",
        { uid: "1", token: "test", newPassword: "test" },
        { detail: "Reset link expired" },
      ),
    );
    expect(store.getState().notifications.items[0].message).toBe(
      "Reset link expired",
    );
  });

  it("shows resend errors", () => {
    store.dispatch(
      resendVerificationCode.rejected(null, "test-resend", undefined, {
        detail: "Try again later",
      }),
    );
    expect(store.getState().notifications.items[0].message).toBe(
      "Try again later",
    );
  });

  it("does not show background refresh failures or cancelled actions", () => {
    store.dispatch(
      refreshAuth.rejected(null, "test-refresh", undefined, {
        detail: "No refresh cookie",
      }),
    );
    store.dispatch(
      resendVerificationCode.rejected(
        { name: "AbortError", message: "Cancelled" },
        "test-cancel",
        undefined,
      ),
    );
    expect(store.getState().notifications.items).toEqual([]);
  });
});
