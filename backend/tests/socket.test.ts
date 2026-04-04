import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from '../src/socket/handlers';
import roomsRouter, { setSocketServer } from '../src/routes/rooms';
import express from 'express';

describe('Socket Handlers', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let hostSocket: ClientSocket;
  let viewerSocket: ClientSocket;
  let createdRoomId: string;
  let hostToken: string;
  let hostParticipantId: string;
  let viewerParticipantId: string;

  beforeEach(async () => {
    // Create Express app + HTTP server
    const app = express();
    app.use(express.json());
    httpServer = createServer(app);

    // Create Socket.IO server
    io = new Server(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket']
    });

    // Inject Socket.IO into routes
    setSocketServer(io);
    app.use('/api/rooms', roomsRouter);

    // Setup socket handlers
    setupSocketHandlers(io);

    // Start server on random port
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    const address = httpServer.address() as import('net').AddressInfo;
    const url = `http://localhost:${address.port}`;

    // Create a room via REST API
    const createRes = await fetch(`${url}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName: 'TestHost' })
    });
    const createData = await createRes.json();
    createdRoomId = createData.roomId;
    hostToken = createData.hostToken;
    hostParticipantId = createData.participantId;

    // Create a viewer participant
    const joinRes = await fetch(`${url}/api/rooms/${createdRoomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantName: 'TestViewer' })
    });
    const joinData = await joinRes.json();
    viewerParticipantId = joinData.participantId;

    // Connect host socket
    hostSocket = ioc(url, {
      transports: ['websocket'],
      forceNew: true
    });
    await new Promise<void>((resolve, reject) => {
      hostSocket.on('connect', resolve);
      hostSocket.on('connect_error', reject);
    });

    // Connect viewer socket
    viewerSocket = ioc(url, {
      transports: ['websocket'],
      forceNew: true
    });
    await new Promise<void>((resolve, reject) => {
      viewerSocket.on('connect', resolve);
      viewerSocket.on('connect_error', reject);
    });
  });

  afterEach(async () => {
    hostSocket?.disconnect();
    viewerSocket?.disconnect();
    await new Promise<void>(resolve => {
      io.close(() => resolve());
    });
    await new Promise<void>(resolve => {
      httpServer.close(() => resolve());
    });
  });

  function joinAsHost(socket: ClientSocket, roomId: string, userId: string, displayName: string, token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      socket.once('room-state', resolve);
      socket.once('error', reject);
      socket.emit('join-room', { roomId, userId, displayName, hostToken: token });
    });
  }

  function joinAsViewer(socket: ClientSocket, roomId: string, userId: string, displayName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      socket.once('room-state', resolve);
      socket.once('error', reject);
      socket.emit('join-room', { roomId, userId, displayName });
    });
  }

  describe('join-room', () => {
    it('allows host to join with valid token', async () => {
      const state = await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);
      expect(state.roomId).toBe(createdRoomId);
      expect(state.hostId).toBe(hostParticipantId);
      expect(state.participants).toBeDefined();
    });

    it('allows viewer to join', async () => {
      // Host joins first
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);

      const state = await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');
      expect(state.roomId).toBe(createdRoomId);
    });

    it('rejects join with invalid room ID', async () => {
      const error = await new Promise<any>((resolve) => {
        hostSocket.once('error', resolve);
        hostSocket.emit('join-room', { roomId: 'invalid!!', userId: 'user1', displayName: 'Test' });
      });
      expect(error.code).toBe('INVALID_INPUT');
    });

    it('rejects join with invalid user ID', async () => {
      const error = await new Promise<any>((resolve) => {
        hostSocket.once('error', resolve);
        hostSocket.emit('join-room', { roomId: createdRoomId, userId: '', displayName: 'Test' });
      });
      expect(error.code).toBe('INVALID_INPUT');
    });

    it('broadcasts user-joined to other participants', async () => {
      // Host joins first
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);

      // Viewer joins and host should receive user-joined
      const userJoined = new Promise<any>(resolve => {
        hostSocket.once('user-joined', resolve);
      });

      await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');

      const data = await userJoined;
      expect(data.displayName).toBe('TestViewer');
    });
  });

  describe('sync-event', () => {
    beforeEach(async () => {
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);
      await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');
    });

    it('broadcasts play event from host to viewers', async () => {
      const syncEvent = new Promise<any>(resolve => {
        viewerSocket.once('sync-event', resolve);
      });

      hostSocket.emit('sync-event', {
        roomId: createdRoomId,
        type: 'play',
        time: 0
      });

      const data = await syncEvent;
      expect(data.type).toBe('play');
    });

    it('broadcasts pause event from host to viewers', async () => {
      const syncEvent = new Promise<any>(resolve => {
        viewerSocket.once('sync-event', resolve);
      });

      hostSocket.emit('sync-event', {
        roomId: createdRoomId,
        type: 'pause',
        time: 30
      });

      const data = await syncEvent;
      expect(data.type).toBe('pause');
    });

    it('broadcasts seek event from host to viewers', async () => {
      const syncEvent = new Promise<any>(resolve => {
        viewerSocket.once('sync-event', resolve);
      });

      hostSocket.emit('sync-event', {
        roomId: createdRoomId,
        type: 'seek',
        time: 120
      });

      const data = await syncEvent;
      expect(data.type).toBe('seek');
      expect(data.time).toBe(120);
    });

    it('rejects sync-event from non-host', async () => {
      const error = new Promise<any>(resolve => {
        viewerSocket.once('error', resolve);
      });

      viewerSocket.emit('sync-event', {
        roomId: createdRoomId,
        type: 'play',
        time: 0
      });

      const data = await error;
      expect(data.code).toBe('NOT_HOST');
    });
  });

  describe('chat-message', () => {
    beforeEach(async () => {
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);
      await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');
    });

    it('broadcasts chat message to all participants', async () => {
      const chatMsg = new Promise<any>(resolve => {
        viewerSocket.once('chat-message', resolve);
      });

      hostSocket.emit('chat-message', {
        message: 'Hello everyone!'
      });

      const data = await chatMsg;
      expect(data.message).toBe('Hello everyone!');
      expect(data.displayName).toBe('TestHost');
    });
  });

  describe('send-reaction', () => {
    beforeEach(async () => {
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);
      await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');
    });

    it('broadcasts reaction to all participants', async () => {
      const reaction = new Promise<any>(resolve => {
        viewerSocket.once('new-reaction', resolve);
      });

      hostSocket.emit('send-reaction', {
        emojiId: 'laugh'
      });

      const data = await reaction;
      expect(data.emojiId).toBe('laugh');
      expect(data.displayName).toBe('TestHost');
    });

    it('rejects invalid emoji', async () => {
      const error = new Promise<any>(resolve => {
        hostSocket.once('error', resolve);
      });

      hostSocket.emit('send-reaction', {
        emojiId: 'invalid_emoji'
      });

      const data = await error;
      expect(data.code).toBe('INVALID_INPUT');
    });
  });

  describe('user-speaking', () => {
    beforeEach(async () => {
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);
      await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');
    });

    it('broadcasts speaking state to other participants', async () => {
      const speaking = new Promise<any>(resolve => {
        viewerSocket.once('user-speaking', resolve);
      });

      hostSocket.emit('user-speaking', {
        roomId: createdRoomId,
        userId: hostParticipantId,
        isSpeaking: true
      });

      const data = await speaking;
      expect(data.userId).toBe(hostParticipantId);
      expect(data.isSpeaking).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('broadcasts user-left when socket disconnects', async () => {
      await joinAsHost(hostSocket, createdRoomId, hostParticipantId, 'TestHost', hostToken);
      await joinAsViewer(viewerSocket, createdRoomId, viewerParticipantId, 'TestViewer');

      const userLeft = new Promise<any>(resolve => {
        hostSocket.once('user-left', resolve);
      });

      viewerSocket.disconnect();

      const data = await userLeft;
      expect(data).toBe(viewerParticipantId);
    });
  });
});
