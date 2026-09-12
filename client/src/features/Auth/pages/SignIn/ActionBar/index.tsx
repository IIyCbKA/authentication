import React from "react";
import styles from "./styles.module.scss";
import { FORGOT_PASSWORD_TEXT, SIGN_UP_TEXT } from "./constants";
import { LinkTo } from "@/components";
import { PATHS } from "@/routes/paths";

export default function ActionBar(): React.ReactElement {
  return (
    <div className={styles.actionBarContainer}>
      <LinkTo to={PATHS.PASSWORD_FORGOT}>{FORGOT_PASSWORD_TEXT}</LinkTo>
      <LinkTo to={PATHS.SIGN_UP}>{SIGN_UP_TEXT}</LinkTo>
    </div>
  );
}
