import type { NotificationData, NotificationsState } from "./types";

export const selectNotifications = (state: {
  notifications: NotificationsState;
}): NotificationData[] => state.notifications.items;
