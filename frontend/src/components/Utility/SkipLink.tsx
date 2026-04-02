import styles from "./SkipLink.module.css";

interface SkipLinkProps {
  /** Target element ID to skip to */
  href: string;
  /** Link text (default: "Skip to main content") */
  children?: React.ReactNode;
}

/**
 * SkipLink provides keyboard users a way to bypass repetitive navigation.
 * Hidden by default, becomes visible when focused via Tab key.
 * Should be the first focusable element in the document.
 *
 * @example
 * <SkipLink href="#main-content" />
 * <SkipLink href="#main-content">Skip to content</SkipLink>
 *
 * WCAG 2.2 Criteria:
 * - 2.4.1 Bypass Blocks (Level A) - mechanism to skip repeated content
 * - 2.4.7 Focus Visible (Level AA) - visible focus indicator
 * - 2.1.1 Keyboard (Level A) - all functionality via keyboard
 *
 * Nielsen Heuristics:
 * - #7 Flexibility and efficiency of use - accelerator for expert users
 */
export function SkipLink({ href, children = "Skip to main content" }: SkipLinkProps) {
  return (
    <a href={href} className={styles.skipLink} data-testid="skip-link">
      {children}
    </a>
  );
}
