import React from 'react';
import {
  ListPlus,
  Heart,
  FolderPlus,
  Play,
  Shuffle,
  Repeat,
  Trash2,
  Sparkles,
  ListMusic,
  Check,
} from 'lucide-react';

interface ToastNotificationProps {
  message: string;
  hasPlayer?: boolean;
}

interface ParsedToast {
  type: 'queue' | 'favorite' | 'playlist' | 'playback' | 'info';
  title: string;
  detail?: string;
  icon: React.ReactNode;
}

const parseToastMessage = (message: string): ParsedToast => {
  // 1. Added to queue
  const queueAddMatch = message.match(/^Added ["“](.*?)["”] to queue$/i);
  if (queueAddMatch) {
    return {
      type: 'queue',
      title: 'Added to Queue',
      detail: queueAddMatch[1],
      icon: <ListPlus size={16} />,
    };
  }

  // 2. Playing next
  const playNextMatch = message.match(/^Playing ["“](.*?)["”] next$/i);
  if (playNextMatch) {
    return {
      type: 'playback',
      title: 'Playing Next',
      detail: playNextMatch[1],
      icon: <Play size={15} fill="currentColor" />,
    };
  }

  // 3. Already in queue
  const alreadyQueueMatch = message.match(/^["“](.*?)["”] is already in the queue$/i);
  if (alreadyQueueMatch) {
    return {
      type: 'info',
      title: 'Already in Queue',
      detail: alreadyQueueMatch[1],
      icon: <ListMusic size={16} />,
    };
  }

  // 4. Added to favorites
  const favAddMatch = message.match(/^Added ["“](.*?)["”] to favorites$/i);
  if (favAddMatch) {
    return {
      type: 'favorite',
      title: 'Added to Favorites',
      detail: favAddMatch[1],
      icon: <Heart size={15} fill="#ff2d55" color="#ff2d55" />,
    };
  }

  // 5. Removed from favorites
  const favRemoveMatch = message.match(/^Removed ["“](.*?)["”] from favorites$/i);
  if (favRemoveMatch) {
    return {
      type: 'info',
      title: 'Removed from Favorites',
      detail: favRemoveMatch[1],
      icon: <Heart size={15} color="var(--text-muted)" />,
    };
  }

  // 6. Added to playlist
  const plAddMatch = message.match(/^Added to ["“](.*?)["”]$/i);
  if (plAddMatch) {
    return {
      type: 'playlist',
      title: 'Added to Playlist',
      detail: plAddMatch[1],
      icon: <FolderPlus size={16} />,
    };
  }

  // 7. Already in playlist
  const plAlreadyMatch = message.match(/^["“](.*?)["”] is already in ["“](.*?)["”]$/i);
  if (plAlreadyMatch) {
    return {
      type: 'info',
      title: `Already in "${plAlreadyMatch[2]}"`,
      detail: plAlreadyMatch[1],
      icon: <FolderPlus size={16} />,
    };
  }

  // 8. Created playlist
  const plCreateMatch = message.match(/^Created playlist ["“](.*?)["”]$/i);
  if (plCreateMatch) {
    return {
      type: 'playlist',
      title: 'Playlist Created',
      detail: plCreateMatch[1],
      icon: <FolderPlus size={16} />,
    };
  }

  // 9. Deleted playlist
  const plDeleteMatch = message.match(/^Deleted playlist ["“](.*?)["”]$/i);
  if (plDeleteMatch) {
    return {
      type: 'info',
      title: 'Playlist Deleted',
      detail: plDeleteMatch[1],
      icon: <Trash2 size={15} />,
    };
  }

  // 10. Shuffle
  if (/shuffle/i.test(message)) {
    return {
      type: 'playback',
      title: message,
      icon: <Shuffle size={15} />,
    };
  }

  // 11. Repeat
  if (/repeat/i.test(message)) {
    return {
      type: 'playback',
      title: message,
      icon: <Repeat size={15} />,
    };
  }

  // 12. Queue / Playlist clear or remove
  if (/removed|cleared|empty/i.test(message)) {
    return {
      type: 'info',
      title: message,
      icon: <Trash2 size={15} />,
    };
  }

  // Default fallback
  return {
    type: 'info',
    title: message,
    icon: <Sparkles size={15} />,
  };
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message, hasPlayer = false }) => {
  const parsed = parseToastMessage(message);

  return (
    <div
      className={`toast-notification toast-type-${parsed.type} ${hasPlayer ? 'toast-has-player' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={`toast-icon-pill toast-pill-${parsed.type}`}>
        {parsed.icon}
      </div>
      <div className="toast-text-wrap">
        <span className="toast-title">{parsed.title}</span>
        {parsed.detail && (
          <span className="toast-detail" title={parsed.detail}>
            {parsed.detail}
          </span>
        )}
      </div>
      <div className="toast-glow-accent" aria-hidden="true" />
    </div>
  );
};

