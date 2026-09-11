import React from "react";
import styles from "./styles.module.scss";
import Header from "./components/Header";
import { Outlet } from "react-router-dom";
import { Divider } from "@/components";

export default function AccountLayout(): React.ReactElement {
  return (
    <div className={styles.accountContentWrap}>
      <div className={styles.accountContent}>
        <Header />
        <Divider className={styles.contentDivider} />
        <Outlet />
      </div>
    </div>
  );
}
