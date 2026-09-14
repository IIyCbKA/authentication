import axios from "axios";
import { apiClient } from "@/shared/http/client.ts";
import { refreshAuth } from "@/domain/auth/thunks.ts";
import { clearSession } from "@/domain/auth/slice.ts";
import { store } from "@/store/store.ts";
import type { AuthRequestConfig } from "./types.ts";

export function setupAuthInterceptors(): () => void {
  let refreshFlight: { revision: number; promise: Promise<string> } | null =
    null;

  const requestId = apiClient.interceptors.request.use(
    (config: AuthRequestConfig) => {
      const session = store.getState().auth;
      if (config.authRetry && config.authRevision !== session.sessionRevision) {
        throw new Error("Account session changed during the request");
      }
      config.authRevision = session.sessionRevision;
      if (session.accessToken) {
        config.headers.set("Authorization", `Bearer ${session.accessToken}`);
      } else {
        config.headers.delete("Authorization");
      }
      return config;
    },
  );

  const responseId = apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (
        !axios.isAxiosError(error) ||
        error.response?.status !== 401 ||
        !error.config
      ) {
        throw error;
      }

      const config = error.config as AuthRequestConfig;
      const session = store.getState().auth;
      if (config.authRevision !== session.sessionRevision) throw error;

      if (config.authRetry || !session.isAuth || !session.accessToken) {
        if (session.accessToken) store.dispatch(clearSession());
        throw error;
      }

      config.authRetry = true;

      // A delayed 401 can arrive after another request has already refreshed
      if (
        config.headers.get("Authorization") !== `Bearer ${session.accessToken}`
      ) {
        return apiClient.request(config);
      }

      if (
        !refreshFlight ||
        refreshFlight.revision !== session.sessionRevision
      ) {
        const flight = {
          revision: session.sessionRevision,
          promise: store
            .dispatch(refreshAuth())
            .unwrap()
            .then(({ accessToken }) => accessToken),
        };
        flight.promise = flight.promise.finally(() => {
          if (refreshFlight === flight) refreshFlight = null;
        });
        refreshFlight = flight;
      }

      try {
        await refreshFlight.promise;
      } catch (refreshError) {
        if (store.getState().auth.sessionRevision === config.authRevision) {
          store.dispatch(clearSession());
        }
        throw refreshError;
      }
      const current = store.getState().auth;
      if (
        current.sessionRevision !== config.authRevision ||
        !current.isAuth ||
        !current.accessToken
      ) {
        throw new Error("Account session changed during refresh");
      }
      return apiClient.request(config);
    },
  );

  return () => {
    apiClient.interceptors.request.eject(requestId);
    apiClient.interceptors.response.eject(responseId);
  };
}
