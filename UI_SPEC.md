# UI/UX Specification
## ViewCrew — Watch Together, Anywhere

**Version:** 1.0  
**Last Updated:** 2026-03-26

---

## 1. Design Principles

1. **Zero friction first.** A user should be watching with friends in under 30 seconds.
2. **Video-first.** The video takes up maximum screen space. UI elements stay out of the way.
3. **Dark by default.** Movie watching = dark room. Dark theme is the only theme in v1.0.
4. **Playful but clean.** Reactions and presence should feel fun, not cluttered.

---

## 2. Color System

| Token | Hex | CSS Variable | Usage |
|---|---|---|---|
| `bg-primary` | `#0A0A0B` | `--color-bg-primary` | Main background |
| `bg-surface` | `#1C1C1F` | `--color-surface` | Cards, panels, controls |
| `bg-elevated` | `#28282B` | `--color-surface-elevated` | Hover states, dropdowns |
| `accent-primary` | `#6366F1` | `--color-accent-primary` | Primary CTA, active state |
| `accent-glow` | `rgba(99, 102, 241, 0.3)` | `--color-accent-glow` | Focus rings, indicators |
| `text-primary` | `#F4F4F5` | `--color-text-primary` | Main text |
| `text-secondary` | `#A1A1AA` | `--color-text-secondary` | Labels, subtitles |
| `text-muted` | `#52525B` | `--color-text-muted` | Placeholders, timestamps |
| `success` | `#22C55E` | `--color-success` | Connected, playing |
| `warning` | `#F59E0B` | `--color-warning` | Buffering |
| `danger` | `#EF4444` | `--color-danger` | Errors, muted mic |
| `speaking` | `#10B981` | `--color-speaking` | Border glow on speaking user |

---

## 3. Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| App Name / Hero | Inter | 32px | 800 |
| Section Heading | Inter | 20px | 700 |
| Body | Inter | 14px | 400 |
| Small / Label | Inter | 12px | 500 |
| Chat Message | Inter | 13px | 400 |
| Timestamp | Inter | 11px | 400 |

---

## 4. Screen Designs

### 4.1 Landing Page

```
┌─────────────────────────────────────────────┐
│                                             │
│            🎬  ViewCrew                   │
│       Watch movies with friends,           │
│         anywhere, anytime.                 │
│                                             │
│   ┌─────────────────────────────────┐      │
│   │   [ Create a Room — Free ]      │      │ ← Accent purple button, full-width
│   └─────────────────────────────────┘      │
│                                             │
│   Already have a code?                      │
│   ┌───────────────────────┐  ┌─────────┐   │
│   │  Enter room code...   │  │  Join   │   │
│   └───────────────────────┘  └─────────┘   │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  🎙️ Voice Chat  🖥️ Screen Share  🔄 Sync  │
│   Three feature icons with short labels     │
│                                             │
└─────────────────────────────────────────────┘
```

**Behavior:**
- "Create a Room" hits `POST /api/rooms` then navigates to `/room/[id]`
- Room code input: 6-character, auto-uppercase, auto-join on 6th char
- No login modal, no email, nothing

---

### 4.2 Room Page — Layout

```
┌────────────────────────────────────────────────────────┐
│  HEADER BAR                                            │
│  🎬 ViewCrew   [room: ab3k9x]  [📋 Copy Link]  [⚙️]  │
├────────────────────────────────────────────────────────┤
│                                        │               │
│                                        │  USER PANEL   │
│                                        │               │
│        VIDEO AREA                      │  👤 Alice (H) │ ← Host badge
│                                        │  🟢            │ ← Speaking glow
│   ┌──────────────────────────────┐     │  👤 Bob       │
│   │                              │     │               │
│   │        Video / Screen        │     │               │
│   │                              │     │  ──────────── │
│   │                              │     │               │
│   └──────────────────────────────┘     │  CHAT PANEL   │
│                                        │               │
│   REACTION OVERLAY (floating emojis)   │  Alice: lmao  │
│                                        │  Bob: 😂      │
│   ──────────────────────────────────── │  ──────────── │
│   CONTROLS BAR (host only)             │  [Type here ] │
│   [▶] [■] ──●──────── 2:22 / 1:48:00  │               │
├────────────────────────────────────────┴───────────────┤
│  BOTTOM BAR                                            │
│   [🎙️ Mute]  [😂 React]  [🖥️ Share Screen]  [📁 File]│
└────────────────────────────────────────────────────────┘
```

