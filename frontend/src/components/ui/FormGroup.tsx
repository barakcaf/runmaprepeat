import { ReactNode } from 'react';
import styles from './FormGroup.module.css';

interface FormGroupProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FormGroup({ label, htmlFor, required, error, hint, children }: FormGroupProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={styles.group} role="group" aria-labelledby={`${htmlFor}-label`}>
      <label id={`${htmlFor}-label`} className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

export default FormGroup;
