import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, Pause, Music, X, ListPlus, FolderPlus, Sparkles } from 'lucide-react';
import { SongItem } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { apiFetch } from '../utils/api';

export const SearchView: React.FC = () => {
  const { currentSong, isPlaying, playSong, togglePlayPause, addToQueue, setTargetSongForPlaylist } = usePlayer();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SongItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const GENRES = [
    { name: 'Billboard Hits', icon: '🏆', query: 'billboard hot 100 hits' },
    { name: 'Bollywood Hits', icon: '🌟', query: 'top bollywood trending songs' },
    { name: 'Chill Lofi', icon: '☕', query: 'chill lofi beats study relax' },
    { name: 'Pop Anthems', icon: '⚡', query: 'pop anthems top global hits' },
    { name: 'Rock & Indie', icon: '🎸', query: 'rock indie top tracks' },
    { name: 'Hip-Hop', icon: '🎤', query: 'hip hop top hits' },
    { name: 'Electronic / EDM', icon: '🎧', query: 'electronic edm festival hits' },
    { name: 'Romantic Vibes', icon: '💖', query: 'romantic love songs hits' },
    { name: 'Acoustic & Unplugged', icon: '🌿', query: 'acoustic guitar unplugged covers' },
  ];

  const BROWSE_CATEGORIES = [
    { title: 'Global Top Hits', subtitle: 'Trending across the charts', gradient: 'linear-gradient(135deg, #ff2d55 0%, #b829e3 100%)', query: 'top global hits 2026' },
    { title: 'Bollywood & Hindi', subtitle: 'Blockbuster tracks & melodies', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', query: 'top bollywood songs' },
    { title: 'Chill & Study Lofi', subtitle: 'Mellow beats & cozy acoustics', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', query: 'chill lofi study' },
    { title: 'Night Vibes & Romance', subtitle: 'Soulful melodies for the soul', gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', query: 'romantic night songs' },
    { title: 'Workout & Energy', subtitle: 'High-octane workout motivation', gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', query: 'workout energy gym motivation' },
    { title: 'Party & Dance Anthems', subtitle: 'Club bangers and dance hits', gradient: 'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)', query: 'club dance party hits' },
  ];

  // Fetch autocomplete suggestions as user types
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      apiFetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.suggestions) setSuggestions(data.suggestions);
        })
        .catch(() => {});
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const executeSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setIsLoading(true);
    setShowSuggestions(false);

    apiFetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.items || []);
        setIsLoading(false);
      })
      .catch(() => {
        setResults([]);
        setIsLoading(false);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Search Input Box */}
      <div className="search-input-wrap">
        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <SearchIcon size={20} className="search-icon-pos" />
          <input
            type="text"
            className="search-input"
            placeholder="Search songs, artists, or genres on YouTube Music..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {query && (
            <button
              type="button"
              className="icon-btn"
              style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)' }}
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setResults([]);
              }}
            >
              <X size={18} />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="suggestion-item"
                  onClick={() => {
                    executeSearch(item);
                  }}
                >
                  <SearchIcon size={16} color="var(--text-dim)" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Genre Filter Pills */}
      <div className="genre-pills-row">
        {GENRES.map((g) => {
          const isActive = query.toLowerCase() === g.name.toLowerCase() || query.toLowerCase() === g.query.toLowerCase();
          return (
            <button
              key={g.name}
              className={`genre-pill ${isActive ? 'active' : ''}`}
              onClick={() => {
                executeSearch(g.query);
              }}
            >
              <span className="genre-pill-icon">{g.icon}</span>
              <span>{g.name}</span>
            </button>
          );
        })}
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="search-loading-box">
          <div className="search-spinner" />
          <span>Searching YouTube Music...</span>
        </div>
      ) : results.length > 0 ? (
        <div>
          <h2 className="section-title" style={{ marginBottom: '1.2rem' }}>
            <Music size={20} color="#ff2d55" />
            <span>Search Results for "{query}"</span>
          </h2>
          <div className="grid-3x3">
            {results.map((song, sIdx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const isThisSelected = currentSong?.id === song.id;

              return (
                <div
                  key={`search-${song.id}-${sIdx}`}
                  className={`speed-dial-card ${isThisSelected ? 'active-playing' : ''}`}
                  onClick={() => {
                    if (isThisSelected) {
                      togglePlayPause();
                    } else {
                      playSong(song, results);
                    }
                  }}
                >
                  <img
                    src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                    alt={song.title}
                    className="speed-dial-thumb"
                    loading="lazy"
                  />
                  <div className="speed-dial-info">
                    <div className="speed-dial-title">{song.title}</div>
                    <div className="speed-dial-artist">
                      {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Various Artists'}
                    </div>
                  </div>

                  <div className="card-action-btns" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="card-quick-btn"
                      onClick={() => addToQueue(song)}
                      title="Add to queue"
                    >
                      <ListPlus size={15} />
                    </button>

                    <button
                      className="card-quick-btn"
                      onClick={() => setTargetSongForPlaylist(song)}
                      title="Add to playlist"
                    >
                      <FolderPlus size={15} />
                    </button>

                    <button
                      className="play-hover-btn"
                      onClick={() => {
                        if (isThisSelected) {
                          togglePlayPause();
                        } else {
                          playSong(song, results);
                        }
                      }}
                      title={isThisPlaying ? 'Pause' : 'Play'}
                    >
                      {isThisPlaying ? <Pause size={15} fill="white" /> : <Play size={15} fill="white" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : query.trim() ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-dim)' }}>
          No songs found for "{query}". Try searching for another artist or song name.
        </div>
      ) : (
        <div className="search-explore-section">
          <h2 className="section-title" style={{ marginBottom: '1.2rem' }}>
            <Sparkles size={20} color="#ff2d55" />
            <span>Explore Genres & Moods</span>
          </h2>
          <div className="search-categories-grid">
            {BROWSE_CATEGORIES.map((cat, idx) => (
              <div
                key={idx}
                className="category-card"
                style={{ background: cat.gradient }}
                onClick={() => executeSearch(cat.query)}
              >
                <div className="category-title">{cat.title}</div>
                <div className="category-subtitle">{cat.subtitle}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
