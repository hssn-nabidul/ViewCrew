# System Architecture Document (SAD)
## ViewCrew — Watch Together, Anywhere

**Version:** 1.0  
**Status:** Draft  
**Author:** Engineering Team  
**Last Updated:** 2026-03-26

---

## 1. Architecture Overview

ViewCrew uses a **hybrid signaling + peer-to-peer** architecture. The server is lightweight — it handles room state, sync events, and WebRTC signaling. All heavy media (screen share, local files) flows directly between peers via WebRTC to minimize server cost and latency.

> **Note:** Voice chat was removed from v1.0 due to audio quality issues in full-mesh topology. The P2P media layer no longer includes voice audio.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │   Host       │     │  Viewer 1    │     │  Viewer 2    │       │
│   │  Browser     │     │  Browser     │     │  Browser     │       │
│   │              │     │              │     │              │       │
│   │  VideoPlayer │     │  VideoPlayer │     │  VideoPlayer │       │
│   │  SyncEngine  │     │  SyncEngine  │     │  SyncEngine  │       │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘       │
│          │                   │                     │               │
└──────────┼───────────────────┼─────────────────────┼───────────────┘
           │                   │                     │
           │   WebSocket (Socket.io) — Sync Events   │
           │◄──────────────────┼─────────────────────┤
           │                   │                     │
┌──────────▼───────────────────▼─────────────────────▼───────────────┐
│                         SERVER LAYER                                │
│                                                                     │
│              ┌─────────────────────────────┐                        │
│              │     Node.js + Express        │                        │
│              │     Socket.io Server         │                        │
│              │                             │                        │
│              │  Room Manager (In-Memory)   │                        │
│              │  Sync Event Broadcaster     │                        │
│              │  PeerJS Signaling Server    │                        │
│              └─────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
           │                   │                     │
           │         WebRTC (P2P Direct)             │
           └───────────────────┬─────────────────────┘
                               │
           ┌────────────────────────────────────────┐
            │          P2P MEDIA LAYER               │
            │                                        │
            │   Screen Share Video (H.264/VP8)       │
            │   Local File Chunks (DataChannel)      │
           └────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend Components

```
src/
├── index.html              # Landing page
├── room.html               # Room page
├── main.js                 # Entry point
│
├── core/
│   ├── RoomManager.js      # Socket.io client, room join/leave
│   ├── SyncEngine.js       # Play/pause/seek sync logic
│   ├── DriftCorrector.js   # Auto-resync every 5s
│   └── PeerManager.js      # WebRTC peer connection management
│
├── media/
│   ├── ScreenShare.js      # getDisplayMedia, video stream
│   └── LocalFileStream.js  # DataChannel file chunking
│
├── players/
│   ├── PlayerInterface.js  # Abstract interface (play/pause/seek/getTime)
│   ├── YouTubePlayer.js    # YouTube IFrame API wrapper
│   ├── HTMLVideoPlayer.js  # Native <video> wrapper
│   └── ScreenPlayer.js     # Screen share receiver/display
│
├── ui/
│   ├── RoomUI.js           # Room DOM management
│   ├── ChatPanel.js        # Text chat panel (inline in RoomUI)
│   ├── ReactionsOverlay.js # Floating emoji reactions (inline in RoomUI)
│   └── Controls.js         # Play/pause/seek bar UI (inline in RoomUI)
│
└── utils/
    ├── storage.js          # localStorage wrapper
    ├── sanitize.js         # XSS prevention
    ├── youtubeParser.js    # YouTube URL parsing
    ├── ToastManager.js     # Toast notifications
    ├── ReactionManager.js  # Emoji reactions
    ├── ErrorBoundary.js    # Error fallback UI
    └── ErrorReporter.js    # Sentry-compatible error reporting
```

### 2.2 Backend Components

```
server/
├── index.js                # Entry point, Express + Socket.io init
│
├── rooms/
│   ├── RoomStore.js        # In-memory room Map, CRUD operations
│   └── RoomCleaner.js      # Cron: delete stale rooms after 30min
│
├── socket/
│   ├── handlers.js         # Socket.io event handlers (join, sync, etc.)
│   └── middleware.js       # Input validation middleware
│
└── peer/
    └── PeerServer.js       # PeerJS server setup (signaling relay)
```

---

## 3. Data Flow Diagrams

### 3.1 Room Creation & Join Flow

```
Host                    Server                 Viewer
  │                       │                      │
  │── POST /room ─────────►│                      │
  │◄─ { roomId: "ab3k9x" }─│                      │
  │                       │                      │
  │── socket.connect() ───►│                      │
  │── join-room("ab3k9x") ►│                      │
  │◄─ room-state({})       │                      │
  │                       │                      │
  │  [Host shares link]    │                      │
  │                       │◄──── socket.connect() │
  │                       │◄──── join-room() ─────│
  │                       │──── room-state() ────►│
  │◄─ user-joined(viewer) ─│                      │
  │                       │──── user-joined(host)►│
  │                       │                      │
```

### 3.2 Sync Event Flow

