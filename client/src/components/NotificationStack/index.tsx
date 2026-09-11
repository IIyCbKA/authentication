import React from "react";
import { createPortal } from "react-dom";
import styles from "./styles.module.scss";
import Notification from "@/components/Notification";
import { NotificationStackProps } from "./interface";

function NotificationStack({
  notifications,
  onDismiss,
  vertical = "bottom",
  horizontal = "right",
  slideFrom = "right",
}: NotificationStackProps): React.ReactElement {
  const container = document.getElementById("notifications")!;

  return createPortal(
    <div
      data-vertical={vertical}
      data-horizontal={horizontal}
      className={styles.stackRoot}
    >
      {notifications.map((n): React.ReactElement => (
        <Notification
          key={n.id}
          id={n.id}
          message={n.message}
          autoHideDuration={n.autoHideDuration}
          onDismiss={onDismiss}
          slideFrom={slideFrom}
        />
      ))}
    </div>,
    container,
  );
}

export default NotificationStack;
