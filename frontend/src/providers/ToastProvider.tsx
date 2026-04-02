import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ToastContainer } from "../components/ui/Toast";

type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ShowToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (options: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;
const EXIT_ANIMATION_MS = 200;

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const show = useCallback(
    ({ message, variant = "info", duration = DEFAULT_DURATION }: ShowToastOptions) => {
      const id = `toast-${++toastCounter}`;
      const toast: ToastItem = { id, message, variant };

      setToasts((prev) => [...prev, toast]);

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
