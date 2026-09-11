import React from "react";
import { Button } from "@/components";
import sharedDrawerStyles from "@/layouts/AuthVerifiedLayout/Header/MenuDrawer/styles.module.scss";
import { SETTINGS_BUTTON_TEXT, SIGN_OUT_BUTTON_TEXT } from "./constants";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/domain/auth/thunks";
import { Logout, Settings } from "@/assets/icons";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";

export default function ServiceBlock(): React.ReactElement {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const toSettings: () => void = (): void => {
    navigate(PATHS.ACCOUNT);
  };

  const onSignOut: () => void = (): void => {
    dispatch(logout());
  };

  return (
    <div className={sharedDrawerStyles.blockContainer}>
      <Button
        fullWidth
        variant={"plain"}
        className={sharedDrawerStyles.defaultBlockButton}
        startIcon={{ content: <Settings /> }}
        onClick={toSettings}
      >
        {SETTINGS_BUTTON_TEXT}
      </Button>
      <Button
        fullWidth
        variant={"plain"}
        className={sharedDrawerStyles.defaultBlockButton}
        startIcon={{ content: <Logout /> }}
        onClick={onSignOut}
      >
        {SIGN_OUT_BUTTON_TEXT}
      </Button>
    </div>
  );
}
