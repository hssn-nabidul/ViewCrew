import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import roomsRouter, { setSocketServer } from '../src/routes/rooms';

// Mock Socket.IO server
const mockIo = {
  to: (room: string) => ({
    emit: () => {}
  })
} as any;

// Create test app
const app = express();
app.use(express.json());

// Inject mock socket server before mounting routes
setSocketServer(mockIo);
app.use('/api/rooms', roomsRouter);

describe('Room Routes', () => {
  let createdRoomId: string;
  let hostToken: string;
  let participantId: string;

  describe('POST /api/rooms', () => {
    it('creates a new room and returns roomId + hostToken', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ hostName: 'TestHost' })
        .expect(201);

      expect(res.body.roomId).toBeDefined();
      expect(res.body.roomId.length).toBe(6);
      expect(res.body.hostToken).toBeDefined();
      expect(res.body.participantId).toBeDefined();
      expect(res.body.roomLink).toContain(res.body.roomId);

      createdRoomId = res.body.roomId;
      hostToken = res.body.hostToken;
      participantId = res.body.participantId;
    });

    it('rejects missing hostName', async () => {
      await request(app)
        .post('/api/rooms')
        .send({})
        .expect(400);
    });

    it('rejects empty hostName', async () => {
      await request(app)
        .post('/api/rooms')
        .send({ hostName: '' })
        .expect(400);
    });

    it('supports optional password', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ hostName: 'SecureHost', password: 'secret123' })
        .expect(201);

      expect(res.body.roomId).toBeDefined();
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('returns room info for existing room', async () => {
      const res = await request(app)
        .get(`/api/rooms/${createdRoomId}`)
        .expect(200);

      expect(res.body.id).toBe(createdRoomId);
      expect(res.body.participantCount).toBe(1);
      expect(res.body.maxParticipants).toBe(4);
      expect(res.body.isActive).toBe(true);
    });

    it('returns 404 for non-existent room', async () => {
      await request(app)
        .get('/api/rooms/NOTFOUND')
        .expect(404);
    });

    it('is case-insensitive', async () => {
      await request(app)
        .get(`/api/rooms/${createdRoomId.toLowerCase()}`)
        .expect(200);
    });
  });

  describe('POST /api/rooms/:id/join', () => {
    it('joins an existing room', async () => {
      const res = await request(app)
        .post(`/api/rooms/${createdRoomId}/join`)
        .send({ participantName: 'Viewer1' })
        .expect(200);

      expect(res.body.participantId).toBeDefined();
      expect(res.body.roomInfo.id).toBe(createdRoomId);
    });

    it('rejects joining non-existent room', async () => {
      await request(app)
        .post('/api/rooms/NOTFOUND/join')
        .send({ participantName: 'Viewer1' })
        .expect(404);
    });

    it('rejects missing participantName', async () => {
      await request(app)
        .post(`/api/rooms/${createdRoomId}/join`)
        .send({})
        .expect(400);
    });

    it('rejects wrong password for password-protected room', async () => {
      // Create a password-protected room
      const secureRes = await request(app)
        .post('/api/rooms')
        .send({ hostName: 'SecureHost', password: 'correct' })
        .expect(201);

      const secureRoomId = secureRes.body.roomId;

      // Try to join with wrong password
      await request(app)
        .post(`/api/rooms/${secureRoomId}/join`)
        .send({ participantName: 'Viewer1', password: 'wrong' })
        .expect(403);

      // Try to join without password
      await request(app)
        .post(`/api/rooms/${secureRoomId}/join`)
        .send({ participantName: 'Viewer1' })
        .expect(403);

      // Join with correct password
      await request(app)
        .post(`/api/rooms/${secureRoomId}/join`)
        .send({ participantName: 'Viewer1', password: 'correct' })
        .expect(200);
    });
  });

  describe('POST /api/rooms/:id/leave', () => {
    let leaveRoomId: string;
    let leaveHostToken: string;
    let leaveParticipantId: string;
    let viewerParticipantId: string;

    beforeEach(async () => {
      // Create a room for leave tests
      const createRes = await request(app)
        .post('/api/rooms')
        .send({ hostName: 'LeaveHost' })
        .expect(201);

      leaveRoomId = createRes.body.roomId;
      leaveHostToken = createRes.body.hostToken;
      leaveParticipantId = createRes.body.participantId;

      // Add a viewer
      const joinRes = await request(app)
        .post(`/api/rooms/${leaveRoomId}/join`)
        .send({ participantName: 'Viewer1' })
        .expect(200);

      viewerParticipantId = joinRes.body.participantId;
    });

    it('allows a participant to leave', async () => {
      await request(app)
        .post(`/api/rooms/${leaveRoomId}/leave`)
        .send({ participantId: viewerParticipantId })
        .expect(200);
    });

    it('returns 404 for non-existent participant', async () => {
      await request(app)
        .post(`/api/rooms/${leaveRoomId}/leave`)
        .send({ participantId: 'non-existent-id' })
        .expect(404);
    });

    it('returns 400 for missing participantId', async () => {
      await request(app)
        .post(`/api/rooms/${leaveRoomId}/leave`)
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    let deleteRoomId: string;
    let deleteHostToken: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/rooms')
        .send({ hostName: 'DeleteHost' })
        .expect(201);

      deleteRoomId = createRes.body.roomId;
      deleteHostToken = createRes.body.hostToken;
    });

    it('deletes room with valid host token', async () => {
      await request(app)
        .delete(`/api/rooms/${deleteRoomId}`)
        .set('x-host-token', deleteHostToken)
        .expect(200);

      // Verify room is gone
      await request(app)
        .get(`/api/rooms/${deleteRoomId}`)
        .expect(404);
    });

    it('rejects deletion with invalid host token', async () => {
      await request(app)
        .delete(`/api/rooms/${deleteRoomId}`)
        .set('x-host-token', 'wrong-token')
        .expect(403);
    });

    it('rejects deletion without host token', async () => {
      await request(app)
        .delete(`/api/rooms/${deleteRoomId}`)
        .expect(403);
    });

    it('returns 404 for non-existent room', async () => {
      await request(app)
        .delete('/api/rooms/NOTFOUND')
        .set('x-host-token', 'some-token')
        .expect(404);
    });
  });

  describe('GET /api/rooms/:id/participants', () => {
    it('returns participant list', async () => {
      const res = await request(app)
        .get(`/api/rooms/${createdRoomId}/participants`)
        .expect(200);

      expect(res.body.participants).toBeDefined();
      expect(Array.isArray(res.body.participants)).toBe(true);
      expect(res.body.participants.length).toBeGreaterThanOrEqual(1);
    });

    it('returns 404 for non-existent room', async () => {
      await request(app)
        .get('/api/rooms/NOTFOUND/participants')
        .expect(404);
    });
  });
});
