/*
--------------NotificationStackProps Interface--------------
vertical    - vertical position of the notification stack on screen
horizontal  - horizontal position of the notification stack on screen
*/

import { HTMLAttributes } from "react";
import type { Horizontal, Vertical } from "./types";
import { NotificationProps } from "@/components/Notification/interface";

type StackSlideProp = Pick<NotificationProps, "slideFrom">;

export interface NotificationStackProps
  extends HTMLAttributes<HTMLDivElement>, StackSlideProp {
  notifications: Pick<
    NotificationProps,
    "id" | "message" | "autoHideDuration"
  >[];
  onDismiss: NotificationProps["onDismiss"];
  vertical?: Vertical;
  horizontal?: Horizontal;
}
