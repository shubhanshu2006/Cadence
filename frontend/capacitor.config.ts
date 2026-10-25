import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nyxora.web',
  appName: 'Nyxora',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    url: 'https://frontend-nu-two-31.vercel.app',
  },
};

export default config;
