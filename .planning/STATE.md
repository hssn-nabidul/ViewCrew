# CineSync - Project State

## Current Status

| Property | Value |
|----------|-------|
| Project | CineSync |
| Phase | 1 - Room System + Voice Chat |
| Status | Plan 04 Complete (Voice Chat - Awaiting Verification) |
| Last Updated | 2026-03-25 |

---

## Completed Phases

### Phase 0: Initialization ✅
- [x] Project specification defined
- [x] Planning files created
- [x] Requirements documented
- [x] Roadmap structured

---

## Active Phase

**Current:** Phase 0 (Complete)  
**Next:** Phase 1 - Room System + Voice Chat

### Phase 1 Checklist
- [x] Set up Node.js backend project (Plan 01, 02)
- [x] Implement Socket.io server for signaling (Plan 02)
- [x] Create room management API endpoints (Plan 02)
- [x] Set up Android project with Kotlin + Jetpack Compose (foundation)
- [x] Configure Hilt dependency injection (foundation)
- [x] Build room creation UI flow (Plan 03)
- [x] Build room joining UI flow (Plan 03)
- [x] Integrate WebRTC for voice chat (Plan 04)
- [x] Implement participant list (Plan 03, 04)
- [x] Add connection status handling (Plan 04)
- [ ] **Voice Chat Verification** (Plan 04 - Human Testing Required)

---

## Project Memory

### Key Decisions
1. **Min SDK 24** - Covers 98%+ of devices, required for MediaProjection (API 21+) but we use 24 for stability
2. **Jetpack Compose** - Modern declarative UI, preferred over XML
3. **P2P via WebRTC** - No video upload to server, bandwidth efficient
4. **Socket.io** - Reliable WebSocket abstraction with fallback, good Android support
5. **ExoPlayer** - Industry standard for video playback on Android

### Technical Notes
- Room IDs: 6-char alphanumeric, generated client-side using SecureRandom
- Sync tolerance: 500ms (users won't notice minor desync)
- Max room size: 4 users (bandwidth constraints for voice/video mesh)
- WebRTC mesh topology (no SFU - keep it simple for v1)

### Risks
1. **WebRTC complexity** - Significant learning curve for signaling/ICE
2. **NAT traversal** - May need TURN server for strict NATs
3. **YouTube API** - Requires API key, potential quota limits
4. **Screen sharing quality** - Performance impact on lower-end devices

### Mitigations
1. Use成熟的 WebRTC libraries (google-webrtc)
2. Start with public STUN, upgrade to TURN if needed
3. YouTube as optional feature, URL playback as fallback
4. Quality auto-adjustment based on device capability

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Use Kotlin + Compose | Modern stack, better DX |
| 2026-03-25 | P2P streaming | No server storage costs |
| 2026-03-25 | Phase 1 = Voice + Rooms | Foundation must be solid |

---

## Next Action

Run Phase 1 planning:
```
/gsd-plan-phase 1
```

---

## Resources

### Documentation
- WebRTC Android: https://webrtc.org/native-code/android/
- ExoPlayer: https://exoplayer.dev/
- Socket.io Android: https://socket.io/blog/native-socket-io-android/
- YouTube Player API: https://developers.google.com/youtube/android/player/

### Backend Reference
- Socket.io Server: https://socket.io/docs/v4/server-integration/
- Express.js: https://expressjs.com/

---

*State file updated automatically on phase transitions*
