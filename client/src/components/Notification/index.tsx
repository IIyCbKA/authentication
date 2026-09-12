import React from "react";
import styles from "./styles.module.scss";
import { NotificationProps } from "./interface";
import clsx from "clsx";
import { Close } from "@/assets/icons";
import { CSSTransition } from "react-transition-group";
import IconButton from "@/components/Buttons/IconButton";
import LinearProgress from "@/components/Progress/LinearProgress";

function Notification({
  id,
  message,
  autoHideDuration,
  onDismiss,
  animationDuration = 200,
  slideFrom = "right",
  className,
  style,
  ...other
}: NotificationProps): React.ReactElement {
  const endRef = React.useRef(Date.now() + autoHideDuration);
  const pauseRef = React.useRef(false);
  const pauseStarted = React.useRef(0);
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [percent, setPercent] = React.useState<number>(100);
  const [visible, setVisible] = React.useState<boolean>(true);

  const onExited: () => void = React.useCallback((): void => {
    onDismiss(id);
  }, [onDismiss, id]);

  const onClose: () => void = React.useCallback(
    (): void => setVisible(false),
    [],
  );

  const onMouseEnter: () => void = (): void => {
    pauseRef.current = true;
    pauseStarted.current = Date.now();
  };

  const onMouseLeave: () => void = (): void => {
    pauseRef.current = false;
    endRef.current += Date.now() - pauseStarted.current;
  };

  React.useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (!pauseRef.current) {
        const remaining = Math.max(0, endRef.current - Date.now());
        setPercent((remaining / autoHideDuration) * 100);
        if (remaining === 0) return onClose();
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoHideDuration, onClose]);

  const styleAnimation = {
    "--notification-duration": `${animationDuration}ms`,
  } as React.CSSProperties;

  return (
    <CSSTransition
      nodeRef={nodeRef}
      in={visible}
      appear
      timeout={animationDuration}
      classNames={{
        appear: styles.notificationAppear,
        appearActive: styles.notificationAppearActive,
        appearDone: styles.notificationAppearDone,
        exit: styles.notificationExit,
        exitActive: styles.notificationExitActive,
        exitDone: styles.notificationExitDone,
      }}
      onExited={onExited}
      unmountOnExit
    >
      <div
        ref={nodeRef}
        {...other}
        style={{ ...style, ...styleAnimation }}
        data-slide={slideFrom}
        className={clsx(styles.notificationRoot, className)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span className={styles.contentZone}>{message}</span>
        <IconButton className={styles.closeButton} onClick={onClose}>
          <Close />
        </IconButton>
        <LinearProgress value={percent} className={styles.progressContainer} />
      </div>
    </CSSTransition>
  );
}

/**
 * WARNING!
 * This component is designed for internal use by NotificationStack only.
 * Do NOT import or render <Notification> directly elsewhere.
 */
export default Notification;
