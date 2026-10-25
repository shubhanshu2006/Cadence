# 🎵 Cadence Web Backend (TypeScript)

The TypeScript/Node.js backend service for Cadence. Provides YouTube Music stream resolution, continuous autoplay radio recommendations, synchronized lyrics, Open-Meteo weather context, and Google Gemini-powered AI Radio Host commentary.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment (`.env`)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example | Where to get |
|---|---|---|---|
| `PORT` | Backend server port | `5000` | N/A |
| `FRONTEND_URL` | Web frontend URL for CORS | `http://localhost:5173` | N/A |
| `GEMINI_API_KEY` | Google Gemini API key for AI Radio commentary | `AIzaSy...` | Free at [Google AI Studio](https://aistudio.google.com/) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for ultra-realistic voices (optional) | `xi-api-key...` | [ElevenLabs.io](https://elevenlabs.io/) |
| `ELEVENLABS_VOICE_ID` | Voice ID for ElevenLabs narration | `21m00Tcm4TlvDq8ikWAM` | [ElevenLabs.io](https://elevenlabs.io/) |
| `DEFAULT_CITY` | Weather context city for the AI DJ | `"San Francisco, CA"` | N/A |

> **Note**: If `GEMINI_API_KEY` is not provided, the backend automatically uses its dynamic procedural Radio Host engine so everything works right out of the box!

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```
