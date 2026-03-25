---
phase: 01-rooms-voice
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - android/app/build.gradle.kts
  - android/app/src/main/java/com/cinesync/app/MainApplication.kt
  - android/app/src/main/java/com/cinesync/app/di/AppModule.kt
  - backend/package.json
  - backend/src/index.ts
  - backend/tsconfig.json
autonomous: true
requirements:
  - F-R1
  - F-R2
  - F-R3
  - F-R4
---

<objective>
Set up project foundations for both Android app and Node.js backend with required dependencies.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

## Requirements Summary
- Phase 1: Room System + Voice Chat
- Backend: Node.js + Express + Socket.io
- Android: Kotlin + Jetpack Compose + Hilt + Coroutines + WebRTC

## Key Tech Decisions
- Socket.io for reliable WebSocket abstraction
- Hilt for dependency injection
- WebRTC mesh topology (no SFU for v1)
- Room IDs: 6-char alphanumeric
</context>

<tasks>

<task type="auto">
  <name>Task 1: Android Project Setup</name>
  <files>android/app/build.gradle.kts, android/app/src/main/java/com/cinesync/app/MainApplication.kt, android/app/src/main/java/com/cinesync/app/di/AppModule.kt</files>
  <action>
    Set up Android project with Gradle Kotlin DSL:

    1. Create/verify android/app/build.gradle.kts with dependencies:
       - Jetpack Compose BOM (2024.02.00)
       - Hilt (2.50)
       - Kotlin Coroutines (1.7.3)
       - Retrofit + OkHttp (2.9.0 / 4.12.0)
       - Socket.io Client (2.1.0)
       - Google WebRTC (1.0.32006)
       - ExoPlayer/Media3 (1.2.1)
       - Navigation Compose (2.7.7)
       - Lifecycle ViewModel Compose (2.7.0)

    2. Create MainApplication.kt with:
       - @HiltAndroidApp annotation
       - Basic Hilt setup

    3. Create AppModule.kt under di package:
       - @Module @InstallIn(SingletonComponent::class)
       - Provide Retrofit instance for REST API
       - Provide Socket.IO client instance
       - Provide WebRTC PeerConnectionFactory

    4. Verify AndroidManifest.xml has:
       - INTERNET permission
       - RECORD_AUDIO permission
       - ACCESS_NETWORK_STATE permission
  </action>
  <verify>
    <automated>cd android && ./gradlew assembleDebug --dry-run 2>&1 | head -20</automated>
  </verify>
  <done>Android project builds with all dependencies resolved</done>
</task>

<task type="auto">
  <name>Task 2: Backend Project Setup</name>
  <files>backend/package.json, backend/src/index.ts, backend/tsconfig.json</files>
  <action>
    Set up Node.js backend project:

    1. Create/verify backend/package.json with dependencies:
       - express (4.18.2)
       - socket.io (4.7.4)
       - cors (2.8.5)
       - uuid (9.0.1)
       - typescript (5.3.3)
       - ts-node (10.9.2)
       - @types/node, @types/express, @types/cors, @types/uuid (dev)

    2. Create backend/tsconfig.json:
       - target: ES2020
       - module: commonjs
       - outDir: ./dist
       - rootDir: ./src
       - strict: true

    3. Create backend/src/index.ts:
       - Express app setup with CORS
       - Socket.io server initialization
       - Basic health check endpoint (GET /health)
       - Socket.io connection handler (log connections)
       - Room data structure in-memory store

    4. Create scripts in package.json:
       - "dev": "ts-node src/index.ts"
       - "build": "tsc"
       - "start": "node dist/index.js"
  </action>
  <verify>
    <automated>cd backend && npm install && npx ts-node --version</automated>
  </verify>
  <done>Backend server starts without errors and responds to health check</done>
</task>

</tasks>

<success_criteria>
- Android project has all required dependencies in build.gradle.kts
- Hilt is configured and MainApplication uses @HiltAndroidApp
- AppModule provides Retrofit, Socket.io client, WebRTC factory
- Backend package.json has express, socket.io, cors, uuid, typescript
- Backend compiles and starts with `npm run dev`
- Health endpoint returns 200
</success_criteria>

<output>
After completion, create `.planning/phases/01-rooms-voice/01-PLAN-SUMMARY.md`
</output>
