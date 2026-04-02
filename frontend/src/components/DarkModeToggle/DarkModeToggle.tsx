import { useTheme } from "../../providers/ThemeProvider";
import styles from "./DarkModeToggle.module.css";

/**
 * Dark Mode Toggle Component
 *
 * WCAG 2.2 AA Compliance:
 * - 1.4.3 Contrast (Minimum): 44×44px touch target with proper contrast
 * - 2.1.1 Keyboard: Fully keyboard accessible with Enter/Space
 * - 2.4.7 Focus Visible: Clear focus indicators
 * - 4.1.2 Name, Role, Value: Proper ARIA labels and live region
 *
 * Nielsen Heuristics:
 * - #1 Visibility of system status: Shows current theme clearly
 * - #3 User control and freedom: Easy toggle between preferences
 * - #7 Flexibility and efficiency: Quick access to theme switcher
 */
export function DarkModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleClick = () => {
    // Cycle through: system → light → dark → system
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Support Enter and Space (Space is default, but explicit for clarity)
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  // Generate accessible label based on current theme
  const getAriaLabel = () => {
    if (theme === "light") {
      return "Switch to dark mode";
    } else if (theme === "dark") {
      return "Switch to system theme preference";
    } else {
      return `Switch to light mode (currently following system: ${resolvedTheme})`;
    }
  };

  // Visual label for the button
  const getLabel = () => {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "Auto";
  };

  // Icon for current theme
  const getIcon = () => {
    if (theme === "light") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={styles.icon}
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    } else if (theme === "dark") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={styles.icon}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    } else {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className={styles.icon}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 3v18" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={getAriaLabel()}
        className={styles.toggle}
        data-theme={theme}
      >
        {getIcon()}
        <span className={styles.label}>{getLabel()}</span>
      </button>
      {/*
        Live region for screen reader announcements
        WCAG 4.1.3 Status Messages (Level AA)
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        Theme changed to {theme === "system" ? `system (${resolvedTheme})` : theme}
      </div>
    </>
  );
}
