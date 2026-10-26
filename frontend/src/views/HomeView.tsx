import React from 'react';
import { Play, Pause, Radio, Flame, ListPlus, FolderPlus } from 'lucide-react';
import { SongItem, HomeSection } from '../types';
import { SpeedDial } from '../components/SpeedDial';
import { QuickPicks } from '../components/QuickPicks';
import { usePlayer } from '../context/PlayerContext';

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
  } = usePlayer();

  // Extract Speed Dial songs (first 27 items from sections)
  const allSongs = homeSections.flatMap((s) => s.items);
  const speedDialSongs = allSongs.slice(0, 27);
  const quickPickSongs = allSongs.slice(27, 45).length > 0 ? allSongs.slice(27, 45) : allSongs.slice(9, 21);

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

      {/* Quick Picks Carousel */}
      <QuickPicks title="Quick Picks For You" songs={quickPickSongs} isLoading={isLoading} />

      {/* Home Feed Shelves */}
      {homeSections.map((sec, idx) => {
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
