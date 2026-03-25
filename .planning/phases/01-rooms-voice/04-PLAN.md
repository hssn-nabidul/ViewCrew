---
phase: 01-rooms-voice
plan: 04
type: execute
wave: 4
depends_on:
  - 01-rooms-voice-02
  - 01-rooms-voice-03
files_modified:
  - android/app/src/main/java/com/cinesync/app/ui/screens/RoomScreen.kt
  - android/app/src/main/java/com/cinesync/app/ui/components/ParticipantList.kt
  - android/app/src/main/java/com/cinesync/app/ui/components/VoiceControlBar.kt
  - android/app/src/main/java/com/cinesync/app/webrtc/WebRTCManager.kt
  - android/app/src/main/java/com/cinesync/app/viewmodel/RoomViewModel.kt
autonomous: false
requirements:
  - F-A1
  - F-A2
  - F-A3
  - F-R3
---

<objective>
Implement WebRTC voice chat integration with mute controls and participant status display.
</objective>

<context>
@.planning/phases/01-rooms-voice/02-PLAN-SUMMARY.md
@.planning/phases/01-rooms-voice/03-PLAN-SUMMARY.md
@.planning/REQUIREMENTS.md

## Voice Chat Requirements:
- F-A1: Real-time audio via WebRTC mesh, auto-route to speaker
- F-A2: Mute/unmute toggle, visual indicator, auto-mute on join
- F-A3: Opus codec, echo cancellation, noise suppression, adaptive bitrate

## Room Screen Layout (S-U2):
- Video player area (main, 16:9 - placeholder for now)
- Participant list sidebar
- Voice control bar (mute, speaker toggle)
- Share room button
- Leave room button
</context>

<tasks>

<task type="auto">
  <name>Task 1: WebRTC Voice Chat Integration</name>
  <files>android/app/src/main/java/com/cinesync/app/webrtc/WebRTCManager.kt</files>
  <action>
    Create WebRTC manager for voice chat:

    1. Create WebRTCManager.kt:
       - @Singleton with Hilt
       - Inject PeerConnectionFactory from AppModule
       - Inject Socket.io client for signaling
       - State: isMuted, localAudioTrack, peerConnections (Map)

       Functions:
       * initialize() - Create audio constraints (Opus codec, echo cancellation, noise suppression)
       * joinRoom(roomId: String, localParticipantId: String) - Connect to signaling namespace
       * createPeerConnection(peerId: String): PeerConnection - For each participant
       * handleOffer/Answer/IceCandidate from socket - Process WebRTC signaling
       * toggleMute() - Enable/disable local audio track
       * leaveRoom() - Close all connections

       Socket event handlers:
       - participant_joined: Create peer connection, send offer
       - participant_left: Close peer connection
       - offer: Create answer
       - answer: Set remote description
       - ice_candidate: Add ICE candidate

    2. Use STUN servers: stun:stun.l.google.com:19302
    3. Enable audio processing: AEC, NS, AGC via MediaConstraints
  </action>
  <verify>
    <automated>cd android && ./gradlew :app:compileDebugKotlin 2>&1 | grep -E "WebRTCManager" | head -5</automated>
  </verify>
  <done>WebRTC manager initializes and establishes voice connections</done>
</task>

<task type="auto">
  <name>Task 2: Participant List Component</name>
  <files>android/app/src/main/java/com/cinesync/app/ui/components/ParticipantList.kt</files>
  <action>
    Create participant list UI:

    1. Create ParticipantList.kt:
       - Composable function: @Composable fun ParticipantList(participants: List<Participant>, isHost: Boolean)
       - LazyColumn for participant items
       - Each item shows:
         * Avatar/initial with unique color per participant
         * Display name
         * Role badge (Host/Participant)
         * Mute status icon (if muted, show mic-off icon)
         * Connection status dot (green=connected, yellow=connecting, red=disconnected)

    2. Participant item design:
       - Row layout with icon, name, badges
       - Background tint based on role (Host gets accent color)
       - Current user highlighted with border
  </action>
  <verify>
    <automated>cd android && ./gradlew :app:compileDebugKotlin 2>&1 | grep -E "ParticipantList" | head -5</automated>
  </verify>
  <done>Participant list displays real-time updates with status indicators</done>
</task>

<task type="auto">
  <name>Task 3: Voice Control Bar and Room Screen</name>
  <files>android/app/src/main/java/com/cinesync/app/ui/components/VoiceControlBar.kt, android/app/src/main/java/com/cinesync/app/ui/screens/RoomScreen.kt</files>
  <action>
    Create voice controls and main room screen:

    1. Create VoiceControlBar.kt:
       - @Composable fun VoiceControlBar(
           isMuted: Boolean,
           isConnected: Boolean,
           onToggleMute: () -> Unit,
           onToggleSpeaker: () -> Unit
         )
       - Row of icon buttons:
         * Mute toggle (mic_on/mic_off)
         * Speaker toggle (speaker_on/speaker_off)
       - Visual feedback (red overlay when muted)
       - Disabled state when not connected

    2. Create RoomScreen.kt:
       - Scaffold with top bar (room ID, share button, leave button)
       - Main area: Video player placeholder (gray box for Phase 1)
       - Bottom: VoiceControlBar
       - Side/Drawer: ParticipantList
       - Connection status banner at top
       - ViewModel integration for state
       - Auto-join voice on room enter (start unmuted, let user control)
  </action>
  <verify>
    <automated>cd android && ./gradlew :app:compileDebugKotlin 2>&1 | grep -E "RoomScreen|VoiceControlBar" | head -5</automated>
  </verify>
  <done>Room screen shows all components integrated with voice controls</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Voice Chat Verification</name>
  <what-built>WebRTC voice chat with room system</what-built>
  <how-to-verify>
    ## Testing Voice Chat

    1. **Build and Install:**
       - `cd android && ./gradlew installDebug`
       - Install on two Android devices/emulators

    2. **Test Room Creation:**
       - Device A: Open app -> Create Room -> Enter name -> Create
       - Note the room ID shown

    3. **Test Room Joining:**
       - Device B: Open app -> Join Room -> Enter room ID and name -> Join

    4. **Test Voice Chat:**
       - Both devices should auto-connect to voice
       - Speak on Device A, verify audio on Device B
       - Tap mute on Device A, verify mic-off on Device B
       - Test reverse (Device B speaks, Device A hears)

    5. **Test Participant List:**
       - Both devices should show each other in participant list
       - Role badges should show correctly
       - Mute indicators should sync

    ## Expected Results:
    - Voice latency < 200ms
    - No echo or feedback
    - Participant list updates within 1s of join/leave
    - Mute state reflects immediately
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<success_criteria>
- Two devices can join same room
- Voice chat works bidirectionally
- Mute/unmute works and shows in participant list
- Participant list shows real-time updates
- Leave room cleans up all connections
- No crashes or ANRs during voice session
</success_criteria>

<output>
After completion, create `.planning/phases/01-rooms-voice/04-PLAN-SUMMARY.md`
</output>
