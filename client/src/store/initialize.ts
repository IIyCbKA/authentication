import { setupAuthInterceptors } from "./authInterceptors";
import { setupNotificationListeners } from "./notifications/listeners";

// Module evaluation installs these once, independently of React renders
const stopAuthInterceptors = setupAuthInterceptors();
const stopNotifications = setupNotificationListeners();

if (import.meta.hot) {
  // Remove the previous registrations before Vite replaces this module
  import.meta.hot.dispose(() => {
    stopAuthInterceptors();
    stopNotifications();
  });
}
