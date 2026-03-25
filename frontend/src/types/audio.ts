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
