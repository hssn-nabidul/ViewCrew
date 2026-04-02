import { Server, Socket } from 'socket.io';
import { Room, Participant } from '../models/room';
import { rooms, getRoom } from '../routes/rooms';
import { createRateLimiter, SocketRateLimiter } from '../middleware/rateLimiter';
import {
  validateRoomId,
  validateDisplayName,
  validateChatMessage,
  validateSyncType,
  validateEmojiId,
  validateTime,
  validateUserId,
} from '../middleware/validation';

// Socket data stored per connection
interface SocketData {
  roomId?: string;
  userId?: string;
  displayName?: string;
}

// Room participants tracking (socketId -> {roomId, userId})
const socketToRoom = new Map<string, { roomId: string; userId: string }>();

// Rate limiting for chat messages (socketId -> timestamp of last message)
const chatRateLimit = new Map<string, number>();
const CHAT_RATE_LIMIT_MS = 1000; // 1 message per second
const CHAT_RATE_LIMIT_WINDOW = 10; // Max 10 messages
const chatMessageCount = new Map<string, number>();
const chatMessageWindow = new Map<string, number>();

// Socket event rate limiters
const syncLimiter = createRateLimiter({ maxEvents: 10, windowMs: 1000, blockMs: 5000 });
const reactionLimiter = createRateLimiter({ maxEvents: 5, windowMs: 1000, blockMs: 3000 });
const signalingLimiter = createRateLimiter({ maxEvents: 20, windowMs: 1000, blockMs: 5000 });
const generalLimiter = createRateLimiter({ maxEvents: 15, windowMs: 1000, blockMs: 3000 });

// Cleanup stale rate limiter entries every 60s
setInterval(() => {
  syncLimiter.cleanup();
  reactionLimiter.cleanup();
  signalingLimiter.cleanup();
  generalLimiter.cleanup();
}, 60000);

