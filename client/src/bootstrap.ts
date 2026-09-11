import { setupAuthInterceptors } from "./store/authInterceptors";
import { setupNotificationListeners } from "./store/notifications/listeners";

const stopAuthInterceptors = setupAuthInterceptors();
const stopNotifications = setupNotificationListeners();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopAuthInterceptors();
    stopNotifications();
  });
}
