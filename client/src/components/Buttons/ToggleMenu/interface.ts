/*
--------------ToggleMenuProps Interface--------------
isOpen     - flag, menu is open
isOverlay  - flag, toggle is overlay (added z-index style)
*/

import { ButtonHTMLAttributes } from "react";

export interface ToggleMenuProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen: boolean;
  isOverlay?: boolean;
}
