import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Room, Participant, CreateRoomResponse, RoomInfoResponse, JoinRoomResponse, ParticipantListResponse, ApiError } from '../models/room';

const router = Router();

// In-memory room store
const rooms = new Map<string, Room>();

// Max participants per room
const MAX_PARTICIPANTS = 4;

// Generate 6-char alphanumeric room ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate secure host token
function generateHostToken(): string {
  return uuidv4();
}

// Find available room ID (avoid collisions)
async function findAvailableRoomId(): Promise<string> {
  let roomId = generateRoomId();
  let attempts = 0;
  while (rooms.has(roomId) && attempts < 10) {
    roomId = generateRoomId();
    attempts++;
  }
  if (rooms.has(roomId)) {
    throw new Error('Failed to generate unique room ID');
  }
  return roomId;
}

// Get or create room (for signaling module access)
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

// Add participant to room (for signaling module)
export function addParticipantToRoom(roomId: string, participant: Participant): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  if (room.participants.size >= MAX_PARTICIPANTS) {
    return false;
  }
  
  room.participants.set(participant.id, participant);
  room.isActive = true;
  
  // Cancel any pending destroy timer
  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
    room.destroyTimer = null;
  }
  
  return true;
}

// Remove participant from room (for signaling module)
export function removeParticipantFromRoom(roomId: string, participantId: string): Participant | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  
  const participant = room.participants.get(participantId);
  if (!participant) return undefined;
  
  room.participants.delete(participantId);
  
  // If room is empty or host left, schedule destroy
  if (room.participants.size === 0) {
    scheduleRoomDestroy(room);
  } else if (participant.isHost) {
    // Transfer host to next participant
    const newHost = room.participants.values().next().value;
    if (newHost) {
      newHost.isHost = true;
      room.hostId = newHost.id;
    }
  }
  
  return participant;
}

// Schedule room destruction after delay
function scheduleRoomDestroy(room: Room, delayMs: number = 60000): void {
  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
  }
  
  room.destroyTimer = setTimeout(() => {
    if (room.participants.size === 0) {
      rooms.delete(room.id);
      console.log(`[Room] Room ${room.id} destroyed (timeout)`);
    }
  }, delayMs);
}

// POST /api/rooms - Create a new room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { hostName } = req.body;
    
    if (!hostName || typeof hostName !== 'string' || hostName.trim().length === 0) {
      const error: ApiError = { error: 'VALIDATION_ERROR', message: 'hostName is required' };
      res.status(400).json(error);
      return;
    }
    
    const roomId = await findAvailableRoomId();
    const hostToken = generateHostToken();
    const hostId = uuidv4();
    
    const hostParticipant: Participant = {
      id: hostId,
      socketId: '',
      displayName: hostName.trim(),
      joinedAt: new Date(),
      isHost: true
    };
    
    const room: Room = {
      id: roomId,
      hostId: hostId,
      hostToken: hostToken,
      participants: new Map([[hostId, hostParticipant]]),
      createdAt: new Date(),
      isActive: true,
      destroyTimer: null
    };
    
    rooms.set(roomId, room);
    
    const response: CreateRoomResponse = {
      roomId,
      roomLink: `/room/${roomId}`,
      hostToken,
      participantId: hostId
    };
    
    console.log(`[Room] Created room ${roomId} by host ${hostName}`);
    res.status(201).json(response);
  } catch (error) {
    console.error('[Room] Error creating room:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create room' });
  }
});

// GET /api/rooms/:id - Get room info
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const room = rooms.get(id.toUpperCase());
  
  if (!room || !room.isActive) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Room not found' });
    return;
  }
  
  const response: RoomInfoResponse = {
    id: room.id,
    hostId: room.hostId,
    participantCount: room.participants.size,
    maxParticipants: MAX_PARTICIPANTS,
    createdAt: room.createdAt,
    isActive: room.isActive
  };
  
  res.json(response);
});

// POST /api/rooms/:id/join - Join a room
router.post('/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const { participantName } = req.body;
  
  if (!participantName || typeof participantName !== 'string' || participantName.trim().length === 0) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'participantName is required' });
    return;
  }
  
  const room = rooms.get(id.toUpperCase());
  
  if (!room || !room.isActive) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Room not found' });
    return;
  }
  
  if (room.participants.size >= MAX_PARTICIPANTS) {
    res.status(400).json({ error: 'ROOM_FULL', message: 'Room is full (max 4 participants)' });
    return;
  }
  
  const participantId = uuidv4();
  const participant: Participant = {
    id: participantId,
    socketId: '',
    displayName: participantName.trim(),
    joinedAt: new Date(),
    isHost: false
  };
  
  room.participants.set(participantId, participant);
  
  // Cancel destroy timer if room was pending destruction
  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
    room.destroyTimer = null;
  }
  
  const response: JoinRoomResponse = {
    participantId,
    roomInfo: {
      id: room.id,
      hostId: room.hostId,
      participantCount: room.participants.size,
      maxParticipants: MAX_PARTICIPANTS,
      createdAt: room.createdAt,
      isActive: room.isActive
    }
  };
  
  console.log(`[Room] ${participantName} joined room ${room.id}`);
  res.json(response);
});

// POST /api/rooms/:id/leave - Leave a room
router.post('/:id/leave', (req: Request, res: Response) => {
  const { id } = req.params;
  const { participantId } = req.body;
  
  if (!participantId || typeof participantId !== 'string') {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'participantId is required' });
    return;
  }
  
  const room = rooms.get(id.toUpperCase());
  
  if (!room) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Room not found' });
    return;
  }
  
  const participant = room.participants.get(participantId);
  if (!participant) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Participant not found' });
    return;
  }
  
  room.participants.delete(participantId);
  console.log(`[Room] ${participant.displayName} left room ${room.id}`);
  
  // Handle host departure
  if (participant.isHost) {
    if (room.participants.size > 0) {
      // Transfer host to first remaining participant
      const newHost = room.participants.values().next().value;
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
        console.log(`[Room] Host transferred to ${newHost.displayName} in room ${room.id}`);
      }
    } else {
      // Schedule room destruction
      scheduleRoomDestroy(room);
    }
  } else if (room.participants.size === 0) {
    scheduleRoomDestroy(room);
  }
  
  res.json({ success: true });
});

// DELETE /api/rooms/:id - Close room (host only)
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const hostToken = req.headers['x-host-token'] as string;
  
  const room = rooms.get(id.toUpperCase());
  
  if (!room) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Room not found' });
    return;
  }
  
  if (!hostToken || hostToken !== room.hostToken) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid host token' });
    return;
  }
  
  // Clear destroy timer if exists
  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
  }
  
  room.isActive = false;
  room.participants.clear();
  rooms.delete(room.id);
  
  console.log(`[Room] Room ${room.id} closed by host`);
  res.json({ success: true, message: 'Room closed' });
});

// GET /api/rooms/:id/participants - List participants
router.get('/:id/participants', (req: Request, res: Response) => {
  const { id } = req.params;
  const room = rooms.get(id.toUpperCase());
  
  if (!room || !room.isActive) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Room not found' });
    return;
  }
  
  const participants = Array.from(room.participants.values()).map(p => ({
    id: p.id,
    displayName: p.displayName,
    isHost: p.isHost,
    joinedAt: p.joinedAt
  }));
  
  const response: ParticipantListResponse = { participants };
  res.json(response);
});

// Export for use by other modules
export { rooms, MAX_PARTICIPANTS };
export default router;
