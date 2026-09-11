import React from "react";
import { useAppSelector } from "@/store/hooks";
import { selectUsername } from "@/domain/auth/selectors";
import sharedDrawerStyles from "@/layouts/AuthVerifiedLayout/Header/MenuDrawer/styles.module.scss";
import { DefaultAvatar } from "@/assets/icons";
import { Button } from "@/components";

export default function RootBlock(): React.ReactElement {
  const username = useAppSelector(selectUsername);

  return (
    <div className={sharedDrawerStyles.blockContainer}>
      <Button
        variant={"plain"}
        className={sharedDrawerStyles.defaultBlockButton}
        startIcon={{ content: <DefaultAvatar /> }}
      >
        {username}
      </Button>
    </div>
  );
}
