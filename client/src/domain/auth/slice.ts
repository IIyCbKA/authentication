import { createSlice, isAnyOf, PayloadAction } from "@reduxjs/toolkit";
import {
  loginUser,
  registerUser,
  emailConfirm,
  refreshAuth,
  logout,
  passwordResetConfirm,
  usernameUpdate,
  fetchCurrentAccount,
  deleteAccount,
} from "./thunks";
import { AuthState, CommonFulfilledResponse } from "./types";
import { SLICE_NAME } from "./constants";

const commonFulfilled = (
  state: AuthState,
  {
    payload: { user, accessToken, isAuthenticated },
  }: PayloadAction<CommonFulfilledResponse>,
) => {
  state.user = user;
  state.accessToken = accessToken;
  state.isAuth = isAuthenticated;
  state.status = "succeeded";
};

const commonLogout = (state: AuthState) => {
  state.user = null;
  state.accessToken = null;
  state.isAuth = false;
  state.status = "idle";
  state.refreshRequestId = null;
  state.sessionRevision += 1;
};

const authSlice = createSlice({
  name: SLICE_NAME,
  initialState: {
    user: null,
    accessToken: null,
    isAuth: false,
    status: "idle",
    sessionRevision: 0,
    refreshRequestId: null,
  } as AuthState,
  reducers: {
    clearSession: commonLogout,
  },
  extraReducers: (builder) => {
    builder
      .addCase(usernameUpdate.fulfilled, (state, action) => {
        if (state.user?.id === action.payload.user.id) {
          state.user = action.payload.user;
        }
      })
      .addCase(fetchCurrentAccount.fulfilled, (state, action) => {
        if (state.user?.id === action.payload.id) {
          state.user = action.payload;
        }
      })
      .addCase(refreshAuth.pending, (state, action) => {
        state.refreshRequestId = action.meta.requestId;
      })
      .addCase(refreshAuth.fulfilled, (state, action) => {
        if (state.refreshRequestId !== action.meta.requestId) return;
        if (state.user?.id !== action.payload.user.id) {
          state.sessionRevision += 1;
        }
        commonFulfilled(state, action);
        state.refreshRequestId = null;
      })
      .addCase(refreshAuth.rejected, (state, action) => {
        if (state.refreshRequestId !== action.meta.requestId) return;
        commonLogout(state);
      });

    builder
      .addMatcher(
        isAnyOf(
          loginUser.pending,
          registerUser.pending,
          emailConfirm.pending,
          passwordResetConfirm.pending,
          logout.pending,
          deleteAccount.pending,
        ),
        (state) => {
          // A previous refresh must not replace a newer login or resurrect logout
          state.sessionRevision += 1;
          state.refreshRequestId = null;
          state.status = "loading";
        },
      )
      .addMatcher(
        isAnyOf(
          loginUser.fulfilled,
          registerUser.fulfilled,
          emailConfirm.fulfilled,
          passwordResetConfirm.fulfilled,
        ),
        (state, action) => {
          commonFulfilled(state, action);
          // Also invalidate a refresh started while this auth request was pending
          state.sessionRevision += 1;
          state.refreshRequestId = null;
        },
      )
      .addMatcher(
        isAnyOf(logout.fulfilled, deleteAccount.fulfilled),
        commonLogout,
      )
      .addMatcher(
        isAnyOf(
          loginUser.rejected,
          registerUser.rejected,
          emailConfirm.rejected,
          passwordResetConfirm.rejected,
          logout.rejected,
          deleteAccount.rejected,
        ),
        (state) => {
          state.status = "failed";
        },
      );
  },
});

export const { clearSession } = authSlice.actions;
export default authSlice.reducer;
