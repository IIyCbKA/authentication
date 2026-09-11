import React from "react";
import { Button } from "@/components";
import sharedDrawerStyles from "@/layouts/AuthVerifiedLayout/Header/MenuDrawer/styles.module.scss";
import { PATTERN_BUTTON_TEXT } from "./constants";
import { Grid } from "@/assets/icons";

export default function NavigationBlock(): React.ReactElement {
  return (
    <div className={sharedDrawerStyles.blockContainer}>
      <Button
        fullWidth
        disabled
        variant={"plain"}
        className={sharedDrawerStyles.defaultBlockButton}
        startIcon={{ content: <Grid /> }}
      >
        {PATTERN_BUTTON_TEXT}
      </Button>
      <Button
        fullWidth
        disabled
        variant={"plain"}
        className={sharedDrawerStyles.defaultBlockButton}
        startIcon={{ content: <Grid /> }}
      >
        {PATTERN_BUTTON_TEXT}
      </Button>
    </div>
  );
}
