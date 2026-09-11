import React from "react";
import styles from "./styles.module.scss";
import { ChevronDown, DefaultAvatar } from "@/assets/icons";
import ButtonsBlock from "./ButtonsBlock";
import { useAppSelector } from "@/store/hooks";
import { selectUsername } from "@/domain/auth/selectors";
import { Button, Dropdown, ClickAwayListener } from "@/components";
import { useLocation } from "react-router-dom";

export default function MenuDropdown(): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const username = useAppSelector(selectUsername);
  const location = useLocation();

  const onAvatarClick: () => void = (): void => {
    setIsOpen((prev: boolean): boolean => !prev);
  };

  const onCloseMenu: () => void = (): void => {
    setIsOpen(false);
  };

  React.useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <ClickAwayListener<HTMLDivElement> onClickAway={onCloseMenu}>
      {(ref: React.Ref<HTMLDivElement>): React.ReactElement => (
        <div className={styles.rootContainer} ref={ref}>
          <Button
            variant={"plain"}
            className={styles.dropdownToggle}
            onClick={onAvatarClick}
            endIcon={{
              content: (
                <span className={styles.toggleEndIconContainer}>
                  <DefaultAvatar />
                  <ChevronDown className={styles.dropdownChevron} />
                </span>
              ),
            }}
          >
            {username}
          </Button>
          <Dropdown isOpen={isOpen} className={styles.dropdownContent}>
            <ButtonsBlock />
          </Dropdown>
        </div>
      )}
    </ClickAwayListener>
  );
}
