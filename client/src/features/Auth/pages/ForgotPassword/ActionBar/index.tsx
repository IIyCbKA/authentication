import React from "react";
import styles from "./styles.module.scss";
import sharedAuthStyles from "@/features/Auth/shared/styles.module.scss";
import { TO_SIGN_IN_BUTTON_TEXT, HAVE_AN_ACCOUNT_QUESTION } from "./constants";
import clsx from "clsx";
import { LinkTo } from "@/components";
import { PATHS } from "@/routes/paths";

export default function ActionBar(): React.ReactElement {
  const containerStyles = clsx(
    sharedAuthStyles.actionBarContainer,
    styles.container,
  );

  return (
    <div className={containerStyles}>
      <span className={sharedAuthStyles.actionBarQuestionWrap}>
        {HAVE_AN_ACCOUNT_QUESTION}
      </span>
      <LinkTo to={PATHS.SIGN_IN}>{TO_SIGN_IN_BUTTON_TEXT}</LinkTo>
    </div>
  );
}
