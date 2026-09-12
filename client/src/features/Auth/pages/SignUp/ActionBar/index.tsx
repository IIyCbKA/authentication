import React from "react";
import styles from "./styles.module.scss";
import sharedAuthStyles from "@/features/Auth/shared/styles.module.scss";
import { HAVE_AN_ACCOUNT_QUESTION, TO_SIGN_IN_BUTTON_TEXT } from "./constants";
import clsx from "clsx";
import { LinkTo } from "@/components";
import { PATHS } from "@/routes/paths";

export default function ActionBar(): React.ReactElement {
  return (
    <div
      className={clsx(sharedAuthStyles.actionBarContainer, styles.container)}
    >
      <span className={sharedAuthStyles.actionBarQuestionWrap}>
        {HAVE_AN_ACCOUNT_QUESTION}
      </span>
      <LinkTo to={PATHS.SIGN_IN}>{TO_SIGN_IN_BUTTON_TEXT}</LinkTo>
    </div>
  );
}
