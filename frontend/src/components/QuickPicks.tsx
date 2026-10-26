import React from 'react';
import { Play, Pause, Sparkles, ListPlus, FolderPlus } from 'lucide-react';
import { SongItem } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface QuickPicksProps {
  title?: string;
  songs: SongItem[];
  isLoading: boolean;
}

export const QuickPicks: React.FC<QuickPicksProps> = ({
  title = 'Quick Picks',
  songs,
  isLoading,
}) => {
  const { currentSong, isPlaying, playSong, togglePlayPause, addToQueue, setTargetSongForPlaylist } = usePlayer();

  if (isLoading) {
    return (
      <div>
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>
          <Sparkles size={20} color="#8b5cf6" />
          <span>{title}</span>
        </h2>
        <div className="quick-picks-row">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="track-card" style={{ opacity: 0.5 }}>
              <div style={{ width: 180, height: 180, background: 'rgba(255,255,255,0.06)', borderRadius: 14 }} />
              <div style={{ height: 14, width: '80%', background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
              <div style={{ height: 10, width: '50%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) return null;

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <h2 className="section-title">
          <Sparkles size={20} color="#8b5cf6" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="quick-picks-row">
        {songs.map((song, qIdx) => {
          const isThisPlaying = currentSong?.id === song.id && isPlaying;
          const isThisSelected = currentSong?.id === song.id;

          return (
            <div
              key={`quick-${song.id}-${qIdx}`}
              className={`track-card ${isThisSelected ? 'track-card-active' : ''}`}
              onClick={() => {
                if (isThisSelected) {
                  togglePlayPause();
                } else {
                  playSong(song);
                }
              }}
            >
              <div className={`track-thumb-wrapper ${isThisSelected ? 'active-playing-thumb' : ''}`}>
                <img
                  src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                  alt={song.title}
                  className="track-thumb"
                  loading="lazy"
                />

                {/* Active Playing Badge */}
                {isThisSelected && (
                  <div className="track-now-playing-badge" title={isThisPlaying ? 'Playing' : 'Paused'}>
                    {isThisPlaying ? (
                      <div className="soundwave-bars">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <Play size={12} fill="white" />
                    )}
                  </div>
                )}

                {/* Desktop-only Mouse Hover Overlay */}
                <div className="track-desktop-hover-overlay" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="track-overlay-small-btn"
                    onClick={() => addToQueue(song)}
                    title="Add to queue"
                    aria-label="Add to queue"
                  >
                    <ListPlus size={15} />
                  </button>

                  <button
                    className="track-overlay-small-btn"
                    onClick={() => setTargetSongForPlaylist(song)}
                    title="Add to playlist"
                    aria-label="Add to playlist"
                  >
                    <FolderPlus size={15} />
                  </button>

                  <button
                    className="track-overlay-play-btn"
                    onClick={() => {
                      if (isThisSelected) {
                        togglePlayPause();
                      } else {
                        playSong(song);
                      }
                    }}
                    title={isThisPlaying ? 'Pause' : 'Play'}
                    aria-label={isThisPlaying ? 'Pause' : 'Play'}
                  >
                    {isThisPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                  </button>
                </div>
              </div>

              <div className="track-info">
                <div className="track-text">
                  <div className="track-title" title={song.title}>
                    {song.title}
                  </div>
                  <div className="track-artist">
                    {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Various Artists'}
                  </div>
                </div>

                {/* Mobile Quick Action Buttons (Add to queue / playlist) */}
                <div className="track-mobile-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="track-inline-action-btn"
                    onClick={() => addToQueue(song)}
                    title="Add to queue"
                    aria-label="Add to queue"
                  >
                    <ListPlus size={14} />
                  </button>
                  <button
                    className="track-inline-action-btn"
                    onClick={() => setTargetSongForPlaylist(song)}
                    title="Add to playlist"
                    aria-label="Add to playlist"
                  >
                    <FolderPlus size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
