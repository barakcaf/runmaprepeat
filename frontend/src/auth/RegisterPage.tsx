import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import styles from "../styles/LoginPage.module.css";

type Step = "register" | "verify";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("register");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password);
      setStep("verify");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await confirmSignUp(email, code);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>RunMapRepeat</h1>
        <p className={styles.subtitle}>
          {step === "register" ? "Create your account" : "Verify your email"}
        </p>

        {step === "register" ? (
          <form onSubmit={handleRegister} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <label className={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
            </label>

            <label className={styles.label}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <label className={styles.label}>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <button
              type="submit"
              className={styles.button}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>

            <p className={styles.link}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <p className={styles.hint}>
              We sent a verification code to <strong>{email}</strong>
            </p>

            <label className={styles.label}>
              Verification code
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.input}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
              />
            </label>

            <button
              type="submit"
              className={styles.button}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Verify email"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
