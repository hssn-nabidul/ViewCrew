# CineSync - Project Context

## Overview
**Project Name:** CineSync  
**Type:** Android Mobile Application  
**Core Functionality:** Watch-party app enabling synchronized video playback with real-time voice chat. Users create/join rooms to watch videos together from local files, URLs, or YouTube, with optional screen sharing.

## Platform & Tech Stack

### Android App
- **Language:** Kotlin
- **UI Framework:** Jetpack Compose (preferred), XML fallback
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)

### Backend
- **Runtime:** Node.js + Express
- **Real-time:** Socket.io (server + Android client)
- **Media Streaming:** WebRTC (android-webrtc library)

### Key Libraries
| Purpose | Library |
|---------|---------|
| Video Playback | ExoPlayer |
| WebRTC | WebRTC Android SDK |
| Signaling | Socket.io Client |
| Dependency Injection | Hilt |
| Async | Kotlin Coroutines + Flow |
| Networking | Retrofit + OkHttp |

## Constraints
- No video file uploads to server (peer-to-peer streaming)
- Room limit: 2-4 users per session
- Low-latency sync required
- Handle poor network conditions gracefully
- Proper Android permissions (Microphone, Storage, Screen Capture)

## Architecture Pattern
**Clean Architecture + MVVM**
```
UI Layer (Compose/ViewModels)
    ↓
Domain Layer (Use Cases)
    ↓
Data Layer (Repositories/Data Sources)
    ↓
Network Layer (Socket.io, WebRTC, REST APIs)
```

## Core Feature Summary
1. Room System (create/join via ID or link)
2. Video Playback (Local, URL, YouTube, Screen Share)
3. Real-time Sync Engine (WebSocket-based)
4. Voice Chat (WebRTC mesh network)
5. Optional Chat System

## Development Model
- Phased approach (4 phases defined in ROADMAP.md)
- Phase 1: Room system + Voice chat
- Phase 2: Video playback + Sync
- Phase 3: Local video streaming
- Phase 4: Screen sharing

## Project Status
**Phase:** 0 - Initialization  
**Started:** 2026-03-25
