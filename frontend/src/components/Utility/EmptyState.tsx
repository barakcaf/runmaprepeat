import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  /** Icon element (e.g., SVG or icon component) */
  icon?: React.ReactNode;
  /** Main heading text */
  heading: string;
  /** Description text */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * EmptyState displays feedback when no content is available.
 * Centered layout with optional icon, heading, description, and action button.
 *
 * @example
 * <EmptyState
 *   icon={<RunIcon />}
 *   heading="No runs yet"
 *   description="Start tracking your first run to see your progress here."
 *   action={{ label: "Create Run", onClick: () => navigate('/new') }}
 * />
 *
 * WCAG 2.2 Criteria:
 * - 1.4.3 Contrast (Minimum) (Level AA) - text contrast 4.5:1
 * - 2.4.6 Headings and Labels (Level AA) - descriptive heading
 * - 2.5.5 Target Size (Level AAA) - 44x44px minimum for action button
 *
 * Nielsen Heuristics:
 * - #1 Visibility of system status - clear feedback about empty state
 * - #3 User control and freedom - action provides path forward
 * - #9 Error recovery - helpful guidance on what to do next
 */
export function EmptyState({
  icon,
  heading,
  description,
  action,
  "data-testid": testId = "empty-state",
}: EmptyStateProps) {
  return (
    <div className={styles.emptyState} data-testid={testId} role="status">
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className={styles.heading}>{heading}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={action.onClick}
          data-testid="empty-state-action"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
