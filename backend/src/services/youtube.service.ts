import { Innertube, UniversalCache } from 'youtubei.js';
import axios from 'axios';
import { Readable } from 'node:stream';
import { SongItem, HomeSection } from '../types/index.js';

export class YouTubeService {
  private static yt: Innertube | null = null;
  private static initPromise: Promise<Innertube> | null = null;

  static async getInstance(): Promise<Innertube> {
    if (this.yt) return this.yt;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const instance = await Innertube.create({
          cache: new UniversalCache(true),
        });
        this.yt = instance;
        return instance;
      } catch (err) {
        console.error('Failed to initialize Innertube client:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Search songs or videos on YouTube Music
   */
  static async search(query: string, filter: 'songs' | 'albums' | 'artists' = 'songs'): Promise<SongItem[]> {
    try {
      const yt = await this.getInstance();
      const results = await yt.music.search(query, {
        type: filter === 'songs' ? 'song' : 'all',
      });

      const songs: SongItem[] = [];

      // Check results
      const contents = results.contents || [];
      for (const section of contents) {
        if ('contents' in section && Array.isArray((section as any).contents)) {
          for (const item of (section as any).contents) {
            const song = this.parseMusicItem(item);
            if (song) songs.push(song);
          }
        } else {
          const song = this.parseMusicItem(section);
          if (song) songs.push(song);
        }
      }

      if (songs.length > 0) return songs;
    } catch (err) {
      console.warn('Innertube music.search failed, falling back to direct search:', err);
    }

    // Direct fallback using YouTube Music InnerTube search API
    return this.directSearchFallback(query);
  }

  /**
   * Search autocomplete suggestions
   */
  static async getSuggestions(query: string): Promise<string[]> {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=${encodeURIComponent(query)}`;
      const res = await axios.get(url, { timeout: 3000 });
      if (Array.isArray(res.data) && Array.isArray(res.data[1])) {
        return res.data[1].slice(0, 8);
      }
    } catch {
      // Ignore
    }
    return [];
  }

  /**
   * Get Home feed tracks (Trending, Charts, Quick Picks)
   */
  static async getHomeFeed(): Promise<HomeSection[]> {
    const sections: HomeSection[] = [];

    try {
      const yt = await this.getInstance();
      
      // Explore & Charts
      try {
        const explore = await yt.music.getExplore();
        if (explore && (explore as any).top_songs) {
          const songs: SongItem[] = [];
          for (const s of ((explore as any).top_songs || [])) {
            const parsed = this.parseMusicItem(s);
            if (parsed) songs.push(parsed);
          }
          if (songs.length > 0) {
            sections.push({
              title: 'Top Hits & Trending Charts',
              items: songs.slice(0, 15),
            });
          }
        }
      } catch {
        // Explore optional
      }

      // Home feed sections
      const home = await yt.music.getHomeFeed();
      if (home.sections) {
        for (const sec of home.sections) {
          const rawTitle = (sec as any).title?.toString() || '';
          const items: SongItem[] = [];
          if ('contents' in sec && Array.isArray((sec as any).contents)) {
            for (const it of (sec as any).contents) {
              const song = this.parseMusicItem(it);
              if (song) items.push(song);
            }
          }
          if (items.length >= 3) {
            sections.push({
              title: rawTitle || 'Recommended For You',
              items: items.slice(0, 15),
            });
          }
        }

        // If home sections had playlist shelves (like "Hits of 2026", "Uncut Bollywood"):
        // Unpack the actual playable songs from those playlists
        for (const sec of home.sections) {
          if ('contents' in sec && Array.isArray((sec as any).contents)) {
            const playlistsInSec = (sec as any).contents.filter(
              (c: any) => c.item_type === 'playlist' || (typeof c.id === 'string' && c.id.startsWith('VL'))
            );
            if (playlistsInSec.length > 0 && sections.length < 5) {
              for (const plItem of playlistsInSec.slice(0, 2)) {
                try {
                  const plId = (plItem.id || '').replace(/^VL/, '');
                  const plData = await yt.music.getPlaylist(plId);
                  if (plData && plData.items && plData.items.length > 0) {
                    const plSongs: SongItem[] = [];
                    for (const t of plData.items) {
                      const parsedTrack = this.parseMusicItem(t);
                      if (parsedTrack) plSongs.push(parsedTrack);
                    }
                    if (plSongs.length >= 4) {
                      const plTitle = plItem.title?.text || plItem.title?.toString() || (plData as any)?.title?.toString() || (plData as any)?.header?.title?.toString() || 'Featured Hits';
                      sections.push({
                        title: plTitle,
                        items: plSongs.slice(0, 15),
                      });
                    }
                  }
                } catch {}
              }
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Innertube getHomeFeed failed, using curated trending list:', err);
    }

    if (sections.length < 3) {
      // Fallback search popular charts
      const popSongs = await this.search('top trending songs global hits', 'songs');
      if (popSongs.length > 0) {
        sections.push({
          title: 'Trending Global Hits',
          items: popSongs.slice(0, 15),
        });
      }

      const chillSongs = await this.search('chill lofi acoustic music', 'songs');
      if (chillSongs.length > 0) {
        sections.push({
          title: 'Chill & Relaxing Picks',
          items: chillSongs.slice(0, 15),
        });
      }
    }

    return sections;
  }

  /**
   * Get Up Next recommendations (Continuous radio autoplay queue)
   */
  static async getNextRecommendations(videoId: string): Promise<SongItem[]> {
    try {
      const yt = await this.getInstance();
      const upNext = await yt.music.getUpNext(videoId);

      const songs: SongItem[] = [];
      if (upNext.contents && Array.isArray(upNext.contents)) {
        for (const item of upNext.contents) {
          const song = this.parseMusicItem(item);
          if (song && song.id !== videoId) songs.push(song);
        }
      }

      if (songs.length > 0) return songs;
    } catch {
      // YouTube enforces BotGuard on datacenter IPs; cleanly fallback to smart search recommendations
    }

    // Resilient fallback: search popular radio mix recommendations
    try {
      const fallbackTracks = await this.search('trending hits radio mix');
      return fallbackTracks.filter((s) => s.id !== videoId).slice(0, 15);
    } catch {
      return [];
    }
  }

  // In-memory cache for resolved stream URLs (videoId -> { url, expiry })
  private static streamCache = new Map<string, { url: string; expiry: number }>();

  /**
   * Directly stream audio to response using Innertube.download with full deciphering,
   * with fallback to deciphered streaming data and multi-client resolution.
   */
  static async getAudioStream(videoId: string, range?: string): Promise<{
    stream: NodeJS.ReadableStream;
    headers: Record<string, string>;
    status: number;
  }> {
    // 1. Primary: Innertube.download() with full player deciphering
    try {
      const yt = await this.getInstance();
      const webStream = await yt.download(videoId, {
        type: 'audio',
        quality: 'best',
        format: 'any',
      });
      if (webStream) {
        const nodeStream = Readable.fromWeb(webStream as any);
        return {
          stream: nodeStream,
          headers: {
            'Content-Type': 'audio/webm',
            'Accept-Ranges': 'bytes',
          },
          status: 200,
        };
      }
    } catch {
      // Fall through to secondary CDN resolver if direct download is unavailable
    }

    // 2. Secondary: Deciphered stream format via yt.getStreamingData or info
    try {
      const streamUrl = await this.resolveStreamUrl(videoId);
      if (streamUrl) {
        const requestHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Range': range || 'bytes=0-',
        };

        const res = await axios.get(streamUrl, {
          headers: requestHeaders,
          responseType: 'stream',
          timeout: 15000,
          validateStatus: (s) => s >= 200 && s < 400,
        });

        const responseHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(k.toLowerCase())) {
            responseHeaders[k] = v as string;
          }
        }

        return {
          stream: res.data,
          headers: responseHeaders,
          status: res.status,
        };
      }
    } catch (err: any) {
      console.warn(`Deciphered stream fetch failed for ${videoId}:`, err?.message || err);
    }

    // 3. Tertiary: Direct multi-client stream
    try {
      const directResult = await this.resolveViaMultiClientPlayer(videoId);
      if (directResult?.url) {
        const res = await axios.get(directResult.url, {
          headers: {
            'User-Agent': directResult.userAgent,
            'Range': range || 'bytes=0-',
            'Accept': '*/*',
          },
          responseType: 'stream',
          timeout: 15000,
          validateStatus: (s) => s >= 200 && s < 400,
        });

        const responseHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(k.toLowerCase())) {
            responseHeaders[k] = v as string;
          }
        }

        return {
          stream: res.data,
          headers: responseHeaders,
          status: res.status,
        };
      }
    } catch (err: any) {
      console.warn(`Direct multi-client stream fetch failed for ${videoId}:`, err?.message || err);
    }

    throw new Error(`Could not obtain playable audio stream for ${videoId}`);
  }

  /**
   * Resolve best direct playable audio stream URL.
   * Matches Cadence Android's multi-client StreamUrlResolver (ANDROID_VR, TVHTML5_SIMPLY_EMBEDDED_PLAYER, IOS)
   * which provide direct unthrottled audio streams without cipher signature restrictions.
   */
  static async resolveStreamUrl(videoId: string): Promise<string | null> {
    const cached = this.streamCache.get(videoId);
    if (cached && cached.expiry > Date.now()) {
      return cached.url;
    }

    // 1. Primary: Direct InnerTube player multi-client resolver (matching Android Cadence)
    const directResult = await this.resolveViaMultiClientPlayer(videoId);
    if (directResult?.url) {
      this.streamCache.set(videoId, { url: directResult.url, expiry: Date.now() + 3600 * 1000 });
      return directResult.url;
    }

    // 2. Secondary fallback: Innertube library instance
    try {
      const yt = await this.getInstance();
      const info = await yt.getInfo(videoId);
      const streamingData = info.streaming_data;

      if (streamingData) {
        const formats = [
          ...(streamingData.adaptive_formats || []),
          ...(streamingData.formats || []),
        ];

        // Direct URLs (no ciphering required)
        const directAudio = formats.find((f) => f.has_audio && !f.has_video && f.url && !f.signature_cipher);
        if (directAudio?.url) {
          this.streamCache.set(videoId, { url: directAudio.url, expiry: Date.now() + 3600 * 1000 });
          return directAudio.url;
        }

        // Try decipher safely with try/catch
        const cipherFormat = formats.find((f) => f.has_audio && !f.has_video);
        if (cipherFormat && typeof cipherFormat.decipher === 'function') {
          try {
            const url = await cipherFormat.decipher(yt.session.player);
            if (url) {
              this.streamCache.set(videoId, { url, expiry: Date.now() + 3600 * 1000 });
              return url;
            }
          } catch {
            // Decipher error ignored
          }
        }
      }
    } catch {
      // Fall through to YouTube client player if direct CDN deciphering is unavailable
    }

    return null;
  }

  /**
   * Multi-client InnerTube player endpoint resolver.
   * Mimics Android Cadence StreamUrlResolver profiles.
   */
  private static async resolveViaMultiClientPlayer(videoId: string): Promise<{ url: string; userAgent: string } | null> {
    const clients = [
      // 1. Android VR (1.43.32) - Primary Cadence Android client
      {
        id: '28',
        version: '1.43.32',
        userAgent: 'com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)',
        body: {
          videoId,
          context: {
            client: {
              clientName: 'ANDROID_VR',
              clientVersion: '1.43.32',
              deviceMake: 'Oculus',
              deviceModel: 'Quest 3',
              osName: 'Android',
              osVersion: '12',
              androidSdkVersion: '32',
              gl: 'US',
              hl: 'en',
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
        },
      },
      // 2. TVHTML5 Embedded Player (Bypasses age & sign restrictions)
      {
        id: '85',
        version: '2.0',
        userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 4/12.02) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
        body: {
          videoId,
          context: {
            client: {
              clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
              clientVersion: '2.0',
              gl: 'US',
              hl: 'en',
            },
            thirdParty: {
              embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
        },
      },
      // 3. iOS Client
      {
        id: '5',
        version: '21.03.1',
        userAgent: 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
        body: {
          videoId,
          context: {
            client: {
              clientName: 'IOS',
              clientVersion: '21.03.1',
              deviceMake: 'Apple',
              deviceModel: 'iPhone16,2',
              osName: 'iOS',
              osVersion: '18.2.22C152',
              gl: 'US',
              hl: 'en',
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
        },
      },
      // 4. Android No-SDK Client
      {
        id: '3',
        version: '21.03.38',
        userAgent: 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
        body: {
          videoId,
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '21.03.38',
              osName: 'Android',
              osVersion: '14',
              androidSdkVersion: '34',
              gl: 'US',
              hl: 'en',
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
        },
      },
    ];

    for (const c of clients) {
      try {
        const res = await axios.post(
          'https://music.youtube.com/youtubei/v1/player',
          c.body,
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': c.userAgent,
              'X-YouTube-Client-Name': c.id,
              'X-YouTube-Client-Version': c.version,
              Origin: 'https://music.youtube.com',
              Referer: 'https://music.youtube.com/',
            },
            timeout: 6000,
          }
        );

        const data = res.data;
        if (data?.playabilityStatus?.status === 'OK' && data.streamingData) {
          const formats = [
            ...(data.streamingData.adaptiveFormats || []),
            ...(data.streamingData.formats || []),
          ];

          // Filter formats that have direct URLs
          const withDirectUrl = formats.filter(
            (f: any) => typeof f.url === 'string' && f.url.startsWith('http')
          );

          if (withDirectUrl.length > 0) {
            // Prioritize audio formats (e.g. audio/webm or audio/mp4)
            const audioFormat =
              withDirectUrl.find((f: any) => f.mimeType?.startsWith('audio/') && !f.mimeType?.includes('video')) ||
              withDirectUrl.find((f: any) => f.mimeType?.includes('audio')) ||
              withDirectUrl[0];

            if (audioFormat?.url) {
              return { url: audioFormat.url, userAgent: c.userAgent };
            }
          }
        }
      } catch (err: any) {
        // Try next client profile
      }
    }

    return null;
  }

  /**
   * Direct InnerTube search endpoint fallback
   */
  private static async directSearchFallback(query: string): Promise<SongItem[]> {
    try {
      const res = await axios.post(
        'https://music.youtube.com/youtubei/v1/search',
        {
          query,
          params: 'Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D', // FILTER_SONG
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://music.youtube.com/',
          },
          timeout: 6000,
        }
      );

      const items: SongItem[] = [];
      const sections = res.data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of sections) {
        const listItems = section?.musicShelfRenderer?.contents || [];
        for (const it of listItems) {
          const song = this.parseMusicResponsiveListItem(it);
          if (song) items.push(song);
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  static parseImportedItem(item: any): SongItem | null {
    return this.parseMusicItem(item);
  }

  private static parseMusicItem(item: any): SongItem | null {
    if (!item) return null;

    // Reject non-song types if explicitly marked as playlist, album, or artist
    if (item.item_type && !['song', 'video'].includes(item.item_type)) {
      return null;
    }

    const rawId = item.video_id || (item.endpoint?.payload?.videoId) || item.id;
    if (!rawId || typeof rawId !== 'string') return null;

    // Valid YouTube Video IDs are strictly 11 characters (not playlist IDs starting with VL, PL, RD, etc.)
    if (!/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
      return null;
    }
    const id = rawId;

    const title = item.title?.text || item.title?.toString() || item.name || 'Unknown Track';
    const artistName = item.author?.name || item.artists?.[0]?.name || (Array.isArray(item.artists) ? item.artists.map((a: any) => a.name).join(', ') : 'Various Artists');
    const duration = item.duration?.seconds || item.duration?.text || '';

    let thumbnail = '';
    if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
      thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
    } else if (item.thumbnail?.url) {
      thumbnail = item.thumbnail.url;
    } else if (Array.isArray(item.thumbnail) && item.thumbnail.length > 0) {
      thumbnail = item.thumbnail[item.thumbnail.length - 1].url;
    } else {
      thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }

    return {
      id,
      title,
      artists: [{ name: artistName }],
      durationText: typeof duration === 'string' ? duration : undefined,
      durationSeconds: typeof duration === 'number' ? duration : undefined,
      thumbnailUrl: thumbnail,
    };
  }

  private static parseMusicResponsiveListItem(it: any): SongItem | null {
    try {
      const renderer = it.musicResponsiveListItemRenderer;
      if (!renderer) return null;

      const videoId = renderer.playlistItemData?.videoId || renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
      if (!videoId) return null;

      const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown Track';
      const artistRuns = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const artistName = artistRuns[0]?.text || 'Various Artists';
      const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      const thumbUrl = thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      return {
        id: videoId,
        title,
        artists: [{ name: artistName }],
        thumbnailUrl: thumbUrl,
      };
    } catch {
      return null;
    }
  }
}
