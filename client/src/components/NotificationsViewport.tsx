import { useCallback } from "react";
import { NotificationStack } from "@/components";
import { selectNotifications } from "@/store/notifications/selectors";
import { popNotification } from "@/store/notifications/slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

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
