import type { LoaderFunction } from "react-router";
import { redirect } from "react-router";
import { store } from "@/store/store";
import { PATHS } from "@/routes/paths";
import { passwordResetValidate } from "@/domain/auth/api";

export const confirmEmailGuard: LoaderFunction = () => {
  const { user, accessToken } = store.getState().auth;
  if (!user?.email || user.isEmailVerified || !accessToken)
    throw redirect(PATHS.SIGN_IN);
  return null;
};

export const resetPasswordGuard: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");
  const token = url.searchParams.get("token");

  if (!uid || !token) throw redirect(PATHS.PASSWORD_FORGOT);

  try {
    await passwordResetValidate({ uid, token });
    return { uid, token };
  } catch (e) {
    throw redirect(PATHS.PASSWORD_FORGOT);
  }
};
