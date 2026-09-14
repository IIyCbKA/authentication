import type { AuthState, AuthStatus, User } from "./types";
import { DEFAULT_EMAIL, DEFAULT_USERNAME } from "./constants";

type RootState = { auth: AuthState };

export const selectIsAuth = (state: RootState): boolean => state.auth.isAuth;
export const selectUser = (state: RootState): User | null => state.auth.user;
export const selectAccessToken = (state: RootState): string | null =>
  state.auth.accessToken;
export const selectAuthStatus = (state: RootState): AuthStatus =>
  state.auth.status;
export const selectUsername = (state: RootState): string =>
  state.auth.user?.username ?? DEFAULT_USERNAME;
export const selectEmail = (state: RootState): string =>
  state.auth.user?.email ?? DEFAULT_EMAIL;
export const selectIsEmailVerified = (state: RootState): boolean | undefined =>
  state.auth.user?.isEmailVerified;
