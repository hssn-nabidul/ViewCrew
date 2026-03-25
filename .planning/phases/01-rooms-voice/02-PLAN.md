---
phase: 01-rooms-voice
plan: 02
type: execute
wave: 2
depends_on:
  - 01-rooms-voice-01
files_modified:
  - backend/src/routes/rooms.ts
  - backend/src/routes/signaling.ts
  - backend/src/socket/handlers.ts
  - backend/src/index.ts
autonomous: true
requirements:
  - F-R1
  - F-R2
  - F-R3
  - F-R4
---

<objective>
Implement backend room management REST API and WebSocket signaling for WebRTC voice chat.
</objective>

<context>
@.planning/phases/01-rooms-voice/01-PLAN-SUMMARY.md
@.planning/REQUIREMENTS.md

## Requirements to implement:
- F-R1: Create Room (generates 6-char ID, shareable link, host role)
- F-R2: Join Room (via ID or link, validates existence, max 4 users)
- F-R3: Participant Management (real-time list, roles, status)
- F-R4: Room Lifecycle (persists while users connected, auto-destroy 60s after last leave, host can close)

## API Endpoints Required:
- POST /api/rooms - Create room
- GET /api/rooms/:id - Get room info
- POST /api/rooms/:id/join - Join room
- POST /api/rooms/:id/leave - Leave room
- DELETE /api/rooms/:id - Close room (host only)
- GET /api/rooms/:id/participants - List participants

## WebSocket Events (Socket.io):
- join_room, leave_room, participant_joined, participant_left
- WebRTC signaling: offer, answer, ice_candidate
</context>

<tasks>

<task type="auto">
  <name>Task 1: Room Management REST API</name>
  <files>backend/src/routes/rooms.ts, backend/src/models/room.ts</files>
  <action>
    Create room management REST API:

    1. Create backend/src/models/room.ts with interfaces:
       - Room { id, hostId, participants, createdAt, isActive }
       - Participant { id, socketId, displayName, joinedAt, isHost }

    2. Create backend/src/routes/rooms.ts with endpoints:

       POST /api/rooms
       - Body: { hostName: string }
       - Generates 6-char alphanumeric roomId using crypto.randomUUID().slice(0,6).toUpperCase()
       - Creates Room with host as first participant
       - Returns: { roomId, roomLink, hostToken }

       GET /api/rooms/:id
       - Returns room info if exists and active
       - Returns 404 if not found

       POST /api/rooms/:id/join
       - Body: { participantName: string }
       - Validates room exists and not full (max 4)
       - Creates participant, adds to room
       - Returns: { participantId, roomInfo }

       POST /api/rooms/:id/leave
       - Body: { participantId: string }
       - Removes participant
       - If host leaves: assign new host or close room after 60s

       DELETE /api/rooms/:id
       - Header: X-Host-Token (required)
       - Closes room, notifies all participants

       GET /api/rooms/:id/participants
       - Returns list of participants with status

    3. Wire routes in backend/src/index.ts under /api prefix
  </action>
  <verify>
    <automated>cd backend && npm run build && curl -s -X POST http://localhost:3000/api/rooms -H "Content-Type: application/json" -d '{"hostName":"Test"}' | head -100</automated>
  </verify>
  <done>All REST endpoints functional with proper validation and error handling</done>
</task>

<task type="auto">
  <name>Task 2: WebSocket Signaling Server</name>
  <files>backend/src/socket/handlers.ts, backend/src/index.ts</files>
  <action>
    Create Socket.io signaling server for WebRTC:

    1. Create backend/src/socket/handlers.ts with room manager:
       - In-memory Map<roomId, Set<socketId>>
       - Functions: joinRoom, leaveRoom, getRoomParticipants, broadcastToRoom

    2. Implement Socket.io event handlers:

       connection:
       - Log new connection

       join_room { roomId, participantId }:
       - Validate room exists
       - Join socket to room namespace
       - Notify other participants via participant_joined

       leave_room { roomId, participantId }:
       - Leave socket from room
       - Notify others via participant_left
       - Handle host transfer if needed

       WebRTC Signaling (relay only, don't process):
       - offer { targetId, offer, callerId } → emit to targetId
       - answer { targetId, answer, callerId } → emit to targetId
       - ice_candidate { targetId, candidate, senderId } → emit to targetId

       disconnect:
       - Clean up from all rooms
       - Trigger leave_room for that participant
  </action>
  <verify>
  </verify>
  <done>WebSocket server relays WebRTC signaling correctly between participants</done>
</task>

</tasks>

<success_criteria>
- POST /api/rooms creates room with unique 6-char ID
- Room join fails with 400 if room is full (4 participants)
- WebSocket emits participant_joined when new user joins
- WebRTC offer/answer/ice_candidate relay to correct target
- Room auto-destroys 60s after last participant leaves
</success_criteria>

<output>
After completion, create `.planning/phases/01-rooms-voice/02-PLAN-SUMMARY.md`
</output>
