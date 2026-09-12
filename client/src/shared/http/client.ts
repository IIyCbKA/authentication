import axios from "axios";
import { API_BASE, REQUEST_TIMEOUT_MS } from "./config";

const config = {
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
};

// Only apiClient receives the app's access-token / refresh interceptors
export const apiClient = axios.create(config);
export const publicClient = axios.create(config);
export const refreshClient = axios.create(config);
