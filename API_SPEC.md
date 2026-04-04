# API Specification
## ViewCrew — Socket.io Events & REST Endpoints

**Version:** 1.0  
**Last Updated:** 2026-03-26

---

## 1. REST API

Base URL: `https://[domain]/api`

### POST /api/rooms
Create a new room.

**Request:** No body required.

**Response 201:**
```json
{
  "roomId": "ab3k9x",
  "url": "https://viewcrew.app/room/ab3k9x",
  "createdAt": 1711411200000
}
```

**Response 503:**
```json
{ "error": "SERVER_FULL", "message": "Maximum concurrent rooms reached" }
```

---

### GET /api/rooms/:roomId
Check if a room exists and get basic metadata.

**Response 200:**
```json
{
  "roomId": "ab3k9x",
  "userCount": 3,
  "hasVideo": true,
  "isFull": false
}
```

**Response 404:**
```json
{ "error": "ROOM_NOT_FOUND", "message": "Room does not exist" }
```

---

## 2. Socket.io Events

### Connection
```javascript
const socket = io("https://viewcrew.app", {
  transports: ["websocket"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

---

## 3. Client → Server Events

### `join-room`
Join a room. Must be the first event after connecting.

```javascript
socket.emit("join-room", {
  roomId: "ab3k9x",
  userId: "uuid-v4-here",
  displayName: "Nabidul"
});
```

**Server response:** Emits `room-state` back to caller, and `user-joined` to all other room members.

---

### `leave-room`
Explicitly leave a room (also fires on disconnect).

```javascript
socket.emit("leave-room", {
  roomId: "ab3k9x",
  userId: "uuid-v4-here"
});
```

---

### `sync-event`
Broadcast a playback control event. **Host only** — server ignores this from non-hosts.

```javascript
// Play
socket.emit("sync-event", {
  roomId: "ab3k9x",
  type: "play",
  time: 142.5  // current time in seconds
});

// Pause
socket.emit("sync-event", {
  roomId: "ab3k9x",
  type: "pause",
  time: 142.5
});

// Seek
socket.emit("sync-event", {
  roomId: "ab3k9x",
  type: "seek",
  time: 300.0
});

// Source change (new video loaded)
socket.emit("sync-event", {
  roomId: "ab3k9x",
  type: "source-change",
  source: "youtube",        // "youtube" | "url" | "screen"
  sourceValue: "dQw4w9WgXcQ"  // YouTube ID or URL
});
```

---

### `user-speaking`
~~Notify the room that a user started or stopped speaking.~~ **DEPRECATED** — Voice chat removed from v1.0. This event remains for future use.

```javascript
socket.emit("user-speaking", {
  roomId: "ab3k9x",
  userId: "uuid-v4-here",
  isSpeaking: true
});
```

---

### `chat-message`
Send a text message to the room.

```javascript
socket.emit("chat-message", {
  roomId: "ab3k9x",
  userId: "uuid-v4-here",
  message: "omg that scene was so good"  // max 500 chars
});
```

---

### `send-reaction`
Send an emoji reaction.

```javascript
socket.emit("send-reaction", {
  roomId: "ab3k9x",
  emojiId: "laugh"
});
```
**Allowed emoji IDs:** `heart`, `laugh`, `wow`, `cry`, `clap`, `fire`, `love`, `skull`

---

## 4. Server → Client Events

### `room-state`
Emitted to a user immediately after they join. Contains full current state.

```javascript
socket.on("room-state", (data) => {
  // data:
  {
    roomId: "ab3k9x",
    hostId: "uuid-of-host",
    users: [
      { userId: "uuid1", displayName: "Alice", isHost: true, isMuted: false },
      { userId: "uuid2", displayName: "Bob", isHost: false, isMuted: true }
    ],
    playback: {
      source: "youtube",          // null if nothing loaded
      sourceValue: "dQw4w9WgXcQ",
      isPlaying: true,
      currentTime: 142.5,
      lastUpdatedAt: 1711411200000
    }
  }
});
```

---

### `user-joined`
A new user joined the room.

```javascript
socket.on("user-joined", (data) => {
  // data:
  {
    userId: "uuid-new",
    displayName: "Charlie",
    isHost: false
  }
});
```

---

### `user-left`
A user left or disconnected.

```javascript
socket.on("user-left", (data) => {
  // data:
  { userId: "uuid-left", displayName: "Charlie" }
});
```

---

### `sync-event`
A playback event from the host (forwarded to all viewers).

```javascript
socket.on("sync-event", (data) => {
  // data:
  {
    type: "play" | "pause" | "seek" | "source-change",
    time: 142.5,
    source: "youtube",          // only on source-change
    sourceValue: "dQw4w9WgXcQ", // only on source-change
    serverTimestamp: 1711411200000
  }
});
```

---

### `user-speaking`
A user started or stopped speaking.

```javascript
socket.on("user-speaking", (data) => {
  // data:
  { userId: "uuid", isSpeaking: true }
});
```

---

### `chat-message`
A chat message from a user.

```javascript
socket.on("chat-message", (data) => {
  // data:
  {
    userId: "uuid",
    displayName: "Alice",
    message: "omg that scene was so good",
    timestamp: 1711411200000
  }
});
```

---

### `new-reaction`
An emoji reaction from a user.

```javascript
socket.on("new-reaction", (data) => {
  // data:
  { userId: "uuid", displayName: "Alice", emojiId: "laugh" }
});
```

---

### `host-changed`
The host role was transferred (e.g., original host disconnected).

```javascript
socket.on("host-changed", (data) => {
  // data:
  { newHostId: "uuid-new-host", displayName: "Bob" }
});
```

---

### `error`
Server-side error.

```javascript
socket.on("error", (data) => {
  // data:
  {
    code: "ROOM_NOT_FOUND" | "ROOM_FULL" | "NOT_HOST" | "INVALID_INPUT",
    message: "Human-readable error message"
  }
});
```

---

## 5. Error Codes Reference

| Code | HTTP Equivalent | Description |
|---|---|---|
| `ROOM_NOT_FOUND` | 404 | Room ID does not exist |
| `ROOM_FULL` | 429 | Room already has 4 users |
| `NOT_HOST` | 403 | Sync event from non-host rejected |
| `INVALID_INPUT` | 400 | Malformed event payload |
| `SERVER_FULL` | 503 | Server at capacity |

---

## 6. PeerJS Peer API

Used for WebRTC signaling. Host is the PeerJS server embedded in the app server.

```javascript
// Initialize peer
const peer = new Peer(userId, {
  host: "viewcrew.app",
  port: 443,
  path: "/peerjs",
  secure: true,
  config: {
    iceServers: ICE_SERVERS  // defined in TRD
  }
});

// Make a call (voice)
const call = peer.call(remotePeerId, localAudioStream);

// Receive a call
peer.on("call", (call) => {
  call.answer(localAudioStream);
  call.on("stream", (remoteStream) => {
    // attach to <audio> element
  });
});

// Add screen share track to existing connections
// (handled via RTCPeerConnection.addTrack directly)
```
