<div align="center">

# 🎵 Cadence

**A modern, high-fidelity music streaming player and AI Radio experience.**

*Available as both a responsive Web Application and a native Android APK.*

---

[![Node.js](https://img.shields.io/badge/Node.js-20+-68a063?style=flat&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19+-61dafb?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119eff?style=flat&logo=capacitor)](https://capacitorjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

<br/>

[![Download Android APK](https://img.shields.io/badge/Download-Cadence%20APK%20(v1.0.0)-00C853?style=for-the-badge&logo=android&logoColor=white)](https://github.com/shubhanshu2006/Cadence/releases/download/v1.0.0/Cadence.apk)

</div>

---

## 🌟 Highlights

- **🎧 YouTube Music Playback**: Instant stream playback with full player controls (seek, volume, shuffle, repeat).
- **📻 Continuous Autoplay Radio**: Automatically prefetches and refills upcoming recommended tracks via YouTube Music's `/radio/next` API when the queue runs low.
- **🎙️ AI Radio Host Commentary**: Live spoken commentary between tracks (powered by Google Gemini & optional ElevenLabs TTS) providing localized weather context, humor, and session openers.
- **🎵 Real-Time Synced Lyrics**: Line-by-line time-synchronized lyrics powered by LRCLIB with click-to-seek support.
- **⚡ 3x3 Speed Dial Grid**: Quick-access card grid with pagination dots for fast browsing.
- **📰 Discover Feed**: RSS-powered music industry news headlines and artist spotlights.
- **🔒 Privacy First**: Playlists, favorite tracks, and listening history are stored 100% locally on your device (no cloud tracking or accounts required).
- **📱 Dual-Target Architecture**: One unified TypeScript codebase compiles into both a browser web app and a standalone Android APK.

---

## 📂 Project Architecture

```
Cadence/
├── backend/                  # Node.js + Express TypeScript API
│   ├── src/
│   │   ├── services/         # YouTubei.js, Lyrics (LRCLIB), Weather, RSS
│   │   └── server.ts         # Express server with CORS & media streaming
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # React 19 + TypeScript + Vite + Vanilla CSS
│   ├── android/              # Capacitor native Android Gradle project
│   ├── src/
│   │   ├── components/       # PlayerBar, LyricsModal, SettingsModal, Navbar
│   │   ├── context/          # PlayerContext & Headless audio playback engine
│   │   ├── utils/api.ts      # Cross-platform API router (Web + APK)
│   │   └── views/            # Home, Search, Discover, Liked, Playlists
│   ├── capacitor.config.ts   # Mobile APK packaging configuration
│   └── package.json
│
└── .github/
    └── workflows/
        └── build-apk.yml     # Automated CI/CD workflow to compile APK on push
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or higher recommended)
- Git

### 1. Start the Backend Service
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
The backend API will run on `http://localhost:5000`.

### 2. Start the Web Player
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📱 Android App (Download & Build)

### ⬇️ Direct APK Download
Install the latest release directly onto your phone (compatible with Android 8.0+):

[![Download Cadence APK](https://img.shields.io/badge/Download-Cadence.apk-00C853?style=for-the-badge&logo=android&logoColor=white)](https://github.com/shubhanshu2006/Cadence/releases/download/v1.0.0/Cadence.apk)

**Direct Link**: [Cadence.apk (v1.0.0)](https://github.com/shubhanshu2006/Cadence/releases/download/v1.0.0/Cadence.apk)

---

### 🛠️ Building the Android APK Yourself

You can build the Android installer APK using either of the methods below:

### Method 1: Automated via GitHub Actions (Zero Local Setup)
Every time you push code to GitHub, the APK is automatically compiled in the cloud:

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Build Cadence APK"
   git push origin main
   ```
2. Navigate to the **Actions** tab on your GitHub repository.
3. Select the latest **"Build Android APK"** workflow run.
4. Download the ready-to-install **`Cadence.apk`** file under **Artifacts**!

---

### Method 2: Building Locally via Terminal
*(Requires Java JDK 21 and the Android SDK installed on your machine)*

```bash
cd frontend

# 1. Compile web bundle and sync with Android
npm run build:apk

# 2. Compile debug APK
cd android
./gradlew assembleDebug
```
*(On Windows PowerShell, use `.\gradlew assembleDebug`)*

The generated installer will be located at:
`frontend/android/app/build/outputs/apk/debug/Cadence.apk`

---

## 🌐 Deploying the Backend Online

For the Android APK to stream songs for anyone in the world without running a local server on your PC, deploy the `backend/` folder to a public cloud provider:

| Cloud Platform | Free Tier | Status | Link |
|---|---|---|---|
| **Koyeb** | Free (2 services) | Does not sleep | [koyeb.com](https://koyeb.com) |
| **Oracle Cloud** | 100% Free Forever (4 CPUs, 24GB RAM) | Dedicated VPS | [oracle.com/cloud/free](https://oracle.com/cloud/free) |
| **Railway** | $5 free trial credits | High-speed edge | [railway.app](https://railway.app) |
| **Render** | Free tier | Sleeps after 15 min | [render.com](https://render.com) |

### Connecting the Frontend / APK to your Deployed Backend
1. **Option A (Before building APK)**: Add your public backend URL to `frontend/.env`:
   ```env
   VITE_API_BASE_URL=https://your-backend-api.onrender.com
   ```
2. **Option B (Inside the App)**: Open Cadence > tap the **Settings icon (⚙️)** > enter your backend URL in the **Backend API Server** field and tap **Save**.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Default | Required? |
|---|---|---|---|
| `PORT` | Port the backend server listens on | `5000` | Optional |
| `FRONTEND_URL` | Frontend URL for CORS origin | `http://localhost:5173` | Optional |
| `GEMINI_API_KEY` | Google Gemini API key for AI commentary | Procedural fallback | Optional |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for high-quality TTS voice | Disabled | Optional |
| `ELEVENLABS_VOICE_ID` | ElevenLabs narrator voice ID | `21m00Tcm4TlvDq8ikWAM` | Optional |
| `DEFAULT_CITY` | City used for weather context in AI Radio | `"San Francisco, CA"` | Optional |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend URL for API calls (leave empty for web dev proxy) | `""` |
| `VITE_PUBLIC_POSTHOG_KEY` | Public PostHog project key used for product analytics | Not set |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog ingestion host | `https://us.i.posthog.com` |

For Vercel deployments, configure `VITE_PUBLIC_POSTHOG_KEY` and
`VITE_PUBLIC_POSTHOG_HOST` in the project Environment Variables and redeploy.
For APK builds from GitHub Actions, add the PostHog project key as an
Actions secret named `VITE_PUBLIC_POSTHOG_KEY`. The key is public by design,
but keeping it in deployment configuration ensures every build is configured
consistently.

---

## 📄 License & Disclaimer

- **License**: Released under the [MIT License](LICENSE).
- **Disclaimer**: Cadence is an independent open-source educational project. It is not affiliated with, endorsed by, or sponsored by YouTube, Google, ElevenLabs, or LRCLIB.
