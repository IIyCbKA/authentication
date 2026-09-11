import React from "react";
import styles from "./styles.module.scss";
import sharedAuthStyles from "@/features/Auth/shared/styles.module.scss";
import {
  HAVE_AN_ACCOUNT_QUESTION,
  ROOT_TEXT,
  TITLE_SCREEN,
  TO_SIGN_IN_BUTTON_TEXT,
} from "./constants";
import clsx from "clsx";
import { PATHS } from "@/routes/paths";
import { LinkTo, Typography } from "@/components";

export default function ForgotPasswordSent(): React.ReactElement {
  const questionContainerStyles = clsx(
    sharedAuthStyles.actionBarContainer,
    styles.questionContainer,
  );

  return (
    <div className={sharedAuthStyles.rootContainer}>
      <Typography>{TITLE_SCREEN}</Typography>
      <div className={sharedAuthStyles.formContainer}>
        <span className={styles.rootText}>{ROOT_TEXT}</span>
      </div>
      <div className={questionContainerStyles}>
        <span className={sharedAuthStyles.actionBarQuestionWrap}>
          {HAVE_AN_ACCOUNT_QUESTION}
        </span>
        <LinkTo to={PATHS.SIGN_IN}>{TO_SIGN_IN_BUTTON_TEXT}</LinkTo>
      </div>
    </div>
  );
}
