# CineSync - Project Roadmap

## Overview
4-phase development plan for CineSync Android app. Each phase delivers a working feature set with progressive integration.

---

## Phase 1: Room System + Voice Chat

**Duration:** 2-3 weeks  
**Priority:** Critical  
**Goal:** Establish foundation with real-time voice communication

### Plans
**Plans:** 4 plans in 4 waves

Plans:
- [x] 01-PLAN.md — Project Foundation (Android + Backend setup) — Wave 1
- [x] 02-PLAN.md — Backend Room System (REST API + WebSocket signaling) — Wave 2
- [ ] 03-PLAN.md — Android Room UI (Creation, Joining, Participants) — Wave 3
- [ ] 04-PLAN.md — WebRTC Voice Chat (Integration, Controls, Status) — Wave 4

### Deliverables
- [x] Backend: Room management API (create, join, leave, list)
- [x] Backend: WebSocket signaling server for WebRTC
- [ ] Android: Room creation flow
- [ ] Android: Room joining via ID/link
- [ ] Android: Participant list UI
- [ ] Android: WebRTC voice chat integration
- [ ] Android: Mute/unmute controls
- [ ] Android: Connection status handling

### Success Criteria
- Users can create rooms and share links
- 2-4 users can join same room
- Voice chat works with <200ms latency
- Graceful handling of disconnections

---

## Phase 2: Video Playback + Sync

**Duration:** 2-3 weeks  
**Priority:** High  
**Goal:** Synchronized video playback across all participants

### Deliverables
- [ ] Backend: Sync event broadcasting (play/pause/seek)
- [ ] Android: ExoPlayer integration
- [ ] Android: URL-based video input and playback
- [ ] Android: YouTube Player API integration
- [ ] Android: Sync engine implementation
- [ ] Android: Host playback controls
- [ ] Android: Sync request/response flow
- [ ] Android: Video player UI with controls

### Success Criteria
- All participants see same video at same time (±500ms)
- Host can control playback for all
- URL videos stream correctly
- YouTube videos sync properly

---

## Phase 3: Local Video Streaming

**Duration:** 1-2 weeks  
**Priority:** Medium  
**Goal:** Stream local device videos to room participants via WebRTC

### Deliverables
- [ ] Android: File picker with MP4/WebM filter
- [ ] Android: Local video file selection
- [ ] Android: WebRTC data channel for video streaming
- [ ] Android: Video chunking and transmission
- [ ] Android: Reception and playback of streamed video
- [ ] Android: Streaming progress indicator

### Success Criteria
- Host can select local video from device
- Video streams P2P without server upload
- Participants receive and play video in real-time
- No file is uploaded to server

---

## Phase 4: Screen Sharing

**Duration:** 1-2 weeks  
**Priority:** Low  
**Goal:** Host can share device screen to room participants

### Deliverables
- [ ] Android: MediaProjection API integration
- [ ] Android: Screen capture request flow
- [ ] Android: Screen stream via WebRTC
- [ ] Android: Screen share indicator UI
- [ ] Android: Stop sharing controls
- [ ] Participant: Receive and display screen share

### Success Criteria
- Host can start/stop screen sharing
- Participants see host's screen in real-time
- Clear indicator when screen is being shared
- Proper permission handling for screen capture

---

## Timeline Summary

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| 0 | Project Setup | 1 day | ✅ Complete |
| 1 | Room + Voice Chat | 2-3 weeks | 📋 Pending |
| 2 | Video Playback + Sync | 2-3 weeks | 📋 Pending |
| 3 | Local Video Streaming | 1-2 weeks | 📋 Pending |
| 4 | Screen Sharing | 1-2 weeks | 📋 Pending |

**Total Estimated:** 6-10 weeks

---

## Phase Dependencies

```
Phase 1 ──┬── Phase 2 (requires room/sync foundation)
          │
          └── Phase 3 (requires WebRTC + room)
          │
          └── Phase 4 (requires WebRTC + room)
```

---

## Next Steps

After Phase 1 completion, run:
```
/gsd-plan-phase 2
```

---

## Verification Gates

Each phase requires:
1. All checklist items completed
2. Code compiles without errors
3. Basic functionality tested
4. No blocking critical bugs

Run verification before proceeding:
```
/gsd-verify phase <phase-number>
```
