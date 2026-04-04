# ViewCrew — Complete Codebase Audit Report

**Date:** 2026-04-05  
**Commit:** `98b0040` (latest)  
**Branch:** `master`  
**Scope:** Full repository scan

---

## 1. Project Overview

**ViewCrew** is a browser-based watch party platform enabling 2-6 people to watch videos together in real-time with synchronized playback, screen sharing, text chat, and emoji reactions. No sign-up required.

| Aspect | Detail |
|--------|--------|
| **Frontend** | Vanilla JS, Vite, Tailwind CSS, Material Symbols |
| **Backend** | Express.js, TypeScript, Socket.io, PeerJS Server |
| **Media** | WebRTC (P2P screen share), YouTube IFrame API |
| **Deployment** | Backend → Render, Frontend → Vercel / Netlify |
| **Architecture** | Hybrid signaling + P2P (server handles room state; media flows peer-to-peer) |

---

## 2. Project Structure

```
ViewCrew/
├── backend/                          # TypeScript backend (1,206 LOC)
│   ├── src/
│   │   ├── index.ts                  # Entry point (179 lines)
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts        # Socket event rate limiter (69 lines)
│   │   │   └── validation.ts         # Input validation (51 lines)
│   │   ├── models/
│   │   │   └── room.ts               # TypeScript interfaces (66 lines)
│   │   ├── routes/
│   │   │   └── rooms.ts              # REST API routes (409 lines)
│   │   └── socket/
│   │       └── handlers.ts           # Socket.IO handlers (432 lines)
│   ├── tests/                        # 4 test files (863 LOC)
│   ├── package.json                  # 7 prod deps, 10 dev deps
│   ├── tsconfig.json                 # Strict mode, ES2020
│   ├── vitest.config.ts              # Test config
│   └── load-test.yml                 # Artillery config
│
├── client/                           # Vanilla JS frontend (4,651 LOC)
│   ├── main.js                       # App entry/orchestrator (329 lines)
│   ├── index.html                    # SPA entry point
│   ├── style.css                     # Tailwind + custom CSS (487 lines)
│   ├── core/
│   │   ├── RoomManager.js            # Room lifecycle, socket, screen (460 lines)
│   │   ├── SyncEngine.js             # Playback sync engine (544 lines)
│   │   └── PeerManager.js            # WebRTC peer connections (214 lines)
│   ├── players/
│   │   ├── PlayerInterface.js        # Abstract player contract (18 lines)
│   │   ├── YouTubePlayer.js          # YouTube IFrame API wrapper (157 lines)
│   │   ├── HTMLVideoPlayer.js        # Native <video> wrapper (125 lines)
│   │   └── ScreenPlayer.js           # Screen share receiver (254 lines)
│   ├── ui/
│   │   ├── LandingUI.js              # Landing page (220 lines)
│   │   └── RoomUI.js                 # Room view (1,229 lines)
│   ├── media/
│   │   ├── VoiceChat.js              # Voice + VAD — DEAD CODE (133 lines)
│   │   └── ScreenShare.js            # Screen capture (55 lines)
│   ├── utils/
│   │   ├── storage.js                # localStorage wrapper (32 lines)
│   │   ├── sanitize.js               # XSS prevention (16 lines)
│   │   ├── youtubeParser.js          # YouTube URL parser (51 lines)
│   │   ├── ToastManager.js           # Toast notifications (126 lines)
│   │   ├── ReactionManager.js        # Emoji reactions (144 lines)
│   │   ├── ErrorBoundary.js          # Error fallback UI (93 lines)
│   │   ├── ErrorReporter.js          # Sentry-compatible reporting (104 lines)
│   │   └── debug.js                  # Debug logger — UNUSED (8 lines)
│   ├── tests/                        # 8 test files (790 LOC)
│   ├── e2e/
│   │   └── app.spec.ts               # 6 Playwright E2E tests
│   ├── vite.config.js                # Build config + proxy
│   ├── tailwind.config.js            # Theme config
│   ├── vitest.config.js              # Test config
│   ├── playwright.config.ts          # E2E config
│   └── vercel.json                   # Vercel deploy
│
├── .github/workflows/ci.yml          # CI pipeline (3 jobs)
├── render.yaml                       # Render Blueprint deploy
├── netlify.toml                      # Netlify deploy
├── PRD.md / ROADMAP.md / API_SPEC.md / UI_SPEC.md / TRD.md / SAD.md / Design.md
├── start-tunnels.ps1 / start-tunnels2.ps1  # Cloudflare tunnel scripts
└── .gitignore
```

