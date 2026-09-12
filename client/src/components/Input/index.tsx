import React from "react";
import styles from "./styles.module.scss";
import { InputProps } from "./interface";
import { HelperProps } from "./types";
import clsx from "clsx";

function Helper({ id, text, error }: HelperProps): React.ReactElement | null {
  if (!text) return null;

  return (
    <div id={id} className={clsx(styles.helper, { [styles.error]: error })}>
      {text}
    </div>
  );
}

function InputInner(
  {
    error,
    fullWidth,
    helperText,
    onlyDisabled,
    className,
    inputAdornment,
    id,
    name,
    rootProps,
    wrapperProps,
    ...other
  }: InputProps,
  ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactElement {
  const { className: rootClassName, ...otherRootProps } = rootProps || {};
  const { className: wrapClassName, ...otherWrapProps } = wrapperProps || {};

  const inputWrapperStyles = clsx(styles.inputWrapper, wrapClassName, {
    [styles.fullWidth]: fullWidth,
    [styles.error]: error,
    [styles.onlyDisabledWrapper]: onlyDisabled,
  });

  const inputStyles = clsx(styles.input, className, {
    [styles.inputWithAdornmentEnd]: inputAdornment,
    [styles.onlyDisabled]: onlyDisabled,
  });

  const helperId = helperText
    ? `${id ?? name ?? React.useId()}-helper`
    : undefined;

  return (
    <div className={clsx(styles.inputRoot, rootClassName)} {...otherRootProps}>
      <span className={inputWrapperStyles} {...otherWrapProps}>
        <input
          ref={ref}
          {...other}
          id={id ?? name}
          name={name}
          className={inputStyles}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={helperId}
        />
        {inputAdornment && (
          <div className={styles.adornmentWrap}>{inputAdornment}</div>
        )}
      </span>
      <Helper id={helperId} text={helperText} error={error} />
    </div>
  );
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(InputInner);

export default Input;
