# Technical Requirements Document (TRD)
## ViewCrew — Watch Together, Anywhere

**Version:** 1.0  
**Status:** Draft  
**Author:** Engineering Team  
**Last Updated:** 2026-03-26

---

## 1. Overview

This document defines the technical requirements, constraints, and specifications for building ViewCrew. It is intended for developers and architects and should be read alongside the PRD and System Architecture Document.

---

## 2. Technology Stack

### Frontend
| Concern | Technology | Rationale |
|---|---|---|
| Build Tool | Vite | Fast HMR, lightweight, zero-config |
| Language | JavaScript (ES2022) | Universal browser support |
| Styling | Tailwind CSS | Rapid utility-first styling |
| State | Vanilla JS / EventEmitter pattern | No framework overhead needed |
| Video Player | HTML5 `<video>` + YouTube IFrame API | Native, no library needed |

### Backend
| Concern | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS | V8 performance, non-blocking I/O |
| Framework | Express.js | Minimal, well-documented |
| Realtime | Socket.io 4.x | WebSocket with automatic fallback |
| Room Storage | In-memory (Map) | No DB needed; rooms are ephemeral |

### Real-time Media
| Concern | Technology | Rationale |
|---|---|---|
| P2P Library | PeerJS | Abstracts WebRTC complexity |
| STUN Server | Google STUN (free) | NAT traversal |
| TURN Server | Metered.ca (free tier) | Fallback for restrictive NATs |

### Infrastructure
| Concern | Technology | Rationale |
|---|---|---|
| Hosting | Railway or Render | Free tier, supports WebSockets |
| CDN | Cloudflare (free) | Static asset caching |
| Domain | Custom (optional) | Nice-to-have for launch |

---

## 3. System Constraints

### Network
- Target: Support 2–6 peers per room
- Max upstream bandwidth from host during screen share: ~2–4 Mbps
- Sync signals via Socket.io: negligible bandwidth (<1 KB per event)

### Browser Compatibility
| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Screen Share (getDisplayMedia) | ✅ 72+ | ✅ 66+ | ✅ 15.4+ | ✅ 79+ |
| WebRTC DataChannel | ✅ | ✅ | ✅ | ✅ |
| YouTube IFrame API | ✅ | ✅ | ✅ | ✅ |

### Performance Targets
- Time to interactive (landing page): < 2s
- Room creation to shareable link: < 500ms
- Sync event propagation latency: < 100ms (LAN), < 300ms (internet)
- Screen share frame rate: 24–30 fps (720p target)

---

## 4. Technical Requirements by Feature

### 4.1 Room Management

**TR-ROOM-01:** Each room shall be identified by a unique 6-character alphanumeric ID (e.g., `ab3k9x`).

**TR-ROOM-02:** Room IDs shall be generated server-side using `crypto.randomBytes` to ensure uniqueness.

**TR-ROOM-03:** Rooms shall be stored in-memory on the server as a Map object with the room ID as key.

**TR-ROOM-04:** A room shall be automatically deleted from memory 30 minutes after the last user disconnects.

**TR-ROOM-05:** The shareable room URL format shall be: `https://[domain]/room/[roomId]`

**TR-ROOM-06:** The server shall support a maximum of 500 concurrent rooms.

**TR-ROOM-07:** Each room shall support a maximum of 6 connected peers.

---

### 4.2 Signaling Server (Socket.io)

**TR-SIG-01:** The signaling server shall handle the following Socket.io events:

```
Client → Server:
  join-room(roomId, userId, displayName)
  leave-room(roomId, userId)
  sync-event(roomId, eventType, payload)  -- play/pause/seek
  user-speaking(roomId, userId, isSpeaking)
  chat-message(roomId, userId, message)
  reaction(roomId, userId, emoji)

Server → Client:
  room-state(users[], hostId, currentTime, isPlaying, videoSource)
  user-joined(userId, displayName)
  user-left(userId)
  sync-event(eventType, payload, timestamp)
  user-speaking(userId, isSpeaking)
  chat-message(userId, displayName, message, timestamp)
  reaction(userId, emoji)
  host-changed(newHostId)
  error(code, message)
```

**TR-SIG-02:** Sync events shall be forwarded to all peers in the room except the sender.

**TR-SIG-03:** On `join-room`, the server shall immediately emit `room-state` to the joining client with the current playback state.

---

### 4.3 WebRTC — Voice Chat ~~(DEPRECATED)~~

> **Status:** Removed from v1.0. These requirements are preserved for future v2.0 implementation with an SFU architecture.

~~**TR-VOICE-01:** Voice connections shall be established using a full-mesh peer-to-peer topology (each peer connects to every other peer).~~

~~**TR-VOICE-02:** Audio shall use the Opus codec via native WebRTC, with noise suppression and echo cancellation enabled via getUserMedia constraints.~~

~~**TR-VOICE-03:** PeerJS shall be used for WebRTC connection management and signaling relay.~~

~~**TR-VOICE-04:** Voice Activity Detection (VAD) shall be implemented using the Web Audio API's `AnalyserNode` to detect speaking and emit `user-speaking` events.~~

~~**TR-VOICE-05:** On peer disconnect, remaining peers shall close that peer's audio stream and remove them from the mesh.~~

---

### 4.4 WebRTC — Screen Sharing

**TR-SCREEN-01:** Screen sharing shall use `navigator.mediaDevices.getDisplayMedia()`.

**TR-SCREEN-02:** The host's screen stream shall be distributed to all viewers via WebRTC video tracks, added to existing peer connections.

