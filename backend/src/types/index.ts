export interface Artist {
  id?: string;
  name: string;
}

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface SongItem {
  id: string; // YouTube Video ID
  title: string;
  artists: Artist[];
  album?: {
    id?: string;
    name: string;
  };
  durationText?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  explicit?: boolean;
}

export interface PlaylistItem {
  id: string;
  title: string;
  author?: string;
  itemCountText?: string;
  thumbnailUrl?: string;
}

export interface HomeSection {
  title: string;
  items: SongItem[];
}

export interface LyricsResponse {
  trackName: string;
  artistName: string;
  plainLyrics?: string;
  syncedLyrics?: Array<{
    time: number; // in seconds
    text: string;
  }>;
  isSynced: boolean;
}


