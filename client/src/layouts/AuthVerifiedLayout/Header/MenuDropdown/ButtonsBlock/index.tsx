import React from "react";
import styles from "./styles.module.scss";
import {
  PATTERN_BUTTON_TEXT,
  SETTINGS_BUTTON_TEXT,
  SIGN_OUT_BUTTON_TEXT,
} from "./constants";
import { Button } from "@/components";
import { logout } from "@/domain/auth/thunks";
import { useAppDispatch } from "@/store/hooks";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";

export default function ButtonsBlock(): React.ReactElement {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const toSettings: () => void = (): void => {
    navigate(PATHS.ACCOUNT);
  };

  const onSignOut: () => void = (): void => {
    dispatch(logout());
  };

  return (
    <>
      <Button fullWidth disabled className={styles.defaultButton}>
        {PATTERN_BUTTON_TEXT}
      </Button>
      <Button fullWidth disabled className={styles.defaultButton}>
        {PATTERN_BUTTON_TEXT}
      </Button>
      <Button fullWidth className={styles.defaultButton} onClick={toSettings}>
        {SETTINGS_BUTTON_TEXT}
      </Button>
      <Button
        fullWidth
        className={clsx(styles.defaultButton, styles.logoutButton)}
        onClick={onSignOut}
      >
        {SIGN_OUT_BUTTON_TEXT}
      </Button>
    </>
  );
}
