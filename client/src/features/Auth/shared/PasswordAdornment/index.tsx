import React from "react";
import sharedAuthStyles from "../styles.module.scss";
import { IconButton } from "@/components";
import { CloseEye, OpenEye } from "@/assets/icons";
import { PasswordAdornmentProps } from "./interface";

function InnerPasswordAdornment(
  { isShow, ...other }: PasswordAdornmentProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactElement {
  return (
    <IconButton ref={ref} className={sharedAuthStyles.passwordInput} {...other}>
      {isShow ? <CloseEye /> : <OpenEye />}
    </IconButton>
  );
}

const PasswordAdornment = React.forwardRef<
  HTMLButtonElement,
  PasswordAdornmentProps
>(InnerPasswordAdornment);

export default PasswordAdornment;
