import { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: "default" | "sky" | "matcha" | "peach";
  onRemove?: () => void;
  icon?: ReactNode;
}

const selectedClass: Record<string, string> = {
  default: styles.selected,
  sky: `${styles.selected} ${styles.toneSky}`,
  matcha: `${styles.selected} ${styles.toneMatcha}`,
  peach: `${styles.selected} ${styles.tonePeach}`,
};

export function Chip({
  selected = false,
  tone = "default",
  onRemove,
  icon,
  className = "",
  children,
  ...rest
}: ChipProps) {
  const classes = [
    styles.chip,
    selected ? selectedClass[tone] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classes} {...rest}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{children}</span>
      {onRemove ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="移除"
          className={styles.removeBtn}
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
        >
          ×
        </span>
      ) : null}
    </button>
  );
}

export default Chip;