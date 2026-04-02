import { useRef, KeyboardEvent } from "react";
import styles from "./SegmentedControl.module.css";

interface SegmentedControlOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (index - 1 + options.length) % options.length;
    }

    if (nextIndex !== null) {
      onChange(options[nextIndex].value);
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]'
      );
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={styles.group}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`${styles.option} ${isSelected ? styles.selected : ""}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
