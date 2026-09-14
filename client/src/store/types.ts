import type { TypedStartListening } from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "./store";

export type AppStartListening = TypedStartListening<RootState, AppDispatch>;

/*
--------------RejectedPayload type--------------
*/
export type RejectedPayload = {
  detail: string;
};

/*
--------------AppThunkCfg type--------------
*/
export type AppThunkCfg = {
  rejectValue: RejectedPayload;
};
