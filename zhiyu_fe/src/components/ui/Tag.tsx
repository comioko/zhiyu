import { HTMLAttributes, ReactNode } from "react";
import styles from "./Tag.module.css";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "sky" | "matcha" | "peach" | "warning" | "muted" | "outline";
  clickable?: boolean;
  onRemove?: () => void;
  icon?: ReactNode;
}

const variantClass = {
  default: "",
  sky: styles.sky,
  matcha: styles.matcha,
  peach: styles.peach,
  warning: styles.warning,
  muted: styles.muted,
  outline: styles.outline,
};

export function Tag({
  variant = "default",
  clickable = false,
  onRemove,
  icon,
  className = "",
  children,
  onClick,
  ...rest
}: TagProps) {
  const classes = [
    styles.tag,
    variantClass[variant],
    clickable ? styles.clickable : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} onClick={onClick} {...rest}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          className={styles.removeBtn}
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="移除"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

export default Tag;