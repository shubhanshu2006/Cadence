export interface Artist {
  id?: string;
  name: string;
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
}

export interface HomeSection {
  title: string;
  items: SongItem[];
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface LyricsData {
  trackName: string;
  artistName: string;
  plainLyrics?: string;
  syncedLyrics?: LyricsLine[];
  isSynced: boolean;
}

export interface WeatherInfo {
  cityName: string;
  temperature: number;
  description: string;
  emoji: string;
}

export interface DiscoverArticle {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  source: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  coverUrl?: string;
  songs: SongItem[];
}
