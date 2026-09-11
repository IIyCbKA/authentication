import React from "react";
import sharedAuthStyles from "@/features/Auth/shared/styles.module.scss";
import {
  LOGIN_PLACEHOLDER,
  PASSWORD_PLACEHOLDER,
  SIGN_IN_BTN_TEXT,
  TITLE_SCREEN,
} from "./constants";
import { EMPTY_STRING } from "@/shared/config/constants";
import ActionBar from "./ActionBar";
import { ErrorsMap } from "./types";
import SignInWith from "@/features/Auth/shared/SignInWith";
import { loginUser } from "@/domain/auth/thunks";
import { useAppDispatch } from "@/store/hooks";
import { Input, Button, Typography } from "@/components";
import PasswordAdornment from "@/features/Auth/shared/PasswordAdornment";
import { validateNonEmpty } from "@/domain/auth/validators";
import { collectDeviceInfo } from "@/shared/utils/device";

export default function SignIn(): React.ReactElement {
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = React.useState<string>(EMPTY_STRING);
  const [password, setPassword] = React.useState<string>(EMPTY_STRING);
  const identifierRef = React.useRef<HTMLInputElement | null>(null);
  const passwordRef = React.useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [isProcessing, setProcessing] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<ErrorsMap>({});

  const onLoginChange: (e: React.ChangeEvent<HTMLInputElement>) => void = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setIdentifier(e.target.value);
    if (errors.identifier)
      setErrors((prev) => ({ ...prev, identifier: undefined }));
  };

  const onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setPassword(e.target.value);
    if (errors.password)
      setErrors((prev) => ({ ...prev, password: undefined }));
  };

  const onPasswordVisibleClick: () => void = (): void => {
    setShowPassword((prev: boolean): boolean => !prev);
  };

  const focusFirstError: (errs: ErrorsMap) => void = (
    errs: ErrorsMap,
  ): void => {
    if (errs.identifier) identifierRef.current?.focus();
    else if (errs.password) passwordRef.current?.focus();
  };

  const onSubmit: (e: React.FormEvent) => void = async (
    e: React.FormEvent,
  ): Promise<void> => {
    e.preventDefault();

    const newErrors: ErrorsMap = {
      identifier: validateNonEmpty(identifier),
      password: validateNonEmpty(password),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      focusFirstError(newErrors);
      return;
    }

    setProcessing(true);
    try {
      const device = collectDeviceInfo();
      await dispatch(loginUser({ identifier, password, device })).unwrap();
    } catch (e) {
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={sharedAuthStyles.rootContainer}>
      <Typography variant={"h1"}>{TITLE_SCREEN}</Typography>
      <form
        className={sharedAuthStyles.formContainer}
        onSubmit={onSubmit}
        noValidate
      >
        <Input
          fullWidth
          ref={identifierRef}
          name={"identifier"}
          autoComplete={"username"}
          value={identifier}
          onChange={onLoginChange}
          placeholder={LOGIN_PLACEHOLDER}
          error={Boolean(errors.identifier)}
          helperText={errors.identifier}
        />
        <Input
          fullWidth
          ref={passwordRef}
          type={showPassword ? "text" : "password"}
          name={"password"}
          autoComplete={"current-password"}
          value={password}
          onChange={onPasswordChange}
          placeholder={PASSWORD_PLACEHOLDER}
          error={Boolean(errors.password)}
          helperText={errors.password}
          inputAdornment={
            <PasswordAdornment
              isShow={showPassword}
              onClick={onPasswordVisibleClick}
            />
          }
        />
        <Button
          isLoading={isProcessing}
          fullWidth
          variant={"contained"}
          type={"submit"}
        >
          {SIGN_IN_BTN_TEXT}
        </Button>
      </form>
      <SignInWith />
      <ActionBar />
    </div>
  );
}
