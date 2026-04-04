# ViewCrew Design System (v1.0)
`design.md` - Implementation Ready

## 1. Design Philosophy
ViewCrew is built to disappear and let the content shine. The interface follows these core principles:
*   **Content First:** The video is the hero. UI elements are semi-transparent or pushed to the periphery.
*   **Cinematic Immersion:** A deep, dark palette reduces eye strain and maintains focus on the screen.
*   **Real-time Presence:** High-fidelity feedback for voice (speaking glows) and reactions (floating emojis) to make digital co-viewing feel tactile.
*   **Minimal Friction:** Browser-based and synchronous. Every action should feel instantaneous.

---

## 2. Color System (Dark Mode Only)
All colors are defined as CSS variables. The system uses a layering approach: `bg` -> `surface` -> `elevated`.

| Token Name | CSS Variable | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Background Primary** | `--color-bg-primary` | `#0A0A0B` | Deepest layer (main app background) |
| **Background Secondary** | `--color-bg-secondary` | `#121214` | Sidebar and header backgrounds |
| **Surface** | `--color-surface` | `#1C1C1F` | Card backgrounds, input fields |
| **Elevated** | `--color-surface-elevated` | `#28282B` | Hover states, modals, popovers |
| **Accent Primary** | `--color-accent-primary` | `#6366F1` | Brand Indigo: Primary buttons, active states |
| **Accent Glow** | `--color-accent-glow` | `rgba(99, 102, 241, 0.3)` | Speaking indicators, focus rings |
| **Text Primary** | `--color-text-primary` | `#F4F4F5` | Main headings and body text |
| **Text Secondary** | `--color-text-secondary` | `#A1A1AA` | Labels, timestamps, metadata |
| **Text Muted** | `--color-text-muted` | `#52525B` | Placeholder text, disabled states |
| **Status Success** | `--color-success` | `#22C55E` | Connection active, positive toast |
| **Status Warning** | `--color-warning` | `#F59E0B` | Buffering, low bandwidth |
| **Status Danger** | `#EF4444` | `--color-danger` | Errors, leave room, disconnect |
| **Live Speaking** | `--color-speaking` | `#10B981` | Vibrant green glow for active voice |

```css
:root {
  --color-bg-primary: #0A0A0B;
  --color-bg-secondary: #121214;
  --color-surface: #1C1C1F;
  --color-surface-elevated: #28282B;
  --color-accent-primary: #6366F1;
  --color-accent-glow: rgba(99, 102, 241, 0.3);
  --color-text-primary: #F4F4F5;
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #52525B;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-speaking: #10B981;
  --border-color: rgba(255, 255, 255, 0.08);
}
```

---

## 3. Typography
**Font Family:** Inter (Sans-serif) via Google Fonts.

| Role | Variable | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `--font-display` | `48px` | 800 (Bold) | 1.1 |
| **H1** | `--font-h1` | `32px` | 700 | 1.2 |
| **H2** | `--font-h2` | `24px` | 600 | 1.3 |
| **H3** | `--font-h3` | `20px` | 600 | 1.4 |
| **Body** | `--font-body` | `16px` | 400 | 1.5 |
| **Small** | `--font-small` | `14px` | 400 | 1.4 |
| **Label** | `--font-label` | `12px` | 600 | 1.0 |
| **Timestamp** | `--font-mono` | `12px` | 400 | 1.0 |

```css
:root {
  --font-family: 'Inter', sans-serif;
  --font-size-base: 16px;
  
  /* Usage Example */
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}
```

---

## 4. Spacing & Layout
ViewCrew uses a strict **4px grid**.

| Token | Value | Token | Value |
| :--- | :--- | :--- | :--- |
| `--space-1` | 4px | `--space-5` | 20px |
| `--space-2` | 8px | `--space-8` | 32px |
| `--space-3` | 12px | `--space-12` | 48px |
| `--space-4` | 16px | `--space-16` | 64px |

### Layout Constants
```css
:root {
  --header-height: 64px;
  --sidebar-width: 320px;
  --controls-height: 80px;
  --max-video-width: 1280px;
  --z-index-base: 1;
  --z-index-sticky: 100;
  --z-index-overlay: 500;
  --z-index-modal: 1000;
  --z-index-toast: 2000;
}
```

---

## 5. Component Specifications

### Avatar
- **Structure:** Circle container with centered text or image.
- **States:**
    - `Speaking`: `box-shadow: 0 0 0 3px var(--color-speaking);`
    - `Muted`: Overlay icon `MicOff` (small, bottom right).
- **Behavior:** Background color derived from `string-to-hex` hash of the username.

### Button
- **Primary:** Background `--color-accent-primary`, Text White.
- **Secondary:** Border `1px solid var(--border-color)`, Background transparent.
- **Ghost:** No border/background until hover (`--color-surface`).
- **States:** Hover (brightness 110%), Active (scale 0.98), Disabled (opacity 0.5, grayscale).

### Video Controls Bar
- **Structure:** `flex` layout. Seekbar is a full-width range input on top of the bar.
- **Host State:** Full interactivity (Play/Pause, Seek).
- **Viewer State:** Seekbar is read-only (displays progress but no handle drag). Volume and Fullscreen are always interactive.

### Emoji Reaction
- **Animation:** Floating up with slight horizontal jitter.
- **Spec:** Random `left` offset within a 100px container, `opacity` fades to 0 as it rises.

---

## 6. Animation & Motion
```css
:root {
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes emoji-float {
  0% { transform: translateY(0) scale(0); opacity: 0; }
  20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-120px) scale(1); opacity: 0; }
}

@keyframes speaking-pulse {
  0% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
}

@keyframes toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes buffer-spin {
  to { transform: rotate(360deg); }
}
```

---

## 7. Icons (Material Symbols)

> The app uses Google Material Symbols Outlined (loaded via Google Fonts). Icon names below map to Material Symbols.

| Icon Name | Context |
| :--- | :--- |
| `play_arrow`, `pause` | Video playback control |
| `volume_up`, `volume_off` | Audio state |
| `fullscreen`, `fullscreen_exit` | Fullscreen toggle |
| `mic`, `mic_off` | Mute toggle (video audio, not voice chat) |
| `content_copy` | Copy room code |
| `people` | Participant list toggle |
| `chat` | Chat sidebar toggle |
| `add` | Add video source |
| `logout` | Leave room |

---

## 8. Responsive Breakpoints
- **Desktop (Default):** Sidebar always visible on the right.
- **Tablet (1024px):** Sidebar becomes a collapsible drawer.
- **Mobile (640px):** Sidebar hidden; Chat and User List become full-screen overlays. Video occupies full width; "Share Screen" button removed from controls.

---

## 9. Dark Mode Implementation
The app is **Dark Mode Exclusive** for Launch.
To implement Light Mode later:
1. Create a `.light-theme` class for `<body>`.
2. Override the `--color-*` variables inside that class.
3. Component CSS remains untouched as it only references variables.

---

## 10. CSS Architecture
**Structure:**
- `/css/tokens.css` (Root variables)
- `/css/reset.css` (Box sizing, margin resets)
- `/css/layout.css` (Grid/Flex skeletons)
- `/css/components/*.css` (Atomic styling)

**Naming:**
Use **BEM (Block Element Modifier)** for components:
`.button {}`
`.button--primary {}`
`.button__icon {}`