function checkRateLimit(socket: Socket, limiter: SocketRateLimiter, eventName: string): boolean {
  const result = limiter.allow(socket.id);
  if (!result.allowed) {
    socket.emit('error', {
      code: 'RATE_LIMITED',
      message: `${eventName} rate exceeded`,
      retryAfter: result.retryAfter
    });
    return false;
  }
  return true;
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    const socketData: SocketData = {};
    socket.data = socketData;

    // join-room: Join a room namespace
    socket.on('join-room', async (data: { roomId: string; userId: string; displayName: string }) => {
      try {
        if (!checkRateLimit(socket, generalLimiter, 'join-room')) return;

        const roomId = validateRoomId(data?.roomId);
        if (!roomId) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
          return;
        }

        const userId = validateUserId(data?.userId);
        if (!userId) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid user ID' });
          return;
        }

        const displayName = validateDisplayName(data?.displayName);
        if (!displayName) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid display name' });
          return;
        }
        
        // Validate room exists
        const room = getRoom(roomId);
        if (!room || !room.isActive) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }
        
        // Find participant in room
        const participant = room.participants.get(userId);
        if (!participant) {
          socket.emit('error', { code: 'PARTICIPANT_NOT_FOUND', message: 'Participant not found' });
          return;
        }
        
        // Update participant socket ID and display name
        participant.socketId = socket.id;
        participant.displayName = displayName;
        
        // Join socket to room
        await socket.join(roomId);
        
        // Track socket -> room mapping
        socketData.roomId = roomId;
        socketData.userId = userId;
        socketData.displayName = displayName;
        socketToRoom.set(socket.id, { roomId, userId });
        
        // Notify other participants
        socket.to(roomId).emit('user-joined', {
          userId,
          displayName,
          isHost: participant.isHost
        });
        
        // Send current participants to joining user
        socket.emit('room-state', {
          roomId,
          hostId: room.hostId,
          isScreenSharing: room.isScreenSharing,
          screenSharingUserId: room.screenSharingUserId,
          currentSource: room.currentSource,
          currentSourceValue: room.currentSourceValue,
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          participants: Array.from(room.participants.values()).map(p => ({
            userId: p.id,
            displayName: p.displayName,
            isHost: p.isHost
          }))
        });
        
        console.log(`[Socket] ${displayName} joined room ${roomId}`);
      } catch (error) {
        console.error('[Socket] Error joining room:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
      }
    });

    // leave-room: Leave current room
    socket.on('leave-room', async (data: { roomId: string; userId: string }) => {
      try {
        if (!checkRateLimit(socket, generalLimiter, 'leave-room')) return;

        const roomId = validateRoomId(data?.roomId);
        if (!roomId) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
          return;
        }

        const userId = validateUserId(data?.userId);
        if (!userId) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid user ID' });
          return;
        }

        await handleLeaveRoom(io, socket, roomId, userId);
      } catch (error) {
        console.error('[Socket] Error leaving room:', error);
        socketToRoom.delete(socket.id);
        socket.emit('error', { code: 'LEAVE_FAILED', message: 'Failed to leave room' });
      }
    });

    // WebRTC Signaling handlers
    socket.on('user-speaking', (data: { roomId: string; userId: string; isSpeaking: boolean }) => {
      if (!checkRateLimit(socket, generalLimiter, 'user-speaking')) return;
      const { roomId, userId, isSpeaking } = data;
      socket.to(roomId.toUpperCase()).emit('user-speaking', { userId, isSpeaking });
    });

    socket.on('offer', (data: { targetId: string; offer: any; callerId: string }) => {
      if (!checkRateLimit(socket, signalingLimiter, 'offer')) return;
      relayToUser(io, socketData.roomId, data.targetId, 'offer', data);
    });

    socket.on('answer', (data: { targetId: string; answer: any; callerId: string }) => {
      if (!checkRateLimit(socket, signalingLimiter, 'answer')) return;
      relayToUser(io, socketData.roomId, data.targetId, 'answer', data);
    });

    socket.on('ice-candidate', (data: { targetId: string; candidate: any; senderId: string }) => {
      if (!checkRateLimit(socket, signalingLimiter, 'ice-candidate')) return;
      relayToUser(io, socketData.roomId, data.targetId, 'ice-candidate', data);
    });


    // sync-event: Relay playback control from host to viewers
    socket.on('sync-event', (data: { roomId: string; type: string; time: number; source?: string; sourceValue?: string }) => {
      if (!checkRateLimit(socket, syncLimiter, 'sync-event')) return;
      const { roomId, ...payload } = data;
      const normalizedRoomId = validateRoomId(roomId);
      if (!normalizedRoomId) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
        return;
      }
      
      const syncType = validateSyncType(payload.type);
      if (!syncType) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid sync event type' });
        return;
      }
      
      if (payload.time !== undefined) {
        const validTime = validateTime(payload.time);
        if (validTime === null) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid time value' });
          return;
        }
        payload.time = validTime;
      }
      
      const room = getRoom(normalizedRoomId);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }
      
      if (room.hostId !== socketData.userId) {
        socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can send sync events' });
        return;
      }
      
      if (syncType === 'source-change') {
        room.isScreenSharing = payload.source === 'screen';
        room.screenSharingUserId = room.isScreenSharing ? payload.sourceValue : undefined;
        room.currentSource = payload.source;
        room.currentSourceValue = payload.sourceValue;
        room.currentTime = 0;
        room.isPlaying = false;
      } else if (payload.time !== undefined) {
        room.currentTime = payload.time;
      }
      
      if (syncType === 'play') {
        room.isPlaying = true;
      } else if (syncType === 'pause') {
        room.isPlaying = false;
      }

      socket.to(normalizedRoomId).emit('sync-event', payload);
    });

    // request-screen: Late joiner requests screen stream from host
    socket.on('request-screen', (data: { roomId: string }) => {
      if (!checkRateLimit(socket, generalLimiter, 'request-screen')) return;
      const normalizedRoomId = (data.roomId || socketData.roomId)?.toUpperCase();
      if (!normalizedRoomId) return;
      
      const room = getRoom(normalizedRoomId);
      if (!room || !room.isScreenSharing) return;
      
      // Notify the host that someone wants their screen
      const hostSocketId = room.participants.get(room.hostId)?.socketId;
      if (hostSocketId) {
        io.to(hostSocketId).emit('screen-requested', {
          requesterId: socketData.userId,
          requesterName: socketData.displayName
        });
      }
    });

    socket.on('update-display-name', (data: { roomId: string; userId: string; displayName: string }) => {
      if (!checkRateLimit(socket, generalLimiter, 'update-display-name')) return;
      const roomId = validateRoomId(data?.roomId);
      if (!roomId) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room ID' });
        return;
      }

      const userId = validateUserId(data?.userId);
      if (!userId) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid user ID' });
        return;
      }

      const displayName = validateDisplayName(data?.displayName);
      if (!displayName) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid display name' });
        return;
      }
      
      if (socketData.userId !== userId) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Cannot update another user\'s name' });
        return;
      }
      
      const room = getRoom(roomId);
      if (room) {
        const participant = room.participants.get(userId);
        if (participant) {
          participant.displayName = displayName;
          socketData.displayName = displayName;
          io.to(roomId).emit('display-name-updated', { userId, displayName });
        }
      }
    });

    // chat-message: Broadcast chat message to room
    socket.on('chat-message', (data: { message: string }) => {
      const roomId = socketData.roomId;
      if (!roomId || !socketData.userId || !socketData.displayName) return;
      
      // Rate limiting - check if user is sending too fast
      const now = Date.now();
      const lastMessage = chatRateLimit.get(socket.id) || 0;
      if (now - lastMessage < CHAT_RATE_LIMIT_MS) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Sending messages too fast' });
        return;
      }
      
      // Track message count in current window
      const windowStart = chatMessageWindow.get(socket.id) || 0;
      if (now - windowStart > 60000) {
        chatMessageCount.set(socket.id, 1);
        chatMessageWindow.set(socket.id, now);
      } else {
        const count = (chatMessageCount.get(socket.id) || 0) + 1;
        chatMessageCount.set(socket.id, count);
        if (count > CHAT_RATE_LIMIT_WINDOW) {
          socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many messages, please slow down' });
          return;
        }
      }
      chatRateLimit.set(socket.id, now);
      
      // Validate and sanitize message
      const message = validateChatMessage(data?.message);
      if (!message) return;

      io.to(roomId).emit('chat-message', {
        userId: socketData.userId,
        displayName: socketData.displayName,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // send-reaction: Broadcast emoji reaction to room
    socket.on('send-reaction', (data: { emojiId: string }) => {
      if (!checkRateLimit(socket, reactionLimiter, 'send-reaction')) return;
      const roomId = socketData.roomId;
      if (!roomId || !socketData.userId) return;

      const emojiId = validateEmojiId(data?.emojiId);
      if (!emojiId) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid emoji ID' });
        return;
      }

      io.to(roomId).emit('new-reaction', {
        userId: socketData.userId,
        displayName: socketData.displayName,
        emojiId
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      const mapping = socketToRoom.get(socket.id);
      if (mapping) {
        handleLeaveRoom(io, socket, mapping.roomId, mapping.userId);
      }
      // Clean up rate limit data
      chatRateLimit.delete(socket.id);
      chatMessageCount.delete(socket.id);
      chatMessageWindow.delete(socket.id);
      syncLimiter.reset(socket.id);
      reactionLimiter.reset(socket.id);
      signalingLimiter.reset(socket.id);
      generalLimiter.reset(socket.id);
    });
  });
}

function relayToUser(io: Server, roomId: string | undefined, targetId: string, event: string, data: any) {
  if (!roomId) return;
  const room = getRoom(roomId);
  if (!room) return;
  
  const target = room.participants.get(targetId);
  if (target && target.socketId) {
    io.to(target.socketId).emit(event, data);
  }
}

async function handleLeaveRoom(io: Server, socket: Socket, roomId: string, userId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;
  
  const participant = room.participants.get(userId);
  if (!participant) return;
  
  const wasHost = participant.isHost;
  await socket.leave(roomId);
  participant.socketId = '';
  socketToRoom.delete(socket.id);
  
  socket.to(roomId).emit('user-left', userId);
  
  if (wasHost && room.participants.size > 0) {
    const newHost = room.participants.values().next().value;
    if (newHost) {
      newHost.isHost = true;
      room.hostId = newHost.id;
      io.to(roomId).emit('host-changed', {
        newHostId: newHost.id,
        displayName: newHost.displayName
      });
    }
  }
  
  console.log(`[Socket] ${participant.displayName} left room ${roomId}`);
}
