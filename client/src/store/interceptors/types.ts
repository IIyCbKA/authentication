import type { InternalAxiosRequestConfig } from "axios";

export type SessionSnapshot = {
  accessToken: string | null;
  isAuth: boolean;
  sessionRevision: number;
};

export type AuthRequestConfig = InternalAxiosRequestConfig & {
  authRetry?: boolean;
  authRevision?: number;
};

export type AuthDependencies = {
  getSession: () => SessionSnapshot;
  refresh: () => Promise<string>;
  clearSession: () => void;
};
