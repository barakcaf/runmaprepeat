import { ReactNode, KeyboardEvent, MouseEvent, HTMLAttributes, ElementType } from 'react';
import styles from './Card.module.css';

type PaddingSize = 'none' | 'sm' | 'md' | 'lg';
type ElementTag = 'div' | 'article' | 'section';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick' | 'onKeyDown'> {
  children: ReactNode;
  padding?: PaddingSize;
  interactive?: boolean;
  onClick?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  as?: ElementTag;
  className?: string;
}

/**
 * Card component - Accessible, composable container with optional interactivity
 *
 * @example
 * // Static card
 * <Card padding="md">Content</Card>
 *
 * @example
 * // Interactive card
 * <Card interactive onClick={handleClick}>
 *   Clickable content
 * </Card>
 *
 * @example
 * // Semantic HTML with custom styles
 * <Card as="article" className={styles.customCard}>
 *   Article content
 * </Card>
 */
export function Card({
  children,
  padding = 'md',
  interactive = false,
  onClick,
  onKeyDown,
  as = 'div',
  className = '',
  ...rest
}: CardProps) {
  const Element = as as ElementType;

  // WCAG 2.1.1 (Level A): Keyboard accessible
  // Handle Enter and Space keys for interactive cards
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (interactive && onClick) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); // Prevent scroll on Space
        onClick(event);
      }
    }
    onKeyDown?.(event);
  };

  const classNames = [
    styles.card,
    styles[`padding-${padding}`],
    interactive ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Element
      {...rest}
      className={classNames}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      // WCAG 2.1.1 (Level A): Interactive elements must be keyboard accessible
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      // WCAG 4.1.2 (Level A): Name, Role, Value
      aria-disabled={interactive && !onClick ? true : undefined}
    >
      {children}
    </Element>
  );
}
