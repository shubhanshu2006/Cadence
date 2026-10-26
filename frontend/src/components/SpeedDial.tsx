import React, { useState } from 'react';
import { Play, Pause, Flame, ListPlus, FolderPlus } from 'lucide-react';
import { SongItem } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface SpeedDialProps {
  songs: SongItem[];
  isLoading: boolean;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({ songs, isLoading }) => {
  const { currentSong, isPlaying, playSong, togglePlayPause, addToQueue, setTargetSongForPlaylist } = usePlayer();
  const [currentPage, setCurrentPage] = useState<number>(0);

  const PAGE_SIZE = 9; // 3x3 grid
  const totalPages = Math.ceil(songs.length / PAGE_SIZE) || 1;
  const currentSongs = songs.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="speed-dial-section">
        <div className="section-header">
          <h2 className="section-title">
            <Flame size={20} color="#ff2d55" />
            <span>Speed Dial</span>
          </h2>
        </div>
        <div className="grid-3x3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="speed-dial-card" style={{ opacity: 0.5 }}>
              <div style={{ width: 54, height: 54, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
              <div className="speed-dial-info">
                <div style={{ height: 14, width: '70%', background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) return null;

  return (
    <div className="speed-dial-section">
      <div className="section-header">
        <h2 className="section-title">
          <Flame size={20} color="#ff2d55" />
          <span>Speed Dial</span>
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Page {currentPage + 1} of {totalPages}
        </span>
      </div>

      <div className="grid-3x3">
        {currentSongs.map((song, sIdx) => {
          const isThisPlaying = currentSong?.id === song.id && isPlaying;
          const isThisSelected = currentSong?.id === song.id;

          return (
            <div
              key={`${song.id}-${currentPage}-${sIdx}`}
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
                loading="lazy"
              />
              <div className="speed-dial-info">
                <div className="speed-dial-title" title={song.title}>
                  {song.title}
                </div>
                <div className="speed-dial-artist">
                  {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Various Artists'}
                </div>
              </div>

              {/* Action Buttons on Card */}
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
                      playSong(song);
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

      {totalPages > 1 && (
        <div className="pagination-dots">
          {Array.from({ length: totalPages }).map((_, index) => (
            <div
              key={index}
              className={`dot ${index === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
