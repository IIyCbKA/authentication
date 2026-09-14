import type { DeviceInfo } from "@/shared/utils/device/types";

/*
--------------AuthStatus type--------------
*/
export type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

/*
--------------LoginCreds type--------------
identifier - identifier of user (email or username)
password   - password of user
*/
export type LoginCreds = {
  identifier: string;
  password: string;
  device?: DeviceInfo;
};

/*
--------------RegisterCreds type--------------
username - name of new user
password - password of new user
email    - email of new user
*/
export type RegisterCreds = {
  username: string;
  password: string;
  email: string;
};

/*
--------------PasswordResetRequestData type--------------
email    - user email
*/
export type PasswordResetRequestData = {
  email: string;
};

/*
--------------AuthState type--------------
user                       - user data
accessToken                - access token of auth user
isAuth                     - trivial flag is user is auth user
status                     - status of authorization
*/
export type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuth: boolean;
  status: AuthStatus;
  sessionRevision: number;
  refreshRequestId: string | null;
};

/*
--------------User type--------------
*/
export type User = {
  id: number;
  username: string;
  email: string | null;
  isEmailVerified: boolean;
};

/*
--------------CommonFulfilledResponse type--------------
accessToken      - access token of auth
user             - user data
isAuthenticated  - server has issued valid tokens for current session
*/
export type CommonFulfilledResponse = {
  accessToken: string;
  user: User;
  isAuthenticated: boolean;
};

/*
--------------EmailConfirmData type--------------
code   - verification code
*/
export type EmailConfirmData = {
  code: string;
};

/*
--------------PasswordResetValidateData type--------------
*/
export type PasswordResetValidateData = {
  uid: string;
  token: string;
};

/*
--------------PasswordResetConfirmData type--------------
*/
export type PasswordResetConfirmData = PasswordResetValidateData & {
  newPassword: string;
};

/*
--------------UsernameUpdateCreds type--------------
*/
export type UsernameUpdateData = {
  username: string;
};

/*
--------------UpdateUsernameResponse type--------------
user             - user data
*/
export type UsernameUpdateResponse = {
  user: User;
};

export type OAuthProvider = "github" | "google" | "yandex" | "x";

export type OAuthLinkData = {
  provider: OAuthProvider;
  next?: string;
};

export type OAuthAuthorizationResponse = {
  authorizationUrl: string;
};
