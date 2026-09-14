/*
--------------ClickAwayListenerProps Interface--------------
children        - func, which getting ref and returning React Element with this ref
onClickAway     - handler of click
clickEventType  - type of click event listener
touchEventType  - type of touch event listener
*/

import React from "react";
import type { Click, Touch } from "./types";

export interface ClickAwayListenerProps<
  RefElType extends HTMLElement = HTMLElement,
> {
  children: (ref: React.Ref<RefElType>) => React.ReactNode;
  onClickAway: () => void;
  clickEventType?: Click;
  touchEventType?: Touch;
}
