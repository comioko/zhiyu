import { ButtonHTMLAttributes, forwardRef } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "matcha" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  matcha: styles.matcha,
  ghost: styles.ghost,
  danger: styles.danger,
};

const sizeClass: Record<Size, string> = {
  sm: styles["size-sm"],
  md: styles["size-md"],
  lg: styles["size-lg"],
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      styles.button,
      variantClass[variant],
      sizeClass[size],
      fullWidth ? styles.full : "",
      loading ? styles.loading : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? <span className={styles.spinner} aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;