---

## 3. Line of Code Summary

| Category | Files | Lines |
|----------|-------|-------|
| Backend source | 6 | 1,206 |
| Backend tests | 4 | 863 |
| Client source | 19 | 4,651 |
| Client tests | 8 | 790 |
| Client E2E | 1 | 101 |
| Config files | 11 | 330 |
| Documentation | 8 | 2,092 |
| **Total** | **57** | **~10,033** |

---

## 4. Backend Analysis

### 4.1 REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rooms` | Create room (returns roomId, hostToken, participantId) |
| `GET` | `/api/rooms/:id` | Get room info |
| `POST` | `/api/rooms/:id/join` | Join room (with optional password) |
| `POST` | `/api/rooms/:id/leave` | Leave room (notifies WebSocket clients) |
| `DELETE` | `/api/rooms/:id` | Close room (requires `x-host-token` header) |
| `GET` | `/api/rooms/:id/participants` | List participants |
| `GET` | `/health` | Health check |
| `/*` | `/peerjs` | WebRTC signaling (PeerJS Express server) |

### 4.2 Socket.io Events

**Client → Server:**

| Event | Handler | Rate Limit | Description |
|-------|---------|------------|-------------|
| `join-room` | `handlers.ts:66` | 10/min | Join room, validate password/host token |
| `leave-room` | `handlers.ts:177` | 10/min | Leave room, handle host transfer |
| `sync-event` | `handlers.ts:253` | 10/sec | Host-only playback control |
| `chat-message` | `handlers.ts:295` | 1/sec, 10/min | Broadcast chat message |
| `send-reaction` | `handlers.ts:334` | 6/min | Broadcast emoji reaction |
| `request-screen` | `handlers.ts:367` | 5/min | Late joiner requests screen stream |
| `update-display-name` | `handlers.ts:382` | 5/min | Update display name |
| `user-speaking` | `handlers.ts:395` | 10/sec | Relay voice activity (unused) |
| `disconnect` | `handlers.ts:405` | — | Auto-leave room, cleanup |

**Server → Client:**

| Event | Description |
|-------|-------------|
| `room-state` | Full room state on join |
| `user-joined` / `user-left` | Participant changes |
| `sync-event` | Playback sync from host |
| `chat-message` | Broadcast chat |
| `new-reaction` | Broadcast emoji reaction |
| `host-changed` | Host transfer notification |
| `display-name-updated` | Name change broadcast |
| `error` | Error responses |
| `screen-requested` | Notify host of screen request |

### 4.3 Middleware

| Module | Purpose |
|--------|---------|
| `validation.ts` | Input sanitization: roomId, displayName, chatMessage, syncType, emojiId, time, userId |
| `rateLimiter.ts` | Per-socket event rate limiting with configurable windows and blocks |
| `index.ts` (Express) | API rate limiting: 100 req/15min, room ops 10/min, PeerJS 30/min |

### 4.4 Data Models

```typescript
interface Participant {
  id: string;          // UUID v4
  socketId: string;    // Socket.io session ID
  displayName: string;
  joinedAt: Date;
  isHost: boolean;
}

interface Room {
  id: string;                    // 6-char alphanumeric
  hostId: string;
  hostToken: string;             // UUID v4
  passwordHash: string | null;   // SHA-256
  participants: Map<string, Participant>;
  createdAt: Date;
  isActive: boolean;
  isScreenSharing: boolean;
  screenSharingUserId: string | null;
  destroyTimer: NodeJS.Timeout | null;
  currentSource: string | null;
  currentSourceValue: string | null;
  currentTime: number;
  isPlaying: boolean;
}
```

---

## 5. Frontend Analysis

### 5.1 Module Architecture

