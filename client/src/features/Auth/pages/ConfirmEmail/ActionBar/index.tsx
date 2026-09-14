import React from "react";
import styles from "./styles.module.scss";
import { Button } from "@/components";
import {
  CANCEL_BTN_TEXT,
  RESEND_AFTER_TEXT,
  RESEND_CODE_BTN_TEXT,
  RESEND_LOCK_SECONDS,
} from "./constants";
import { seconds2MinutesSeconds } from "@/shared/utils/time/formatDuration";
import { useAppDispatch } from "@/store/hooks";
import { logout, resendVerificationCode } from "@/domain/auth/thunks";
import { ActionBarProps } from "./interface.ts";

export default function ActionBar(props: ActionBarProps): React.ReactElement {
  const [secondsLeft, setSecondsLeft] =
    React.useState<number>(RESEND_LOCK_SECONDS);
  const [isProcessing, setProcessing] = React.useState<boolean>(false);
  const isDisabledResend: boolean = secondsLeft > 0;
  const dispatch = useAppDispatch();

  const onResendClick: () => Promise<void> = async (): Promise<void> => {
    setProcessing(true);

    try {
      await dispatch(resendVerificationCode()).unwrap();
      setSecondsLeft(RESEND_LOCK_SECONDS);
    } catch (e) {
      // The application notification listener displays the server error
    } finally {
      setProcessing(false);
    }
  };

  const onCancelClick: () => void = (): void => {
    dispatch(logout());
  };

  React.useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout((): void => {
      setSecondsLeft((prev: number): number => prev - 1);
    }, 1000);

    return (): void => clearTimeout(timer);
  }, [secondsLeft]);

  const resendBtnText: string =
    secondsLeft > 0
      ? `${RESEND_AFTER_TEXT} ${seconds2MinutesSeconds(secondsLeft)}`
      : RESEND_CODE_BTN_TEXT;

  return (
    <div className={styles.actionBarContainer}>
      <Button
        variant={"plain"}
        disabled={props.isDisabled}
        onClick={onCancelClick}
      >
        {CANCEL_BTN_TEXT}
      </Button>
      <Button
        isLoading={isProcessing}
        disabled={props.isDisabled || isDisabledResend}
        variant={"plain"}
        onClick={onResendClick}
      >
        {resendBtnText}
      </Button>
    </div>
  );
}
