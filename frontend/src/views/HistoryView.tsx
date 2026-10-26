import React from 'react';
import { History, ListPlus, FolderPlus, Play, Pause } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const HistoryView: React.FC = () => {
  const {
    history,
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    addToQueue,
    setTargetSongForPlaylist,
  } = usePlayer();

  return (
    <div className="history-page">
      <div className="section-header">
        <div>
          <h1 className="section-title">
            <History size={24} color="#8b5cf6" />
            <span>Listening History</span>
          </h1>
          <p className="history-subtitle">Rediscover the songs you played recently.</p>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="grid-3x3">
          {history.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            const isPlayingThis = isCurrent && isPlaying;
            return (
              <div
                key={`history-${song.id}-${index}`}
                className={`speed-dial-card ${isCurrent ? 'active-playing' : ''}`}
                onClick={() => (isCurrent ? togglePlayPause() : playSong(song))}
              >
                <img
                  src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                  alt={song.title}
                  className="speed-dial-thumb"
                  loading="lazy"
                />
                <div className="speed-dial-info">
                  <div className="speed-dial-title" title={song.title}>{song.title}</div>
                  <div className="speed-dial-artist">
                    {song.artists?.map((artist) => artist.name).join(', ') || 'Various Artists'}
                  </div>
                </div>
                <div className="card-action-btns" onClick={(event) => event.stopPropagation()}>
                  <button className="card-quick-btn" onClick={() => addToQueue(song)} title="Add to queue">
                    <ListPlus size={15} />
                  </button>
                  <button className="card-quick-btn" onClick={() => setTargetSongForPlaylist(song)} title="Add to playlist">
                    <FolderPlus size={15} />
                  </button>
                  <button
                    className="play-hover-btn"
                    onClick={() => (isCurrent ? togglePlayPause() : playSong(song))}
                    title={isPlayingThis ? 'Pause' : 'Play'}
                  >
                    {isPlayingThis ? <Pause size={15} fill="white" /> : <Play size={15} fill="white" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="history-empty-state">
          <History size={44} />
          <h2>No listening history yet</h2>
          <p>Play a song and it will appear here for easy replay.</p>
        </div>
      )}
    </div>
  );
};
