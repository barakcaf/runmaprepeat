import { useAuth } from "../auth/AuthProvider";
import styles from "../styles/Dashboard.module.css";

export function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome to RunMapRepeat</h1>
        <div className={styles.userInfo}>
          <span className={styles.email}>{user?.email}</span>
          <button onClick={signOut} className={styles.signOutButton}>
            Sign out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.placeholder}>Your runs will appear here</p>
      </main>
    </div>
  );
}
