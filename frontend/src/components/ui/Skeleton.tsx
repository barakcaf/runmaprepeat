import styles from "./Skeleton.module.css";

type SkeletonVariant = "line" | "circle" | "rect";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = "line", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};

  if (width !== undefined) {
    style.width = typeof width === "number" ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === "number" ? `${height}px` : height;
    style.minHeight = style.height;
  }

  const className = [
    styles.skeleton,
    variant === "circle" ? styles.circle : undefined,
    variant === "rect" ? styles.rect : undefined,
    variant === "line" ? styles.line : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}
