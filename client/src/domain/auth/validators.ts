import { EMPTY_STRING_LENGTH } from "@/shared/config/constants";
import {
  EMAIL_RE,
  EMPTY_FIELD_ERROR,
  INCORRECT_EMAIL_ERROR,
  INCORRECT_PASSWORD_ERROR,
  PASSWORD_RE,
  PASSWORDS_DO_NOT_MATCH_ERROR,
} from "./constants";

export const validateNonEmpty = (value: string) => {
  if (!value || value.trim().length === EMPTY_STRING_LENGTH)
    return EMPTY_FIELD_ERROR;
  return undefined;
};

export const validatePassword = (value: string) => {
  if (!value || value.trim().length === EMPTY_STRING_LENGTH)
    return EMPTY_FIELD_ERROR;

  if (!PASSWORD_RE.test(value)) return INCORRECT_PASSWORD_ERROR;
  return undefined;
};

export const validatePasswordConfirmation = (orig: string, value: string) => {
  if (!value || value.trim().length === EMPTY_STRING_LENGTH)
    return EMPTY_FIELD_ERROR;

  if (orig !== value) return PASSWORDS_DO_NOT_MATCH_ERROR;
  return undefined;
};

export const validateEmail = (value: string) => {
  if (!value || value.trim().length === EMPTY_STRING_LENGTH)
    return EMPTY_FIELD_ERROR;

  if (!EMAIL_RE.test(value)) return INCORRECT_EMAIL_ERROR;
  return undefined;
};
