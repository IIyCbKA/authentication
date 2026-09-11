import React from "react";
import styles from "./styles.module.scss";
import MenuDropdown from "./MenuDropdown";
import MenuDrawer from "./MenuDrawer";
import { PATHS } from "@/routes/paths";
import { Link } from "react-router-dom";
import { Logotype } from "@/assets/icons";

export default function Header(): React.ReactElement {
  return (
    <div className={styles.navbarRoot}>
      <div className={styles.headerContainer}>
        <div className={styles.headerContent}>
          <Link to={PATHS.DASHBOARD} className={styles.logotypeWrap}>
            <Logotype className={styles.logotypeImg} />
          </Link>
          <MenuDropdown />
          <MenuDrawer />
        </div>
      </div>
      <div className={styles.headerSpace} aria-hidden={"true"} />
    </div>
  );
}
