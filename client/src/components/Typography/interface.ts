/*
--------------TypographyProps Interface--------------
variant       - heading variant tag
*/

import { HTMLAttributes } from "react";
import type { TypographyVariant } from "./types";

export interface TypographyProps extends HTMLAttributes<HTMLHeadingElement> {
  variant?: TypographyVariant;
}
