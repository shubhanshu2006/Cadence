/**
 * Cross-platform API utility for Nyxora.
 * Seamlessly handles:
 * - Web Dev: uses relative paths proxied by Vite to http://localhost:5000
 * - Web Production: uses relative path or VITE_API_BASE_URL
 * - Mobile APK (Capacitor): uses configured backend URL or saved custom host
 */

export const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
};

const getStoredBaseUrl = (): string => {
  try {
    return localStorage.getItem('nyxora_api_base_url') || localStorage.getItem('tunespark_api_base_url') || '';
  } catch {
    return '';
  }
};

export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const storedUrl = getStoredBaseUrl().trim();

  if (storedUrl) return storedUrl;
  if (envUrl) return envUrl;

  // In native Android APK without an env, 10.0.2.2 is the Android Emulator alias to host machine
  if (isNativePlatform()) {
    return 'http://10.0.2.2:5000';
  }

  // In browser, empty string means relative path (proxied by Vite in dev)
  return '';
};

export function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;

  return fetch(url, init);
}
