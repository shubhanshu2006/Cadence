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
              <span style={{ width: 36, textAlign: 'center' }}>#</span>
              <span style={{ flex: 1 }}>Title</span>
              <span style={{ width: 200 }}>Artist</span>
              <span style={{ width: 120, textAlign: 'right' }}>Actions</span>
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
                  <span style={{ width: 36, textAlign: 'center', color: isThisCurrent ? '#ff2d55' : 'var(--text-dim)' }}>
                    {isThisPlaying ? '▶' : idx + 1}
                  </span>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0 }}>
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

                  <span style={{ width: 200, color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Unknown'}
                  </span>

                  <div
                    style={{ width: 120, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            <Library size={26} color="#ff2d55" />
            <span>Your Playlists</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.3rem' }}>
            Create, customize, and play your personalized collections.
          </p>
        </div>

        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={18} />
          <span>New Playlist</span>
        </button>
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

            <div style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pl.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
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
    </div>
  );
};
