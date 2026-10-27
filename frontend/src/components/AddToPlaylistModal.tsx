import React, { useState } from 'react';
import { X, FolderPlus, Plus, Check, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const AddToPlaylistModal: React.FC = () => {
  const {
    targetSongForPlaylist,
    setTargetSongForPlaylist,
    playlists,
    addSongToPlaylist,
    createPlaylist,
  } = usePlayer();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!targetSongForPlaylist) return null;

  const closeModal = () => {
    setNewPlaylistName('');
    setIsCreating(false);
    setTargetSongForPlaylist(null);
  };

  const handleSelectPlaylist = (playlistId: string) => {
    addSongToPlaylist(playlistId, targetSongForPlaylist);
    closeModal();
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newId = createPlaylist(newPlaylistName.trim());
    addSongToPlaylist(newId, targetSongForPlaylist);
    closeModal();
  };

  return (
    <div className="modal-overlay playlist-picker-overlay" onClick={closeModal}>
      <div className="modal-content playlist-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="playlist-picker-header">
          <div className="playlist-picker-title">
            <FolderPlus size={22} color="#ff2d55" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add to Playlist</h3>
          </div>
          <button className="icon-btn" onClick={closeModal} aria-label="Close add to playlist">
            <X size={20} />
          </button>
        </div>

        {/* Target Song Info */}
        <div className="playlist-target-song">
          <img
            src={targetSongForPlaylist.thumbnailUrl || `https://i.ytimg.com/vi/${targetSongForPlaylist.id}/hqdefault.jpg`}
            alt={targetSongForPlaylist.title}
            className="playlist-target-art"
          />
          <div className="playlist-target-meta">
            <div className="playlist-target-title">
              {targetSongForPlaylist.title}
            </div>
            <div className="playlist-target-artist">
              {targetSongForPlaylist.artists.map((a) => a.name).join(', ')}
            </div>
          </div>
        </div>

        {/* Existing Playlists List */}
        <div className="playlist-picker-list">
          {playlists.length === 0 && (
            <div className="playlist-picker-empty">
              <ListMusic size={20} />
              <span>No playlists yet. Create one below to get started.</span>
            </div>
          )}
          {playlists.map((pl) => {
            const alreadyInPlaylist = pl.songs.some((s) => s.id === targetSongForPlaylist.id);

            return (
              <div
                key={pl.id}
                className="playlist-picker-item"
                onClick={() => handleSelectPlaylist(pl.id)}
              >
                <div className="playlist-picker-info">
                  <div className="playlist-mini-art">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ListMusic size={16} color="var(--text-muted)" />
                    )}
                  </div>
                  <div className="playlist-picker-copy">
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{pl.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      {pl.songs.length} {pl.songs.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                </div>

                {alreadyInPlaylist ? (
                  <span className="playlist-picker-status playlist-picker-status-added">
                    <Check size={14} /> Added
                  </span>
                ) : (
                  <span className="playlist-picker-status">+ Add</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Playlist option */}
        {!isCreating ? (
          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} />
            <span>Create New Playlist</span>
          </button>
        ) : (
          <form onSubmit={handleCreateAndAdd} className="playlist-create-form">
            <input
              type="text"
              autoFocus
              aria-label="New playlist name"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="playlist-create-input"
            />
            <button type="submit" className="btn-primary playlist-create-submit">
              Create & Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
