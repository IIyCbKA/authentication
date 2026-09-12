import React from "react";
import styles from "./styles.module.scss";
import { EMPTY_STRING } from "@/shared/config/constants";
import {
  RECOVER_PASSWORD_BTN_TEXT,
  EMAIL_PLACEHOLDER,
  TITLE_SCREEN,
} from "./constants";
import ActionBar from "./ActionBar";
import { useAppDispatch } from "@/store/hooks";
import { passwordResetRequest } from "@/domain/auth/thunks";
import { Button, Input, Typography } from "@/components";
import { validateEmail } from "@/domain/auth/validators";

export default function ForgotPassword(): React.ReactElement {
  const dispatch = useAppDispatch();
  const [email, setEmail] = React.useState<string>(EMPTY_STRING);
  const [isProcessing, setProcessing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const emailRef = React.useRef<HTMLInputElement | null>(null);

  const onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setEmail(e.target.value);
    if (error) setError(undefined);
  };

  const onSubmit: (e: React.FormEvent) => void = async (
    e: React.FormEvent,
  ): Promise<void> => {
    e.preventDefault();

    const newError: string | undefined = validateEmail(email);

    setError(newError);

    if (newError) {
      emailRef.current?.focus();
      return;
    }

    setProcessing(true);
    try {
      await dispatch(passwordResetRequest({ email })).unwrap();
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
          ref={emailRef}
          name={"email"}
          autoComplete={"email"}
          value={email}
          onChange={onEmailChange}
          placeholder={EMAIL_PLACEHOLDER}
          error={Boolean(error)}
          helperText={error}
        />
        <Button
          isLoading={isProcessing}
          fullWidth
          variant={"contained"}
          type={"submit"}
        >
          {RECOVER_PASSWORD_BTN_TEXT}
        </Button>
      </form>
      <ActionBar />
    </div>
  );
}
