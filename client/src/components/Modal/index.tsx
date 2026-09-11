import React from "react";
import { createPortal } from "react-dom";
import { ModalProps } from "./interface";
import clsx from "clsx";
import styles from "./styles.module.scss";
import { CSSTransition } from "react-transition-group";
import { CloseButtonProps } from "./types";
import IconButton from "@/components/Buttons/IconButton";
import { Close } from "@/assets/icons";

function CloseButton({
  isShow,
  onClick,
  closeButtonProps,
}: CloseButtonProps): React.ReactElement | null {
  if (!isShow) return null;

  const {
    className: className,
    children: children,
    ...otherProps
  } = closeButtonProps || {};

  return (
    <IconButton
      className={clsx(styles.closeButton, className)}
      onClick={onClick}
      {...otherProps}
    >
      {children ?? <Close />}
    </IconButton>
  );
}

function ModalInner(
  {
    animationDuration = 250,
    withCloseButton = false,
    closeButtonProps,
    rootProps,
    isOpen,
    onClose,
    onExited,
    ...wrapProps
  }: ModalProps,
  ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactElement {
  const innerRef = React.useRef<HTMLDivElement>(null);
  const {
    children: content,
    className: wrapClassName,
    onPointerDown: wrapPointerDown,
    ...otherWrapProps
  } = wrapProps;

  const {
    className: rootClassName,
    onPointerDown: rootPointerDown,
    ...otherRootProps
  } = rootProps || {};

  React.useImperativeHandle(
    ref,
    (): HTMLDivElement => innerRef.current as HTMLDivElement,
  );

  const styleAnimation = {
    "--modal-duration": `${animationDuration}ms`,
  } as React.CSSProperties;

  const wrapStyles = clsx(styles.modalWrap, wrapClassName);
  const rootStyles = clsx(styles.modalRoot, rootClassName);

  const stop: (e: React.PointerEvent) => void = (
    e: React.PointerEvent,
  ): void => {
    e.stopPropagation();
  };

  return createPortal(
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
      onExited={() => onExited?.()}
      unmountOnExit
    >
      <div
        ref={innerRef}
        style={styleAnimation}
        className={wrapStyles}
        onPointerDown={wrapPointerDown ?? onClose}
        role="dialog"
        aria-modal="true"
        {...otherWrapProps}
      >
        <div
          className={rootStyles}
          onPointerDown={rootPointerDown ?? stop}
          {...otherRootProps}
        >
          <CloseButton
            isShow={withCloseButton}
            onClick={onClose}
            closeButtonProps={closeButtonProps}
          />
          {content}
        </div>
      </div>
    </CSSTransition>,
    document.body,
  );
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(ModalInner);

export default Modal;
