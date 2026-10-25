import axios from 'axios';
import { LyricsResponse } from '../types/index.js';

/**
 * LRCLIB synced lyrics service
 */
export class LyricsService {
  private static BASE_URL = 'https://lrclib.net/api';

  static async getLyrics(title: string, artist: string, duration?: number): Promise<LyricsResponse | null> {
    try {
      const cleanTitle = title
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\[Official.*?\]/gi, '')
        .replace(/\(Audio\)/gi, '')
        .replace(/\[Audio\]/gi, '')
        .replace(/\(Lyric.*?\)/gi, '')
        .replace(/\(Video.*?\)/gi, '')
        .trim();

      const params: Record<string, string | number> = {
        track_name: cleanTitle,
        artist_name: artist,
      };

      if (duration && duration > 0) {
        params.duration = Math.round(duration);
      }

      const res = await axios.get(`${this.BASE_URL}/get`, {
        params,
        timeout: 6000,
      });

      const data = res.data;
      if (!data) return null;

      const syncedLyrics = data.syncedLyrics ? this.parseLrc(data.syncedLyrics) : undefined;

      return {
        trackName: data.trackName || title,
        artistName: data.artistName || artist,
        plainLyrics: data.plainLyrics || undefined,
        syncedLyrics,
        isSynced: !!syncedLyrics && syncedLyrics.length > 0,
      };
    } catch {
      // Fallback search endpoint
      try {
        const searchRes = await axios.get(`${this.BASE_URL}/search`, {
          params: { q: `${artist} ${title}` },
          timeout: 6000,
        });

        if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          const first = searchRes.data[0];
          const syncedLyrics = first.syncedLyrics ? this.parseLrc(first.syncedLyrics) : undefined;
          return {
            trackName: first.trackName || title,
            artistName: first.artistName || artist,
            plainLyrics: first.plainLyrics || undefined,
            syncedLyrics,
            isSynced: !!syncedLyrics && syncedLyrics.length > 0,
          };
        }
      } catch {
        // Ignored fallback failure
      }
      return null;
    }
  }

  private static parseLrc(lrcText: string): Array<{ time: number; text: string }> {
    const lines = lrcText.split('\n');
    const result: Array<{ time: number; text: string }> = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millis = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
        const totalSeconds = minutes * 60 + seconds + millis / 1000;
        const text = match[4].trim();
        result.push({ time: totalSeconds, text });
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }
}
