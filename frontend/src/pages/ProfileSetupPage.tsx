import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfileGate } from "../auth/ProfileGate";
import { updateProfile } from "../api/client";
import type { Profile } from "../types/profile";
import shared from "../styles/shared.module.css";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ProfileSetupPage() {
  const { user } = useAuth();
  const { recheckProfile } = useProfileGate();
  const [email, setEmail] = useState(user?.email ?? "");
  const [displayName, setDisplayName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    };

    try {
      await updateProfile(data);
      await recheckProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
      setSaving(false);
    }
  }

  return (
    <div className={shared.page} style={{ paddingBottom: "2rem" }}>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>Set Up Your Profile</h1>
        <p style={{ color: "#666", margin: "0.5rem 0 0" }}>
          Please fill in your details to get started.
        </p>
      </div>

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

        <button
          type="submit"
          className={shared.buttonPrimary}
          disabled={saving}
          style={{ width: "100%" }}
        >
          {saving ? "Saving..." : "Complete Setup"}
        </button>
      </form>
    </div>
  );
}
