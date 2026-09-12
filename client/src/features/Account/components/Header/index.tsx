import React from "react";
import styles from "./styles.module.scss";
import { DefaultAvatar } from "@/assets/icons";
import { useAppSelector } from "@/store/hooks";
import { selectEmail, selectUsername } from "@/domain/auth/selectors";

export default function Header(): React.ReactElement {
  const username = useAppSelector(selectUsername);
  const email = useAppSelector(selectEmail);

  return (
    <div className={styles.headerRoot}>
      <DefaultAvatar className={styles.avatar} />
      <div className={styles.description}>
        <span className={styles.username}>{username}</span>
        <span className={styles.email}>{email}</span>
      </div>
    </div>
  );
}
