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

  return (
    <div className={styles.headerRoot}>
      <DefaultAvatar className={styles.avatar} />
      <div className={styles.description}>
        <span className={clsx(styles.username, baseStyles.truncateText)}>
          {username}
        </span>
        <span className={clsx(styles.email, baseStyles.truncateText)}>
          {email}
        </span>
      </div>
    </div>
  );
}
