import styles from "./Badge.module.css";

interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: "default" | "success" | "warning" | "error" | "info";
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * Badge displays an inline status indicator with semantic colors.
 * Small pill shape for compact display of status, counts, or labels.
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error">Failed</Badge>
 * <Badge variant="warning">Pending</Badge>
 *
 * WCAG 2.2 Criteria:
 * - 1.4.1 Use of Color (Level A) - text provides meaning, not just color
 * - 1.4.3 Contrast (Minimum) (Level AA) - 4.5:1 contrast for text
 * - 1.4.11 Non-text Contrast (Level AA) - 3:1 contrast for UI components
 *
 * Nielsen Heuristics:
 * - #4 Consistency and standards - color conventions match semantic meaning
 * - #8 Aesthetic and minimalist design - compact, focused display
 */
export function Badge({
  children,
  variant = "default",
  "data-testid": testId = "badge",
}: BadgeProps) {
  const variantClass = {
    default: styles.default,
    success: styles.success,
    warning: styles.warning,
    error: styles.error,
    info: styles.info,
  }[variant];

  return (
    <span
      className={`${styles.badge} ${variantClass}`}
      data-testid={testId}
      role="status"
      aria-label={`Status: ${children}`}
    >
      {children}
    </span>
  );
}