| Module | File | Purpose | LOC |
|--------|------|---------|-----|
| Entry | `main.js` | App bootstrap, render loop, event wiring | 329 |
| Room Manager | `core/RoomManager.js` | Socket.io client, peer management, screen share orchestration | 460 |
| Peer Manager | `core/PeerManager.js` | PeerJS WebRTC connections, screen stream distribution | 214 |
| Sync Engine | `core/SyncEngine.js` | Playback sync, drift correction, player lifecycle | 544 |
| Room UI | `ui/RoomUI.js` | All room view rendering (lobby, watch, chat, people, settings) | 1,229 |
| Landing UI | `ui/LandingUI.js` | Landing page rendering and form handling | 220 |
| Player Interface | `players/PlayerInterface.js` | Abstract player base class | 18 |
| YouTube Player | `players/YouTubePlayer.js` | YouTube IFrame API wrapper | 157 |
| HTML Video Player | `players/HTMLVideoPlayer.js` | Native `<video>` wrapper | 125 |
| Screen Player | `players/ScreenPlayer.js` | WebRTC screen share receiver | 254 |
| Screen Share | `media/ScreenShare.js` | `getDisplayMedia()` capture | 55 |
| Voice Chat | `media/VoiceChat.js` | **DEAD CODE** — never imported | 133 |
| Sanitize | `utils/sanitize.js` | HTML/attribute escaping | 16 |
| YouTube Parser | `utils/youtubeParser.js` | Extract video IDs from URLs | 51 |
| Storage | `utils/storage.js` | localStorage wrapper | 32 |
| Toast Manager | `utils/ToastManager.js` | Toast notification system | 126 |
| Reaction Manager | `utils/ReactionManager.js` | Emoji reaction picker + animation | 144 |
| Error Boundary | `utils/ErrorBoundary.js` | Global error handler with fallback UI | 93 |
| Error Reporter | `utils/ErrorReporter.js` | Sentry-compatible error reporting | 104 |
| Debug | `utils/debug.js` | **UNUSED** — never imported | 8 |

### 5.2 Client Dependencies

| Package | Version | Type |
|---------|---------|------|
| inter-ui | ^3.19.3 | runtime |
| peerjs | ^1.5.5 | runtime |
| socket.io-client | ^4.8.3 | runtime |
| vite | ^5.2.10 | dev |
| tailwindcss | ^3.4.3 | dev |
| vitest | ^4.1.2 | dev |
| playwright | ^1.59.1 | dev |

---

## 6. Test Coverage

### 6.1 Summary

| Area | Tests | Files | Status |
|------|-------|-------|--------|
| Backend unit/integration | 55 | 4 | All passing |
| Client unit | 82 | 8 | All passing |
| Client E2E | 6 | 1 | All passing |
| **Total** | **143** | **13** | **All passing** |

### 6.2 Backend Tests

| File | Tests | Coverage |
|------|-------|----------|
| `tests/validation.test.ts` | 22 | All 8 validators |
| `tests/rateLimiter.test.ts` | 6 | Allow, block, reset, cleanup |
| `tests/rooms.test.ts` | 16 | Full REST CRUD + password validation |
| `tests/socket.test.ts` | 11 | Socket events integration (join, sync, chat, reactions, disconnect) |

### 6.3 Client Tests

| File | Tests | Coverage |
|------|-------|----------|
| `tests/SyncEngine.test.js` | 4 | Constructor, re-entrancy, cleanup |
| `tests/youtubeParser.test.js` | 20 | All URL formats + edge cases |
| `tests/sanitize.test.js` | 12 | XSS prevention |
| `tests/storage.test.js` | 8 | localStorage wrapper |
| `tests/ToastManager.test.js` | 9 | Show, dismiss, queue, destroy |
| `tests/ReactionManager.test.js` | 11 | Picker, click, animate, destroy |
| `tests/ErrorBoundary.test.js` | 8 | Error tracking, fallback UI |
| `tests/PlayerInterface.test.js` | 10 | Contract validation |

### 6.4 Coverage Gaps

| Module | LOC | Tests | Gap |
|--------|-----|-------|-----|
| `RoomManager.js` | 460 | 0 | Critical — core orchestration |
| `PeerManager.js` | 214 | 0 | Critical — WebRTC connections |
| `YouTubePlayer.js` | 157 | 0 | Medium — player wrapper |
| `HTMLVideoPlayer.js` | 125 | 0 | Medium — player wrapper |
| `ScreenPlayer.js` | 254 | 0 | Medium — player wrapper |
| `ScreenShare.js` | 55 | 0 | Low — media capture |
| `ErrorReporter.js` | 104 | 0 | Low — error reporting |
| `index.ts` (backend) | 179 | 0 | Excluded from coverage config |

---

## 7. Security Assessment

### 7.1 Protections Present

