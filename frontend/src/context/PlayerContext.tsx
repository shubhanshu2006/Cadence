import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SongItem, Playlist } from '../types';
import { apiFetch } from '../utils/api';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
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

  // Playback
  playSong: (song: SongItem, newQueue?: SongItem[]) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolumeLevel: (vol: number) => void;
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
  createPlaylist: (name: string, description?: string) => string;
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
      const saved = localStorage.getItem('nyxora_history') || localStorage.getItem('tunespark_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likedSongs, setLikedSongs] = useState<SongItem[]>(() => {
    try {
      const saved = localStorage.getItem('nyxora_liked') || localStorage.getItem('tunespark_liked');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('nyxora_playlists') || localStorage.getItem('tunespark_playlists');
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Background playback keeper: prevents browser or YouTube from pausing when tab/screen is switched
  useEffect(() => {
    const handleBackgroundPreservation = () => {
      if (document.hidden && isPlayingRef.current && !manualPauseRef.current) {
        setTimeout(() => {
          if (ytPlayerRef.current && isPlayingRef.current && !manualPauseRef.current) {
            try {
              const state = ytPlayerRef.current.getPlayerState?.();
              if (state === 2) { // 2 = PAUSED
                ytPlayerRef.current.playVideo();
              }
            } catch {}
          }
        }, 120);
      }
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
          ytPlayerRef.current = new window.YT.Player('nyxora-yt-embed', {
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
              origin: window.location.origin,
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
                if (event.data === 1) {
                  setIsPlaying(true);
                  manualPauseRef.current = false;
                  const dur = event.target.getDuration();
                  if (dur && !isNaN(dur) && dur > 0) {
                    setDuration(dur);
                  }
                } else if (event.data === 2) {
                  // If pause was caused by tab switch or screen lock (user did NOT click pause):
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
                console.warn('YouTube Player notice (code:', event.data, ')');
                setIsPlaying(false);
                setTimeout(() => {
                  playNext();
                }, 1500);
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
    localStorage.setItem('nyxora_history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('nyxora_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('nyxora_playlists', JSON.stringify(playlists));
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

  // Play Song function
  const playSong = (song: SongItem, newQueue?: SongItem[]) => {
    manualPauseRef.current = false;
    setCurrentSong(song);
    setCurrentTime(0);

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
      setQueue((prev) => [song, ...prev.filter((s) => s.id !== song.id)]);
    }

    // Add to History
    setHistory((prev) => [song, ...prev.filter((s) => s.id !== song.id)].slice(0, 50));

    // Play using YouTube Engine
    if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
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
            setQueue((prev) => {
              const existingIds = new Set(prev.map((i) => i.id));
              const newItems = data.items.filter((i: SongItem) => !existingIds.has(i.id));
              return [...prev, ...newItems];
            });
          }
        })
        .catch(() => {});
    }
  };

  const togglePlayPause = () => {
    if (!currentSong) return;
    if (!ytPlayerRef.current || !isYtReadyRef.current) return;

    try {
      if (isPlaying) {
        manualPauseRef.current = true;
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        manualPauseRef.current = false;
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('togglePlayPause error:', err);
    }
  };

  // MediaSession API for OS lock screen controls & permanent background audio playback
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artists?.map((a) => a.name).join(', ') || 'Nyxora Music',
        album: 'Nyxora High-Fidelity',
        artwork: [
          {
            src: currentSong.thumbnailUrl || `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg`,
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        manualPauseRef.current = false;
        ytPlayerRef.current?.playVideo();
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        manualPauseRef.current = true;
        ytPlayerRef.current?.pauseVideo();
        setIsPlaying(false);
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
    } catch {}
  }, [currentSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(time, true);
      } catch {}
    }
  };

  const playNext = () => {
    const currentQ = queueRef.current;
    if (currentQ.length === 0) return;

    const current = currentSongRef.current;
    const currentIndex = current ? currentQ.findIndex((s) => s.id === current.id) : -1;
    let nextIndex = currentIndex + 1;

    if (isShufflingRef.current) {
      nextIndex = Math.floor(Math.random() * currentQ.length);
    } else if (nextIndex >= currentQ.length) {
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
        showToast(`Removed "${song.title}" from favorites`);
        return prev.filter((s) => s.id !== song.id);
      } else {
        showToast(`Added "${song.title}" to favorites`);
        return [song, ...prev];
      }
    });
  };

  const isLiked = (songId: string) => likedSongs.some((s) => s.id === songId);

  // Queue Operations
  const addToQueue = (song: SongItem) => {
    setQueue((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      if (exists) {
        return [...prev.filter((s) => s.id !== song.id), song];
      }
      return [...prev, song];
    });
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
  const createPlaylist = (name: string, description: string = '') => {
    const newId = `playlist-${Date.now()}`;
    const newPl: Playlist = {
      id: newId,
      name: name.trim() || 'My Playlist',
      description: description.trim(),
      createdAt: Date.now(),
      songs: [],
    };
    setPlaylists((prev) => [newPl, ...prev]);
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
        id="nyxora-yt-player-container"
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
        <div id="nyxora-yt-embed" />
      </div>
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
