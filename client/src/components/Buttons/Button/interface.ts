/*
--------------ButtonProps Interface--------------
isLoading        - flag that button is loading something
fullWidth        - flag is full parent width
endIcon          - button end icon
startIcon        - button start icon
variant          - variant of button style
*/

import { ButtonHTMLAttributes } from "react";
import type { Adornment, ButtonVariant } from "./types";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  fullWidth?: boolean;

  endIcon?: Adornment;
  startIcon?: Adornment;
  variant?: ButtonVariant;
}
