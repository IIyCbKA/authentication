import React from "react";
import { LinearProgressProps } from "./interface";
import styles from "./styles.module.scss";
import clsx from "clsx";

function LinearProgressInner(
  { value, className, ...other }: LinearProgressProps,
  ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactElement {
  const progressTransform = {
    transform: `scaleX(${value / 100})`,
  } as React.CSSProperties;

  return (
    <div ref={ref} className={clsx(styles.container, className)} {...other}>
      <div className={styles.progress} style={progressTransform} />
    </div>
  );
}

const LinearProgress = React.forwardRef<HTMLDivElement, LinearProgressProps>(
  LinearProgressInner,
);

export default LinearProgress;
