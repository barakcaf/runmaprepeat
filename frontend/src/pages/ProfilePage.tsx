import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getProfile, updateProfile } from "../api/client";
import type { Profile } from "../types/profile";
import shared from "../styles/shared.module.css";
import styles from "../styles/ProfilePage.module.css";

export function ProfilePage() {
  const { signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setDisplayName(profile.displayName ?? "");
        setWeightKg(profile.weightKg?.toString() ?? "");
        setHeightCm(profile.heightCm?.toString() ?? "");
        setBirthDate(profile.birthDate ?? "");
      })
      .catch((err: unknown) => {
        // 404 = no profile yet, just show empty form
        if (err instanceof Error && err.message.includes("404")) return;
        const message = err instanceof Error ? err.message : "Failed to load profile";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const data: Profile = {};
    if (displayName.trim()) data.displayName = displayName.trim();
    if (weightKg) data.weightKg = Number(weightKg);
    if (heightCm) data.heightCm = Number(heightCm);
    if (birthDate) data.birthDate = birthDate;

    try {
      await updateProfile(data);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setSaving(false);
    }
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

      <form className={shared.card} onSubmit={handleSave}>
        {error && <div className={shared.errorState}>{error}</div>}
        {success && <div className={styles.success}>Profile saved!</div>}

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            className={shared.formInput}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="weightKg">Weight (kg)</label>
          <input
            id="weightKg"
            className={shared.formInput}
            type="number"
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="heightCm">Height (cm)</label>
          <input
            id="heightCm"
            className={shared.formInput}
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="birthDate">Birth Date</label>
          <input
            id="birthDate"
            className={shared.formInput}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className={shared.buttonPrimary}
          disabled={saving}
          style={{ width: "100%" }}
        >
          {saving ? "Saving..." : "Save Profile"}
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
      </form>
    </div>
  );
}
