import type { InternalAxiosRequestConfig } from "axios";

export type AuthRequestConfig = InternalAxiosRequestConfig & {
  authRetry?: boolean;
  authRevision?: number;
};
