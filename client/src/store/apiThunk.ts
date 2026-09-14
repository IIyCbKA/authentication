import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { OTHER_SERVER_ERROR_TEXT } from "@/shared/config/constants";
import type { AppThunkCfg } from "./types";

export function createAppAsyncThunk<Returned, Arg = void>(
  typePrefix: string,
  apiFn: (arg: Arg) => Promise<Returned>,
) {
  return createAsyncThunk<Returned, Arg, AppThunkCfg>(
    typePrefix,
    async (arg, { rejectWithValue }) => {
      try {
        return await apiFn(arg);
      } catch (err: unknown) {
        let detail: string;

        if (axios.isAxiosError(err)) {
          detail = err.response?.data?.detail ?? OTHER_SERVER_ERROR_TEXT;
        } else {
          detail = OTHER_SERVER_ERROR_TEXT;
        }

        return rejectWithValue({ detail });
      }
    },
  );
}
