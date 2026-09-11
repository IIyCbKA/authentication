import { store } from "@/store/store";
import { refreshAuth } from "@/domain/auth/thunks";

let authPromise: Promise<void> | null = null;

export const ensureAuthInitialized = async (): Promise<void> => {
  if (!authPromise) {
    authPromise = store.dispatch(refreshAuth()).then(() => undefined);
  }

  await authPromise;
};
