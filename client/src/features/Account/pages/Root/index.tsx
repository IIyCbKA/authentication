import React from "react";
import styles from "./styles.module.scss";
import {
  CHANGE_BUTTON_TEXT,
  TITLE_SCREEN,
  USERNAME_ROW_TITLE,
} from "./constants";
import ControlRow from "@/features/Account/components/ControlRow";
import { Delete, User, Reset } from "@/assets/icons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUsername } from "@/domain/auth/selectors";
import UsernameModal from "./UsernameModal";
import { fetchCurrentAccount, deleteAccount } from "@/domain/auth/thunks.ts";

export default function RootAccount(): React.ReactElement {
  const username = useAppSelector(selectUsername);
  const [isUsernameOpen, setUsernameOpen] = React.useState(false);
  const [isProcessing, setProcessing] = React.useState<boolean>(false);
  const dispatch = useAppDispatch();

  const onUpdate = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    setProcessing(true);
    try {
      await dispatch(fetchCurrentAccount()).unwrap();
    } catch (e) {
    } finally {
      setProcessing(false);
    }
  };

  const onDelete = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    setProcessing(true);
    try {
      await dispatch(deleteAccount()).unwrap();
    } catch (e) {
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <span className={styles.title}>{TITLE_SCREEN}</span>
      <ControlRow
        title={"Data"}
        info={"Update data about this account"}
        iconProps={{ children: <Reset /> }}
        buttonProps={{
          children: "Update",
          onClick: onUpdate,
          disabled: isProcessing,
          className: styles.accountButton,
        }}
      />
      <ControlRow
        title={USERNAME_ROW_TITLE}
        info={username}
        iconProps={{ children: <User /> }}
        buttonProps={{
          children: CHANGE_BUTTON_TEXT,
          onClick: (): void => setUsernameOpen(true),
          disabled: isProcessing,
          className: styles.accountButton,
        }}
      />
      <ControlRow
        title={"Account"}
        info={"Delete this account"}
        iconProps={{ children: <Delete /> }}
        buttonProps={{
          children: "Delete",
          onClick: onDelete,
          disabled: isProcessing,
          className: styles.accountButton,
        }}
      />
      <UsernameModal
        isOpen={isUsernameOpen}
        onClose={(): void => setUsernameOpen(false)}
      />
    </>
  );
}