| Protection | Implementation |
|------------|---------------|
| Helmet security headers | CSP, CORP, X-Content-Type-Options, X-Frame-Options |
| CORS | Configurable origins, credentials enabled |
| Rate limiting | 4 tiers: REST API, room ops, PeerJS, socket events |
| Input validation | All user inputs validated server-side |
| XSS prevention | `escapeHtml()` + `escapeAttr()` in all UI rendering |
| Host token auth | Room deletion and sync events require valid token |
| Password protection | SHA-256 hashed passwords for rooms |
| Crypto-random room IDs | `crypto.getRandomValues()` for 6-char alphanumeric |
| Secure host tokens | UUID v4 |
| Console suppression | Production console.log/warn/info suppressed |

### 7.2 Vulnerabilities

| Severity | Issue | Details |
|----------|-------|---------|
| **HIGH** | No authentication | Anyone with room ID can join; host tokens only protect deletion and sync |
| **HIGH** | Host token in plain text over WS | If not using WSS, tokens are exposed |
| **MEDIUM** | No CSRF protection | REST endpoints accept POST/DELETE without CSRF tokens |
| **MEDIUM** | No request body size limits | Express has no `express.json({ limit })` configured |
| **MEDIUM** | Room IDs only 6 chars | 36^6 ≈ 2.1B — feasible to brute-force with automation |
| **MEDIUM** | `@types/helmet` deprecated | helmet@8 ships its own types; package is unnecessary |
| **LOW** | localStorage stores hostToken | Persistent across sessions; shared device risk |
| **LOW** | `crossOriginEmbedderPolicy: false` | Required for YouTube iframes but weakens isolation |
| **LOW** | `process.exit(1)` on unhandled errors | Could cause DoS in production |

---

## 8. Performance Analysis

### 8.1 Build Output

| Metric | Value |
|--------|-------|
| JS bundle | 238.54 kB (61.84 kB gzipped) |
| CSS bundle | 54.47 kB (9.73 kB gzipped) |
| HTML | 1.84 kB (0.89 kB gzipped) |
| Font files | ~3.2 MB (WOFF2: ~1.5 MB) |
| Build time | ~16s |
| Modules transformed | 83 |

### 8.2 Optimization Opportunities

| Area | Issue | Recommendation |
|------|-------|----------------|
| **Re-rendering** | `main.js` re-renders entire app on state changes | Implement fine-grained DOM updates |
| **RoomUI.js** | 1,229 lines of template strings | Split into sub-components |
| **Debug logging** | 50+ console.log calls in SyncEngine, RoomManager | All suppressed in production, but adds bundle size |
| **No code splitting** | Single bundle | Dynamic imports for player modules |
| **No service worker** | No caching strategy | Add basic SW for offline resilience |
| **Font loading** | 36 font variants loaded | Subset to only used weights |
| **Drift correction** | `setInterval` every 5s | Consider `requestAnimationFrame` or WS ping |
| **Video capture retries** | Up to 8 retries with 1s delays | Add exponential backoff |

---

## 9. Known Issues

### 9.1 Code-Level Issues

| # | File | Issue | Impact |
|---|------|-------|--------|
| 1 | `VoiceChat.js` | 133 lines of dead code — never imported | Bundle bloat |
| 2 | `debug.js` | 8 lines — never imported anywhere | Bundle bloat |
| 3 | `handlers.ts:419` | Host transfer uses Map insertion order, not oldest participant | Minor UX |
| 4 | `rooms.ts:333` | Same host transfer issue | Minor UX |
| 5 | `RoomManager.js:430-459` | `destroy()` sets `userId = null` but doesn't disconnect socket or leave room server-side | Resource leak |
| 6 | `YouTubePlayer.js:3-4` | Module-level globals (`apiReadyCallbacks`, `apiLoaded`) not cleaned up on player destroy | Minor memory leak |
| 7 | `index.ts:163-170` | `process.exit(1)` on unhandled rejection kills server | Production stability |
| 8 | `API_SPEC.md` | Documents `ping-sync` event not implemented | Documentation gap |
| 9 | `API_SPEC.md` | Documents room max as 6, code uses `MAX_PARTICIPANTS = 4` | Documentation gap |
| 10 | `TRD.md` | Specifies 30-min room auto-deletion, code uses 60s | Documentation gap |

### 9.2 Documentation Inconsistencies (Resolved)

