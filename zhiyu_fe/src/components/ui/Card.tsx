import { HTMLAttributes, forwardRef } from "react";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "selected" | "translucent" | "warning";
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const variantClass = {
  default: "",
  flat: styles.flat,
  selected: styles.selected,
  translucent: styles.translucent,
  warning: styles.warning,
};

const paddingClass = {
  none: styles["padding-none"],
  sm: styles["padding-sm"],
  md: "",
  lg: styles["padding-lg"],
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = "default", padding = "md", interactive = false, className = "", children, ...rest },
    ref,
  ) => {
    const classes = [
      styles.card,
      variantClass[variant],
      paddingClass[padding],
      interactive ? styles.interactive : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={classes} {...rest}>
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
export default Card;