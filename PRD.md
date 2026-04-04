# Product Requirements Document (PRD)
## ViewCrew — Watch Together, Anywhere

**Version:** 1.0  
**Status:** Draft  
**Author:** Product Team  
**Last Updated:** 2026-03-26

---

## 1. Executive Summary

ViewCrew is a free, browser-based watch party platform that lets small groups of people watch videos together in real-time with synchronized playback. No app downloads, no subscriptions, no login required.

---

## 2. Problem Statement

Friends and families separated by distance have no free, simple tool to watch video content together. Existing solutions either require everyone to have the same paid subscription, are limited to specific platforms, or lack integrated voice communication. People are forced to use a patchwork of tools — screen sharing on Zoom, manually syncing YouTube, texting timestamps — which creates a fragmented and frustrating experience.

---

## 3. Goals & Objectives

### Primary Goals
- Let a group of 2–6 people watch any video together in real-time sync
- Require zero installation and zero account creation
- Be completely free to use

### Non-Goals (v1.0)
- Supporting more than 6 simultaneous users per room
- Mobile native apps (Android/iOS)
- Persistent user accounts or watch history
- Paid subscription tiers
- Content discovery or a built-in library

---

## 4. Target Users

### Primary Persona — The Long-Distance Friend Group
- Age 18–30
- Separated from close friends due to college, work, or geography
- Already communicates via Discord, WhatsApp, or Telegram
- Frustrated by the hassle of syncing YouTube manually or paying for Teleparty

### Secondary Persona — The Family Movie Night
- Age 30–50
- Wants to watch movies with family in other cities
- Less technically savvy; needs zero-friction onboarding
- Likely watching on a laptop or desktop

---

## 5. User Stories

### Room Management
- As a host, I want to create a room instantly and get a shareable link so I can invite friends
- As a viewer, I want to join a room using just a link with no sign-up required
- As a host, I want to see who is currently in my room

### Video Playback
- As a host, I want to paste a YouTube link and have everyone in the room watch it together
- As a host, I want to paste a direct MP4 URL and stream it to everyone
- As a host, I want to share my screen so viewers can watch anything I am watching
- As a viewer, I want the video to automatically sync to the host's position when I join late

### Sync Controls
- As a host, I want play/pause/seek to apply to all viewers simultaneously
- As a viewer, I want to see a visual indicator when the host pauses or seeks
- As a viewer, I want my player to auto-resync if I drift more than 3 seconds from the host

### Engagement
- As a viewer, I want to react to the video with emojis that appear on screen briefly
- As a user, I want to send text messages in a side chat panel

### Removed Features
- ~~Voice Chat~~ — Removed due to audio quality issues in mesh topology. May be revisited with SFU architecture in v2.0.

---

## 6. Features

### Must Have (v1.0)
| Feature | Description |
|---|---|
| Room Creation | One-click room creation, unique shareable URL |
| No-Auth Join | Join any room via link, choose a display name |
| YouTube Sync | Sync YouTube playback via IFrame API |
| URL Sync | Sync any direct video URL (MP4/WebM) |
| Screen Sharing | Host shares browser tab or full screen via WebRTC |
| Sync Controls | Host-controlled play/pause/seek synced to all viewers |
| Mute Toggle | Per-user mute/unmute for video audio |
| Late Join Sync | Newcomers snap to host's current timestamp |

### Should Have (v1.0)
| Feature | Description |
|---|---|
| Emoji Reactions | Floating emoji reactions on the video overlay |
| Text Chat | Side panel text chat for the room |
| User Presence | See avatars/names of everyone in the room |
| Sync Drift Correction | Auto-resync if viewer drifts >3s from host |

### Nice to Have (v2.0)
| Feature | Description |
|---|---|
| Voice Chat | Peer-to-peer audio via WebRTC (requires SFU for quality) |
| Host Handoff | Transfer host controls to another viewer |
| Room Password | Optional password for private rooms |
| Twitch Sync | Support for Twitch embed |
| Local File Sharing | P2P streaming of local video files |
| Dark/Light Mode | Theme toggle |

---

## 7. User Flow

```
Landing Page
    │
    ├── [Create Room] ──► Generate Room ID ──► Enter Room as Host
    │                                               │
    └── [Join Room] ──► Enter Room Code ──► Enter Display Name ──► Enter Room as Viewer
                                                    │
                                          ┌─────────┴──────────┐
                                     Host View            Viewer View
                                          │                    │
                               Paste URL/YouTube         Watch synced video
                               OR Share Screen           React with emojis
                               Control Playback          Text chat
                               Text chat
```

---

## 8. Success Metrics

| Metric | Target (3 months post-launch) |
|---|---|
| Rooms created per day | 100+ |
| Average session duration | 60+ minutes |
| Average users per room | 3+ |
| Return user rate (7-day) | 30%+ |
| Screen share usage rate | 40%+ of sessions |
| Page load to room join time | < 10 seconds |

---

## 9. Constraints & Assumptions

- Maximum 6 users per room (bandwidth and WebRTC mesh complexity)
- Host must remain connected for screen share to work
- No server-side video storage; all media is streamed P2P or from original source
- Browser must support WebRTC (Chrome, Firefox, Edge, Safari 15+)
- Screen sharing requires desktop browser (not supported on mobile browsers)

---

## 10. Release Plan

| Phase | Scope | Target |
|---|---|---|
| Alpha | Rooms | Week 2 |
| Beta | + Video Sync (YouTube + URL) | Week 4 |
| v1.0 | + Screen Sharing + Reactions + Chat | Week 6 |
| v1.1 | + Local File Streaming | Week 9 |
| v2.0 | + Host Handoff + Room Passwords + Voice Chat (SFU) | Week 12 |

---

## 11. Open Questions

1. Should rooms expire after a period of inactivity (e.g., 24 hours)?
2. Should we support Twitch embed in v1.0?
3. What happens when the host disconnects — do we auto-promote another viewer to host?
4. Do we want anonymous display names or require the user to set one?