| Issue | Status |
|-------|--------|
| Naming: "ViewCrew" vs "WatchSync" vs "CineSync" | ✅ Fixed — all docs use "ViewCrew" |
| Voice chat documented as active feature | ✅ Fixed — marked deprecated everywhere |
| Color palettes differ between UI_SPEC.md and Design.md | ✅ Fixed — aligned to Design.md |
| Icon library: Lucide vs Material Symbols | ✅ Fixed — Design.md updated to Material Symbols |
| API event name: `reaction` vs `send-reaction` | ✅ Fixed — API_SPEC.md updated |
| Netlify undocumented | ✅ Fixed — added to README |

---

## 10. Dependencies

### 10.1 Backend

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| cors | ^2.8.5 | Current | |
| express | ^4.18.2 | Current | Express 5 in beta |
| express-rate-limit | ^8.3.1 | Current | |
| helmet | ^8.1.0 | Current | |
| peer | ^1.0.2 | Current | |
| socket.io | ^4.7.4 | Current | |
| uuid | ^9.0.1 | Current | |
| @types/helmet | ^0.0.48 | **Deprecated** | Remove — helmet ships own types |
| typescript | ^5.3.3 | Behind | Current is 5.7+ |
| vitest | ^4.1.2 | Current | |

### 10.2 Client

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| inter-ui | ^3.19.3 | Current | |
| peerjs | ^1.5.5 | Current | |
| socket.io-client | ^4.8.3 | Current | |
| vite | ^5.2.10 | Behind | Vite 6 available |
| tailwindcss | ^3.4.3 | Behind | Tailwind 4 available (breaking) |
| vitest | ^4.1.2 | Current | |
| playwright | ^1.59.1 | Current | |

---

## 11. CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

| Job | Steps | Status |
|-----|-------|--------|
| **Client** | `npm ci` → `npm run build` → `npm test` | ✅ Working |
| **E2E** | Install Playwright Chromium → start backend → run E2E | ✅ Working |
| **Backend** | `npm ci` → `npm run build` | ✅ Working |

**Issues:**
- Uses `npm run dev &` for background server — fragile timing
- Only tests Chromium, no cross-browser E2E
- No load test execution in CI

### Auto-Deploy

| Platform | Trigger | Config |
|----------|---------|--------|
| Render | Push to `master` | `render.yaml` Blueprint |
| Vercel | Push to `master` | `client/vercel.json` |
| Netlify | Push to `master` | `netlify.toml` |

---

## 12. Deployment Status

### Required Environment Variables

**Render (Backend):**
| Variable | Purpose | Required |
|----------|---------|----------|
| `CORS_ORIGIN` | Frontend URL for CORS | Yes |
| `NODE_ENV` | Set to `production` | Yes |
| `TURN_USERNAME` | TURN server auth | Optional |
| `TURN_CREDENTIAL` | TURN server auth | Optional |

**Vercel/Netlify (Frontend):**
| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_API_URL` | Backend URL | Yes |

---

## 13. Remaining Roadmap Items

| Phase | Item | Status |
|-------|------|--------|
| Phase 5 | Load test: 50 rooms × 6 users | Not run (Artillery config exists) |
| Phase 5 | Security review | Partially done |
| v1.1 | Twitch embed support | Not started |
| v2.0 | Redis adapter for Socket.io | Not started |
| v2.0 | Mobile PWA | Not started |
| v2.0 | Persistent rooms (DB) | Not started |
| v2.0 | Voice chat (SFU architecture) | Not started |

---

## 14. Summary Metrics

| Metric | Value |
|--------|-------|
| Total source files | 37 |
| Total test files | 13 |
| Total tests | 143 (all passing) |
| Backend source LOC | 1,206 |
| Client source LOC | 4,651 |
| Test LOC | 1,654 |
| Documentation LOC | 2,092 |
| Dead code files | 2 (VoiceChat.js, debug.js) |
| Security issues (HIGH) | 2 |
| Security issues (MEDIUM) | 4 |
| Security issues (LOW) | 3 |
| Known code issues | 10 |
| Outdated dependencies | 3 |
| Bundle size (JS) | 238.54 kB (61.84 kB gzipped) |
| Bundle size (CSS) | 54.47 kB (9.73 kB gzipped) |

---

*Report generated 2026-04-05. Next recommended action: remove dead code files (`VoiceChat.js`, `debug.js`), add tests for RoomManager/PeerManager, and run load tests.*
