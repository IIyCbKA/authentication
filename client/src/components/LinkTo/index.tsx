import React, { ForwardedRef } from "react";
import { Link } from "react-router-dom";
import { LinkToProps } from "./interface";
import styles from "./styles.module.scss";
import clsx from "clsx";

function LinkToInner(
  { className, ...other }: LinkToProps,
  ref: ForwardedRef<HTMLAnchorElement>,
): React.ReactElement {
  return (
    <Link {...other} ref={ref} className={clsx(styles.linkToRoot, className)} />
  );
}

const LinkTo = React.forwardRef<HTMLAnchorElement, LinkToProps>(LinkToInner);

export default LinkTo;
