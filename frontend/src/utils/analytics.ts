import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost = (
  import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
).trim();

let initialized = false;
let sessionStartedAt: number | null = null;

export const initializeAnalytics = (): void => {
  if (initialized || !posthogKey) return;

  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    person_profiles: 'never',
    persistence: 'localStorage',
  });
  initialized = true;
  sessionStartedAt = Date.now();
  posthog.capture('app_opened');
};

export const trackEvent = (
  event: string,
  properties?: Record<string, unknown>,
): void => {
  if (initialized) posthog.capture(event, properties);
};

export const trackForeground = (): void => {
  if (!initialized) return;
  sessionStartedAt = Date.now();
  posthog.capture('app_foregrounded');
};

export const trackBackground = (): void => {
  if (!initialized || sessionStartedAt === null) return;

  const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000));
  posthog.capture('app_backgrounded', { duration_seconds: durationSeconds });
  sessionStartedAt = null;
};

export const setupAppLifecycleTracking = (): (() => void) => {
  if (!initialized) return () => {};

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      trackForeground();
    } else {
      trackBackground();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
};
