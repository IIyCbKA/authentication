import { createListenerMiddleware } from "@reduxjs/toolkit";
import type { AppStartListening } from "./types";

export const listenerMiddleware = createListenerMiddleware();
export const startAppListening =
  listenerMiddleware.startListening as AppStartListening;
