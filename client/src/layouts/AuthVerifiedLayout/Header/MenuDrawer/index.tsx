import React from "react";
import styles from "./styles.module.scss";
import { Drawer, ToggleMenu } from "@/components";
import RootBlock from "./RootBlock";
import NavigationBlock from "./NavigationBlock";
import ServiceBlock from "./ServiceBlock";
import { useLocation } from "react-router-dom";

export default function MenuDrawer(): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const onToggleClick: () => void = (): void => {
    setIsOpen((prev: boolean): boolean => !prev);
  };

  React.useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.rootContainer}>
      <ToggleMenu isOverlay isOpen={isOpen} onClick={onToggleClick} />
      <Drawer className={styles.drawerContent} isOpen={isOpen}>
        <RootBlock />
        <NavigationBlock />
        <ServiceBlock />
      </Drawer>
    </div>
  );
}
