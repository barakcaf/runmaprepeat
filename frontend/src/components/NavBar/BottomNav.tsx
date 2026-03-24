import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

const tabs = [
  { to: "/", label: "Home", icon: "\u{1F3E0}" },
  { to: "/runs/new", label: "New Run", icon: "\u{2795}" },
  { to: "/planned", label: "Planned", icon: "\u{1F4CB}" },
  { to: "/profile", label: "Profile", icon: "\u{1F464}" },
] as const;

export function BottomNav() {
  return (
    <nav className={styles.nav} data-testid="bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ""}`
          }
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
