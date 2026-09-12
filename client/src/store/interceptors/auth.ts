import axios, { type AxiosInstance } from "axios";
import { apiClient } from "@/shared/http/client.ts";
import { refreshAuth } from "@/domain/auth/thunks.ts";
import { clearSession } from "@/domain/auth/slice.ts";
import { store } from "@/store/store.ts";
import { type AuthDependencies, type AuthRequestConfig } from "./types.ts";

export function installAuthInterceptors(
  client: AxiosInstance,
  dependencies: AuthDependencies,
): () => void {
  let refreshFlight: { revision: number; promise: Promise<string> } | null =
    null;

  const requestId = client.interceptors.request.use(
    (config: AuthRequestConfig) => {
      const session = dependencies.getSession();
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

  const responseId = client.interceptors.response.use(
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
      const session = dependencies.getSession();
      if (config.authRevision !== session.sessionRevision) throw error;

      if (config.authRetry || !session.isAuth || !session.accessToken) {
        if (session.accessToken) dependencies.clearSession();
        throw error;
      }

      config.authRetry = true;

      // A delayed 401 can arrive after another request has already refreshed
      if (
        config.headers.get("Authorization") !== `Bearer ${session.accessToken}`
      ) {
        return client.request(config);
      }

      if (
        !refreshFlight ||
        refreshFlight.revision !== session.sessionRevision
      ) {
        const flight = {
          revision: session.sessionRevision,
          promise: dependencies.refresh(),
        };
        flight.promise = flight.promise.finally(() => {
          if (refreshFlight === flight) refreshFlight = null;
        });
        refreshFlight = flight;
      }

      try {
        await refreshFlight.promise;
      } catch (refreshError) {
        if (dependencies.getSession().sessionRevision === config.authRevision) {
          dependencies.clearSession();
        }
        throw refreshError;
      }
      const current = dependencies.getSession();
      if (
        current.sessionRevision !== config.authRevision ||
        !current.isAuth ||
        !current.accessToken
      ) {
        throw new Error("Account session changed during refresh");
      }
      return client.request(config);
    },
  );

  return () => {
    client.interceptors.request.eject(requestId);
    client.interceptors.response.eject(responseId);
  };
}

export function setupAuthInterceptors(): () => void {
  return installAuthInterceptors(apiClient, {
    getSession: () => store.getState().auth,
    refresh: async () => {
      const result = await store.dispatch(refreshAuth()).unwrap();
      return result.accessToken;
    },
    clearSession: () => {
      store.dispatch(clearSession());
    },
  });
}
