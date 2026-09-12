import { startAppListening } from "@/store/listener";
import {
  emailConfirm,
  loginUser,
  logout,
  registerUser,
  passwordResetRequest,
  passwordResetConfirm,
  deleteAccount,
  refreshAuth,
} from "@/domain/auth/thunks";
import { isAnyOf } from "@reduxjs/toolkit";
import { clearSession } from "@/domain/auth/slice";
import { router } from "@/routes/router";
import { PATHS } from "@/routes/paths";

export function setupAuthNavigation() {
  startAppListening({
    actionCreator: refreshAuth.rejected,
    effect: (action, { getOriginalState, getState }) => {
      const previous = getOriginalState().auth;
      if (
        previous.isAuth &&
        previous.refreshRequestId === action.meta.requestId &&
        !getState().auth.accessToken
      ) {
        router.navigate(PATHS.SIGN_IN, { replace: true });
      }
    },
  });

  startAppListening({
    matcher: isAnyOf(logout.fulfilled, deleteAccount.fulfilled, clearSession),
    effect: (action, { getOriginalState }) => {
      if (
        (logout.fulfilled.match(action) ||
          deleteAccount.fulfilled.match(action)) &&
        getOriginalState().auth.authRequestId !== action.meta.requestId
      )
        return;
      router.navigate(PATHS.SIGN_IN, { replace: true });
    },
  });

  startAppListening({
    actionCreator: loginUser.fulfilled,
    effect: (action, { getOriginalState }) => {
      if (getOriginalState().auth.authRequestId !== action.meta.requestId)
        return;
      if (action.payload.isAuthenticated)
        router.navigate(PATHS.DASHBOARD, { replace: true });
      else router.navigate(PATHS.EMAIL_CONFIRM);
    },
  });

  startAppListening({
    actionCreator: registerUser.fulfilled,
    effect: (action, { getOriginalState }) => {
      if (getOriginalState().auth.authRequestId !== action.meta.requestId)
        return;
      router.navigate(PATHS.EMAIL_CONFIRM);
    },
  });

  startAppListening({
    actionCreator: passwordResetRequest.fulfilled,
    effect: () => {
      router.navigate(PATHS.PASSWORD_FORGOT_SENT);
    },
  });

  startAppListening({
    actionCreator: emailConfirm.fulfilled,
    effect: (action, { getOriginalState }) => {
      if (getOriginalState().auth.authRequestId !== action.meta.requestId)
        return;
      router.navigate(PATHS.DASHBOARD, { replace: true });
    },
  });

  startAppListening({
    actionCreator: passwordResetConfirm.fulfilled,
    effect: (action, { getOriginalState }) => {
      if (getOriginalState().auth.authRequestId !== action.meta.requestId)
        return;
      router.navigate(PATHS.DASHBOARD, { replace: true });
    },
  });
}
