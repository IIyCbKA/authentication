import React from "react";
import styles from "./styles.module.scss";
import { Circle } from "@/assets/icons";
import { CircularProgressProps } from "./interface";
import clsx from "clsx";

function CircularProgressInner(
  { className, ...other }: CircularProgressProps,
  ref: React.ForwardedRef<HTMLSpanElement>,
): React.ReactElement {
  return (
    <span
      ref={ref}
      {...other}
      className={clsx(styles.circularProgressWrap, className)}
    >
      <Circle className={styles.circularProgressRoot} />
    </span>
  );
}

const CircularProgress = React.forwardRef<
  HTMLSpanElement,
  CircularProgressProps
>(CircularProgressInner);

export default CircularProgress;
