# AudioAI - Audio to Video Visualization

Transform audio files into stunning AI-powered visualizations with beat-matched particle systems.

## Features

- 🎵 Audio upload and analysis (MP3, WAV, FLAC, M4A, OGG)
- 🎨 Real-time Three.js particle visualization
- 🎚️ Customizable visual parameters
- 📹 720p MP4 video export
- 🔐 JWT-based authentication
- 📊 MongoDB for data persistence

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Three.js / react-three-fiber
- TailwindCSS
- Zustand (state management)
- React Query (data fetching)
- WaveSurfer.js (audio waveform)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Redis + BullMQ (job queue)
- FFmpeg (video encoding)
- JWT authentication

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for MongoDB + Redis)
- FFmpeg (installed on system)

## Quick Start

### 1. Start MongoDB and Redis

```bash
docker-compose up -d
```

### 2. Set up the server

```bash
cd server
cp .env.example .env
# Edit .env and set a secure JWT_SECRET
npm install
npm run dev
```

### 3. Set up the client

```bash
cd client
npm install
npm run dev
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173)

## Environment Variables

### Server (.env)

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/audioai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### Projects
- `POST /api/projects` - Create project (upload audio)
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id/settings` - Update visual settings
- `DELETE /api/projects/:id` - Delete project

### Rendering
- `POST /api/render/:projectId/start` - Start video export
- `GET /api/render/:projectId/status` - Get export status
- `GET /api/render/:projectId/status/stream` - SSE status updates

## Project Structure

```
audioAi/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   ├── pages/          # Route pages
│   │   └── stores/         # Zustand stores
│   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # App configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── jobs/           # BullMQ workers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   └── routes/         # API routes
│   └── ...
├── docker-compose.yml      # MongoDB + Redis
└── README.md
```

## License

MIT
