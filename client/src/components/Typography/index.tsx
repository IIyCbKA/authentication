import React from "react";
import { TypographyProps } from "./interface";
import styles from "./styles.module.scss";
import clsx from "clsx";

function TypographyInner(
  { variant = "h2", children, className, ...other }: TypographyProps,
  ref: React.ForwardedRef<HTMLHeadingElement>,
): React.ReactElement {
  const Tag = variant;

  return (
    <Tag ref={ref} className={clsx(styles.title, className)} {...other}>
      {children}
    </Tag>
  );
}

const Typography = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  TypographyInner,
);

export default Typography;
