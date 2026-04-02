import { createPortal } from "react-dom";
import type { ToastItem } from "../../providers/ToastProvider";
import styles from "./Toast.module.css";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.variant]}${toast.exiting ? ` ${styles.exiting}` : ""}`}
          role={toast.variant === "error" ? "alert" : "status"}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
