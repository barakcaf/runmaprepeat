import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state - shows spinner and disables interaction */
  loading?: boolean;
  /** Icon element to display before text */
  icon?: ReactNode;
  /** Expand to full container width */
  fullWidth?: boolean;
  /** Button content */
  children?: ReactNode;
}

/**
 * Accessible button component following WCAG 2.2 AA standards
 *
 * Features:
 * - Minimum 44×44px touch target (WCAG 2.2 Success Criterion 2.5.8)
 * - Visible focus indicator with --color-focus-ring
 * - Loading state with aria-busy and screen reader announcements
 * - Keyboard accessible (native button semantics)
 * - All variants meet 3:1 contrast ratio for UI components
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleSave}>
 *   Save Changes
 * </Button>
 *
 * <Button variant="danger" loading icon={<TrashIcon />}>
 *   Delete
 * </Button>
 * ```
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  // Loading state implies disabled
  const isDisabled = disabled || loading;

  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // WCAG 4.1.2: Icon-only buttons must have an accessible name
  const needsAriaLabel = icon && !children && !props['aria-label'] && !props['aria-labelledby'];
  if (process.env.NODE_ENV !== 'production' && needsAriaLabel) {
    console.warn('Button: Icon-only buttons require an aria-label or aria-labelledby for accessibility.');
  }

  return (
    <button
      type="button"
      className={classNames}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && <span className={styles.icon} aria-hidden="true">{icon}</span>
      )}
      {children && <span className={styles.label}>{children}</span>}
    </button>
  );
}
