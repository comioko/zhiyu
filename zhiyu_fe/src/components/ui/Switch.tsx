import { ReactNode } from "react";
import styles from "./Switch.module.css";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  id,
}: SwitchProps) {
  const autoId = id || `ui-switch-${Math.random().toString(36).slice(2, 9)}`;

  const inner = (
    <span className={styles.switch}>
      <input
        id={autoId}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className={styles.track} />
      <span className={styles.thumb} />
    </span>
  );

  if (!label) return inner;

  return (
    <label
      className={`${styles.label} ${disabled ? styles.disabled : ""}`}
      htmlFor={autoId}
    >
      {inner}
      <span>{label}</span>
    </label>
  );
}

export default Switch;