---

### 4.3 Source Selection Modal (Host)

Appears when host has no video loaded yet, or clicks the "+" button.

```
┌──────────────────────────────────────┐
│  What do you want to watch?          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🔗 Paste a URL               │  │
│  │  youtube.com, .mp4, etc.       │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  🖥️ Share your screen         │  │
│  │  Works with anything           │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📁 Local file                 │  │
│  │  Stream from your device       │  │
│  └────────────────────────────────┘  │
│                                      │
│                              [Cancel]│
└──────────────────────────────────────┘
```

---

### 4.4 User Avatar Component

Each user in the user panel is represented by:

```
┌───────────────────────────────┐
│  ┌─────┐                      │
│  │ AB  │  Alice               │  ← Initials avatar (colored by hash of name)
│  └─────┘  [HOST]              │  ← Host badge if host
│            🟢 Speaking...     │  ← Shown when VAD triggers
│            🔇                 │  ← Shown when muted
└───────────────────────────────┘
```

**Speaking State:** Avatar border animates with a pulsing green glow (`box-shadow: 0 0 12px #10B981`)

---

### 4.5 Video Controls Bar (Host Only)

Viewers see a read-only version (no seek bar interaction).

```
[▶ / ⏸]  [0:00 ──────●────── 1:48:00]  [🔊──●──]  [⛶]
 Play/Pause   Seek Bar (draggable)     Volume     Fullscreen
```

- Host sees: fully interactive controls
- Viewers see: same UI but all inputs disabled + faint "Host controls playback" label

---

### 4.6 Reaction System

```
User clicks [😂 React] → opens emoji picker:

  ❤️   😂   😮   😢   👏   🔥   😍   💀

On click:
  - Emoji floats up from bottom of video area
  - Multiple concurrent reactions stagger horizontally
  - Each emoji fades out after 2 seconds
  - Broadcast to all viewers via socket
```

CSS animation: `translateY(-200px)` + `opacity: 0`, duration 2s, ease-out.

---

### 4.7 Toast Notifications

Small non-blocking toasts in top-right corner:

| Event | Toast |
|---|---|
| User joins | "👋 Bob joined" |
| User leaves | "Bob left the room" |
| Host pauses | "⏸ Alice paused" |
| Host seeks | "⏩ Alice skipped to 2:30" |
| Screen share starts | "🖥️ Alice is sharing their screen" |
| Host disconnects | "⚠️ Host disconnected. Waiting..." |

Duration: 3 seconds. Max 3 toasts visible at once (queue older ones out).

---

## 5. Interaction States

### Video Loading States
| State | What the User Sees |
|---|---|
| No video | Centered "Add a video to get started" text + "+" button |
| Loading | Spinner overlay on video area |
| Buffering | Yellow spinner, "Buffering..." label |
| Playing | Clean video, controls visible on hover |
| Paused | Controls visible persistently |
| Screen share active | Video area shows host's screen, "LIVE" badge |

---

### Voice States ~~(DEPRECATED — Voice chat removed from v1.0)~~

> Voice chat was removed from v1.0 due to audio quality issues. The states below are documented for future v2.0 implementation.

| State | Mic Button | Avatar |
|---|---|---|
| Connected, unmuted | Green mic icon | Normal border |
| Connected, speaking | Green mic icon + pulse | Green glow border |
| Muted | Red mic with slash | 🔇 icon shown |
| Permission denied | Red mic + "!" warning | Grey border |

---

## 6. Responsive Behavior

### Desktop (>1024px)
Full layout as shown in 4.2 — video + side panel.

### Tablet (768–1024px)
Side panel collapses to bottom sheet. Users tap a button to open chat/user list.

### Mobile (<768px)
- Video takes full width
- Controls as floating bottom bar
- Chat/users accessible via bottom sheet
- Screen sharing button hidden (not supported)

---

## 7. Accessibility

- All buttons have `aria-label` attributes
- Keyboard navigation: Space = play/pause, Left/Right arrows = seek ±10s (host only)
- Focus indicators visible on all interactive elements
- Mute button state announced via `aria-pressed`
- Color is never the only indicator (icons always accompany color state)
