import React from "react";
import { IconButtonProps } from "./interface";
import styles from "./styles.module.scss";
import clsx from "clsx";

function IconButtonInner(
  { className, type = "button", ...other }: IconButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactElement {
  return (
    <button
      {...other}
      ref={ref}
      type={type}
      className={clsx(styles.iconButtonRoot, className)}
    />
  );
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  IconButtonInner,
);

export default IconButton;
