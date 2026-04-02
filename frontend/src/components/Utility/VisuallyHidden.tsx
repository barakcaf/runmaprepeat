import type { ReactNode } from "react";
import styles from "./VisuallyHidden.module.css";

interface VisuallyHiddenProps {
  children: ReactNode;
  /** Allows the element to be focusable for screen reader users */
  focusable?: boolean;
}

/**
 * VisuallyHidden hides content visually while keeping it accessible to screen readers.
 * Uses the clip pattern recommended by WebAIM for WCAG 2.2 compliance.
 *
 * @example
 * <button>
 *   <Icon name="search" aria-hidden="true" />
 *   <VisuallyHidden>Search</VisuallyHidden>
 * </button>
 *
 * WCAG 2.2 Criteria:
 * - 1.3.1 Info and Relationships (Level A)
 * - 2.4.4 Link Purpose (Level A)
 * - 4.1.2 Name, Role, Value (Level A)
 */
export function VisuallyHidden({ children, focusable = false }: VisuallyHiddenProps) {
  return (
    <span
      className={focusable ? styles.visuallyHiddenFocusable : styles.visuallyHidden}
      data-testid="visually-hidden"
    >
      {children}
    </span>
  );
}
