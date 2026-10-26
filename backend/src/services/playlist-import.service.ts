import axios from 'axios';
import { YouTubeService } from './youtube.service.js';
import { SongItem } from '../types/index.js';

export class PlaylistImportService {
  static async import(provider: 'spotify' | 'youtube', url: string): Promise<{ name: string; songs: SongItem[] }> {
    const parsedUrl = new URL(url);
    if (provider === 'youtube') {
      const playlistId = parsedUrl.searchParams.get('list');
      if (!playlistId) throw new Error('That is not a YouTube playlist URL.');
      const yt = await YouTubeService.getInstance();
      const playlist = await yt.music.getPlaylist(playlistId.replace(/^VL/, ''));
      const songs = (playlist.items || [])
        .map((item: any) => YouTubeService.parseImportedItem(item))
        .filter((song: SongItem | null): song is SongItem => song !== null);
      return {
        name: String((playlist as any).title || 'Imported YouTube Playlist'),
        songs,
      };
    }

    if (parsedUrl.hostname !== 'open.spotify.com') {
      throw new Error('Use a public open.spotify.com playlist URL.');
    }
    const playlistId = parsedUrl.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/)?.[1];
    if (!playlistId) throw new Error('That is not a Spotify playlist URL.');
    const response = await axios.get(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const html = String(response.data);
    const entitiesMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!entitiesMatch) throw new Error('Spotify did not provide readable playlist data.');
    const data = JSON.parse(entitiesMatch[1]);
    const entity = data?.props?.pageProps?.state?.data?.entity;
    const tracks = entity?.trackList || [];
    const spotifyTracks = tracks
      .map((track: any) => {
        const title = track.title || track.track?.name;
        const artist = track.subtitle || track.track?.artists?.map((item: any) => item.name).join(', ');
        const uri = track.uri || track.track?.uri;
        const id = uri?.split(':').pop();
        return title && artist && id
          ? {
              id,
              title: `${title} - ${artist}`,
              artists: [{ name: artist }],
              thumbnailUrl: track.imageUrl || '',
            }
          : null;
      })
      .filter((song: SongItem | null): song is SongItem => song !== null);
    const songs: SongItem[] = [];
    for (const track of spotifyTracks.slice(0, 100)) {
      const matches = await YouTubeService.search(track.title, 'songs');
      const match = matches.find((item) =>
        item.title.toLowerCase().includes(track.title.toLowerCase().split(' - ')[0])
      ) || matches[0];
      if (match) songs.push(match);
    }
    return { name: entity?.name || 'Imported Spotify Playlist', songs };
  }
}
