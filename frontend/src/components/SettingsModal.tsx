import React, { useState } from 'react';
import { X, Settings, Info, Shield, Server, Check, RotateCcw } from 'lucide-react';
import { getApiBaseUrl, isNativePlatform } from '../utils/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiUrl, setApiUrl] = useState<string>(() => {
    return localStorage.getItem('nyxora_api_base_url') || localStorage.getItem('tunespark_api_base_url') || '';
  });
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiUrl.trim();
    if (trimmed) {
      localStorage.setItem('nyxora_api_base_url', trimmed);
    } else {
      localStorage.removeItem('nyxora_api_base_url');
      localStorage.removeItem('tunespark_api_base_url');
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      window.location.reload();
    }, 600);
  };

  const handleReset = () => {
    localStorage.removeItem('nyxora_api_base_url');
    localStorage.removeItem('tunespark_api_base_url');
    setApiUrl('');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      window.location.reload();
    }, 600);
  };

  const activeUrl = getApiBaseUrl() || (isNativePlatform() ? 'http://10.0.2.2:5000' : 'Vite Dev Proxy (http://localhost:5000)');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={22} color="#8b5cf6" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Nyxora Settings</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Backend Server Configuration (Crucial for APK & Web) */}
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <Server size={20} color="#8b5cf6" />
              <div>
                <div style={{ fontWeight: 600 }}>Backend API Server</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Active: <code style={{ color: '#06b6d4' }}>{activeUrl}</code>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder={isNativePlatform() ? "e.g. http://192.168.1.15:5000 or https://api.myserver.com" : "Leave blank for Web default (/api)"}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                className="action-pill primary"
                onClick={handleSave}
                style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
              >
                {isSaved ? <Check size={16} /> : 'Save'}
              </button>
              {apiUrl && (
                <button
                  className="icon-btn"
                  onClick={handleReset}
                  title="Reset to default"
                  style={{ width: '38px', height: '38px' }}
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              💡 Set to your computer's IP (e.g. <code>http://192.168.1.X:5000</code>) when testing the APK on phone Wi-Fi, or your hosted backend URL.
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Shield size={20} color="#10b981" />
              <div>
                <div style={{ fontWeight: 600 }}>Privacy & Data</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  All your playback history, liked songs, and custom playlists are stored privately and locally in your device storage.
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Info size={20} color="#06b6d4" />
              <div>
                <div style={{ fontWeight: 600 }}>About Nyxora</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.3rem' }}>
                  A modern, high-fidelity music streaming player. Works as a Web App in any browser and as an Android APK.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Nyxora • Web & APK Unified Edition
        </div>
      </div>
    </div>
  );
};
