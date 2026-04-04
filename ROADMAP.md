# Development Roadmap
## ViewCrew — Watch Together, Anywhere

**Version:** 1.0  
**Last Updated:** 2026-03-26

---

## Overview

Total estimated time to v1.0: **6–7 weeks** (solo developer, part-time)

```
Week 1 ──► Foundation + Rooms
Week 2 ──► Video Sync Engine
Week 3 ──► Screen Sharing
Week 4 ──► Polish + Reactions + Chat
Week 5 ──► Testing + Deployment + Launch
Week 7+ ──► v1.1 (Local File Streaming)
```

---

## Phase 0 — Foundation (Week 1)

**Goal:** A deployable skeleton. Two users can visit the same room URL and see each other's presence.

### Tasks

- [ ] Initialize project structure (Vite frontend + Node.js backend in monorepo)
- [ ] Install dependencies: Express, Socket.io, PeerJS, uuid
- [ ] Implement `POST /api/rooms` — generate and store room
- [ ] Implement `GET /api/rooms/:roomId` — check room exists
- [ ] Implement Socket.io `join-room` and `leave-room` events
- [ ] Implement `room-state` broadcast on join
- [ ] Implement `user-joined` / `user-left` broadcast
- [ ] Build landing page UI (Create Room + Join Room input)
- [ ] Build room page skeleton (header, placeholder video area, user panel)
- [ ] Render connected users list with initials avatars
- [ ] Room auto-deletion after 30 minutes of inactivity
- [ ] Deploy to Railway/Render (CI from GitHub)
- [ ] Copy room link to clipboard button

**Milestone:** Two browser tabs can join the same room and see each other in the user list.

---

## Phase 1 — Voice Chat ~~(Week 2)~~ — REMOVED

> **Status:** Removed from v1.0 due to audio quality issues in full-mesh WebRTC topology. May be revisited in v2.0 with an SFU (Selective Forwarding Unit) architecture.
> 
> The code for VoiceChat.js, VAD.js, and related components remains in the codebase but is not actively used.

---

## Phase 2 — Video Sync Engine (Week 2)

**Goal:** Host can load a YouTube or MP4 URL and control playback for everyone.

### Tasks

- [ ] Build abstract `PlayerInterface.js` with unified play/pause/seek/getTime API
- [ ] Implement `YouTubePlayer.js` (IFrame API wrapper)
- [ ] Implement `HTMLVideoPlayer.js` (native `<video>` wrapper)
- [ ] Implement YouTube URL parser (regex for all URL formats)
- [ ] Build Source Selection Modal UI
- [ ] Implement `sync-event` emission from host (play/pause/seek/source-change)
- [ ] Implement `sync-event` receiver on viewer (apply to local player)
- [ ] Implement late-join sync (snap to host time on `room-state`)
- [ ] Implement drift correction (every 5s, compare to `ping-sync` response)
- [ ] Build video controls UI (seek bar, play/pause, time display)
- [ ] Disable controls for viewers (read-only mode)
- [ ] Add "Host controls playback" label for viewers
- [ ] Handle buffering state (spinner + yellow indicator)

**Milestone:** Host pastes a YouTube link, presses play, and all viewers play in sync.

---

## Phase 3 — Screen Sharing (Week 3)

**Goal:** Host can share their screen, viewers watch it in the video area.

### Tasks

- [ ] Implement `ScreenShare.js` using `getDisplayMedia()`
- [ ] Add screen video track to all existing peer connections via `addTrack()`
- [ ] Implement screen stream receiver — display in video area via `srcObject`
- [ ] Handle host stopping screen share (browser button OR UI button)
- [ ] Add "LIVE" badge to video area during active screen share
- [ ] Add "🖥️ Share Screen" button to bottom bar
- [ ] Show toast "Host is sharing their screen" to viewers
- [ ] Detect `getDisplayMedia` unavailability and hide button on mobile
- [ ] Handle viewer joining mid-share (renegotiate and send existing stream)
- [ ] Sync screen share state in `room-state` (so late joiners know share is active)
- [ ] Handle host disconnect during screen share gracefully

**Milestone:** Host shares their screen, all viewers see it live.

---

## Phase 4 — Polish & Engagement (Week 4)

**Goal:** The app feels alive and enjoyable to use.

### Tasks

- [ ] Implement emoji reaction system (picker + floating animation)
- [ ] Implement text chat panel (send/receive messages)
- [ ] Add toast notification system (user join/leave/pause/seek events)
- [ ] Style full dark-mode UI per UI/UX Spec color system
- [ ] Add animated speaking indicator (pulsing green glow)
- [ ] Add smooth entrance/exit animations for user avatars
- [ ] Add room code display + one-click copy in header
- [ ] Build "waiting for host" state UI (when host hasn't loaded video)
- [ ] Add reconnection handling with visual indicator ("Reconnecting...")
- [ ] Make layout responsive for tablet/mobile

**Milestone:** The app looks and feels polished enough to share with friends.

---

## Phase 5 — Testing & Launch (Week 5)

**Goal:** Stable, bug-free launch with real users.

### Tasks

- [ ] Write unit tests for SyncEngine (Vitest)
- [ ] Write unit tests for drift correction logic
- [ ] Write integration tests for Socket.io room flows
- [ ] Write E2E test: create room → join → sync playback (Playwright)
- [ ] Load test: 50 rooms × 6 users (Artillery)
- [ ] Fix all bugs found in testing
- [ ] Security review: input sanitization, CORS, sync auth
- [ ] Set up environment variables on Railway/Render
- [ ] Configure Cloudflare DNS + HTTPS
- [ ] Write README (setup, dev, deploy)
- [ ] Create landing page (with feature highlights)
- [ ] Soft launch (share with 5–10 friends for beta testing)

**Milestone:** v1.0 is live at a public URL and has been tested by real users.

---

## Phase 6 — v1.1: Local File Streaming (Week 7+)

**Goal:** Host can share a local video file stored on their device.

### Tasks

- [ ] Implement file picker UI (drag-and-drop + button)
- [ ] Implement `LocalFileStream.js` — read file via FileReader API
- [ ] Chunk file into 16KB segments
- [ ] Send chunks via WebRTC DataChannel to all peers
- [ ] Implement receiver — buffer chunks → feed to MediaSource API
- [ ] Handle buffering/stall during transfer
- [ ] Implement progress indicator (% received)
- [ ] Sync controls work the same as Phase 2 (same SyncEngine)

---

## Technical Debt & Future Considerations (v2.0)

| Item | Priority | Notes |
|---|---|---|
| Host handoff on disconnect | High | Auto-promote next oldest user |
| Room passwords | Medium | Optional privacy for rooms |
| Twitch embed support | Medium | `player.twitch.tv/js/embed/v1.js` |
| Redis adapter for Socket.io | Low | Needed for horizontal scaling |
| Mobile PWA | Low | Installable app experience |
| Persistent rooms (DB) | Low | Only if user demand justifies it |

---

## Definition of Done

A feature is "done" when:
1. It works in Chrome, Firefox, and Edge
2. It handles errors gracefully (no white screens, no uncaught exceptions)
3. It works with 2, 4, and 6 users simultaneously
4. It is styled per the UI/UX spec
5. It has at least one test covering the happy path
