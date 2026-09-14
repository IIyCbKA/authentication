/*
--------------LoadingOverlayProps Interface--------------
overlayType - type of overlay for set of styles
*/

import { HTMLAttributes } from "react";
import type { LoadingOverlayVariant } from "./types";

export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  overlayType?: LoadingOverlayVariant;
}
