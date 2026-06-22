import { TextareaHTMLAttributes, forwardRef } from "react";
import styles from "./Textarea.module.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helper,
      error,
      required = false,
      maxLength,
      showCount = false,
      disabled,
      className = "",
      id,
      value,
      ...rest
    },
    ref,
  ) => {
    const autoId = id || `ui-textarea-${Math.random().toString(36).slice(2, 9)}`;
    const fieldClass = [
      styles.field,
      error ? styles.error : "",
      disabled ? styles.disabled : "",
    ]
      .filter(Boolean)
      .join(" ");

    const length = typeof value === "string" ? value.length : 0;
    const isOver = typeof maxLength === "number" && length > maxLength;

    return (
      <div className={`${styles.wrapper} ${className}`}>
        {label ? (
          <label className={styles.label} htmlFor={autoId}>
            {label}
            {required ? <span className={styles.required}>*</span> : null}
          </label>
        ) : null}
        <div className={fieldClass}>
          <textarea
            ref={ref}
            id={autoId}
            className={styles.textarea}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            aria-invalid={error ? "true" : undefined}
            {...rest}
          />
        </div>
        <div className={styles.footer}>
          {error ? (
            <span className={styles.errorMsg}>{error}</span>
          ) : helper ? (
            <span className={styles.helper}>{helper}</span>
          ) : (
            <span />
          )}
          {showCount && maxLength ? (
            <span className={`${styles.count} ${isOver ? styles.countOver : ""}`}>
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;