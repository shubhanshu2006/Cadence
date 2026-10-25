/**
 * Cross-platform API utility for Nyxora.
 * Seamlessly connects:
 * - Native Android APK -> https://nyxora-sit3.onrender.com
 * - Vercel Production Web -> https://nyxora-sit3.onrender.com
 * - Local Vite Dev -> Proxies to localhost:5000 or custom host
 */

export const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
};

const DEFAULT_BACKEND_URL = 'https://nyxora-sit3.onrender.com';

export const getApiBaseUrl = (): string => {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim();

  if (envUrl) return envUrl.replace(/\/+$/, '');

  // In native Android APK, always target the live Render backend
  if (isNativePlatform()) {
    return DEFAULT_BACKEND_URL;
  }

  // In local browser development without env, relative path proxies to localhost:5000 via Vite
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '';
  }

  // Deployed web default fallback
  return DEFAULT_BACKEND_URL;
};

export function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;

  return fetch(url, init);
}
