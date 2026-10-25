import type { CapacitorConfig } from '@capacitor/cli';

// Optional: Set to your live Vercel URL (e.g. 'https://nyxora.vercel.app') 
// to automatically stream live UI updates to the APK without needing to rebuild!
const liveUrl = process.env.VITE_APP_URL || process.env.CAPACITOR_LIVE_URL;

const config: CapacitorConfig = {
  appId: 'com.nyxora.web',
  appName: 'Nyxora',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    ...(liveUrl ? { url: liveUrl } : {}),
  },
};

export default config;
