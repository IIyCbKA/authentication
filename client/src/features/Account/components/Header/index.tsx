import React from "react";
import styles from "./styles.module.scss";
import baseStyles from "@/shared/styles/base.module.scss";
import { DefaultAvatar } from "@/assets/icons";
import { useAppSelector } from "@/store/hooks";
import { selectEmail, selectUsername } from "@/domain/auth/selectors";
import clsx from "clsx";

export default function Header(): React.ReactElement {
  const username = useAppSelector(selectUsername);
  const email = useAppSelector(selectEmail);

  const usernameStyles = clsx(styles.username, baseStyles.truncateText);
  const emailStyles = clsx(styles.email, baseStyles.truncateText);

  return (
    <div className={styles.headerRoot}>
      <DefaultAvatar className={styles.avatar} />
      <div className={styles.description}>
        <span className={usernameStyles}>{username}</span>
        <span className={emailStyles}>{email}</span>
      </div>
    </div>
  );
}
