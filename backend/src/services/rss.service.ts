import Parser from 'rss-parser';

export interface DiscoverArticle {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  source: string;
}

export class RssService {
  private static parser = new Parser({
    timeout: 8000,
  });

  private static feeds = [
    { name: 'Billboard', url: 'https://www.billboard.com/feed/' },
    { name: 'Rolling Stone', url: 'https://www.rollingstone.com/music/music-news/feed/' },
    { name: 'Pitchfork', url: 'https://pitchfork.com/feed/feed-news/rss' }
  ];

  static async getArticles(): Promise<DiscoverArticle[]> {
    const articles: DiscoverArticle[] = [];

    const jobs = this.feeds.map(async (feed) => {
      try {
        const parsed = await this.parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 4).map((item) => ({
          title: item.title || 'Untitled',
          link: item.link || '#',
          pubDate: item.pubDate,
          contentSnippet: item.contentSnippet || item.content?.slice(0, 160) || '',
          source: feed.name,
        }));
      } catch {
        return [];
      }
    });

    const results = await Promise.all(jobs);
    for (const batch of results) {
      articles.push(...batch);
    }

    // Default fallbacks if network issues occur with RSS
    if (articles.length === 0) {
      articles.push(
        {
          title: 'Grammys Unveil Major Categories & Breakthrough Artist Nominations',
          link: 'https://billboard.com',
          source: 'Music News',
          contentSnippet: 'The music industry gears up for an electrifying award season with new records broken.',
        },
        {
          title: 'Top 50 Global Tracks Making Waves This Week',
          link: 'https://rollingstone.com',
          source: 'Global Charts',
          contentSnippet: 'From indie synth-pop to chart-topping hip-hop anthems, here is what listeners are replaying.',
        }
      );
    }

    return articles;
  }
}
