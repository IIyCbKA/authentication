import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/domain/auth/slice";
import notificationsReducer from "@/store/notifications/slice";

export const rootReducer = combineReducers({
  auth: authReducer,
  notifications: notificationsReducer,
});
