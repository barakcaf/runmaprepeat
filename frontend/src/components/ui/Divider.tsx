import styles from "./Divider.module.css";

interface DividerProps {
  label?: string;
}

export function Divider({ label }: DividerProps) {
  if (label) {
    return (
      <div className={styles.labeled} role="separator" aria-label={label}>
        <hr className={styles.line} aria-hidden="true" />
        <span className={styles.label} aria-hidden="true">{label}</span>
        <hr className={styles.line} aria-hidden="true" />
      </div>
    );
  }

  return <hr className={styles.divider} />;
}
