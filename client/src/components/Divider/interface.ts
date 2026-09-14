/*
--------------DividerProps Interface--------------
flexItem    - parent box is flex
orientation - divider orientation
variant     - ratio of divider length to total length
*/

import type { DividerOrientation, DividerVariant } from "./types";
import { HTMLAttributes } from "react";

export interface DividerProps extends HTMLAttributes<HTMLElement> {
  flexItem?: boolean;
  orientation?: DividerOrientation;
  variant?: DividerVariant;
}
