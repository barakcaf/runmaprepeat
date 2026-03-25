export interface SpotifyRef {
  source: 'spotify';
  spotifyId: string;
  type: 'artist' | 'album' | 'track';
  name: string;
  artistName?: string;
  albumName?: string;
  imageUrl: string | null;
  spotifyUrl: string;
}

export interface ManualAudioRef {
  source: 'manual';
  name: string;
  artistName?: string;
}

export type AudioRef = SpotifyRef | ManualAudioRef;

export type AudioRefs = AudioRef[];

export const MAX_AUDIO_SELECTIONS = 3;

/**
 * Normalize audio from the backend — handles both legacy single-object
 * format and new array format for backward compatibility.
 */
export function normalizeAudio(audio: AudioRef | AudioRef[] | undefined | null): AudioRef[] {
  if (!audio) return [];
  if (Array.isArray(audio)) return audio;
  return [audio];
}
