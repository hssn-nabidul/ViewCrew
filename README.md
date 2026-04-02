# ViewCrew

A browser-based watch party platform for real-time synchronized video watching with 2-6 people. No sign-up required.

## Features

- **Video Sync** — YouTube and direct MP4 URL playback with host-controlled synchronization
- **Screen Sharing** — WebRTC-based screen sharing with late-joiner support
- **Text Chat** — Real-time chat with rate limiting and input sanitization
- **Emoji Reactions** — Floating emoji reactions visible to all participants
- **Voice Indicators** — Speaking detection with visual pulse indicators
- **Reconnection** — Automatic reconnection with visual indicator and state recovery
- **Dark Theme** — Full dark-mode UI with responsive design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS, Vite, Tailwind CSS, Material Symbols |
| Real-time | Socket.io (signaling, chat, sync) |
| Media | PeerJS WebRTC (screen sharing), YouTube IFrame API |
| Backend | Express.js, TypeScript, Socket.io, PeerJS Server |
| CI/CD | GitHub Actions |

## Prerequisites

- Node.js 20+
- npm

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/hssn-nabidul/ViewCrew.git
cd ViewCrew
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Client
cd ../client
npm install
```

### 3. Start the backend server

```bash
cd backend
npm run dev
```

The backend starts on `http://localhost:3000` by default.

### 4. Start the client dev server

```bash
cd client
npm run dev
```

The client starts on `http://localhost:5173` by default.

### 5. Open the app

Navigate to `http://localhost:5173` in your browser. Create a room or join an existing one.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,https://view-crew.vercel.app` |
| `USE_HTTPS` | Enable HTTPS mode (`true`/`false`) | `false` |
| `HTTPS_CERT_PATH` | Path to SSL certificate | — |
| `HTTPS_KEY_PATH` | Path to SSL private key | — |

### Client (`client/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `window.location.origin` |
| `VITE_TURN_URL` | TURN server URL | — |
| `VITE_TURN_USER` | TURN server username | — |
| `VITE_TURN_CREDENTIAL` | TURN server password | — |
| `VITE_SENTRY_DSN` | Sentry DSN for error reporting | — |
| `VITE_ENV` | Environment name | `production` |
| `VITE_RELEASE` | Release version | `unknown` |

## Production Deployment

### Backend

```bash
cd backend
npm run build
npm start
```

For HTTPS production deployment, set `USE_HTTPS=true` and provide cert paths:

```bash
USE_HTTPS=true \
HTTPS_CERT_PATH=/etc/ssl/certs/cert.pem \
HTTPS_KEY_PATH=/etc/ssl/private/key.pem \
PORT=443 \
npm start
```

### Frontend

```bash
cd client
npm run build
```

The built files are in `client/dist/`. Serve them with any static file server (Netlify, Vercel, nginx, etc.).

### Docker (optional)

Create a `Dockerfile` in the backend directory:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rooms` | Create a new room |
| `GET` | `/api/rooms/:id` | Get room info |
| `POST` | `/api/rooms/:id/join` | Join a room |
| `POST` | `/api/rooms/:id/leave` | Leave a room |
| `DELETE` | `/api/rooms/:id` | Close a room (host only) |
| `GET` | `/api/rooms/:id/participants` | List participants |
| `GET` | `/health` | Health check |

### Socket.io Events

**Client → Server:**
- `join-room` — Join a room (requires roomId, userId, displayName, hostToken for hosts)
- `leave-room` — Leave a room
- `sync-event` — Playback control (host only: play, pause, seek, source-change)
- `chat-message` — Send chat message
- `send-reaction` — Send emoji reaction
- `request-screen` — Request screen stream (late joiner)
- `update-display-name` — Change display name
- `user-speaking` — Relay speaking state

**Server → Client:**
- `room-state` — Initial room state on join
- `user-joined` / `user-left` — Participant changes
- `sync-event` — Playback sync from host
- `chat-message` — Broadcast chat
- `new-reaction` — Broadcast emoji reaction
- `host-changed` — Host transfer notification
- `display-name-updated` — Name change broadcast
- `error` — Error responses

## Security

- **Host token validation** — Only the room creator with a valid host token can control playback
- **Input sanitization** — All user inputs are trimmed, truncated, and validated server-side
- **Rate limiting** — Socket events and REST API are rate-limited per connection
- **CORS** — Configurable allowed origins
- **XSS prevention** — HTML escaping on all user-generated content

## Testing

```bash
cd client
npm test          # Run tests once
npm run test:watch # Watch mode
```

## CI/CD

GitHub Actions runs on every push and pull request:
- Client: `npm run build` + `npm test`
- Backend: `npm run build`

## License

MIT
