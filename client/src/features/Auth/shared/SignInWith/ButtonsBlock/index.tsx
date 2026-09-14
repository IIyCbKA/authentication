import React from "react";
import styles from "./styles.module.scss";
import { IconButton } from "@/components";
import { ELEMENTS_LIST } from "./constants";
import type { ButtonElement } from "./types";
import { getOAuthLoginUrl } from "@/domain/auth/api";

export default function ButtonsBlock(): React.ReactElement {
  return (
    <div className={styles.buttonsBlockContainer}>
      {ELEMENTS_LIST.map(
        (
          { icon: Icon, provider, ...other }: ButtonElement,
          index: number,
        ): React.ReactElement => {
          const onClick = () => {
            window.location.href = getOAuthLoginUrl(
              provider,
              window.location.href,
            );
          };

          return (
            <IconButton
              key={index}
              className={styles.buttonContainer}
              onClick={onClick}
              {...other}
            >
              <Icon />
            </IconButton>
          );
        },
      )}
    </div>
  );
}
