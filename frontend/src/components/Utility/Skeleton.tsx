import styles from "./Skeleton.module.css";

interface SkeletonProps {
  /** Variant type */
  variant?: "text" | "circular" | "rectangular";
  /** Width in CSS units or percentage */
  width?: string | number;
  /** Height in CSS units or percentage */
  height?: string | number;
  /** CSS class name for additional styling */
  className?: string;
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * Skeleton displays an animated placeholder while content is loading.
 * Uses a pulse animation that respects prefers-reduced-motion.
 *
 * @example
 * <Skeleton variant="text" width="60%" />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" width="100%" height="200px" />
 *
 * WCAG 2.2 Criteria:
 * - 2.2.2 Pause, Stop, Hide (Level A) - respects prefers-reduced-motion
 * - 2.3.3 Animation from Interactions (Level AAA) - motion can be disabled
 * - 4.1.3 Status Messages (Level AA) - aria-live region for loading state
 *
 * Nielsen Heuristics:
 * - #1 Visibility of system status - Shows loading progress
 */
export function Skeleton({
  variant = "text",
  width,
  height,
  className,
  "data-testid": testId = "skeleton",
}: SkeletonProps) {
  const style: React.CSSProperties = {};

  if (width !== undefined) {
    style.width = typeof width === "number" ? `${width}px` : width;
  }

  if (height !== undefined) {
    style.height = typeof height === "number" ? `${height}px` : height;
  }

  const variantClass = {
    text: styles.text,
    circular: styles.circular,
    rectangular: styles.rectangular,
  }[variant];

  return (
    <span
      className={`${styles.skeleton} ${variantClass} ${className || ""}`}
      style={style}
      data-testid={testId}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <span className={styles.visuallyHidden}>Loading...</span>
    </span>
  );
}
