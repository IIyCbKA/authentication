import React from "react";
import styles from "./styles.module.scss";
import {
  CHANGE_BUTTON_TEXT,
  TITLE_SCREEN,
  USERNAME_ROW_TITLE,
} from "./constants";
import ControlRow from "@/features/Account/components/ControlRow";
import { User } from "@/assets/icons";
import { useAppSelector } from "@/store/hooks";
import { selectUsername } from "@/domain/auth/selectors";
import UsernameModal from "./UsernameModal";

export default function RootAccount(): React.ReactElement {
  const username = useAppSelector(selectUsername);
  const [isUsernameOpen, setUsernameOpen] = React.useState(false);

  return (
    <>
      <span className={styles.title}>{TITLE_SCREEN}</span>
      <ControlRow
        title={USERNAME_ROW_TITLE}
        info={username}
        iconProps={{ children: <User /> }}
        buttonProps={{
          children: CHANGE_BUTTON_TEXT,
          onClick: (): void => setUsernameOpen(true),
        }}
      />
      <UsernameModal
        isOpen={isUsernameOpen}
        onClose={(): void => setUsernameOpen(false)}
      />
    </>
  );
}
