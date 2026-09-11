import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import { SLICE_NAME } from "./constants";
import type {
  NotificationData,
  NotificationID,
  NotificationInput,
  NotificationsState,
} from "./types";

const initialState: NotificationsState = { items: [] };

const notificationsSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    pushNotification: {
      reducer: (state, action: PayloadAction<NotificationData>) => {
        state.items.push(action.payload);
      },
      prepare: ({ message, autoHideDuration = 5000 }: NotificationInput) => ({
        payload: { id: nanoid(), message, autoHideDuration },
      }),
    },
    popNotification: (state, action: PayloadAction<NotificationID>) => {
      state.items = state.items.filter(({ id }) => id !== action.payload);
    },
  },
});

export const { pushNotification, popNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
