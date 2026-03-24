import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getProfile, updateProfile } from "../api/client";
import type { Profile } from "../types/profile";
import shared from "../styles/shared.module.css";
import styles from "../styles/ProfilePage.module.css";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ProfilePage() {
  const { signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weeklyEmail, setWeeklyEmail] = useState(false);
  const [monthlyEmail, setMonthlyEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Saved values to restore on cancel
  const [savedValues, setSavedValues] = useState({
    email: "",
    displayName: "",
    weightKg: "",
    heightCm: "",
    weeklyEmail: false,
    monthlyEmail: false,
  });

  useEffect(() => {
    getProfile()
      .then((profile) => {
        const values = {
          email: profile.email ?? "",
          displayName: profile.displayName ?? "",
          weightKg: profile.weightKg?.toString() ?? "",
          heightCm: profile.heightCm?.toString() ?? "",
          weeklyEmail: profile.emailSubscriptions?.weekly ?? false,
          monthlyEmail: profile.emailSubscriptions?.monthly ?? false,
        };
        setEmail(values.email);
        setDisplayName(values.displayName);
        setWeightKg(values.weightKg);
        setHeightCm(values.heightCm);
        setWeeklyEmail(values.weeklyEmail);
        setMonthlyEmail(values.monthlyEmail);
        setSavedValues(values);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("404")) return;
        const message = err instanceof Error ? err.message : "Failed to load profile";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  function validate(): string | null {
    if (!email.trim()) return "Email is required";
    if (!EMAIL_REGEX.test(email.trim())) return "Please enter a valid email address";
    if (!displayName.trim()) return "Display name is required";
    if (!heightCm) return "Height is required";
    if (Number(heightCm) <= 0) return "Height must be a positive number";
    if (!weightKg) return "Weight is required";
    if (Number(weightKg) <= 0) return "Weight must be a positive number";
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setSaving(false);
      return;
    }

    const data: Profile = {
      email: email.trim(),
      displayName: displayName.trim(),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      emailSubscriptions: {
        weekly: weeklyEmail,
        monthly: monthlyEmail,
      },
    };

    try {
      await updateProfile(data);
      const newSaved = {
        email: data.email,
        displayName: data.displayName,
        weightKg: data.weightKg.toString(),
        heightCm: data.heightCm.toString(),
        weeklyEmail: weeklyEmail,
        monthlyEmail: monthlyEmail,
      };
      setSavedValues(newSaved);
      setSuccess(true);
      setMode("view");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit() {
    setError(null);
    setSuccess(false);
    setMode("edit");
  }

  function handleCancel() {
    setEmail(savedValues.email);
    setDisplayName(savedValues.displayName);
    setWeightKg(savedValues.weightKg);
    setHeightCm(savedValues.heightCm);
    setWeeklyEmail(savedValues.weeklyEmail);
    setMonthlyEmail(savedValues.monthlyEmail);
    setError(null);
    setSuccess(false);
    setMode("view");
  }

  if (loading) {
    return (
      <div className={shared.page}>
        <div className={shared.loadingState}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Profile</h1>
      </div>

      {mode === "view" ? (
        <div className={shared.card}>
          {error && <div className={shared.errorState}>{error}</div>}
          {success && <div className={styles.success}>Profile saved!</div>}

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Email</span>
            <span className={styles.fieldValue} data-testid="view-email">{email || "—"}</span>
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Display Name</span>
            <span className={styles.fieldValue} data-testid="view-displayName">{displayName || "—"}</span>
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Height (cm)</span>
            <span className={styles.fieldValue} data-testid="view-heightCm">{heightCm || "—"}</span>
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Weight (kg)</span>
            <span className={styles.fieldValue} data-testid="view-weightKg">{weightKg || "—"}</span>
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Email Subscriptions</span>
            <span className={styles.fieldValue} data-testid="view-weeklyEmail">Weekly: {weeklyEmail ? "On" : "Off"}</span>
            <span className={styles.fieldValue} data-testid="view-monthlyEmail">Monthly: {monthlyEmail ? "On" : "Off"}</span>
          </div>

          <button
            type="button"
            className={shared.buttonPrimary}
            onClick={handleEdit}
            style={{ width: "100%" }}
          >
            Edit
          </button>

          <div className={styles.signOutSection}>
            <button
              type="button"
              className={shared.buttonSecondary}
              onClick={signOut}
              style={{ width: "100%" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <form className={shared.card} onSubmit={handleSave}>
          {error && <div className={shared.errorState}>{error}</div>}

          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="email">Email *</label>
            <input
              id="email"
              className={shared.formInput}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="displayName">Display Name *</label>
            <input
              id="displayName"
              className={shared.formInput}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="heightCm">Height (cm) *</label>
            <input
              id="heightCm"
              className={shared.formInput}
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              required
            />
          </div>

          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="weightKg">Weight (kg) *</label>
            <input
              id="weightKg"
              className={shared.formInput}
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
            />
          </div>

          <div className={shared.formGroup}>
            <label className={shared.formLabel}>Email Subscriptions</label>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={weeklyEmail}
                onChange={(e) => setWeeklyEmail(e.target.checked)}
              />
              Weekly summary email
            </label>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={monthlyEmail}
                onChange={(e) => setMonthlyEmail(e.target.checked)}
              />
              Monthly summary email
            </label>
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={shared.buttonSecondary}
              onClick={handleCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={shared.buttonPrimary}
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <div className={styles.signOutSection}>
            <button
              type="button"
              className={shared.buttonSecondary}
              onClick={signOut}
              style={{ width: "100%" }}
            >
              Sign Out
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
