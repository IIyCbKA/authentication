/*
--------------NotificationProps Interface--------------
id                 - unique identifier for the notification
message            - the text content to display in the notification
autoHideDuration   - time in milliseconds before the notification auto-dismisses
animationDuration  - duration of the slide-in/slide-out animation in milliseconds
slideFrom          - screen edge from which the notification will slide in/out
*/

import { HTMLAttributes } from "react";
import type { SlideDirection } from "./types";

export interface NotificationProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  message: string;
  autoHideDuration: number;
  onDismiss: (id: string) => void;
  animationDuration?: number;
  slideFrom?: SlideDirection;
}
