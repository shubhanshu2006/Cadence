import React, { useEffect, useState, useRef } from 'react';
import { X, Mic2, AlertCircle } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { LyricsData } from '../types';
import { apiFetch } from '../utils/api';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({ isOpen, onClose }) => {
  const { currentSong, currentTime, duration, seekTo } = usePlayer();
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !currentSong) return;

    setIsLoading(true);
    const artist = currentSong.artists[0]?.name || '';
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
        setIsLoading(false);
      })
      .catch(() => {
        setLyricsData(null);
        setIsLoading(false);
      });
  }, [isOpen, currentSong?.id]);

  // Auto-scroll to active synchronized line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  if (!isOpen || !currentSong) return null;

  // Find active line index
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Mic2 size={20} color="#ff2d55" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Lyrics</h3>
            {lyricsData?.isSynced && (
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,45,85,0.2)', color: '#ff7597', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                Synced (LRCLIB)
              </span>
            )}
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <strong style={{ color: 'white' }}>{currentSong.title}</strong> — {currentSong.artists.map((a) => a.name).join(', ')}
        </div>

        <div className="lyrics-container" ref={containerRef}>
          {isLoading ? (
            <div style={{ padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading synchronized lyrics from LRCLIB...
            </div>
          ) : lyricsData?.syncedLyrics && lyricsData.syncedLyrics.length > 0 ? (
            lyricsData.syncedLyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  className={`lyrics-line ${isActive ? 'active' : ''}`}
                  onClick={() => seekTo(line.time)}
                  title="Click to jump to line"
                >
                  {line.text || '♪ ♪ ♪'}
                </div>
              );
            })
          ) : lyricsData?.plainLyrics ? (
            <div style={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: '1.1rem', color: 'var(--text-main)' }}>
              {lyricsData.plainLyrics}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '3rem 0', color: 'var(--text-dim)' }}>
              <AlertCircle size={32} />
              <p>No synced lyrics found for this track on LRCLIB.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
