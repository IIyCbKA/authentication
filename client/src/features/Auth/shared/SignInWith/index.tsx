import React from "react";
import styles from "./styles.module.scss";
import ButtonsBlock from "./ButtonsBlock";
import { TITLE_TEXT } from "./constants";

export default function SignInWith(): React.ReactElement {
  return (
    <div className={styles.signInWithContainer}>
      <span className={styles.titleRoot}>{TITLE_TEXT}</span>
      <ButtonsBlock />
    </div>
  );
}
