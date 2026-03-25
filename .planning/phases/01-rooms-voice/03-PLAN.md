---
phase: 01-rooms-voice
plan: 03
type: execute
wave: 3
depends_on:
  - 01-rooms-voice-01
files_modified:
  - android/app/src/main/java/com/cinesync/app/ui/screens/HomeScreen.kt
  - android/app/src/main/java/com/cinesync/app/ui/screens/RoomScreen.kt
  - android/app/src/main/java/com/cinesync/app/ui/screens/CreateRoomScreen.kt
  - android/app/src/main/java/com/cinesync/app/ui/screens/JoinRoomScreen.kt
  - android/app/src/main/java/com/cinesync/app/ui/components/ParticipantList.kt
  - android/app/src/main/java/com/cinesync/app/viewmodel/RoomViewModel.kt
  - android/app/src/main/java/com/cinesync/app/navigation/Screen.kt
  - android/app/src/main/java/com/cinesync/app/data/repository/RoomRepository.kt
autonomous: true
requirements:
  - F-R1
  - F-R2
  - F-R3
  - F-R4
---

<objective>
Implement Android UI for room creation, joining, and participant display.
</objective>

<context>
@.planning/phases/01-rooms-voice/01-PLAN-SUMMARY.md
@.planning/phases/01-rooms-voice/02-PLAN-SUMMARY.md
@.planning/REQUIREMENTS.md

## UI Requirements:
- S-U1: Home Screen (Create Room, Join Room buttons, branding)
- S-U2: Room Screen Layout (video area, participant sidebar, controls)
- Connection status indicator

## Navigation Flow:
Home -> CreateRoom -> Room (as host)
Home -> JoinRoom -> Room (as participant)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Room Repository and ViewModel</name>
  <files>android/app/src/main/java/com/cinesync/app/data/repository/RoomRepository.kt, android/app/src/main/java/com/cinesync/app/viewmodel/RoomViewModel.kt</files>
  <action>
    Create data layer for room operations:

    1. Create RoomRepository.kt:
       - @Singleton with Hilt
       - Retrofit instance for REST API calls
       - Socket.io client injection
       - Functions:
         * createRoom(hostName: String): Flow<Result<Room>>
         * joinRoom(roomId: String, participantName: String): Flow<Result<Participant>>
         * leaveRoom(roomId: String, participantId: String)
         * getRoomInfo(roomId: String): Flow<Result<Room>>
         * closeRoom(roomId: String, hostToken: String)
       - Connect to Socket.io namespace /room/:id
       - Expose socket events as Flows: participantJoined, participantLeft, roomClosed

    2. Create RoomViewModel.kt:
       - @HiltViewModel
       - State: uiState (sealed class with Loading, Success, Error states)
       - Room state: roomId, isHost, participants (List), connectionStatus
       - Functions:
         * createRoom(hostName: String)
         * joinRoom(roomId: String, participantName: String)
         * leaveRoom()
         * closeRoom()
       - Socket event handlers to update participants list
  </action>
  <verify>
    <automated>cd android && ./gradlew :app:compileDebugKotlin 2>&1 | grep -E "(error|FAILURE|SUCCESS)" | head -10</automated>
  </verify>
  <done>Repository and ViewModel compile and handle API calls</done>
</task>

<task type="auto">
  <name>Task 2: Home and Room Navigation</name>
  <files>android/app/src/main/java/com/cinesync/app/ui/screens/HomeScreen.kt, android/app/src/main/java/com/cinesync/app/navigation/Screen.kt</files>
  <action>
    Create navigation structure and Home screen:

    1. Create Screen.kt with navigation routes:
       - object Home
       - object CreateRoom
       - object JoinRoom
       - data class Room(val roomId: String, val isHost: Boolean)

    2. Update MainActivity to set up NavHost:
       - StartDestination = Home
       - Routes for CreateRoom, JoinRoom, Room

    3. Create HomeScreen.kt:
       - Centered layout with CineSync branding/logo
       - "Create Room" primary button (navigates to CreateRoom)
       - "Join Room" secondary button (navigates to JoinRoom)
       - Clean Material Design 3 styling
  </action>
  <verify>
    <automated>cd android && ./gradlew :app:compileDebugKotlin 2>&1 | grep -E "HomeScreen|RoomScreen" | head -5</automated>
  </verify>
  <done>Home screen displays with navigation to room flows</done>
</task>

<task type="auto">
  <name>Task 3: Room Creation and Joining UI</name>
  <files>android/app/src/main/java/com/cinesync/app/ui/screens/CreateRoomScreen.kt, android/app/src/main/java/com/cinesync/app/ui/screens/JoinRoomScreen.kt</files>
  <action>
    Create room creation and joining screens:

    1. CreateRoomScreen.kt:
       - Text field for host display name
       - "Create Room" button (calls ViewModel.createRoom)
       - Loading state while creating
       - On success: navigate to Room screen with roomId
       - Show generated room ID and share link after creation
       - "Copy Link" button for sharing

    2. JoinRoomScreen.kt:
       - Text field for room ID (auto-uppercase, max 6 chars)
       - OR paste/share link detection
       - Text field for participant name
       - "Join Room" button
       - Loading state while joining
       - Error handling (room not found, room full)
       - On success: navigate to Room screen with roomId
  </action>
  <verify>
    <automated>cd android && ./gradlew :app:compileDebugKotlin 2>&1 | grep -E "CreateRoomScreen|JoinRoomScreen" | head -5</automated>
  </verify>
  <done>User can create or join room with proper validation and feedback</done>
</task>

</tasks>

<success_criteria>
- Home screen shows Create Room and Join Room options
- Create room generates ID and shows share link
- Join room validates ID exists before joining
- Navigation to Room screen after successful create/join
- Room ID copy-to-clipboard works
</success_criteria>

<output>
After completion, create `.planning/phases/01-rooms-voice/03-PLAN-SUMMARY.md`
</output>
