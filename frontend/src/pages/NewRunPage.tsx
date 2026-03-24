import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRun } from "../api/client";
import type { Audio, CreateRunPayload } from "../types/run";
import shared from "../styles/shared.module.css";
import styles from "../styles/NewRunPage.module.css";

function toISOLocal(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function nowDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function NewRunPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(nowDate);
  const [time, setTime] = useState(nowTime);
  const [status, setStatus] = useState<"completed" | "planned">("completed");
  const [durationInput, setDurationInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioType, setAudioType] = useState<"music" | "podcast">("music");
  const [musicSubtype, setMusicSubtype] = useState<"artist" | "playlist">("artist");
  const [audioName, setAudioName] = useState("");
  const [audioDetail, setAudioDetail] = useState("");
  const [artistFormat, setArtistFormat] = useState<"album" | "mix">("album");

  function parseDuration(input: string): number | null {
    if (!input.trim()) return null;
    const parts = input.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  function buildAudio(): Audio | undefined {
    if (!audioName.trim()) return undefined;
    if (audioType === "podcast") {
      return {
        type: "podcast",
        name: audioName.trim(),
        ...(audioDetail.trim() ? { detail: audioDetail.trim() } : {}),
      };
    }
    if (musicSubtype === "playlist") {
      return {
        type: "music",
        subtype: "playlist",
        name: audioName.trim(),
      };
    }
    return {
      type: "music",
      subtype: "artist",
      format: artistFormat,
      name: audioName.trim(),
      ...(audioDetail.trim() ? { detail: audioDetail.trim() } : {}),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const durationSeconds = parseDuration(durationInput);
    if (status === "completed" && (durationSeconds === null || durationSeconds <= 0)) {
      setError("Please enter a valid duration");
      setSaving(false);
      return;
    }

    const payload: CreateRunPayload = {
      status,
      runDate: toISOLocal(date, time),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(status === "completed" && durationSeconds ? { durationSeconds } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      audio: buildAudio(),
    };

    try {
      const run = await createRun(payload);
      navigate(`/runs/${run.runId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create run";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={shared.page}>
      <div className={styles.mapArea}>Map component loading...</div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>New Run</h2>

        {error && <div className={shared.errorState}>{error}</div>}

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="title">Title</label>
          <input
            id="title"
            className={shared.formInput}
            type="text"
            placeholder="Morning run"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="date">Date</label>
          <input
            id="date"
            className={shared.formInput}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="time">Time</label>
          <input
            id="time"
            className={shared.formInput}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel}>Status</label>
          <div className={shared.toggleGroup}>
            <button
              type="button"
              className={status === "completed" ? shared.toggleOptionActive : shared.toggleOption}
              onClick={() => setStatus("completed")}
            >
              Completed
            </button>
            <button
              type="button"
              className={status === "planned" ? shared.toggleOptionActive : shared.toggleOption}
              onClick={() => setStatus("planned")}
            >
              Planned
            </button>
          </div>
        </div>

        {status === "completed" && (
          <div className={shared.formGroup}>
            <label className={shared.formLabel} htmlFor="duration">
              Duration (HH:MM:SS)
            </label>
            <input
              id="duration"
              className={shared.formInput}
              type="text"
              placeholder="0:32:15"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
            />
          </div>
        )}

        <div className={styles.audioSection}>
          <div className={styles.audioSectionTitle}>Audio</div>
          <div className={shared.formGroup}>
            <div className={shared.toggleGroup}>
              <button
                type="button"
                className={audioType === "music" ? shared.toggleOptionActive : shared.toggleOption}
                onClick={() => setAudioType("music")}
              >
                🎵 Music
              </button>
              <button
                type="button"
                className={audioType === "podcast" ? shared.toggleOptionActive : shared.toggleOption}
                onClick={() => setAudioType("podcast")}
              >
                🎙️ Podcast
              </button>
            </div>
          </div>

          {audioType === "music" && (
            <div className={shared.formGroup}>
              <div className={shared.toggleGroup}>
                <button
                  type="button"
                  className={musicSubtype === "artist" ? shared.toggleOptionActive : shared.toggleOption}
                  onClick={() => setMusicSubtype("artist")}
                >
                  Artist
                </button>
                <button
                  type="button"
                  className={musicSubtype === "playlist" ? shared.toggleOptionActive : shared.toggleOption}
                  onClick={() => setMusicSubtype("playlist")}
                >
                  Playlist
                </button>
              </div>
            </div>
          )}

          {audioType === "music" && musicSubtype === "artist" && (
            <>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="artistName">Artist</label>
                <input
                  id="artistName"
                  className={shared.formInput}
                  type="text"
                  placeholder="Artist name"
                  value={audioName}
                  onChange={(e) => setAudioName(e.target.value)}
                />
              </div>
              <div className={shared.formGroup}>
                <div className={shared.toggleGroup}>
                  <button
                    type="button"
                    className={artistFormat === "album" ? shared.toggleOptionActive : shared.toggleOption}
                    onClick={() => setArtistFormat("album")}
                  >
                    Album
                  </button>
                  <button
                    type="button"
                    className={artistFormat === "mix" ? shared.toggleOptionActive : shared.toggleOption}
                    onClick={() => setArtistFormat("mix")}
                  >
                    Mix
                  </button>
                </div>
              </div>
              {artistFormat === "album" && (
                <div className={shared.formGroup}>
                  <label className={shared.formLabel} htmlFor="albumName">Album</label>
                  <input
                    id="albumName"
                    className={shared.formInput}
                    type="text"
                    placeholder="Album name"
                    value={audioDetail}
                    onChange={(e) => setAudioDetail(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {audioType === "music" && musicSubtype === "playlist" && (
            <div className={shared.formGroup}>
              <label className={shared.formLabel} htmlFor="playlistName">Playlist</label>
              <input
                id="playlistName"
                className={shared.formInput}
                type="text"
                placeholder="Playlist name"
                value={audioName}
                onChange={(e) => setAudioName(e.target.value)}
              />
            </div>
          )}

          {audioType === "podcast" && (
            <>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="podcastName">Podcast</label>
                <input
                  id="podcastName"
                  className={shared.formInput}
                  type="text"
                  placeholder="Podcast name"
                  value={audioName}
                  onChange={(e) => setAudioName(e.target.value)}
                />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.formLabel} htmlFor="episode">Episode</label>
                <input
                  id="episode"
                  className={shared.formInput}
                  type="text"
                  placeholder="Episode (optional)"
                  value={audioDetail}
                  onChange={(e) => setAudioDetail(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className={shared.formTextarea}
            placeholder="How did it go?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className={shared.buttonPrimary}
          disabled={saving}
          style={{ width: "100%" }}
        >
          {saving ? "Saving..." : "Save Run"}
        </button>
      </form>
    </div>
  );
}
