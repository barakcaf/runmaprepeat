import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClassMap: Record<BadgeVariant, string> = {
  default: styles.default,
  success: styles.success,
  warning: styles.warning,
  error: styles.error,
  info: styles.info,
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${variantClassMap[variant]}`}>
      {children}
    </span>
  );
}
