import React from "react";
import { DrawerProps } from "./interface";
import { CSSTransition } from "react-transition-group";
import styles from "./styles.module.scss";
import clsx from "clsx";

function DrawerInner(
  { animationDuration = 200, isOpen, className, ...other }: DrawerProps,
  ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactElement | null {
  const innerRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(
    ref,
    (): HTMLDivElement => innerRef.current as HTMLDivElement,
  );

  const styleAnimation = {
    "--drawer-duration": `${animationDuration}ms`,
  } as React.CSSProperties;

  return (
    <CSSTransition
      nodeRef={innerRef}
      in={isOpen}
      timeout={animationDuration}
      classNames={{
        enter: styles.enter,
        enterActive: styles.enterActive,
        enterDone: styles.enterDone,
        exit: styles.exit,
        exitActive: styles.exitActive,
        exitDone: styles.exitDone,
      }}
      unmountOnExit
    >
      <div
        ref={innerRef}
        style={styleAnimation}
        {...other}
        className={clsx(styles.menuContainer, className)}
      />
    </CSSTransition>
  );
}

const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(DrawerInner);

export default Drawer;
