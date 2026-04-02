import type { ReactNode } from "react";
import styles from "./VisuallyHidden.module.css";

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: "span" | "div";
  focusable?: boolean;
}

export function VisuallyHidden({
  children,
  as: Tag = "span",
  focusable = false,
}: VisuallyHiddenProps) {
  return (
    <Tag
      className={focusable ? styles.visuallyHiddenFocusable : styles.visuallyHidden}
    >
      {children}
    </Tag>
  );
}
