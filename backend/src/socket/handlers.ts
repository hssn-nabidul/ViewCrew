import { Server, Socket } from 'socket.io';
import { Room, Participant } from '../models/room';
import { rooms, getRoom, addParticipantToRoom, removeParticipantFromRoom } from '../routes/rooms';

// Socket data stored per connection
interface SocketData {
  roomId?: string;
  participantId?: string;
  displayName?: string;
}

// Room participants tracking (socketId -> {roomId, participantId})
const socketToRoom = new Map<string, { roomId: string; participantId: string }>();

// Get room participants as array
function getRoomParticipants(roomId: string): Array<{ id: string; displayName: string; isHost: boolean }> {
  const room = getRoom(roomId);
  if (!room) return [];
  
  return Array.from(room.participants.values()).map(p => ({
    id: p.id,
    displayName: p.displayName,
    isHost: p.isHost
  }));
}

// Broadcast to all participants in room except sender
function broadcastToRoom(io: Server, roomId: string, event: string, data: any, excludeSocketId?: string): void {
  io.to(roomId).except(excludeSocketId || '').emit(event, data);
}

// Broadcast to all participants in room including sender
function emitToRoom(io: Server, roomId: string, event: string, data: any): void {
  io.to(roomId).emit(event, data);
}

export function setupSocketHandlers(io: Server): void {
  // Connection handler
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    // Store socket data
    const socketData: SocketData = {};
    socket.data = socketData;

    // join_room: Join a room namespace
    socket.on('join_room', async (data: { roomId: string; participantId: string }) => {
      try {
        const { roomId, participantId } = data;
        
        // Validate room exists
        const room = getRoom(roomId.toUpperCase());
        if (!room || !room.isActive) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }
        
        // Find participant in room
        const participant = room.participants.get(participantId);
        if (!participant) {
          socket.emit('error', { code: 'PARTICIPANT_NOT_FOUND', message: 'Participant not found' });
          return;
        }
        
        // Update participant socket ID
        participant.socketId = socket.id;
        
        // Join socket to room
        await socket.join(roomId.toUpperCase());
        
        // Track socket -> room mapping
        socketData.roomId = roomId.toUpperCase();
        socketData.participantId = participantId;
        socketData.displayName = participant.displayName;
        socketToRoom.set(socket.id, { roomId: roomId.toUpperCase(), participantId });
        
        // Notify other participants
        emitToRoom(io, roomId.toUpperCase(), 'participant_joined', {
          participantId,
          displayName: participant.displayName,
          isHost: participant.isHost,
          participants: getRoomParticipants(roomId.toUpperCase())
        });
        
        // Send current participants to joining user
        socket.emit('room_joined', {
          roomId: roomId.toUpperCase(),
          participants: getRoomParticipants(roomId.toUpperCase()),
          yourId: participantId
        });
        
        console.log(`[Socket] ${participant.displayName} joined room ${roomId}`);
      } catch (error) {
        console.error('[Socket] Error joining room:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
      }
    });

    // leave_room: Leave current room
    socket.on('leave_room', async (data: { roomId: string; participantId: string }) => {
      try {
        const { roomId, participantId } = data;
        
        await handleLeaveRoom(io, socket, roomId.toUpperCase(), participantId);
      } catch (error) {
        console.error('[Socket] Error leaving room:', error);
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to leave room' });
      }
    });

    // WebRTC Signaling handlers (relay only)
    
    // offer: Send WebRTC offer to specific participant
    socket.on('offer', (data: { targetId: string; offer: any; callerId: string }) => {
      const { targetId, offer, callerId } = data;
      const roomId = socketData.roomId;
      
      if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in a room' });
        return;
      }
      
      // Find target participant
      const room = getRoom(roomId);
      if (!room) return;
      
      const targetParticipant = room.participants.get(targetId);
      if (!targetParticipant || !targetParticipant.socketId) {
        socket.emit('error', { code: 'TARGET_NOT_FOUND', message: 'Target participant not in room' });
        return;
      }
      
      // Relay offer to target
      io.to(targetParticipant.socketId).emit('offer', {
        targetId,
        offer,
        callerId
      });
    });

    // answer: Send WebRTC answer to specific participant
    socket.on('answer', (data: { targetId: string; answer: any; callerId: string }) => {
      const { targetId, answer, callerId } = data;
      const roomId = socketData.roomId;
      
      if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in a room' });
        return;
      }
      
      // Find target participant
      const room = getRoom(roomId);
      if (!room) return;
      
      const targetParticipant = room.participants.get(targetId);
      if (!targetParticipant || !targetParticipant.socketId) {
        socket.emit('error', { code: 'TARGET_NOT_FOUND', message: 'Target participant not in room' });
        return;
      }
      
      // Relay answer to target
      io.to(targetParticipant.socketId).emit('answer', {
        targetId,
        answer,
        callerId
      });
    });

    // ice_candidate: Send ICE candidate to specific participant
    socket.on('ice_candidate', (data: { targetId: string; candidate: any; senderId: string }) => {
      const { targetId, candidate, senderId } = data;
      const roomId = socketData.roomId;
      
      if (!roomId) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in a room' });
        return;
      }
      
      // Find target participant
      const room = getRoom(roomId);
      if (!room) return;
      
      const targetParticipant = room.participants.get(targetId);
      if (!targetParticipant || !targetParticipant.socketId) {
        return; // Silently ignore if target not found
      }
      
      // Relay ICE candidate to target
      io.to(targetParticipant.socketId).emit('ice_candidate', {
        targetId,
        candidate,
        senderId
      });
    });

    // chat_message: Broadcast chat message to room
    socket.on('chat_message', (data: { message: string }) => {
      const roomId = socketData.roomId;
      const { message } = data;
      
      if (!roomId || !socketData.participantId || !socketData.displayName) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in a room' });
        return;
      }
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return;
      }
      
      // Broadcast message to all participants
      emitToRoom(io, roomId, 'chat_message', {
        senderId: socketData.participantId,
        senderName: socketData.displayName,
        message: message.trim().substring(0, 500), // Max 500 chars
        timestamp: new Date().toISOString()
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      
      const mapping = socketToRoom.get(socket.id);
      if (mapping) {
        handleLeaveRoom(io, socket, mapping.roomId, mapping.participantId);
        socketToRoom.delete(socket.id);
      }
    });
  });
}

// Handle leave room logic
async function handleLeaveRoom(
  io: Server, 
  socket: Socket, 
  roomId: string, 
  participantId: string
): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;
  
  const participant = room.participants.get(participantId);
  if (!participant) return;
  
  const displayName = participant.displayName;
  const wasHost = participant.isHost;
  
  // Leave socket room
  await socket.leave(roomId);
  
  // Update participant socket ID
  participant.socketId = '';
  
  // Remove from tracking
  socketToRoom.delete(socket.id);
  
  // Notify remaining participants
  emitToRoom(io, roomId, 'participant_left', {
    participantId,
    displayName,
    participants: getRoomParticipants(roomId)
  });
  
  // Handle host transfer
  if (wasHost && room.participants.size > 0) {
    const newHost = room.participants.values().next().value;
    if (newHost) {
      newHost.isHost = true;
      room.hostId = newHost.id;
      
      // Notify about host transfer
      emitToRoom(io, roomId, 'host_transferred', {
        newHostId: newHost.id,
        newHostName: newHost.displayName
      });
    }
  }
  
  console.log(`[Socket] ${displayName} left room ${roomId}`);
}

export { getRoomParticipants, emitToRoom };
