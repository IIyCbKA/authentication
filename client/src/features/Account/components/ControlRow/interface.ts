/*
--------------ControlRowProps Interface--------------
title                 - row title
info                  - small info text / subtitle
withoutTopDivider     - hides top divider when true
withoutBottomDivider  - hides bottom divider when true
buttonProps           - optional props forwarded to internal Button
iconProps             - props for icon wrapper; MUST include `children`
*/

import { HTMLAttributes } from "react";
import type { ExtendedButtonProps, IconProps } from "./types";

export interface ControlRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  info: string;
  withoutTopDivider?: boolean;
  withoutBottomDivider?: boolean;

  buttonProps: ExtendedButtonProps;
  iconProps: IconProps;
}
