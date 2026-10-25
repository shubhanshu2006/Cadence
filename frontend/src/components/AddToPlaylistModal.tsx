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

  const handleSelectPlaylist = (playlistId: string) => {
    addSongToPlaylist(playlistId, targetSongForPlaylist);
    setTargetSongForPlaylist(null);
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newId = createPlaylist(newPlaylistName.trim());
    addSongToPlaylist(newId, targetSongForPlaylist);
    setNewPlaylistName('');
    setIsCreating(false);
    setTargetSongForPlaylist(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setTargetSongForPlaylist(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderPlus size={22} color="#ff2d55" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add to Playlist</h3>
          </div>
          <button className="icon-btn" onClick={() => setTargetSongForPlaylist(null)}>
            <X size={20} />
          </button>
        </div>

        {/* Target Song Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 10,
          }}
        >
          <img
            src={targetSongForPlaylist.thumbnailUrl || `https://i.ytimg.com/vi/${targetSongForPlaylist.id}/hqdefault.jpg`}
            alt={targetSongForPlaylist.title}
            style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
          />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {targetSongForPlaylist.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {targetSongForPlaylist.artists.map((a) => a.name).join(', ')}
            </div>
          </div>
        </div>

        {/* Existing Playlists List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
          {playlists.map((pl) => {
            const alreadyInPlaylist = pl.songs.some((s) => s.id === targetSongForPlaylist.id);

            return (
              <div
                key={pl.id}
                className="playlist-picker-item"
                onClick={() => handleSelectPlaylist(pl.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="playlist-mini-art">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ListMusic size={16} color="var(--text-muted)" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{pl.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      {pl.songs.length} {pl.songs.length === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                </div>

                {alreadyInPlaylist ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#10b981' }}>
                    <Check size={14} /> Added
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+ Add</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Playlist option */}
        {!isCreating ? (
          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} />
            <span>Create New Playlist</span>
          </button>
        ) : (
          <form onSubmit={handleCreateAndAdd} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              autoFocus
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 8,
                padding: '0.6rem 0.9rem',
                color: 'white',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1rem' }}>
              Create & Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
