import React from "react";
import styles from "./styles.module.scss";
import {
  HAVE_AN_ACCOUNT_QUESTION,
  ROOT_TEXT,
  TITLE_SCREEN,
  TO_SIGN_IN_BUTTON_TEXT,
} from "./constants";
import { PATHS } from "@/routes/paths";
import { LinkTo, Typography } from "@/components";

export default function ForgotPasswordSent(): React.ReactElement {
  return (
    <div className={styles.rootContainer}>
      <Typography>{TITLE_SCREEN}</Typography>
      <div className={styles.formContainer}>
        <span className={styles.rootText}>{ROOT_TEXT}</span>
      </div>
      <div className={styles.questionContainer}>
        <span className={styles.actionBarQuestionWrap}>
          {HAVE_AN_ACCOUNT_QUESTION}
        </span>
        <LinkTo to={PATHS.SIGN_IN}>{TO_SIGN_IN_BUTTON_TEXT}</LinkTo>
      </div>
    </div>
  );
}
