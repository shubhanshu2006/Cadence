import React, { useEffect, useState } from 'react';
import { Compass, ExternalLink, Newspaper } from 'lucide-react';
import { DiscoverArticle } from '../types';
import { apiFetch } from '../utils/api';

export const DiscoverView: React.FC = () => {
  const [articles, setArticles] = useState<DiscoverArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    apiFetch('/api/discover')
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            <Compass size={24} color="#06b6d4" />
            <span>Discover Feed</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.3rem' }}>
            Latest music industry headlines, artist spotlights, and cultural stories.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading latest music articles...
        </div>
      ) : articles.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {articles.map((item, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase' }}>
                    {item.source}
                  </span>
                  {item.pubDate && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(item.pubDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4, marginBottom: '0.6rem' }}>
                  {item.title}
                </h3>

                {item.contentSnippet && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {item.contentSnippet.length > 140 ? `${item.contentSnippet.slice(0, 140)}...` : item.contentSnippet}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <span>Read Article</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-dim)' }}>
          <Newspaper size={36} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No headlines available right now.</p>
        </div>
      )}
    </div>
  );
};
