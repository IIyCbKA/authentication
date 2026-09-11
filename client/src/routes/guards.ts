import { PATHS } from "@/routes/paths";
import { LoaderFunction, redirect } from "react-router";
import { store } from "@/store/store";
import { ensureAuthInitialized } from "@/features/Auth/initialize";

export const IndexLoader: LoaderFunction = async () => {
  await ensureAuthInitialized();
  const { isAuth } = store.getState().auth;

  if (isAuth) return redirect(PATHS.DASHBOARD);
  else return redirect(PATHS.SIGN_IN);
};

export const AuthVerifiedGuard: LoaderFunction = async () => {
  await ensureAuthInitialized();
  const { isAuth } = store.getState().auth;

  if (!isAuth) throw redirect(PATHS.SIGN_IN);
  return null;
};

export const AnonGuard: LoaderFunction = async () => {
  await ensureAuthInitialized();
  const { isAuth } = store.getState().auth;

  if (isAuth) throw redirect(PATHS.DASHBOARD);
  return null;
};
