/*
--------------PasswordAdornmentProps Interface--------------
isShow        - flag that password is show for user
*/

import { ButtonHTMLAttributes } from "react";

export interface PasswordAdornmentProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isShow: boolean;
}
