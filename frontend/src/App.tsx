import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { Navbar, MobileBottomNav } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { NowPlayingModal } from './components/NowPlayingModal';
import { LyricsModal } from './components/LyricsModal';
import { QueueDrawer } from './components/QueueDrawer';
import { SettingsModal } from './components/SettingsModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { LikedView } from './views/LikedView';
import { PlaylistsView } from './views/PlaylistsView';
import { HomeSection } from './types';
import { apiFetch } from './utils/api';

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'liked' | 'playlists'>('home');
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState<boolean>(true);

  // Modals state
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [nowPlayingInitialTab, setNowPlayingInitialTab] = useState<'poster' | 'lyrics'>('poster');
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const { toastMessage } = usePlayer();

  // Load home sections
  useEffect(() => {
    apiFetch('/api/home')
      .then((res) => res.json())
      .then((data) => {
        if (data.sections) {
          setHomeSections(data.sections);
        }
        setIsLoadingHome(false);
      })
      .catch((err) => {
        console.error('Failed to load home feed:', err);
        setIsLoadingHome(false);
      });
  }, []);

  return (
    <div className="app-container">
      {/* Background Atmosphere Glows */}
      <div className="ambient-glow" />
      <div className="ambient-glow-secondary" />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {currentTab === 'home' && (
          <HomeView
            homeSections={homeSections}
            isLoading={isLoadingHome}
          />
        )}

        {currentTab === 'search' && <SearchView />}

        {currentTab === 'liked' && <LikedView />}

        {currentTab === 'playlists' && <PlaylistsView />}

        {/* Footer: Built with love by Shubhanshu */}
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-built-with">
              <span>Built with</span>
              <Heart size={16} fill="#ff2a85" color="#ff2a85" className="heart-pulse-icon" />
              <span>by <strong className="author-name">Shubhanshu</strong></span>
            </div>
            <div className="footer-brand-sub">
              <span>Cadence</span>
              <span className="footer-dot">•</span>
              <span>Pure High-Fidelity Audio</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Bottom Audio Player Bar */}
      <PlayerBar
        onOpenNowPlaying={() => {
          setNowPlayingInitialTab('poster');
          setIsNowPlayingOpen(true);
        }}
        onToggleLyrics={() => {
          setNowPlayingInitialTab('lyrics');
          setIsNowPlayingOpen(true);
        }}
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isLyricsOpen={isNowPlayingOpen && nowPlayingInitialTab === 'lyrics'}
        isQueueOpen={isQueueOpen}
      />

      {/* Mobile Bottom Navigation Bar (Visible on mobile <= 768px) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      {/* Spotify-style Full Now Playing Modal (Poster + Synced Lyrics + Controls) */}
      <NowPlayingModal
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        onOpenQueue={() => setIsQueueOpen(true)}
        initialTab={nowPlayingInitialTab}
      />

      {/* Modals & Overlays */}
      <LyricsModal isOpen={isLyricsOpen} onClose={() => setIsLyricsOpen(false)} />
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <AddToPlaylistModal />

      {/* Global Interactive Notification Toast */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  );
}
