import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  FolderPlus,
  Mic2,
  Music2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getSongArtworkUrl, usePlayer } from '../context/PlayerContext';
import { LyricsData } from '../types';
import { apiFetch } from '../utils/api';

interface NowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQueue: () => void;
  initialTab?: 'poster' | 'lyrics';
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  isOpen,
  onClose,
  onOpenQueue,
  initialTab = 'poster',
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

  const [activeTab, setActiveTab] = useState<'poster' | 'lyrics'>(initialTab);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync tab with initialTab when opening
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch lyrics when song changes or modal opens
  useEffect(() => {
    if (!isOpen || !currentSong) return;

    setIsLoadingLyrics(true);
    const artist = currentSong.artists?.[0]?.name || '';
    const params = new URLSearchParams({
      title: currentSong.title,
      artist,
    });
    if (duration > 0) {
      params.append('duration', duration.toString());
    }

    apiFetch(`/api/lyrics?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: LyricsData) => {
        setLyricsData(data);
        setIsLoadingLyrics(false);
      })
      .catch(() => {
        setLyricsData(null);
        setIsLoadingLyrics(false);
      });
  }, [isOpen, currentSong?.id, duration]);

  // Auto-scroll active lyrics line to center
  useEffect(() => {
    if (activeTab === 'lyrics' && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, activeTab]);

  if (!isOpen || !currentSong) return null;

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
  const posterUrl = getSongArtworkUrl(currentSong);
  const artistNames = currentSong.artists && currentSong.artists.length > 0
    ? currentSong.artists.map((a) => a.name).join(', ')
    : 'Cadence Music';

  // Find active lyrics index
  let activeIndex = -1;
  if (lyricsData?.syncedLyrics) {
    for (let i = 0; i < lyricsData.syncedLyrics.length; i++) {
      if (lyricsData.syncedLyrics[i].time <= currentTime + 0.3) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div className="now-playing-overlay" onClick={onClose}>
      <div className="now-playing-modal" onClick={(e) => e.stopPropagation()}>
        {/* Dynamic Ambient Background Glow */}
        <div
          className="now-playing-bg-art"
          style={{ backgroundImage: `url(${posterUrl})` }}
          aria-hidden="true"
        />
        <div className="now-playing-backdrop-scrim" aria-hidden="true" />

        {/* Top Header Bar */}
        <header className="now-playing-header">
          <button
            type="button"
            className="now-playing-collapse-btn"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            title="Minimize player"
            aria-label="Minimize player"
          >
            <ChevronDown size={28} />
          </button>

          <div className="now-playing-header-info">
            <span className="now-playing-context-subtitle">PLAYING FROM</span>
            <span className="now-playing-context-title">Cadence Radio</span>
          </div>

          <button
            type="button"
            className="now-playing-action-btn"
            onClick={(event) => {
              event.stopPropagation();
              setTargetSongForPlaylist(currentSong);
            }}
            title="Add to playlist"
            aria-label="Add to playlist"
          >
            <FolderPlus size={22} />
          </button>
        </header>

        {/* View Switcher: Poster vs Synced Lyrics */}
        <div className="now-playing-tab-switch">
          <button
            type="button"
            className={`now-playing-tab-btn ${activeTab === 'poster' ? 'active' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              setActiveTab('poster');
            }}
          >
            <Music2 size={16} />
            <span>Poster</span>
          </button>
          <button
            type="button"
            className={`now-playing-tab-btn ${activeTab === 'lyrics' ? 'active' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              setActiveTab('lyrics');
            }}
          >
            <Mic2 size={16} />
            <span>Lyrics</span>
            {lyricsData?.isSynced && <span className="tab-synced-dot" title="Synced" />}
          </button>
        </div>

        {/* Main Center Content (Poster or Synced Lyrics) */}
        <div className="now-playing-body">
          {activeTab === 'poster' ? (
            <div className="now-playing-poster-view">
              <div className="now-playing-poster-wrapper">
                <img
                  src={posterUrl}
                  alt={currentSong.title}
                  className="now-playing-poster-img"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg`;
                  }}
                />
              </div>

              {/* Spotify-style Quick Lyrics Preview Card right underneath artwork */}
              {lyricsData?.syncedLyrics && lyricsData.syncedLyrics.length > 0 && (
                <div
                  className="now-playing-mini-lyrics-card"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveTab('lyrics');
                  }}
                  title="Tap to expand full synchronized lyrics"
                >
                  <div className="mini-lyrics-header">
                    <span className="mini-lyrics-label">LYRICS PREVIEW</span>
                    <span className="mini-lyrics-expand-action">Tap for Full Lyrics →</span>
                  </div>
                  <div className="mini-lyrics-line active-preview">
                    {activeIndex !== -1 && lyricsData.syncedLyrics[activeIndex]
                      ? lyricsData.syncedLyrics[activeIndex].text
                      : lyricsData.syncedLyrics[0]?.text || '♪ Singing along ♪'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="now-playing-lyrics-view" ref={lyricsContainerRef}>
              {isLoadingLyrics ? (
                <div className="lyrics-status-box">
                  <div className="lyrics-spinner" />
                  <p>Loading synchronized lyrics from LRCLIB...</p>
                </div>
              ) : lyricsData?.syncedLyrics && lyricsData.syncedLyrics.length > 0 ? (
                <div className="now-playing-lyrics-list">
                  {lyricsData.syncedLyrics.map((line, idx) => {
                    const isActive = idx === activeIndex;
                    const isPassed = activeIndex > idx;
                    return (
                      <div
                        key={idx}
                        ref={isActive ? activeLineRef : null}
                        className={`now-playing-lyric-line ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                        onClick={() => seekTo(line.time)}
                        title="Click to jump here"
                      >
                        {line.text || '♪ ♪ ♪'}
                      </div>
                    );
                  })}
                </div>
              ) : lyricsData?.plainLyrics ? (
                <div className="now-playing-plain-lyrics">
                  <pre>{lyricsData.plainLyrics}</pre>
                </div>
              ) : (
                <div className="lyrics-status-box">
                  <Mic2 size={36} color="var(--text-dim)" />
                  <p className="no-lyrics-title">No Lyrics Available</p>
                  <p className="no-lyrics-sub">Enjoy the pure melody & music of {currentSong.title}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section: Track Info, Scrubber, and Full Controls */}
        <div className="now-playing-footer">
          {/* Track Info & Like Button */}
          <div className="now-playing-meta-row">
            <div className="now-playing-title-col">
              <h1 className="now-playing-song-title" title={currentSong.title}>
                {currentSong.title}
              </h1>
              <p className="now-playing-artist-name">
                {artistNames}
              </p>
            </div>

            <button
              type="button"
              className={`now-playing-heart-btn ${liked ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleLikeSong(currentSong);
              }}
              title={liked ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={26} fill={liked ? '#ff2a85' : 'none'} color={liked ? '#ff2a85' : 'white'} />
            </button>
          </div>

          {/* Interactive Progress Bar */}
          <div className="now-playing-progress-section">
            <div
              className="now-playing-scrub-bar-wrap"
              onClick={(event) => {
                event.stopPropagation();
                handleSeekChange(event);
              }}
              role="slider"
              aria-valuenow={currentTime}
              aria-valuemax={duration}
            >
              <div
                className="now-playing-scrub-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="now-playing-scrub-thumb"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <div className="now-playing-time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Primary Controls Row */}
          <div className="now-playing-controls-row">
            <button
              type="button"
              className={`now-playing-control-btn ${isShuffling ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleShuffle();
              }}
              title={isShuffling ? 'Shuffle on' : 'Shuffle off'}
              aria-label="Shuffle"
            >
              <Shuffle size={20} />
            </button>

            <button
              type="button"
              className="now-playing-control-btn"
              onClick={(event) => {
                event.stopPropagation();
                playPrevious();
              }}
              title="Previous song"
              aria-label="Previous song"
            >
              <SkipBack size={26} fill="white" />
            </button>

            <button
              type="button"
              className="now-playing-main-play-btn"
              onClick={(event) => {
                event.stopPropagation();
                togglePlayPause();
              }}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={28} fill="#000000" color="#000000" />
              ) : (
                <Play size={28} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
              )}
            </button>

            <button
              type="button"
              className="now-playing-control-btn"
              onClick={(event) => {
                event.stopPropagation();
                playNext();
              }}
              title="Next song"
              aria-label="Next song"
            >
              <SkipForward size={26} fill="white" />
            </button>

            <button
              type="button"
              className={`now-playing-control-btn ${repeatMode !== 'off' ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleRepeat();
              }}
              title={`Repeat: ${repeatMode}`}
              aria-label={`Repeat mode: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Secondary Actions (Queue & Volume) */}
          <div className="now-playing-bottom-extras">
            <div className="now-playing-volume-row">
              <button
                type="button"
                className="now-playing-control-btn icon-small"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleMute();
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                className="now-playing-volume-slider"
                title="Volume"
              />
            </div>

            <button
              type="button"
              className="now-playing-queue-btn"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
                onOpenQueue();
              }}
              title={`Open Queue (${queue.length} songs)`}
            >
              <ListMusic size={20} />
              <span>Queue ({queue.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
