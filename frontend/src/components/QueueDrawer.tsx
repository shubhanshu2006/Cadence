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
    <div className="queue-drawer">
      {/* Drawer Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ListMusic size={20} color="#ff2d55" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Play Queue</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {queue.length > 1 && (
            <button
              className="queue-action-pill"
              onClick={shuffleQueue}
              title="Shuffle all upcoming songs in queue"
            >
              <Shuffle size={14} />
              <span>Shuffle Queue</span>
            </button>
          )}

          {queue.length > 1 && (
            <button
              className="icon-btn"
              onClick={clearQueue}
              title="Clear upcoming songs"
              style={{ color: 'var(--text-dim)' }}
            >
              <Trash2 size={16} />
            </button>
          )}

          <button className="icon-btn" onClick={onClose} title="Close queue">
            <X size={20} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>{queue.length} {queue.length === 1 ? 'song' : 'songs'} in queue</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Drag items to reorder</span>
      </div>

      {/* Queue Items List with Native Drag & Drop */}
      <div className="queue-items-list" onDragOver={(e) => e.preventDefault()}>
        {queue.map((song, index) => {
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

              <img
                src={song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                alt={song.title}
                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: isPlayingThis ? '#ff2d55' : 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {song.title}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {song.artists && song.artists.length > 0 ? song.artists.map((a) => a.name).join(', ') : 'Various Artists'}
                </div>
              </div>

              {isPlayingThis ? (
                <span style={{ fontSize: '0.75rem', color: '#ff2d55', fontWeight: 700, paddingRight: '0.4rem' }}>
                  NOW
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    className="queue-item-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                    }}
                    title="Remove from queue"
                  >
                    <X size={14} />
                  </button>
                  <Play size={14} color="var(--text-dim)" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
