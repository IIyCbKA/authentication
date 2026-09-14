import React from "react";
import styles from "./styles.module.scss";
import { INPUT_ELEMENTS, SIGN_UP_BUTTON_TEXT, TITLE_SCREEN } from "./constants";
import { EMPTY_STRING } from "@/shared/config/constants";
import ActionBar from "./ActionBar";
import SignInWith from "@/features/Auth/shared/SignInWith";
import type { ErrorsMap, FormData } from "./types";
import { registerUser } from "@/domain/auth/thunks";
import { useAppDispatch } from "@/store/hooks";
import { Input, Button, Typography } from "@/components";
import PasswordAdornment from "@/features/Auth/shared/PasswordAdornment";
import {
  validateEmail,
  validateNonEmpty,
  validatePassword,
  validatePasswordConfirmation,
} from "@/domain/auth/validators";

export default function SignUp(): React.ReactElement {
  const [isProcessing, setProcessing] = React.useState<boolean>(false);
  const [form, setForm] = React.useState<FormData>({
    username: EMPTY_STRING,
    password: EMPTY_STRING,
    passwordConfirmation: EMPTY_STRING,
    email: EMPTY_STRING,
  });
  const [errors, setErrors] = React.useState<ErrorsMap>({});
  const usernameRef = React.useRef<HTMLInputElement | null>(null);
  const passwordRef = React.useRef<HTMLInputElement | null>(null);
  const passwordConfirmationRef = React.useRef<HTMLInputElement | null>(null);
  const emailRef = React.useRef<HTMLInputElement | null>(null);

  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    React.useState<boolean>(false);

  const onPasswordVisibilityClick: () => void = (): void => {
    setShowPassword((prev: boolean): boolean => !prev);
  };

  const onPasswordConfirmationVisibilityClick: () => void = (): void => {
    setShowPasswordConfirmation((prev: boolean): boolean => !prev);
  };

  const onChangeData: (e: React.ChangeEvent<HTMLInputElement>) => void =
    React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
      const { name, value } = e.target;
      setForm((prev: FormData) => ({ ...prev, [name]: value }));
      setErrors((prev: ErrorsMap) => ({ ...prev, [name]: undefined }));
    }, []);

  const focusFirstError: (errs: ErrorsMap) => void = (
    errs: ErrorsMap,
  ): void => {
    if (errs.username) usernameRef.current?.focus();
    else if (errs.password) passwordRef.current?.focus();
    else if (errs.passwordConfirmation)
      passwordConfirmationRef.current?.focus();
    else if (errs.email) emailRef.current?.focus();
  };

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (
    e,
  ): Promise<void> => {
    e.preventDefault();

    const newErrors: ErrorsMap = {
      username: validateNonEmpty(form.username),
      password: validatePassword(form.password),
      passwordConfirmation: validatePasswordConfirmation(
        form.password,
        form.passwordConfirmation,
      ),
      email: validateEmail(form.email),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      focusFirstError(newErrors);
      return;
    }

    setProcessing(true);
    try {
      await dispatch(
        registerUser({
          username: form.username,
          password: form.password,
          email: form.email,
        }),
      ).unwrap();
    } catch (e) {
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={styles.rootContainer}>
      <Typography>{TITLE_SCREEN}</Typography>
      <form className={styles.formContainer} onSubmit={onSubmit} noValidate>
        <Input
          fullWidth
          ref={usernameRef}
          autoComplete={"username"}
          placeholder={INPUT_ELEMENTS.username.placeholder}
          name={INPUT_ELEMENTS.username.name}
          value={form.username}
          onChange={onChangeData}
          error={Boolean(errors.username)}
          helperText={errors.username}
        />
        <Input
          fullWidth
          ref={passwordRef}
          autoComplete={"new-password"}
          type={showPassword ? "text" : "password"}
          placeholder={INPUT_ELEMENTS.password.placeholder}
          name={INPUT_ELEMENTS.password.name}
          value={form.password}
          onChange={onChangeData}
          error={Boolean(errors.password)}
          helperText={errors.password}
          inputAdornment={
            <PasswordAdornment
              isShow={showPassword}
              onClick={onPasswordVisibilityClick}
            />
          }
        />
        <Input
          fullWidth
          ref={passwordConfirmationRef}
          autoComplete={"new-password"}
          type={showPasswordConfirmation ? "text" : "password"}
          placeholder={INPUT_ELEMENTS.passwordConfirmation.placeholder}
          name={INPUT_ELEMENTS.passwordConfirmation.name}
          value={form.passwordConfirmation}
          onChange={onChangeData}
          error={Boolean(errors.passwordConfirmation)}
          helperText={errors.passwordConfirmation}
          inputAdornment={
            <PasswordAdornment
              isShow={showPasswordConfirmation}
              onClick={onPasswordConfirmationVisibilityClick}
            />
          }
        />
        <Input
          fullWidth
          ref={emailRef}
          autoComplete={"email"}
          type={"email"}
          placeholder={INPUT_ELEMENTS.email.placeholder}
          name={INPUT_ELEMENTS.email.name}
          value={form.email}
          onChange={onChangeData}
          error={Boolean(errors.email)}
          helperText={errors.email}
        />
        <Button
          isLoading={isProcessing}
          fullWidth
          variant={"contained"}
          type={"submit"}
        >
          {SIGN_UP_BUTTON_TEXT}
        </Button>
      </form>
      <SignInWith />
      <ActionBar />
    </div>
  );
}
