import { isAnyOf } from "@reduxjs/toolkit";
import {
  loginUser,
  registerUser,
  emailConfirm,
  passwordResetRequest,
  passwordResetConfirm,
  usernameUpdate,
  resendVerificationCode,
  fetchCurrentAccount,
  deleteAccount,
  linkOAuthAccount,
  logout,
  fetchAllUsers,
} from "@/domain/auth/thunks";
import { pushNotification } from "@/store/notifications/slice";
import { startAppListening } from "@/store/listener";

const isNotifiableRejection = isAnyOf(
  loginUser.rejected,
  registerUser.rejected,
  emailConfirm.rejected,
  passwordResetRequest.rejected,
  passwordResetConfirm.rejected,
  usernameUpdate.rejected,
  resendVerificationCode.rejected,
  fetchCurrentAccount.rejected,
  deleteAccount.rejected,
  linkOAuthAccount.rejected,
  logout.rejected,
  fetchAllUsers.rejected,
);

// Business events are connected to generic UI state at the application layer
export function setupNotificationListeners() {
  return startAppListening({
    matcher: isNotifiableRejection,
    effect: (action, { dispatch }) => {
      if (action.payload) {
        dispatch(pushNotification({ message: action.payload.detail }));
      }
    },
  });
}
