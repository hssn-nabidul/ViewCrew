// Room and Participant interfaces for CineSync watch-party

export interface Participant {
  id: string;
  socketId: string;
  displayName: string;
  joinedAt: Date;
  isHost: boolean;
}

export interface Room {
  id: string;
  hostId: string;
  hostToken: string;
  participants: Map<string, Participant>;
  createdAt: Date;
  isActive: boolean;
  isScreenSharing: boolean;
  screenSharingUserId?: string;
  destroyTimer?: NodeJS.Timeout | null;
}

// Room creation response
export interface CreateRoomResponse {
  roomId: string;
  roomLink: string;
  hostToken: string;
  participantId: string;
}

// Room info response
export interface RoomInfoResponse {
  id: string;
  hostId: string;
  participantCount: number;
  maxParticipants: number;
  createdAt: Date;
  isActive: boolean;
}

// Join room response
export interface JoinRoomResponse {
  participantId: string;
  roomInfo: RoomInfoResponse;
}

// Participant list response
export interface ParticipantListResponse {
  participants: Array<{
    id: string;
    displayName: string;
    isHost: boolean;
    joinedAt: Date;
  }>;
}

// API Error response
export interface ApiError {
  error: string;
  message: string;
}
