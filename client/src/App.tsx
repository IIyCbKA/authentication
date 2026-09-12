import React from "react";
import "@/shared/styles/index.scss";
import AppRoutes from "@/routes/AppRoutes";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import NotificationsViewport from "@/features/Notifications/NotificationsViewport.tsx";

export default function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <AppRoutes />
      <NotificationsViewport />
    </Provider>
  );
}
