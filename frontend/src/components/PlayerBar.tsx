import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  FileText,
  Heart,
  FolderPlus,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface PlayerBarProps {
  onOpenNowPlaying: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onOpenNowPlaying,
  onToggleLyrics,
  onToggleQueue,
  isLyricsOpen,
  isQueueOpen,
}) => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffling,
    repeatMode,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    setVolumeLevel,
    toggleMute,
    toggleLikeSong,
    isLiked,
    setTargetSongForPlaylist,
    queue,
  } = usePlayer();

  if (!currentSong) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeekChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pos * duration);
  };

  const liked = isLiked(currentSong.id);

  return (
    <div
      className="player-bar"
      onClick={onOpenNowPlaying}
      role="button"
      tabIndex={0}
      title="Click to expand player & lyrics"
    >
      {/* Left: Track Information (Click to expand player & lyrics like Spotify) */}
      <div
        className="player-track-info"
        onClick={onOpenNowPlaying}
        title="Tap to expand full player & lyrics"
        style={{ cursor: 'pointer' }}
      >
        <div className={`vinyl-disc ${isPlaying ? 'rotating' : ''}`}>
          <img
            src={currentSong.thumbnailUrl || `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg`}
            alt={currentSong.title}
            className="vinyl-img"
          />
        </div>

        <div className="track-text">
          <div className="track-title" title={currentSong.title}>
            {currentSong.title}
          </div>
          <div className="track-artist">
            {currentSong.artists && currentSong.artists.length > 0
              ? currentSong.artists.map((a) => a.name).join(', ')
              : 'YouTube Music'}
          </div>
        </div>

        <button
          className={`icon-btn ${liked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleLikeSong(currentSong);
          }}
          title={liked ? 'Remove from favorites' : 'Add to favorites'}
          style={{ color: liked ? '#ff2d55' : undefined }}
        >
          <Heart size={18} fill={liked ? '#ff2d55' : 'none'} />
        </button>

        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            setTargetSongForPlaylist(currentSong);
          }}
          title="Add current song to playlist"
        >
          <FolderPlus size={18} />
        </button>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="player-center" onClick={(e) => e.stopPropagation()}>
        <div className="player-controls">
          <button
            className={`icon-btn ${isShuffling ? 'active' : ''}`}
            onClick={toggleShuffle}
            title={isShuffling ? 'Shuffle enabled' : 'Shuffle disabled'}
          >
            <Shuffle size={17} />
          </button>

          <button className="icon-btn" onClick={playPrevious} title="Previous track">
            <SkipBack size={19} />
          </button>

          <button
            className="play-pause-btn"
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={19} fill="#000000" color="#000000" />
            ) : (
              <Play size={19} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button className="icon-btn" onClick={playNext} title="Next track">
            <SkipForward size={19} />
          </button>

          <button
            className={`icon-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={toggleRepeat}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <span className="time-text">{formatTime(currentTime)}</span>
          <div className="progress-bar-wrap" onClick={handleSeekChange}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="time-text">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Actions, Queue, Lyrics, Volume */}
      <div className="player-extras" onClick={(e) => e.stopPropagation()}>
        {/* Play Queue Toggle - Prominent & Visible */}
        <button
          className={`icon-btn queue-toggle-btn ${isQueueOpen ? 'active' : ''}`}
          onClick={onToggleQueue}
          title={`Play Queue (${queue.length} tracks)`}
        >
          <ListMusic size={20} />
          {queue.length > 0 && (
            <span className="queue-pill-badge">{queue.length}</span>
          )}
        </button>

        {/* Synced Lyrics Toggle */}
        <button
          className={`icon-btn ${isLyricsOpen ? 'active' : ''}`}
          onClick={onToggleLyrics}
          title="Synchronized Lyrics"
        >
          <FileText size={18} />
        </button>

        {/* Volume Slider */}
        <div className="volume-slider-wrap">
          <button className="icon-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  );
};
