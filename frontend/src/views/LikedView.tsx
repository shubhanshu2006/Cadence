import React from 'react';
import { Heart, ListPlus, FolderPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const LikedView: React.FC = () => {
  const {
    likedSongs,
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    toggleLikeSong,
    addToQueue,
    setTargetSongForPlaylist,
  } = usePlayer();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Favorite Tracks */}
      <div>
        <div className="section-header" style={{ marginBottom: '1.2rem' }}>
          <h2 className="section-title">
            <Heart size={22} color="#ff2d55" fill="#ff2d55" />
            <span>Liked Songs ({likedSongs.length})</span>
          </h2>
        </div>

        {likedSongs.length > 0 ? (
          <div className="grid-3x3">
            {likedSongs.map((song, lIdx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const isThisSelected = currentSong?.id === song.id;

              return (
                <div
                  key={`liked-${song.id}-${lIdx}`}
                  className={`speed-dial-card ${isThisSelected ? 'active-playing' : ''}`}
                  onClick={() => {
                    if (isThisSelected) {
                      togglePlayPause();
                    } else {
                      playSong(song);
                    }
                  }}
                >
                  <img
                    src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                    alt={song.title}
                    className="speed-dial-thumb"
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
                      className="icon-btn active"
                      onClick={() => toggleLikeSong(song)}
                      title="Remove from favorites"
                    >
                      <Heart size={16} fill="#ff2d55" color="#ff2d55" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-dim)' }}>
            No favorites yet. Click the heart icon on any playing song to save it here!
          </div>
        )}
      </div>
    </div>
  );
};
