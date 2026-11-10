import React, { useState } from 'react';
import { X, ListMusic, Play, Shuffle, Trash2, GripVertical } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const { queue, currentSong, playSong, shuffleQueue, clearQueue, removeFromQueue, reorderQueue } = usePlayer();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderQueue(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      {/* Dimmed Backdrop for Mobile & Desktop */}
      <div className="queue-overlay-backdrop" onClick={onClose} aria-hidden="true" />

      <aside className="queue-drawer" aria-label="Play queue">
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="queue-header-icon-pill">
              <ListMusic size={18} color="#ff2d55" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>Play Queue</h3>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {queue.length} {queue.length === 1 ? 'song' : 'songs'} queued
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {queue.length > 1 && (
              <button
                className="queue-action-pill"
                onClick={shuffleQueue}
                title="Shuffle all upcoming songs in queue"
              >
                <Shuffle size={13} />
                <span>Shuffle</span>
              </button>
            )}

            {queue.length > 1 && (
              <button
                className="icon-btn"
                onClick={clearQueue}
                title="Clear upcoming songs"
                style={{ color: 'var(--text-dim)', padding: '6px' }}
              >
                <Trash2 size={16} />
              </button>
            )}

            <button className="icon-btn" onClick={onClose} title="Close queue" style={{ padding: '6px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Queue Playlist</span>
          <span>Drag to reorder</span>
        </div>

        {/* Queue Items List with Native Drag & Drop */}
        <div className="queue-items-list" onDragOver={(e) => e.preventDefault()}>
          {queue.length === 0 ? (
            <div className="queue-empty-state">
              <ListMusic size={32} color="var(--text-dim)" />
              <p>Queue is empty</p>
              <span>Songs will appear here when you play music</span>
            </div>
          ) : (
            queue.map((song, index) => {
              const isPlayingThis = currentSong?.id === song.id;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;

              return (
                <div
                  key={`${song.id}-${index}`}
                  draggable={!isPlayingThis}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`queue-item ${isPlayingThis ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  onClick={() => playSong(song)}
                  style={{
                    cursor: isPlayingThis ? 'default' : 'grab',
                    opacity: isDragging ? 0.35 : 1,
                    borderTop: isDragOver ? '2px solid #ff2d55' : undefined,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Drag Handle */}
                  {!isPlayingThis ? (
                    <div
                      className="queue-drag-handle"
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={16} color="var(--text-dim)" />
                    </div>
                  ) : (
                    <div style={{ width: 16 }} />
                  )}

                  <div className="queue-item-thumb-wrap">
                    <img
                      src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                      alt={song.title}
                      className="queue-item-thumb"
                    />
                    {isPlayingThis && (
                      <div className="queue-thumb-equalizer-overlay">
                        <div className="soundwave-bars">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: isPlayingThis ? 700 : 600,
                        color: isPlayingThis ? '#ff2d55' : '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.25,
                      }}
                    >
                      {song.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Various Artists'}
                    </div>
                  </div>

                  {isPlayingThis ? (
                    <div className="queue-now-playing-pill" title="Currently Playing">
                      <span className="queue-pulsing-dot" />
                      <span>PLAYING</span>
                    </div>
                  ) : (
                    <div className="queue-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="queue-item-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(index);
                        }}
                        title="Remove from queue"
                        aria-label="Remove from queue"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
