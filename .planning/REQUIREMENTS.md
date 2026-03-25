# CineSync - Requirements Specification

## 1. Room System

### F-R1: Create Room (Host)
- User can create a new watch-party room
- System generates unique 6-character alphanumeric Room ID
- System generates shareable room link
- Creator automatically becomes Room Host
- Host has exclusive playback control

### F-R2: Join Room
- User can join room via Room ID input
- User can join room via shareable link
- System validates room existence before joining
- System shows error if room is full (max 4 users)
- New joiners become Participants (non-host)

### F-R3: Participant Management
- Display real-time list of all room participants
- Show participant role (Host/Participant)
- Show participant connection status
- Handle participant disconnect gracefully

### F-R4: Room Lifecycle
- Room persists while at least one user is connected
- Room auto-destroys 60 seconds after last user leaves
- Host can manually close room

---

## 2. Video Playback Modes

### F-V1: Local File Streaming
- Host selects video from device storage
- Supported formats: MP4, WebM
- Stream video to participants via WebRTC P2P
- No file upload to backend server
- Show file picker with format filter

### F-V2: URL-Based Streaming
- User inputs direct video URL
- All users load identical stream URL
- Playback synchronized via WebSocket server
- Support common formats (MP4, HLS, DASH)

### F-V3: YouTube Sync
- Host inputs YouTube video URL
- Integrate YouTube Player API
- Sync play/pause/seek across all participants
- Handle YouTube embed restrictions

### F-V4: Screen Sharing
- Host can share device screen
- Use Android MediaProjection API
- Stream screen capture via WebRTC
- Show screen share indicator to participants
- Stop sharing button for host

---

## 3. Real-Time Sync Engine

### F-S1: Playback Control
- Host controls: Play, Pause, Seek
- Sync events transmitted via WebSocket (Socket.io)
- Client playback auto-adjusts to match host
- Sync tolerance: ±500ms

### F-S2: Event Types
| Event | Payload | Direction |
|-------|---------|-----------|
| play | timestamp | Host → Server → Clients |
| pause | timestamp | Host → Server → Clients |
| seek | newPosition | Host → Server → Clients |
| sync_request | - | Client → Server → Host |
| sync_response | timestamp | Host → Server → Client |

### F-S3: Latency Handling
- Measure round-trip time (RTT)
- Compensate for network delay on seek
- Re-sync on significant drift (>1 second)

---

## 4. Voice Chat (Core Feature)

### F-A1: Voice Communication
- Real-time audio via WebRTC mesh network
- Group voice chat (all participants connected)
- Automatic audio routing to speaker

### F-A2: Audio Controls
- Mute/unmute toggle for self
- Visual indicator for muted participants
- Auto-mute when joining room (user must opt-in)
- Push-to-talk option (accessibility)

### F-A3: Audio Quality
- Opus codec for voice
- Echo cancellation enabled
- Noise suppression enabled
- Adaptive bitrate based on connection quality

---

## 5. Chat System (Optional)

### F-C1: Text Messaging
- Real-time text chat within room
- Socket.io for message delivery
- Show sender name and timestamp
- Auto-scroll to latest message

### F-C2: Message Features
- Character limit: 500 per message
- Emoji support (native keyboard)
- Message persistence: session only (no history)

---

## 6. UI/UX Requirements

### S-U1: Home Screen
- "Create Room" button (prominent)
- "Join Room" button with ID input field
- Room link paste/detection
- App branding/logo

### S-U2: Room Screen Layout
- Video player (main area, 16:9 aspect)
- Participant list sidebar (collapsible on mobile)
- Voice control bar (mute, speaker toggle)
- Chat panel (tab/slide-out)
- Share room button
- Leave room button

### S-U3: Video Player Controls
- Play/Pause button
- Seek bar with timestamp
- Fullscreen toggle
- Source indicator (Local/URL/YouTube/Screen)

### S-U4: Permissions UI
- Request Microphone permission with explanation
- Request Storage permission with explanation
- Request Screen Capture permission with explanation
- Clear error messages if denied

---

## 7. Non-Functional Requirements

### N-F1: Performance
- App launch: < 2 seconds
- Video start: < 1 second (local), < 3 seconds (network)
- Sync latency: < 500ms
- Voice chat latency: < 200ms

### N-F2: Reliability
- Handle network disconnection gracefully
- Auto-reconnect with exponential backoff
- Resume sync on reconnection
- Show connection status indicator

### N-F3: Security
- Room IDs are not guessable (cryptographically random)
- No PII stored on server
- WebRTC DTLS encryption for media
- HTTPS/WSS for all connections

---

## Out of Scope (Future)
- User accounts and authentication
- Persistent room history
- Cloud-based room hosting
- Cross-platform (iOS, Web)
- AI recommendations
- Video quality selection
- Recording functionality
