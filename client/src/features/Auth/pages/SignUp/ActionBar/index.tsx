import React from "react";
import styles from "./styles.module.scss";
import { HAVE_AN_ACCOUNT_QUESTION, TO_SIGN_IN_BUTTON_TEXT } from "./constants";
import { LinkTo } from "@/components";
import { PATHS } from "@/routes/paths";

export default function ActionBar(): React.ReactElement {
  return (
    <div className={styles.container}>
      <span className={styles.actionBarQuestionWrap}>
        {HAVE_AN_ACCOUNT_QUESTION}
      </span>
      <LinkTo to={PATHS.SIGN_IN}>{TO_SIGN_IN_BUTTON_TEXT}</LinkTo>
    </div>
  );
}
