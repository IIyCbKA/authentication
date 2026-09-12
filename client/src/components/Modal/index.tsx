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
    style: wrapStyle,
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

  const onRootPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    rootPointerDown?.(e);
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
        style={{ ...wrapStyle, ...styleAnimation }}
        className={clsx(styles.modalWrap, wrapClassName)}
        onPointerDown={wrapPointerDown ?? onClose}
        role="dialog"
        aria-modal="true"
        {...otherWrapProps}
      >
        <div
          className={clsx(styles.modalRoot, rootClassName)}
          onPointerDown={onRootPointerDown}
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