```
Host                    Server                  Viewer
  │                       │                       │
  │  [User presses play]   │                       │
  │── sync-event(play, t) ►│                       │
  │                       │── sync-event(play, t) ►│
  │                       │                       │── video.play()
  │                       │                       │
  │  [User seeks to 2:30]  │                       │
  │── sync-event(seek,150)►│                       │
  │                       │──sync-event(seek,150) ►│
  │                       │                       │── video.currentTime=150
```

### 3.3 ~~WebRTC Voice Chat Setup (Mesh)~~ — DEPRECATED

> Voice chat removed from v1.0. Diagram preserved for future reference.

```
                 ┌─────────┐
                 │ PeerJS  │ (Signaling Only)
                 │ Server  │
                 └────┬────┘
                      │ ICE negotiation
        ┌─────────────┼─────────────┐
        │             │             │
    ┌───▼──┐      ┌───▼──┐     ┌───▼──┐
    │ Host │◄────►│Peer 2│◄───►│Peer 3│
    └──────┘      └──────┘     └──────┘
         ▲                          ▲
         └──────────────────────────┘

After ICE: Direct P2P audio streams (no server involved)
```

### 3.4 Screen Share Distribution

```
Host Browser                    Viewer Browsers
     │                               │
     │  getDisplayMedia()            │
     │  ── captureStream ──          │
     │                               │
     │  For each viewer peer:        │
     │  addTrack(videoTrack) ───────►│ ontrack event
     │                               │── srcObject = stream
     │                               │── <video>.play()
     │                               │
     │  [Host stops share]           │
     │  removeTrack() ──────────────►│ onremovetrack
     │                               │── clear <video>
```

---

## 4. State Management

### Client State Machine (Playback)

```
                ┌──────────┐
    ─────────── │  IDLE    │ ──────────────
   │            └──────────┘               │
   │                 │ source set           │
   ▼                 ▼                      ▼
┌──────────┐   ┌──────────┐         ┌──────────┐
│ LOADING  │──►│  READY   │◄────────│ BUFFERING│
└──────────┘   └────┬─────┘         └──────────┘
                    │                     ▲
              play  │                     │ buffer empty
                    ▼                     │
               ┌──────────┐         ┌────┴─────┐
               │ PLAYING  │────────►│  PAUSED  │
               └──────────┘  pause  └──────────┘
```

### Server Room State

```javascript
// Room state transitions
EMPTY (no users)
  │ first user joins
  ▼
ACTIVE (1+ users, has host)
  │ all users leave
  ▼
DORMANT (timer starts: 30 min)
  │ timer expires
  ▼
DELETED (removed from memory)
```

---

## 5. Network Architecture

### STUN/TURN Configuration

```javascript
// PeerJS / RTCPeerConnection ICE servers config
const ICE_SERVERS = [
  // Google STUN (free, for NAT traversal in most cases)
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // TURN server (for symmetric NAT fallback)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL
  }
];
```

### Connection Strategy
1. **Direct P2P (best case):** STUN resolves NAT, peers connect directly
2. **TURN relay (fallback):** Used when direct connection fails (~10–15% of cases)
3. **Server relay (emergency):** Not implemented in v1.0

---

## 6. Scalability Considerations

ViewCrew v1.0 is intentionally small-scale. The architecture is designed for vertical scaling (single server) which is sufficient for the initial target.

| Resource | v1.0 Limit | Calculation |
|---|---|---|
| Concurrent rooms | ~500 | ~2KB per room in memory |
| Concurrent users | ~3,000 | 500 rooms × 6 users |
| Server bandwidth | ~10 Mbps | Sync signals only (media is P2P) |
| CPU | Low | Signaling only, no media processing |

For scaling beyond this (v2+), horizontal scaling is achievable by adding:
- Redis adapter for Socket.io (multi-instance sync)
- Sticky sessions on the load balancer

---

## 7. Security Architecture

```
Browser                     Server
   │                           │
   │── HTTPS (TLS 1.3) ───────►│  All traffic encrypted
   │── WSS (Secure WebSocket) ►│  Socket.io over TLS
   │                           │
   │  Input Validation         │  Input Validation
   │  - XSS sanitization       │  - Event schema validation
   │  - URL whitelist check    │  - Host-only sync enforcement
   │                           │  - Room capacity check
   │                           │
   P2P (WebRTC)                │
   │── DTLS-SRTP ─────────────►│  All WebRTC encrypted by default
```

---

## 8. Deployment Architecture

```
Internet
    │
    ▼
┌──────────────────────┐
│   Cloudflare DNS     │  (Free: DDoS protection, CDN)
│   + CDN              │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Railway / Render   │  (Free tier: Node.js server)
│                      │
│   Express + Socket.io│
│   + PeerJS Server    │
│   + Static Files     │
└──────────────────────┘
```

---

## 9. Logging & Monitoring

### What to Log (Server)
- Room created / deleted (roomId, timestamp, user count)
- User join / leave (roomId, userId hashed, timestamp)
- Errors (type, roomId, timestamp — NO content or IP)

### What NOT to Log
- User IPs
- Display names
- Chat messages
- Video sources
- Any PII

### Monitoring (Free Tools)
- **UptimeRobot** — uptime monitoring, alerts
- **Railway/Render dashboard** — CPU, memory, request metrics
- **Console logging** — structured JSON logs for debugging
