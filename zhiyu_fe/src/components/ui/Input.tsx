import { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helper,
      error,
      required = false,
      iconLeft,
      iconRight,
      disabled,
      className = "",
      id,
      ...rest
    },
    ref,
  ) => {
    const autoId = id || `ui-input-${Math.random().toString(36).slice(2, 9)}`;
    const fieldClass = [
      styles.field,
      error ? styles.error : "",
      disabled ? styles.disabled : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={`${styles.wrapper} ${className}`}>
        {label ? (
          <label className={styles.label} htmlFor={autoId}>
            {label}
            {required ? <span className={styles.required}>*</span> : null}
          </label>
        ) : null}
        <div className={fieldClass}>
          {iconLeft ? <span className={styles.iconLeft}>{iconLeft}</span> : null}
          <input
            ref={ref}
            id={autoId}
            className={styles.input}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            {...rest}
          />
          {iconRight ? <span className={styles.iconRight}>{iconRight}</span> : null}
        </div>
        {error ? (
          <span className={styles.errorMsg}>{error}</span>
        ) : helper ? (
          <span className={styles.helper}>{helper}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;