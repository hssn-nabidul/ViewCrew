import { Server, Socket } from 'socket.io';
import { Room, Participant } from '../models/room';
import { rooms, getRoom } from '../routes/rooms';

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

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    const socketData: SocketData = {};
    socket.data = socketData;

    // join-room: Join a room namespace
    socket.on('join-room', async (data: { roomId: string; userId: string; displayName: string }) => {
      try {
        const { roomId, userId } = data;
        const normalizedRoomId = roomId.toUpperCase();
        
        // Validate room exists
        const room = getRoom(normalizedRoomId);
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
        
        // Update participant socket ID
        participant.socketId = socket.id;
        
        // Join socket to room
        await socket.join(normalizedRoomId);
        
        // Track socket -> room mapping
        socketData.roomId = normalizedRoomId;
        socketData.userId = userId;
        socketData.displayName = participant.displayName;
        socketToRoom.set(socket.id, { roomId: normalizedRoomId, userId });
        
        // Notify other participants
        socket.to(normalizedRoomId).emit('user-joined', {
          userId,
          displayName: participant.displayName,
          isHost: participant.isHost
        });
        
        // Send current participants to joining user
        socket.emit('room-state', {
          roomId: normalizedRoomId,
          hostId: room.hostId,
          isScreenSharing: room.isScreenSharing,
          screenSharingUserId: room.screenSharingUserId,
          participants: Array.from(room.participants.values()).map(p => ({
            userId: p.id,
            displayName: p.displayName,
            isHost: p.isHost
          }))
        });
        
        console.log(`[Socket] ${participant.displayName} joined room ${normalizedRoomId}`);
      } catch (error) {
        console.error('[Socket] Error joining room:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
      }
    });

    // leave-room: Leave current room
    socket.on('leave-room', async (data: { roomId: string; userId: string }) => {
      try {
        const { roomId, userId } = data;
        await handleLeaveRoom(io, socket, roomId.toUpperCase(), userId);
      } catch (error) {
        console.error('[Socket] Error leaving room:', error);
        // Ensure socketToRoom is cleaned up even on error
        socketToRoom.delete(socket.id);
        socket.emit('error', { code: 'LEAVE_FAILED', message: 'Failed to leave room' });
      }
    });

    // WebRTC Signaling handlers
    socket.on('user-speaking', (data: { roomId: string; userId: string; isSpeaking: boolean }) => {
      const { roomId, userId, isSpeaking } = data;
      socket.to(roomId.toUpperCase()).emit('user-speaking', { userId, isSpeaking });
    });

    socket.on('offer', (data: { targetId: string; offer: any; callerId: string }) => {
      relayToUser(io, socketData.roomId, data.targetId, 'offer', data);
    });

    socket.on('answer', (data: { targetId: string; answer: any; callerId: string }) => {
      relayToUser(io, socketData.roomId, data.targetId, 'answer', data);
    });

    socket.on('ice-candidate', (data: { targetId: string; candidate: any; senderId: string }) => {
      relayToUser(io, socketData.roomId, data.targetId, 'ice-candidate', data);
    });


    // sync-event: Relay playback control from host to viewers
    socket.on('sync-event', (data: { roomId: string; type: string; time: number; source?: string; sourceValue?: string }) => {
      const { roomId, ...payload } = data;
      const normalizedRoomId = roomId.toUpperCase();
      
      const room = getRoom(normalizedRoomId);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }
      
      if (room.hostId !== socketData.userId) {
        socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can send sync events' });
        return;
      }
      
      if (payload.type === 'source-change') {
        room.isScreenSharing = payload.source === 'screen';
        room.screenSharingUserId = room.isScreenSharing ? payload.sourceValue : undefined;
      }

      socket.to(normalizedRoomId).emit('sync-event', payload);
    });

    socket.on('update-display-name', (data: { roomId: string; userId: string; displayName: string }) => {
      const { roomId, userId, displayName } = data;
      const normalizedRoomId = roomId.toUpperCase();
      const room = getRoom(normalizedRoomId);
      
      if (socketData.userId !== userId) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Cannot update another user\'s name' });
        return;
      }
      
      if (room) {
        const participant = room.participants.get(userId);
        if (participant) {
          const sanitizedName = String(displayName).trim().substring(0, 30);
          participant.displayName = sanitizedName;
          socketData.displayName = sanitizedName;
          io.to(normalizedRoomId).emit('display-name-updated', { userId, displayName: sanitizedName });
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
        // Reset window after 1 minute
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
      const message = data.message?.trim().substring(0, 500) || '';
      if (message.length === 0) return;

      io.to(roomId).emit('chat-message', {
        userId: socketData.userId,
        displayName: socketData.displayName,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // send-reaction: Broadcast emoji reaction to room
    socket.on('send-reaction', (data: { emojiId: string }) => {
      const roomId = socketData.roomId;
      if (!roomId || !socketData.userId) return;

      io.to(roomId).emit('new-reaction', {
        userId: socketData.userId,
        displayName: socketData.displayName,
        emojiId: data.emojiId
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
