import React from "react";
import { ToggleMenuProps } from "./interface";
import styles from "./styles.module.scss";
import clsx from "clsx";

function ToggleMenuInner(
  { isOpen, isOverlay, className, type = "button", ...other }: ToggleMenuProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactElement {
  const buttonStyles = clsx(styles.toggleMenuWrapper, className, {
    [styles.open]: isOpen,
    [styles.overlay]: isOverlay,
  });

  return (
    <button ref={ref} className={buttonStyles} type={type} {...other}>
      <div className={clsx(styles.rootLine, styles.firstLine)} />
      <div className={clsx(styles.rootLine, styles.secondLine)} />
      <div className={clsx(styles.rootLine, styles.thirdLine)} />
    </button>
  );
}

const ToggleMenu = React.forwardRef<HTMLButtonElement, ToggleMenuProps>(
  ToggleMenuInner,
);

export default ToggleMenu;
