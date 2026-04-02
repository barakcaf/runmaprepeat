import styles from "./SkipLink.module.css";

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

export function SkipLink({ href = "#main-content", children = "Skip to main content" }: SkipLinkProps) {
  return (
    <a className={styles.skipLink} href={href}>
      {children}
    </a>
  );
}