**TR-SCREEN-03:** Screen share resolution preference shall be set to 1280x720 at 24fps:

```javascript
const screenConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24 }
  },
  audio: false  // System audio sharing is optional
};
```

**TR-SCREEN-04:** When the host stops screen sharing (either via browser button or UI button), all viewer streams shall be stopped and the source mode shall reset.

**TR-SCREEN-05:** Screen sharing shall not be available on mobile browsers (feature-detect and disable button if `getDisplayMedia` is unavailable).

---

### 4.5 Video Sync Engine

**TR-SYNC-01:** The host's video player shall be the single source of truth for playback state.

**TR-SYNC-02:** Sync events to broadcast: `play`, `pause`, `seek(time)`.

**TR-SYNC-03:** On receiving a `seek` event, viewers shall call `video.currentTime = time`.

**TR-SYNC-04:** Drift correction: Every 5 seconds, viewers shall compare their `currentTime` to the server-reported host time. If drift exceeds 3 seconds, auto-seek to correct time.

**TR-SYNC-05:** Late join sync: On `room-state`, if video is playing, the client shall seek to `currentTime + networkLatencyEstimate` and begin playing.

**TR-SYNC-06:** Network latency for late join shall be estimated as the round-trip time of the Socket.io connection divided by 2.

---

### 4.6 YouTube Integration

**TR-YT-01:** YouTube playback shall use the official YouTube IFrame Player API.

**TR-YT-02:** The YouTube player shall be initialized inside a hidden iframe inside the video container.

**TR-YT-03:** Video ID shall be extracted from pasted YouTube URLs using a regex that handles all common URL formats:
```
youtube.com/watch?v=ID
youtu.be/ID
youtube.com/embed/ID
youtube.com/shorts/ID
```

**TR-YT-04:** All IFrame API events (`onStateChange`, `onReady`) shall be mapped to the sync engine's unified event interface.

---

### 4.7 Local File Streaming (Phase 4)

**TR-LOCAL-01:** Local video files shall be streamed from host to viewers using WebRTC DataChannels.

**TR-LOCAL-02:** Files shall be chunked into 16KB segments for transfer.

**TR-LOCAL-03:** The receiving client shall buffer received chunks and feed them to a MediaSource object for playback.

**TR-LOCAL-04:** No file data shall ever be sent to the server; it is strictly peer-to-peer.

---

## 5. Data Models

### Room Object (Server In-Memory)
```javascript
{
  id: "ab3k9x",
  hostId: "user_abc",
  createdAt: 1711411200000,
  lastActiveAt: 1711411200000,
  users: Map<userId, UserObject>,
  playbackState: {
    source: "youtube" | "url" | "screen" | null,
    sourceValue: "https://...",
    isPlaying: false,
    currentTime: 0,
    lastUpdatedAt: 1711411200000
  }
}
```

### User Object (Server In-Memory)
```javascript
{
  id: "user_abc",          // UUID generated client-side
  socketId: "socket_xyz",
  displayName: "Nabidul",
  isHost: true,
  joinedAt: 1711411200000,
  isMuted: false
}
```

### Sync Event Payload
```javascript
{
  type: "play" | "pause" | "seek",
  time: 142.5,             // seconds (for seek/play)
  sourceTimestamp: 1711411200000  // server time of event
}
```

---

## 6. Security Requirements

**SEC-01:** Room IDs shall use cryptographically random generation (not sequential integers).

**SEC-02:** The server shall validate that a `sync-event` sender is the current room host before broadcasting it.

**SEC-03:** Input sanitization shall be applied to all user-provided strings (display names, chat messages) to prevent XSS.

**SEC-04:** CORS shall be configured to allow only the app's own origin on all API endpoints.

**SEC-05:** Socket.io shall be configured with `pingTimeout: 10000` and `pingInterval: 25000` to detect and clean up stale connections.

**SEC-06:** No sensitive data shall be logged (no user IPs, no message content).

---

## 7. Error Handling

| Error | Client Behavior | Server Behavior |
|---|---|---|
| Peer disconnects unexpectedly | Show "X left the room" toast, cleanup audio stream | Remove user from room state, broadcast `user-left` |
| Host disconnects | Show "Host disconnected" modal, freeze playback | Mark next joined user as host (or leave hostless) |
| WebRTC connection fails | Show retry button, attempt ICE restart | Log, do nothing |
| Room not found on join | Show "Room not found" error page | Emit `error` event with code `ROOM_NOT_FOUND` |
| Room full (>6 users) | Show "Room is full" message | Emit `error` with code `ROOM_FULL`, reject join |
| getDisplayMedia denied | Show "Permission denied" toast | N/A |

---

## 8. Testing Requirements

| Type | Tool | Coverage Target |
|---|---|---|
| Unit Tests | Vitest | Core sync logic, room utilities |
| Integration Tests | Socket.io mock client | Signaling flows |
| E2E Tests | Playwright | Room create → join → sync flow |
| Load Test | Artillery | 50 concurrent rooms, 6 users each |

---

## 9. Deployment Requirements

**DEP-01:** The app shall be deployable to a free-tier Railway or Render instance.

**DEP-02:** Environment variables required:
```
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
TURN_SERVER_URL=turn:yourturnserver.com
TURN_USERNAME=user
TURN_CREDENTIAL=pass
```

**DEP-03:** The frontend build shall be served as static files from the Express server (no separate CDN required for v1).

**DEP-04:** WebSocket support must be enabled on the hosting provider.
