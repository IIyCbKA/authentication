import { apiClient, publicClient, refreshClient } from "@/shared/http/client";
import { API_BASE } from "@/shared/http/config";
import { ENDPOINT } from "./endpoints";
import type {
  EmailConfirmData,
  LoginCreds,
  CommonFulfilledResponse,
  RegisterCreds,
  PasswordResetRequestData,
  PasswordResetValidateData,
  PasswordResetConfirmData,
  User,
  UsernameUpdateData,
  UsernameUpdateResponse,
  OAuthLinkData,
  OAuthAuthorizationResponse,
  OAuthProvider,
} from "./types";

export async function login(
  creds: LoginCreds,
): Promise<CommonFulfilledResponse> {
  const { data } = await publicClient.post<CommonFulfilledResponse>(
    ENDPOINT.LOGIN,
    creds,
  );
  return data;
}

export async function register(
  creds: RegisterCreds,
): Promise<CommonFulfilledResponse> {
  const { data } = await publicClient.post<CommonFulfilledResponse>(
    ENDPOINT.PENDING_REGISTER,
    creds,
  );
  return data;
}

export async function emailConfirm(
  confirmData: EmailConfirmData,
): Promise<CommonFulfilledResponse> {
  const { data } = await apiClient.post<CommonFulfilledResponse>(
    ENDPOINT.EMAIL_CONFIRM,
    confirmData,
  );
  return data;
}

export async function refresh(): Promise<CommonFulfilledResponse> {
  const { data } = await refreshClient.post<CommonFulfilledResponse>(
    ENDPOINT.REFRESH,
  );
  return data;
}

export async function logout(): Promise<void> {
  await publicClient.post(ENDPOINT.LOGOUT);
}

export async function resendCode(): Promise<void> {
  await apiClient.post(ENDPOINT.VERIFY_CODE_RESEND);
}

export async function passwordResetRequest(
  resetData: PasswordResetRequestData,
): Promise<void> {
  await publicClient.post(ENDPOINT.PASSWORD_RESET_REQUEST, resetData);
}

export async function passwordResetValidate(
  validateData: PasswordResetValidateData,
): Promise<void> {
  await publicClient.post(ENDPOINT.PASSWORD_RESET_VALIDATE, validateData);
}

export async function passwordResetConfirm(
  confirmData: PasswordResetConfirmData,
): Promise<CommonFulfilledResponse> {
  const { data } = await publicClient.post<CommonFulfilledResponse>(
    ENDPOINT.PASSWORD_RESET_CONFIRM,
    confirmData,
  );
  return data;
}

export async function getCurrentAccount(): Promise<User> {
  const { data } = await apiClient.get<User>(ENDPOINT.CURRENT_ACCOUNT);
  return data;
}

export async function deleteCurrentAccount(): Promise<void> {
  await apiClient.delete(ENDPOINT.CURRENT_ACCOUNT);
}

export async function usernameUpdate(
  updateData: UsernameUpdateData,
): Promise<UsernameUpdateResponse> {
  const { data } = await apiClient.patch<UsernameUpdateResponse>(
    ENDPOINT.USERNAME_UPDATE,
    updateData,
  );
  return data;
}

function startPath(provider: OAuthProvider): string {
  return `/auth/oauth/${provider}/start/`;
}

export function getOAuthLoginUrl(
  provider: OAuthProvider,
  next: string,
): string {
  const query = new URLSearchParams({ flow: "login", next });
  return `${API_BASE ?? ""}${startPath(provider)}?${query}`;
}

export async function startOAuthLink({
  provider,
  next,
}: OAuthLinkData): Promise<OAuthAuthorizationResponse> {
  const { data } = await apiClient.post<OAuthAuthorizationResponse>(
    startPath(provider),
    undefined,
    { params: { flow: "link", next } },
  );
  return data;
}
