import React from "react";
import { Outlet, useNavigation } from "react-router-dom";
import styles from "./styles.module.scss";
import { LoadingOverlay } from "@/components";

export default function RootLayout(): React.ReactElement {
  const nav = useNavigation();
  const pending = nav.state !== "idle";

  return (
    <div className={styles.rootContainer}>
      {pending && <LoadingOverlay />}
      <Outlet />
    </div>
  );
}
