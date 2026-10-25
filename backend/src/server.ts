import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { YouTubeService } from './services/youtube.service.js';
import { LyricsService } from './services/lyrics.service.js';
import { WeatherService } from './services/weather.service.js';
import { RssService } from './services/rss.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // Allow web player origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Authorization'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type']
}));

app.use(express.json());

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Nyxora Web API',
    version: '1.0.0',
  });
});

// Home Feed (Charts, Quick Picks, Trending)
app.get('/api/home', async (_req: Request, res: Response) => {
  try {
    const feed = await YouTubeService.getHomeFeed();
    res.json({ sections: feed });
  } catch (err: any) {
    console.error('Home feed error:', err);
    res.status(500).json({ error: 'Failed to fetch home feed' });
  }
});

// Search
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const filter = (req.query.filter as any) || 'songs';
    if (!q || !q.trim()) {
      res.json({ items: [] });
      return;
    }
    const items = await YouTubeService.search(q.trim(), filter);
    res.json({ items });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search Suggestions
app.get('/api/search/suggestions', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      res.json({ suggestions: [] });
      return;
    }
    const suggestions = await YouTubeService.getSuggestions(q.trim());
    res.json({ suggestions });
  } catch {
    res.json({ suggestions: [] });
  }
});

// Continuous Autoplay Radio Refill (Up Next)
app.get('/api/radio/next', async (req: Request, res: Response) => {
  try {
    const videoId = req.query.videoId as string;
    if (!videoId) {
      res.status(400).json({ error: 'Missing videoId' });
      return;
    }
    const recommendations = await YouTubeService.getNextRecommendations(videoId);
    res.json({ items: recommendations });
  } catch (err: any) {
    console.error('Radio next error:', err);
    res.status(500).json({ error: 'Failed to fetch radio recommendations' });
  }
});

// Direct stream URL resolver endpoint (matching Android Nyxora StreamUrlResolver)
app.get('/api/stream-url/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  try {
    const streamUrl = await YouTubeService.resolveStreamUrl(videoId);
    if (!streamUrl) {
      res.status(404).json({ error: 'Could not resolve audio stream' });
      return;
    }
    res.json({ url: streamUrl });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed' });
  }
});

// Audio Stream endpoint (streams audio chunks directly to browser with Range support)
app.get('/api/stream/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  try {
    const rangeHeader = req.headers.range;
    const { stream, headers, status } = await YouTubeService.getAudioStream(videoId, rangeHeader);

    res.status(status);
    for (const [key, val] of Object.entries(headers)) {
      if (val) {
        res.setHeader(key, val);
      }
    }

    req.on('close', () => {
      if (stream && typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
    });

    (stream as any).pipe(res);
  } catch (err: any) {
    console.error(`Stream route failed for ${videoId}:`, err?.message || err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Stream playback unavailable' });
    }
  }
});

// Synced Lyrics (LRCLIB)
app.get('/api/lyrics', async (req: Request, res: Response) => {
  try {
    const title = req.query.title as string;
    const artist = req.query.artist as string;
    const duration = req.query.duration ? parseFloat(req.query.duration as string) : undefined;

    if (!title || !artist) {
      res.status(400).json({ error: 'Missing title or artist' });
      return;
    }

    const lyrics = await LyricsService.getLyrics(title, artist, duration);
    if (!lyrics) {
      res.status(404).json({ error: 'Lyrics not found' });
      return;
    }
    res.json(lyrics);
  } catch (err: any) {
    console.error('Lyrics error:', err);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

// Live Weather Context
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const city = (req.query.city as string) || undefined;
    const weather = await WeatherService.getWeather(lat, lon, city);
    res.json(weather || { cityName: 'Everywhere', temperature: 21, description: 'Good vibes', emoji: '✨' });
  } catch {
    res.json({ cityName: 'Everywhere', temperature: 21, description: 'Good vibes', emoji: '✨' });
  }
});

// Discover News Feed
app.get('/api/discover', async (_req: Request, res: Response) => {
  try {
    const articles = await RssService.getArticles();
    res.json({ articles });
  } catch {
    res.json({ articles: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🎵 Nyxora TypeScript backend is running on http://localhost:${PORT}`);
});
