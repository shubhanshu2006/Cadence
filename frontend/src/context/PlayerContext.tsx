import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SongItem, Playlist } from '../types';
import { apiFetch, getApiBaseUrl } from '../utils/api';
import { trackEvent } from '../utils/analytics';

const getNotificationArtworkUrl = (song: SongItem) => {
  return getSongArtworkUrl(song);
};

export const getSongArtworkUrl = (song: SongItem) => {
  if (/^[a-zA-Z0-9_-]{11}$/.test(song.id)) {
    return `https://i.ytimg.com/vi/${song.id}/sddefault.jpg`;
  }

  const thumbnailUrl = song.thumbnailUrl;
  if (!thumbnailUrl) return '';

  return thumbnailUrl
    .replace(/=w\d+-h\d+(?:-[^&]*)?/i, '=w720-h720')
    .replace(/\/w\d+-h\d+\//i, '/w720-h720/');
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

interface PlayerContextType {
  currentSong: SongItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffling: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: SongItem[];
  history: SongItem[];
  likedSongs: SongItem[];
  toastMessage: string | null;
  playlists: Playlist[];

  // Actions
  playSong: (song: SongItem, newQueue?: SongItem[]) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolumeLevel: (val: number) => void;
  toggleMute: () => void;
  toggleLikeSong: (song: SongItem) => void;
  isLiked: (songId: string) => boolean;

  // Queue Operations
  addToQueue: (song: SongItem) => void;
  playNextInQueue: (song: SongItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  reorderQueue: (sourceIndex: number, destinationIndex: number) => void;

  // Playlist Operations
  createPlaylist: (name: string, description?: string, songs?: SongItem[]) => string;
  deletePlaylist: (playlistId: string) => void;
  addSongToPlaylist: (playlistId: string, song: SongItem) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  playPlaylist: (playlistId: string, startIndex?: number, shuffle?: boolean) => void;

  // Modal helpers
  targetSongForPlaylist: SongItem | null;
  setTargetSongForPlaylist: (song: SongItem | null) => void;

  // Toast
  showToast: (msg: string) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

function parseDurationToSeconds(duration: string | number | undefined): number {
  if (typeof duration === 'number') return duration;
  if (!duration) return 0;
  const parts = duration.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const [queue, setQueue] = useState<SongItem[]>([]);
  const [history, setHistory] = useState<SongItem[]>(() => {
    try {
      const saved = localStorage.getItem('cadence_history') || localStorage.getItem('nyxora_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likedSongs, setLikedSongs] = useState<SongItem[]>(() => {
    try {
      const saved = localStorage.getItem('cadence_liked') || localStorage.getItem('nyxora_liked');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('cadence_playlists') || localStorage.getItem('nyxora_playlists');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'playlist-favorites',
        name: 'My Vibes',
        description: 'Personal favorite tracks & daily mix',
        createdAt: Date.now(),
        songs: [],
      },
    ];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [targetSongForPlaylist, setTargetSongForPlaylist] = useState<SongItem | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // YouTube Player References & State Sync Refs
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingSongRef = useRef<SongItem | null>(null);

  const queueRef = useRef<SongItem[]>(queue);
  queueRef.current = queue;
  const currentSongRef = useRef<SongItem | null>(currentSong);
  currentSongRef.current = currentSong;
  const isShufflingRef = useRef<boolean>(isShuffling);
  isShufflingRef.current = isShuffling;
  const repeatModeRef = useRef<'off' | 'all' | 'one'>(repeatMode);
  repeatModeRef.current = repeatMode;
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const manualPauseRef = useRef<boolean>(false);
  const nativeQueueCommandRef = useRef<boolean>(false);
  const queueAppendIndexRef = useRef<number>(-1);

  // Top-level silent audio element: triggers Android MediaSession in notification shade & prevents WebView throttling
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      audio.loop = true;
      audio.volume = 0.001;
      silentAudioRef.current = audio;
    } catch {}

    // Request notification permission if available (Android 13+)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      try {
        silentAudioRef.current?.pause();
      } catch {}
      silentAudioRef.current = null;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Background playback preservation
  useEffect(() => {
    const handleBackgroundPreservation = () => {
      if (manualPauseRef.current || !currentSongRef.current || !isPlayingRef.current) return;

      setTimeout(() => {
        if (ytPlayerRef.current && isPlayingRef.current && !manualPauseRef.current) {
          try {
            const state = ytPlayerRef.current.getPlayerState?.();
            if (state === 2 || state === 5) {
              ytPlayerRef.current.playVideo();
            }
          } catch {}
        }
      }, document.hidden ? 120 : 250);
    };

    document.addEventListener('visibilitychange', handleBackgroundPreservation);
    window.addEventListener('blur', handleBackgroundPreservation);

    return () => {
      document.removeEventListener('visibilitychange', handleBackgroundPreservation);
      window.removeEventListener('blur', handleBackgroundPreservation);
    };
  }, []);

  // Initialize YouTube IFrame Player (Headless Audio Engine)
  useEffect(() => {
    const initPlayer = () => {
      if (window.YT && window.YT.Player && !ytPlayerRef.current) {
        try {
          ytPlayerRef.current = new window.YT.Player('cadence-yt-embed', {
            height: '240',
            width: '240',
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1,
            },
            events: {
              onReady: (event: any) => {
                isYtReadyRef.current = true;
                try {
                  event.target.setVolume(isMutedRef.current ? 0 : volumeRef.current * 100);
                } catch {}
                if (pendingSongRef.current) {
                  const song = pendingSongRef.current;
                  pendingSongRef.current = null;
                  playSong(song);
                }
              },
              onStateChange: (event: any) => {
                // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
                const nativePlayback = typeof window !== 'undefined' && Boolean((window as any).AndroidMediaBridge?.playTrack);
                if (nativePlayback) return;
                if (event.data === 1) {
                  setIsPlaying(true);
                  manualPauseRef.current = false;
                  const dur = event.target.getDuration();
                  if (dur && !isNaN(dur) && dur > 0) {
                    setDuration(dur);
                  }
                } else if (event.data === 2) {
                  if ((document.hidden || !document.hasFocus()) && !manualPauseRef.current && currentSongRef.current) {
                    setTimeout(() => {
                      if (!manualPauseRef.current && currentSongRef.current && ytPlayerRef.current) {
                        try {
                          ytPlayerRef.current.playVideo();
                        } catch {}
                      }
                    }, 120);
                    return;
                  }
                  setIsPlaying(false);
                } else if (event.data === 0) {
                  setIsPlaying(false);
                  handleSongEnded();
                }
              },
              onError: (event: any) => {
                const nativePlayback = typeof window !== 'undefined' && Boolean((window as any).AndroidMediaBridge?.playTrack);
                if (nativePlayback) return;
                console.warn('YouTube Player notice (code:', event.data, ')');
                if (event.data === 150 || event.data === 101 || event.data === 2) {
                  // Restricted embed or unavailable video - advance to next track
                  setIsPlaying(false);
                  setTimeout(() => {
                    playNext();
                  }, 1200);
                }
              },
            },
          });
        } catch (e) {
          console.error('Error instantiating YouTube Player:', e);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        initPlayer();
      };

      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(tag, firstScript);
      }
    }

    return () => {};
  }, []);

  // Real-time progress interval timer while playing
  useEffect(() => {
    const nativePlayback = typeof window !== 'undefined' && Boolean((window as any).AndroidMediaBridge?.playTrack);
    if (nativePlayback) return;

    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        if (ytPlayerRef.current && isYtReadyRef.current) {
          try {
            const cur = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (typeof cur === 'number' && !isNaN(cur)) {
              setCurrentTime(cur);
            }
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setDuration(dur);
            }
          } catch {}
        }
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Persist storage
  useEffect(() => {
    localStorage.setItem('cadence_history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('cadence_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('cadence_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Handle Song Ended (Repeat, Continuous Autoplay)
  const handleSongEnded = () => {
    if (repeatModeRef.current === 'one' && currentSongRef.current) {
      if (ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(0);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    playNext();
  };

  // Play Song function (Direct, instant, authentic YouTube streaming)
  const playSong = (song: SongItem, newQueue?: SongItem[]) => {
    manualPauseRef.current = false;
    setCurrentSong(song);
    setCurrentTime(0);
    trackEvent('song_started', { song_id: song.id });

    // Awaken top-level audio on user gesture for Android Notification shade
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
    }

    if (song.durationSeconds) {
      setDuration(song.durationSeconds);
    } else if (song.durationText) {
      const d = parseDurationToSeconds(song.durationText);
      if (d > 0) setDuration(d);
    }

    // Update queue if provided
    if (newQueue) {
      setQueue(newQueue);
    } else if (!queueRef.current.some((s) => s.id === song.id)) {
      setQueue((prev) => {
        const currentIndex = currentSongRef.current
          ? prev.findIndex((item) => item.id === currentSongRef.current?.id)
          : -1;
        const insertIndex = currentIndex >= 0 ? currentIndex + 1 : prev.length;
        const updated = [...prev];
        updated.splice(insertIndex, 0, song);
        queueAppendIndexRef.current = -1;
        return updated;
      });
    }

    // Add to History
    setHistory((prev) => [song, ...prev.filter((s) => s.id !== song.id)].slice(0, 50));

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
    if (nativeBridge?.playTrack) {
      const currentQueue = newQueue || queueRef.current;
      const requestedQueue = newQueue || (() => {
        const remainingQueue = currentQueue.filter((item) => item.id !== song.id);
        const currentIndex = currentSongRef.current
          ? remainingQueue.findIndex((item) => item.id === currentSongRef.current?.id)
          : -1;
        const insertIndex = currentIndex >= 0 ? currentIndex + 1 : remainingQueue.length;
        remainingQueue.splice(insertIndex, 0, song);
        return remainingQueue;
      })();
      if (newQueue) queueAppendIndexRef.current = -1;
      const nativeQueue = [
        ...requestedQueue,
        ...(requestedQueue.some((item) => item.id === song.id) ? [] : [song]),
      ].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
        .slice(0, 20);
      const nativeStartIndex = Math.max(0, nativeQueue.findIndex((item) => item.id === song.id));
      try {
        ytPlayerRef.current?.pauseVideo?.();
      } catch {}
      silentAudioRef.current?.pause();
      nativeBridge.playTrack(
        song.id,
        song.title,
        song.artists?.map((a) => a.name).join(', ') || 'Cadence Music',
        getNotificationArtworkUrl(song),
        getApiBaseUrl(),
        JSON.stringify(nativeQueue.map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artists?.map((a) => a.name).join(', ') || 'Cadence Music',
            artworkUrl: getNotificationArtworkUrl(item),
          }))),
        nativeStartIndex,
        true
      );
      setIsPlaying(true);
    } else if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById(song.id);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Error loading video in YT Player:', err);
      }
    } else {
      pendingSongRef.current = song;
    }

    // Prefetch next songs for continuous autoplay if queue is running low
    if (queueRef.current.length < 5) {
      apiFetch(`/api/radio/next?videoId=${song.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.items && Array.isArray(data.items)) {
          const existingIds = new Set(queueRef.current.map((item) => item.id));
          const newItems = data.items.filter(
            (item: SongItem) => !existingIds.has(item.id)
          );
          const nativeBridge = typeof window !== 'undefined'
            ? (window as any).AndroidMediaBridge
            : null;
          if (nativeBridge?.appendToQueue) {
            newItems.forEach((item: SongItem) => {
              nativeBridge.appendToQueue(
                item.id,
                item.title,
                item.artists?.map((artist) => artist.name).join(', ') || 'Cadence Music',
                getNotificationArtworkUrl(item)
              );
            });
          }
          setQueue((prev) => {
            const currentIds = new Set(prev.map((item) => item.id));
            return [
              ...prev,
              ...newItems.filter((item: SongItem) => !currentIds.has(item.id)),
            ];
          });
          }
        })
        .catch(() => {});
    }
  };

  const togglePlayPause = () => {
    if (!currentSong) return;

    try {
      const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
      if (nativeBridge?.control) {
        nativeBridge.control(isPlaying
          ? 'com.cadence.web.ACTION_PAUSE'
          : 'com.cadence.web.ACTION_PLAY');
        manualPauseRef.current = isPlaying;
        setIsPlaying(!isPlaying);
        return;
      }

      if (!ytPlayerRef.current || !isYtReadyRef.current) return;
      if (isPlaying) {
        manualPauseRef.current = true;
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
        silentAudioRef.current?.pause();
      } else {
        manualPauseRef.current = false;
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        silentAudioRef.current?.play().catch(() => {});
      }
    } catch (err) {
      console.warn('togglePlayPause error:', err);
    }
  };

  // MediaSession API for Android Notification Shade & Lockscreen Spotify-style card
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    if (typeof window !== 'undefined' && (window as any).AndroidMediaBridge?.playTrack) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artists?.map((a) => a.name).join(', ') || 'Cadence Music',
        album: 'Cadence Music',
        artwork: [
          {
            src: getNotificationArtworkUrl(currentSong),
            sizes: '1280x720',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        manualPauseRef.current = false;
        const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
        if (nativeBridge?.control) {
          nativeBridge.control('com.cadence.web.ACTION_PLAY');
        } else {
          ytPlayerRef.current?.playVideo?.();
        }
        setIsPlaying(true);
        silentAudioRef.current?.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        manualPauseRef.current = true;
        const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
        if (nativeBridge?.control) {
          nativeBridge.control('com.cadence.web.ACTION_PAUSE');
        } else {
          ytPlayerRef.current?.pauseVideo?.();
        }
        setIsPlaying(false);
        silentAudioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        seekTo(Math.max(0, currentTime - skip));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        seekTo(currentTime + skip);
      });
    } catch {}
  }, [currentSong]);

  useEffect(() => {
    const nativePlayback = typeof window !== 'undefined' && Boolean((window as any).AndroidMediaBridge?.playTrack);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    if (silentAudioRef.current) {
      if (nativePlayback) {
        silentAudioRef.current.pause();
      } else if (isPlaying) {
        silentAudioRef.current.play().catch(() => {});
      } else {
        silentAudioRef.current.pause();
      }
    }

  }, [isPlaying, isMuted, volume]);

  // Synchronize dynamic seekbar in Android notification shade
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).AndroidMediaBridge?.playTrack) return;
    if (
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      duration > 0 &&
      !isNaN(duration) &&
      !isNaN(currentTime) &&
      currentTime <= duration
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch {}
    }
  }, [currentTime, duration]);

  // Expose global remote control handlers for Android Native Notification Buttons
  useEffect(() => {
    (window as any).CadenceRemoteControl = {
      play: () => {
        manualPauseRef.current = false;
        const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
        if (nativeBridge?.control) {
          nativeBridge.control('com.cadence.web.ACTION_PLAY');
        } else {
          ytPlayerRef.current?.playVideo?.();
        }
        setIsPlaying(true);
        silentAudioRef.current?.play().catch(() => {});
      },
      pause: () => {
        manualPauseRef.current = true;
        const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
        if (nativeBridge?.control) {
          nativeBridge.control('com.cadence.web.ACTION_PAUSE');
        } else {
          ytPlayerRef.current?.pauseVideo?.();
        }
        setIsPlaying(false);
        silentAudioRef.current?.pause();
      },
      next: () => {
        nativeQueueCommandRef.current = true;
        playNext();
        window.setTimeout(() => {
          nativeQueueCommandRef.current = false;
        }, 500);
      },
      prev: () => {
        nativeQueueCommandRef.current = true;
        playPrevious();
        window.setTimeout(() => {
          nativeQueueCommandRef.current = false;
        }, 500);
      },
    };

    return () => {
      delete (window as any).CadenceRemoteControl;
    };
  }, []);

  useEffect(() => {
    (window as any).CadenceNativeTrack = (videoId: string) => {
      const song = queueRef.current.find((item) => item.id === videoId);
      if (song) {
        setCurrentSong(song);
        setCurrentTime(0);
        if (song.durationSeconds) setDuration(song.durationSeconds);
        else if (song.durationText) {
          const parsedDuration = parseDurationToSeconds(song.durationText);
          if (parsedDuration > 0) setDuration(parsedDuration);
        }
        setHistory((prev) => [song, ...prev.filter((item) => item.id !== song.id)].slice(0, 50));
      }
    };

    return () => {
      delete (window as any).CadenceNativeTrack;
    };
  }, []);

  useEffect(() => {
    (window as any).CadenceNativeProgress = (
      positionMs: number,
      durationMs: number,
      playing: boolean
    ) => {
      if (Number.isFinite(positionMs)) setCurrentTime(Math.max(0, positionMs / 1000));
      if (Number.isFinite(durationMs) && durationMs > 0) {
        setDuration(durationMs / 1000);
      }
      setIsPlaying(playing);
    };

    return () => {
      delete (window as any).CadenceNativeProgress;
    };
  }, []);

  const seekTo = (time: number) => {
    const nextTime = Math.max(0, Number.isFinite(time) ? time : 0);
    setCurrentTime(nextTime);
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
    if (nativeBridge?.seekTo) {
      nativeBridge.seekTo(nextTime);
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(nextTime, true);
      } catch {}
    }
  };

  const playNext = () => {
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
    if (nativeBridge?.control && !nativeQueueCommandRef.current) {
      nativeBridge.control('com.cadence.web.ACTION_NEXT');
      return;
    }
    const currentQ = queueRef.current;
    if (currentQ.length === 0) return;

    const current = currentSongRef.current;
    const currentIndex = current ? currentQ.findIndex((s) => s.id === current.id) : -1;
    let nextIndex = currentIndex + 1;

    if (nextIndex >= currentQ.length) {
      if (repeatModeRef.current === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextSong = currentQ[nextIndex];
    if (nextSong) {
      playSong(nextSong);
    }
  };

  const playPrevious = () => {
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
    if (nativeBridge?.control && !nativeQueueCommandRef.current) {
      nativeBridge.control('com.cadence.web.ACTION_PREV');
      return;
    }
    const currentQ = queueRef.current;
    if (currentQ.length === 0) return;

    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    const current = currentSongRef.current;
    const currentIndex = current ? currentQ.findIndex((s) => s.id === current.id) : 0;
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      playSong(currentQ[prevIndex]);
    } else if (repeatModeRef.current === 'all') {
      playSong(currentQ[currentQ.length - 1]);
    } else {
      seekTo(0);
    }
  };

  const toggleShuffle = () => {
    setIsShuffling((prev) => {
      const next = !prev;
      showToast(next ? 'Shuffle enabled' : 'Shuffle disabled');
      return next;
    });
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      let next: 'off' | 'all' | 'one' = 'off';
      if (prev === 'off') next = 'all';
      else if (prev === 'all') next = 'one';
      else next = 'off';
      showToast(`Repeat mode: ${next.toUpperCase()}`);
      return next;
    });
  };

  const setVolumeLevel = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(val * 100);
        if (val === 0) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
        }
      } catch {}
    }
  };

  const toggleMute = () => {
    if (!ytPlayerRef.current) return;
    if (isMuted) {
      try {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume * 100);
        setIsMuted(false);
      } catch {}
    } else {
      try {
        ytPlayerRef.current.mute();
        setIsMuted(true);
      } catch {}
    }
  };

  const toggleLikeSong = (song: SongItem) => {
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      if (exists) {
        trackEvent('song_unliked', { song_id: song.id });
        showToast(`Removed "${song.title}" from favorites`);
        return prev.filter((s) => s.id !== song.id);
      } else {
        trackEvent('song_liked', { song_id: song.id });
        showToast(`Added "${song.title}" to favorites`);
        return [song, ...prev];
      }
    });
  };

  const isLiked = (songId: string) => likedSongs.some((s) => s.id === songId);

  // Queue Operations
  const addToQueue = (song: SongItem) => {
    const alreadyQueued = queueRef.current.some((item) => item.id === song.id);
    if (alreadyQueued) {
      showToast(`"${song.title}" is already in the queue`);
      return;
    }

    let insertedIndex = -1;
    setQueue((prev) => {
      const currentIndex = currentSongRef.current
        ? prev.findIndex((item) => item.id === currentSongRef.current?.id)
        : -1;
      const baseIndex = queueAppendIndexRef.current >= 0
        ? queueAppendIndexRef.current
        : currentIndex;
      insertedIndex = baseIndex >= 0 ? baseIndex + 1 : prev.length;
      const updated = [...prev];
      updated.splice(insertedIndex, 0, song);
      queueAppendIndexRef.current = insertedIndex;
      return updated;
    });

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidMediaBridge : null;
    if (nativeBridge?.addToQueue) {
      nativeBridge.addToQueue(
        song.id,
        song.title,
        song.artists?.map((artist) => artist.name).join(', ') || 'Cadence Music',
        getNotificationArtworkUrl(song)
      );
    }
    showToast(`Added "${song.title}" to queue`);
  };

  const playNextInQueue = (song: SongItem) => {
    setQueue((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      const currentIndex = currentSongRef.current ? filtered.findIndex((s) => s.id === currentSongRef.current?.id) : -1;
      if (currentIndex !== -1) {
        const updated = [...filtered];
        updated.splice(currentIndex + 1, 0, song);
        return updated;
      }
      return [song, ...filtered];
    });
    showToast(`Playing "${song.title}" next`);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    showToast('Removed from queue');
  };

  const clearQueue = () => {
    const current = currentSongRef.current;
    setQueue(current ? [current] : []);
    showToast('Queue cleared');
  };

  const shuffleQueue = () => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      const current = currentSongRef.current;
      if (current) {
        const others = prev.filter((s) => s.id !== current.id);
        const shuffled = [...others].sort(() => Math.random() - 0.5);
        return [current, ...shuffled];
      }
      return [...prev].sort(() => Math.random() - 0.5);
    });
    showToast('Play queue shuffled!');
  };

  const reorderQueue = (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) return;
    setQueue((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIndex, 1);
      updated.splice(destinationIndex, 0, movedItem);
      return updated;
    });
  };

  // Playlist Operations
  const createPlaylist = (name: string, description: string = '', songs: SongItem[] = []) => {
    const newId = `playlist-${Date.now()}`;
    const newPl: Playlist = {
      id: newId,
      name: name.trim() || 'My Playlist',
      description: description.trim(),
      createdAt: Date.now(),
      songs,
    };
    setPlaylists((prev) => [newPl, ...prev]);
    trackEvent('playlist_created', { song_count: songs.length });
    showToast(`Created playlist "${newPl.name}"`);
    return newId;
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => {
      const target = prev.find((p) => p.id === playlistId);
      if (target) {
        showToast(`Deleted playlist "${target.name}"`);
      }
      return prev.filter((p) => p.id !== playlistId);
    });
  };

  const addSongToPlaylist = (playlistId: string, song: SongItem) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.songs.some((s) => s.id === song.id)) {
          showToast(`"${song.title}" is already in "${pl.name}"`);
          return pl;
        }
        showToast(`Added to "${pl.name}"`);
        trackEvent('song_added_to_playlist', {
          playlist_id: playlistId,
          song_id: song.id,
        });
        return {
          ...pl,
          coverUrl: pl.coverUrl || song.thumbnailUrl,
          songs: [...pl.songs, song],
        };
      })
    );
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return {
          ...pl,
          songs: pl.songs.filter((s) => s.id !== songId),
        };
      })
    );
    showToast('Removed track from playlist');
  };

  const playPlaylist = (playlistId: string, startIndex: number = 0, shuffle: boolean = false) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl || pl.songs.length === 0) {
      showToast('Playlist is empty');
      return;
    }

    let songList = [...pl.songs];
    if (shuffle) {
      songList = songList.sort(() => Math.random() - 0.5);
    }
    const startSong = songList[startIndex] || songList[0];
    playSong(startSong, songList);
    showToast(`Playing playlist "${pl.name}"`);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffling,
        repeatMode,
        queue,
        history,
        likedSongs,
        toastMessage,
        playlists,
        playSong,
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
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        clearQueue,
        shuffleQueue,
        reorderQueue,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        playPlaylist,
        targetSongForPlaylist,
        setTargetSongForPlaylist,
        showToast,
      }}
    >
      {children}
      {/* Headless YouTube Player Engine for authentic, unblocked browser streaming */}
      <div
        id="cadence-yt-player-container"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '200px',
          height: '200px',
          opacity: 0.0001,
          pointerEvents: 'none',
          zIndex: -9999,
          overflow: 'hidden',
          clipPath: 'inset(100%)',
        }}
        aria-hidden="true"
      >
        <div id="cadence-yt-embed" />
      </div>
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
