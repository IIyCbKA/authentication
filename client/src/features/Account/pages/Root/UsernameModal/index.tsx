import React from "react";
import styles from "./styles.module.scss";
import { UsernameModalProps } from "./interface";
import { Button, Input, Modal, Typography } from "@/components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usernameUpdate } from "@/domain/auth/thunks";
import { selectUsername } from "@/domain/auth/selectors";
import {
  CONTINUE_BUTTON_TEXT,
  MODAL_TITLE,
  NEW_USERNAME_PLACEHOLDER,
  NOTE,
} from "./constants";
import { EMPTY_STRING } from "@/shared/config/constants";
import { validateNonEmpty } from "@/domain/auth/validators";

export default function UsernameModal({
  isOpen,
  onClose,
}: UsernameModalProps): React.ReactElement {
  const username = useAppSelector(selectUsername);
  const dispatch = useAppDispatch();
  const [newUsername, setNewUsername] = React.useState<string>(EMPTY_STRING);
  const [isProcessing, setProcessing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const newUsernameRef = React.useRef<HTMLInputElement | null>(null);

  const onNewUsernameChange: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewUsername(e.target.value);
    if (error) setError(undefined);
  };

  const onExited: () => void = (): void => {
    setNewUsername(EMPTY_STRING);
    setError(undefined);
  };

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (
    e,
  ): Promise<void> => {
    e.preventDefault();

    const validation = validateNonEmpty(newUsername);
    setError(validation);
    if (validation) {
      newUsernameRef.current?.focus();
      return;
    }

    setProcessing(true);
    try {
      await dispatch(usernameUpdate({ username: newUsername })).unwrap();
      onClose();
    } catch (e) {
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExited={onExited}
      withCloseButton
    >
      <Typography variant={"h1"}>{MODAL_TITLE}</Typography>
      <form className={styles.modalContent} onSubmit={onSubmit} noValidate>
        <Input fullWidth disabled onlyDisabled value={username} />
        <Input
          autoFocus
          fullWidth
          ref={newUsernameRef}
          name={"newUsername"}
          autoComplete={"username"}
          value={newUsername}
          onChange={onNewUsernameChange}
          placeholder={NEW_USERNAME_PLACEHOLDER}
          error={Boolean(error)}
          helperText={error}
        />
        <Button
          fullWidth
          type={"submit"}
          variant={"contained"}
          isLoading={isProcessing}
        >
          {CONTINUE_BUTTON_TEXT}
        </Button>
      </form>
      <span className={styles.note}>{NOTE}</span>
    </Modal>
  );
}
