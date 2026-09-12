// Vite replaces this public value at build time; it must never contain secrets
export const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
export const REQUEST_TIMEOUT_MS = 30_000;
