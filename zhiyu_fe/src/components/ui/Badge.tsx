import { HTMLAttributes, ReactNode } from "react";
import styles from "./Badge.module.css";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "sky" | "matcha" | "peach" | "warning" | "cocoa" | "outline";
  size?: "sm" | "md" | "lg";
  shape?: "pill" | "round";
  icon?: ReactNode;
}

const toneClass: Record<string, string> = {
  default: "",
  sky: styles.toneSky,
  matcha: styles.toneMatcha,
  peach: styles.tonePeach,
  warning: styles.toneWarning,
  cocoa: styles.toneCocoa,
  outline: styles.toneOutline,
};

const sizeClass: Record<string, string> = {
  sm: styles.sizeSm,
  md: "",
  lg: styles.sizeLg,
};

export function Badge({
  tone = "default",
  size = "md",
  shape = "pill",
  icon,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  const classes = [
    styles.badge,
    toneClass[tone],
    sizeClass[size],
    shape === "round" ? styles.round : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}

export default Badge;