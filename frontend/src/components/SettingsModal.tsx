import React from 'react';
import { X, Settings, Info, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={22} color="var(--accent-pink)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Cadence Settings</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Shield size={20} color="#10b981" />
              <div>
                <div style={{ fontWeight: 600 }}>Privacy & Data</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  All your playback history, liked songs, and custom playlists are stored privately and locally in your device storage.
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Info size={20} color="#ff7a18" />
              <div>
                <div style={{ fontWeight: 600 }}>About Cadence</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.2rem' }}>
                  A modern, high-fidelity music streaming player. Works seamlessly as a Progressive Web App in any browser and as a native Android APK.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Cadence • High-Fidelity Music Experience
        </div>
      </div>
    </div>
  );
};
