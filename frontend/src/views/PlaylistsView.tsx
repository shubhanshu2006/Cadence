import React, { useState } from 'react';
import {
  Library,
  Plus,
  Play,
  Shuffle,
  Trash2,
  ArrowLeft,
  ListPlus,
  Music,
  Clock,
  X,
} from 'lucide-react';
import { Playlist, SongItem } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { apiFetch } from '../utils/api';
import { trackEvent } from '../utils/analytics';

const SpotifyLogo: React.FC = () => (
  <svg className="playlist-provider-logo spotify-logo" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="currentColor" />
    <path d="M6.7 9.2c3.45-1.05 7.72-.78 10.63.93" fill="none" stroke="#15121b" strokeWidth="1.55" strokeLinecap="round" />
    <path d="M7.45 12.35c2.82-.75 6.2-.5 8.67.9" fill="none" stroke="#15121b" strokeWidth="1.45" strokeLinecap="round" />
    <path d="M8.2 15.3c2.12-.5 4.52-.26 6.45.77" fill="none" stroke="#15121b" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

const YouTubeMusicLogo: React.FC = () => (
  <svg className="playlist-provider-logo youtube-music-logo" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="currentColor" />
    <path d="M10 7.55 17 12l-7 4.45V7.55Z" fill="#fff" />
    <path d="M6.15 7.2a6.8 6.8 0 0 0 0 9.6M17.85 7.2a6.8 6.8 0 0 1 0 9.6" fill="none" stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".8" />
  </svg>
);

export const PlaylistsView: React.FC = () => {
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    playPlaylist,
    removeSongFromPlaylist,
    addToQueue,
    playSong,
    currentSong,
    isPlaying,
    togglePlayPause,
  } = usePlayer();

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [importProvider, setImportProvider] = useState<'spotify' | 'youtube' | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const id = createPlaylist(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setIsCreateOpen(false);
    setSelectedPlaylistId(id);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setImportError('');
    try {
      const response = await apiFetch('/api/import/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: importProvider, url: importUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Playlist import failed.');
      createPlaylist(
        data.name,
        `Imported from ${importProvider === 'spotify' ? 'Spotify' : 'YouTube Music'}`,
        data.songs as SongItem[]
      );
      trackEvent('playlist_imported', {
        provider: importProvider,
        song_count: Array.isArray(data.songs) ? data.songs.length : 0,
      });
      setImportProvider(null);
      setImportUrl('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Playlist import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  // If a playlist is selected, display its full tracklist and controls
  if (selectedPlaylist) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Back Button */}
        <button
          className="btn-secondary"
          style={{ width: 'fit-content' }}
          onClick={() => setSelectedPlaylistId(null)}
        >
          <ArrowLeft size={16} />
          <span>All Playlists</span>
        </button>

        {/* Playlist Hero Info */}
        <div className="playlist-detail-header">
          <div className="playlist-big-cover">
            {selectedPlaylist.coverUrl ? (
              <img
                src={selectedPlaylist.coverUrl}
                alt={selectedPlaylist.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Library size={64} color="var(--text-dim)" />
            )}
          </div>

          <div className="playlist-detail-meta">
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
              Playlist
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.2rem 0' }}>
              {selectedPlaylist.name}
            </h1>
            {selectedPlaylist.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.2rem 0 0.8rem 0' }}>
                {selectedPlaylist.description}
              </p>
            )}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.2rem' }}>
              {selectedPlaylist.songs.length} {selectedPlaylist.songs.length === 1 ? 'song' : 'songs'} • Created {new Date(selectedPlaylist.createdAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <button
                className="btn-primary"
                disabled={selectedPlaylist.songs.length === 0}
                onClick={() => playPlaylist(selectedPlaylist.id, 0, false)}
              >
                <Play size={18} fill="white" />
                <span>Play</span>
              </button>

              <button
                className="btn-secondary"
                disabled={selectedPlaylist.songs.length === 0}
                onClick={() => playPlaylist(selectedPlaylist.id, 0, true)}
                title="Shuffle play playlist"
              >
                <Shuffle size={18} />
                <span>Shuffle</span>
              </button>

              <button
                className="icon-btn"
                onClick={() => {
                  deletePlaylist(selectedPlaylist.id);
                  setSelectedPlaylistId(null);
                }}
                title="Delete playlist"
                style={{ color: 'var(--text-dim)' }}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        {selectedPlaylist.songs.length > 0 ? (
          <div className="playlist-track-table">
            <div className="track-table-header">
              <span className="track-column-number">#</span>
              <span className="track-column-title">Title</span>
              <span className="track-column-artist">Artist</span>
              <span className="track-column-actions">Actions</span>
            </div>

            {selectedPlaylist.songs.map((song, idx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const isThisCurrent = currentSong?.id === song.id;

              return (
                <div
                  key={`${song.id}-${idx}`}
                  className={`track-table-row ${isThisCurrent ? 'active' : ''}`}
                  onClick={() => {
                    if (isThisCurrent) {
                      togglePlayPause();
                    } else {
                      playPlaylist(selectedPlaylist.id, idx, false);
                    }
                  }}
                >
                  <span className="track-column-number" style={{ color: isThisCurrent ? '#ff2d55' : 'var(--text-dim)' }}>
                    {isThisPlaying ? '▶' : idx + 1}
                  </span>

                  <div className="track-column-title track-title-cell">
                    <img
                      src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                      alt={song.title}
                      style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.92rem',
                          color: isThisCurrent ? '#ff2d55' : 'white',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {song.title}
                      </div>
                    </div>
                  </div>

                  <span className="track-column-artist track-artist-cell">
                    {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Unknown'}
                  </span>

                  <div
                    className="track-column-actions track-actions-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="icon-btn"
                      onClick={() => addToQueue(song)}
                      title="Add to queue"
                    >
                      <ListPlus size={16} />
                    </button>

                    <button
                      className="icon-btn"
                      onClick={() => removeSongFromPlaylist(selectedPlaylist.id, song.id)}
                      title="Remove from playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-dim)' }}>
            <Music size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
            <p>This playlist is empty.</p>
            <p style={{ fontSize: '0.88rem', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
              Add songs from Home, Search, or Favorites by clicking the "+ Playlist" button!
            </p>
          </div>
        )}
      </div>
    );
  }

  // All Playlists Grid View
  return (
    <div className="playlists-page">
      <div className="playlists-hero">
        <div className="playlists-hero-copy">
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            <Library size={26} color="#ff2d55" />
            <span>Your Playlists</span>
          </h1>
          <p>
            Create, customize, and play your personalized collections.
          </p>
        </div>

        <div className="playlists-actions">
          <button className="playlist-import-btn playlist-import-spotify" onClick={() => setImportProvider('spotify')}>
            <SpotifyLogo />
            <span><strong>Import from</strong> Spotify</span>
          </button>
          <button className="playlist-import-btn playlist-import-youtube" onClick={() => setImportProvider('youtube')}>
            <YouTubeMusicLogo />
            <span><strong>Import from</strong> YouTube Music</span>
          </button>
          <button className="btn-primary playlist-new-btn" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="playlists-grid">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="playlist-card glass-card"
            onClick={() => setSelectedPlaylistId(pl.id)}
          >
            <div className="playlist-card-cover">
              {pl.coverUrl ? (
                <img src={pl.coverUrl} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Library size={48} color="var(--text-dim)" />
              )}

              {/* Hover Play Button */}
              {pl.songs.length > 0 && (
                <button
                  className="playlist-hover-play"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPlaylist(pl.id, 0, false);
                  }}
                  title="Play playlist"
                >
                  <Play size={20} fill="white" />
                </button>
              )}
            </div>

            <div className="playlist-card-info">
              <div className="playlist-card-name">
                {pl.name}
              </div>
              <div className="playlist-card-count">
                {pl.songs.length} {pl.songs.length === 1 ? 'track' : 'tracks'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Playlist Modal */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>New Playlist</h3>
              <button className="icon-btn" onClick={() => setIsCreateOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Playlist Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Late Night Drives"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 8,
                    padding: '0.75rem 1rem',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What's the vibe of this playlist?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-highlight)',
                    borderRadius: 8,
                    padding: '0.75rem 1rem',
                    color: 'white',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importProvider && (
        <div className="modal-overlay" onClick={() => !isImporting && setImportProvider(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                Import from {importProvider === 'spotify' ? 'Spotify' : 'YouTube Music'}
              </h3>
              <button className="icon-btn" onClick={() => setImportProvider(null)} disabled={isImporting}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Paste a public playlist URL. A new local playlist will be created.
            </p>
            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="url"
                required
                autoFocus
                placeholder={importProvider === 'spotify' ? 'https://open.spotify.com/playlist/...' : 'https://music.youtube.com/playlist?list=...'}
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-highlight)', borderRadius: 8, padding: '0.75rem 1rem', color: 'white', outline: 'none' }}
              />
              {importError && <p style={{ color: '#ff6b81', fontSize: '0.85rem' }}>{importError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setImportProvider(null)} disabled={isImporting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isImporting}>
                  {isImporting ? 'Importing...' : 'Import Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
