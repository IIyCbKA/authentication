import React from "react";
import styles from "./styles.module.scss";
import clsx from "clsx";
import { ButtonProps } from "./interface";
import { LoadingSpinnerProps, PositionedAdornmentProps } from "./types";
import CircularProgress from "@/components/Progress/CircularProgress";

function AdornmentIcon({
  content,
  className,
  position,
}: PositionedAdornmentProps): React.ReactElement | null {
  const adornmentStyles = clsx(styles.adornmentContainer, className, {
    [styles.startAdornment]: position === "start",
    [styles.endAdornment]: position === "end",
  });

  if (!content) return null;
  return <div className={adornmentStyles}>{content}</div>;
}

function LoadingSpinner({
  isLoading,
}: LoadingSpinnerProps): React.ReactElement | null {
  if (!isLoading) return null;

  return (
    <span className={styles.loadingWrap}>
      <CircularProgress className={styles.spinner} />
    </span>
  );
}

function ButtonInner(
  {
    disabled,
    isLoading,
    fullWidth,
    children,
    className,
    type = "button",
    endIcon,
    startIcon,
    variant = "text",
    ...other
  }: ButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactElement {
  const isDisabled = disabled || isLoading;

  const buttonStyles = clsx(styles.rootButton, className, {
    [styles.fullWidth]: fullWidth,
    [styles.containedButton]: variant === "contained",
    [styles.textButton]: variant === "text",
    [styles.outlinedButton]: variant === "outlined",
    [styles.plainButton]: variant === "plain",
    [styles.buttonWithAdornment]: startIcon || endIcon,
    [styles.loading]: isLoading,
  });

  return (
    <button
      {...other}
      ref={ref}
      disabled={isDisabled}
      type={type}
      className={buttonStyles}
    >
      <AdornmentIcon position={"start"} {...startIcon} />
      {children}
      <AdornmentIcon position={"end"} {...endIcon} />
      <LoadingSpinner isLoading={isLoading} />
    </button>
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(ButtonInner);

export default Button;
