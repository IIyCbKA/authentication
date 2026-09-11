import React from "react";
import styles from "./styles.module.scss";
import { DividerProps } from "./interface";
import clsx from "clsx";

export default function Divider({
  flexItem,
  orientation = "horizontal",
  variant = "fullwidth",
  className,
  ...other
}: DividerProps): React.ReactElement {
  const Component: React.ElementType =
    orientation === "horizontal" ? "hr" : "div";

  const orientationStyles =
    orientation === "horizontal"
      ? clsx(styles.dividerHorizontal, {
          [styles.dividerHorizontalInset]: variant === "inset",
          [styles.dividerHorizontalMiddle]: variant === "middle",
          [styles.dividerHorizontalFlex]: flexItem,
        })
      : clsx(styles.dividerVertical, {
          [styles.dividerVerticalFullWidth]: variant === "fullwidth",
          [styles.dividerVerticalMiddle]: variant === "middle",
          [styles.dividerVerticalInset]: variant === "inset",
          [styles.dividerVerticalFlex]: flexItem,
        });

  const dividerStyles = clsx(styles.dividerRoot, orientationStyles, className);

  return <Component {...other} className={dividerStyles} />;
}
