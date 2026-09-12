import { useCallback } from "react";
import { NotificationStack } from "@/components";
import { selectNotifications } from "@/store/notifications/selectors.ts";
import { popNotification } from "@/store/notifications/slice.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";

export default function NotificationsViewport() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const onDismiss = useCallback(
    (id: string) => {
      dispatch(popNotification(id));
    },
    [dispatch],
  );

  return (
    <NotificationStack notifications={notifications} onDismiss={onDismiss} />
  );
}
