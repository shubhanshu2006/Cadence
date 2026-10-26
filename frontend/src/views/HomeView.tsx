import React, { useEffect, useState } from 'react';
import { Play, Pause, Radio, Flame, ListPlus, FolderPlus } from 'lucide-react';
import { SongItem, HomeSection } from '../types';
import { SpeedDial } from '../components/SpeedDial';
import { QuickPicks } from '../components/QuickPicks';
import { usePlayer } from '../context/PlayerContext';
import { apiFetch } from '../utils/api';

interface HomeViewProps {
  homeSections: HomeSection[];
  isLoading: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  homeSections,
  isLoading,
}) => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    addToQueue,
    setTargetSongForPlaylist,
    history,
    likedSongs,
    playlists,
  } = usePlayer();
  const [personalizedSongs, setPersonalizedSongs] = useState<SongItem[]>([]);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);

  const personalSourceSongs = [...history, ...likedSongs, ...playlists.flatMap((playlist) => playlist.songs)]
    .filter((song, index, songs) => songs.findIndex((item) => item.id === song.id) === index);
  const personalSeedSongs = [
    ...history.slice(0, 2),
    ...likedSongs.slice(0, 2),
    ...playlists.flatMap((playlist) => playlist.songs).slice(0, 3),
  ].filter((song, index, songs) => songs.findIndex((item) => item.id === song.id) === index);
  const hasPersonalSignals = personalSourceSongs.length > 0;
  const personalCatalog = hasPersonalSignals
    ? personalizedSongs
    : homeSections.flatMap((section) => section.items);

  // Use the personal catalog for all primary Home shelves. New users fall back to the server feed.
  const speedDialSongs = personalCatalog.slice(0, 27);
  const quickPickSongs = personalCatalog.slice(27, 45).length > 0
    ? personalCatalog.slice(27, 45)
    : personalCatalog.slice(9, 21);

  useEffect(() => {
    const sourceSongs = personalSourceSongs;
    const seeds = personalSeedSongs.slice(0, 7);
    if (seeds.length === 0) {
      setPersonalizedSongs([]);
      return;
    }

    let cancelled = false;
    setIsLoadingPersonalized(true);
    Promise.all(
      seeds.map(async (seed) => {
        try {
          const response = await apiFetch(`/api/radio/next?videoId=${encodeURIComponent(seed.id)}`);
          if (!response.ok) return [];
          const data = await response.json();
          return Array.isArray(data.items) ? data.items as SongItem[] : [];
        } catch {
          return [];
        }
      })
    ).then((recommendationGroups) => {
      if (cancelled) return;
      const sourceIds = new Set(sourceSongs.map((song) => song.id));
      const recommendations = recommendationGroups
        .flat()
        .filter((song) => !sourceIds.has(song.id))
        .filter((song, index, songs) => songs.findIndex((item) => item.id === song.id) === index)
        .slice(0, 36);
      setPersonalizedSongs([...sourceSongs, ...recommendations].slice(0, 54));
    }).finally(() => {
      if (!cancelled) setIsLoadingPersonalized(false);
    });

    return () => {
      cancelled = true;
    };
  }, [history, likedSongs, playlists]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Welcome Banner */}
      <div className="hero-banner">
        <div className="hero-text">
          <h1>Unlimited Music, Pure & Direct</h1>
          <p>
            Stream millions of tracks powered by YouTube Music, explore your personalized 3x3 Speed Dial, and sing along with real-time synchronized lyrics.
          </p>
          <div className="hero-actions" style={{ marginTop: '1.4rem' }}>
            <button
              className="btn-primary"
              onClick={() => {
                if (speedDialSongs.length > 0) {
                  playSong(speedDialSongs[0]);
                }
              }}
            >
              <Radio size={18} />
              <span>Start Cadence Radio</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'none' }} className="hero-artwork-desktop" />
      </div>

      {/* Speed Dial 3x3 Card Grid */}
      <SpeedDial songs={speedDialSongs} isLoading={isLoading} />

      {isLoadingPersonalized && hasPersonalSignals && (
        <QuickPicks title="Made for you" songs={[]} isLoading />
      )}
      {!isLoadingPersonalized && hasPersonalSignals && personalizedSongs.length > 0 && (
        <QuickPicks title="Made for you" songs={personalizedSongs.slice(0, 18)} isLoading={false} />
      )}

      <QuickPicks
        title={hasPersonalSignals ? 'Quick Picks From Your Taste' : 'Quick Picks For You'}
        songs={quickPickSongs}
        isLoading={isLoading || (hasPersonalSignals && isLoadingPersonalized)}
      />

      {/* Personalized shelves, with the original themed feed only for users without activity. */}
      {(hasPersonalSignals
        ? [
            { title: 'Recommended From Your Listening', items: personalCatalog.slice(18, 30) },
            { title: 'From Your Likes & Playlists', items: personalSourceSongs.slice(0, 12) },
          ]
        : homeSections.filter((section) => section.title.toLowerCase() !== 'bachata')
      ).map((sec, idx) => {
        if (sec.items.length === 0) return null;
        return (
          <div key={idx}>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <h2 className="section-title">
                <Flame size={20} color="#ff2d55" />
                <span>{sec.title}</span>
              </h2>
            </div>
            <div className="grid-3x3">
              {sec.items.slice(0, 6).map((song, songIdx) => {
                const isThisPlaying = currentSong?.id === song.id && isPlaying;
                const isThisSelected = currentSong?.id === song.id;

                return (
                  <div
                    key={`${sec.title}-${song.id}-${songIdx}`}
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
                        {song.artists && song.artists.length > 0
                          ? song.artists.map((a) => a.name).join(', ')
                          : 'Various Artists'}
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
          </div>
        );
      })}
    </div>
  );
};
