import { EmptyState } from "./EmptyState";
import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  /** Error message heading */
  heading?: string;
  /** Detailed error description */
  description?: string;
  /** Retry callback function */
  onRetry?: () => void;
  /** Custom retry button label */
  retryLabel?: string;
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * ErrorIcon component - simple SVG error icon
 */
function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.errorIcon}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * ErrorState displays error feedback with optional retry action.
 * Extends EmptyState with error-specific styling and aria-live region.
 *
 * @example
 * <ErrorState
 *   heading="Failed to load data"
 *   description="Please check your connection and try again."
 *   onRetry={() => refetch()}
 * />
 *
 * WCAG 2.2 Criteria:
 * - 3.3.1 Error Identification (Level A) - clear error message
 * - 3.3.3 Error Suggestion (Level AA) - recovery suggestion provided
 * - 4.1.3 Status Messages (Level AA) - aria-live="polite" for error announcement
 *
 * Nielsen Heuristics:
 * - #9 Error recovery - clear message with recovery action
 * - #5 Error prevention - helps users understand and fix errors
 */
export function ErrorState({
  heading = "Something went wrong",
  description = "An error occurred while loading this content. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  "data-testid": testId = "error-state",
}: ErrorStateProps) {
  return (
    <div aria-live="polite" aria-atomic="true" role="alert">
      <EmptyState
        icon={<ErrorIcon />}
        heading={heading}
        description={description}
        action={
          onRetry
            ? {
                label: retryLabel,
                onClick: onRetry,
              }
            : undefined
        }
        data-testid={testId}
      />
    </div>
  );
}
