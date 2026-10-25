import React from 'react';
import { Radio, Search, Compass, Heart, Settings, Library, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface NavbarProps {
  currentTab: 'home' | 'search' | 'discover' | 'liked' | 'playlists';
  onSelectTab: (tab: 'home' | 'search' | 'discover' | 'liked' | 'playlists') => void;
  onOpenSettings: () => void;
  onOpenQueue?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  onOpenQueue,
}) => {
  const { playlists, queue } = usePlayer();

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => onSelectTab('home')}>
        <div className="nav-brand-icon">
          <Radio size={18} />
        </div>
        <span>Nyxora</span>
      </div>

      <ul className="nav-links">
        <li>
          <button
            className={`nav-btn ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => onSelectTab('home')}
          >
            <Radio size={16} />
            <span>Home</span>
          </button>
        </li>
        <li>
          <button
            className={`nav-btn ${currentTab === 'search' ? 'active' : ''}`}
            onClick={() => onSelectTab('search')}
          >
            <Search size={16} />
            <span>Search</span>
          </button>
        </li>
        <li>
          <button
            className={`nav-btn ${currentTab === 'discover' ? 'active' : ''}`}
            onClick={() => onSelectTab('discover')}
          >
            <Compass size={16} />
            <span>Discover</span>
          </button>
        </li>
        <li>
          <button
            className={`nav-btn ${currentTab === 'liked' ? 'active' : ''}`}
            onClick={() => onSelectTab('liked')}
          >
            <Heart size={16} />
            <span>Favorites</span>
          </button>
        </li>
        <li>
          <button
            className={`nav-btn ${currentTab === 'playlists' ? 'active' : ''}`}
            onClick={() => onSelectTab('playlists')}
          >
            <Library size={16} />
            <span>Playlists</span>
            {playlists.length > 0 && (
              <span className="nav-pill-count">{playlists.length}</span>
            )}
          </button>
        </li>
      </ul>

      <div className="nav-right">

        {/* Play Queue button in top navigation */}
        {onOpenQueue && (
          <button
            className="icon-btn queue-nav-btn"
            onClick={onOpenQueue}
            title={`Play Queue (${queue.length} songs)`}
            style={{ position: 'relative' }}
          >
            <ListMusic size={20} />
            {queue.length > 0 && (
              <span className="nav-queue-badge">{queue.length}</span>
            )}
          </button>
        )}

        <button className="icon-btn" onClick={onOpenSettings} title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
};

export const MobileBottomNav: React.FC<Pick<NavbarProps, 'currentTab' | 'onSelectTab'>> = ({
  currentTab,
  onSelectTab,
}) => {
  const { playlists } = usePlayer();

  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`mobile-nav-btn ${currentTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelectTab('home')}
      >
        <Radio size={20} />
        <span>Home</span>
      </button>

      <button
        className={`mobile-nav-btn ${currentTab === 'search' ? 'active' : ''}`}
        onClick={() => onSelectTab('search')}
      >
        <Search size={20} />
        <span>Search</span>
      </button>

      <button
        className={`mobile-nav-btn ${currentTab === 'discover' ? 'active' : ''}`}
        onClick={() => onSelectTab('discover')}
      >
        <Compass size={20} />
        <span>Discover</span>
      </button>

      <button
        className={`mobile-nav-btn ${currentTab === 'liked' ? 'active' : ''}`}
        onClick={() => onSelectTab('liked')}
      >
        <Heart size={20} />
        <span>Favorites</span>
      </button>

      <button
        className={`mobile-nav-btn ${currentTab === 'playlists' ? 'active' : ''}`}
        onClick={() => onSelectTab('playlists')}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Library size={20} />
          {playlists.length > 0 && (
            <span className="mobile-badge">{playlists.length}</span>
          )}
        </div>
        <span>Playlists</span>
      </button>
    </nav>
  );
};
