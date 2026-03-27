import { io } from 'socket.io-client';
import { PeerManager } from './PeerManager';
import { SyncEngine } from './SyncEngine';
import { ScreenShare } from '../media/ScreenShare';

export class RoomManager {
  constructor(apiUrl, userId, displayName) {
    this.apiUrl = apiUrl;
    this.userId = userId;
    this.displayName = displayName;
    this.socket = io(apiUrl);
    this.peerManager = new PeerManager(apiUrl, userId);
    this.syncEngine = null;
    this.screenShare = new ScreenShare();
    this.roomId = null;
    this.participants = [];
    this.onStateChange = null;
    this._pendingScreenStream = null;
    this.hasEnteredTheater = false;

    this.setupListeners();
    this.setupPeerManagerCallbacks();
  }

  setupPeerManagerCallbacks() {
    this.peerManager.onRemoteStream = (remoteUserId, remoteStream, type) => {
      if (type === 'screen') {
        console.log('[RoomManager] Screen stream received from peer:', remoteUserId);

        if (this.syncEngine) {
          this.syncEngine.attachScreenStream(remoteStream);
        } else {
          console.warn('[RoomManager] SyncEngine not ready, buffering screen stream');
          this._pendingScreenStream = remoteStream;
        }
      }
    };

    this.peerManager.onRemoteStreamRemoved = (remoteUserId, type) => {
      if (type === 'screen') {
        console.log('[RoomManager] Screen stream removed from peer:', remoteUserId);
        this._pendingScreenStream = null;
      }
    };
  }

  async startScreenShare() {
    const stream = await this.screenShare.start();
    if (stream) {
      // Auto-enter theater when starting screen share
      this.hasEnteredTheater = true;
      if (this.onStateChange) this.onStateChange(this.participants);

      this.peerManager.startScreenShare(stream, this.participants.map(p => p.userId));
      this.syncEngine.changeSource('screen', this.userId, this.roomId);
      this.syncEngine.attachScreenStream(stream);

      this.screenShare.onStop = () => {
        this.stopScreenShare();
      };
    }
  }

  stopScreenShare() {
    this.screenShare.stop();
    this.peerManager.stopScreenShare();

    this.syncEngine.changeSource(null, null, this.roomId);
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log(`[RoomManager] Connected: ${this.socket.id}`);
    });

    this.socket.on('room-state', (state) => {
      console.log('[RoomManager] State received:', state);
      this.participants = state.participants;
      this.roomId = state.roomId;

      const isHost = state.hostId === this.userId;
      if (!this.syncEngine) {
        this.syncEngine = new SyncEngine(this.socket, 'video-container', isHost, this.roomId);
        this.setupSyncEngineCallbacks();
      } else {
        this.syncEngine.isHost = isHost;
        this.syncEngine.roomId = this.roomId;
      }

      if (state.isScreenSharing && state.screenSharingUserId !== this.userId) {
        this.syncEngine.loadSource('screen', state.screenSharingUserId);
      }

      if (this._pendingScreenStream) {
        console.log('[RoomManager] Flushing buffered screen stream to SyncEngine');
        this.syncEngine.attachScreenStream(this._pendingScreenStream);
        this._pendingScreenStream = null;
      }

      if (this.onStateChange) this.onStateChange(this.participants);
    });

    this.socket.on('user-joined', (user) => {
      console.log(`[RoomManager] User joined: ${user.displayName}`);
      if (!this.participants.find(p => p.userId === user.userId)) {
        this.participants.push(user);

        if (user.userId !== this.userId) {
          // Only call for screen share if active
          if (this.screenShare.isActive()) {
            this.peerManager.callPeer(user.userId, 'screen');
          }
        }

        if (this.onStateChange) this.onStateChange(this.participants);
      }
    });

    this.socket.on('user-left', (leftUserId) => {
      console.log(`[RoomManager] User left: ${leftUserId}`);
      this.participants = this.participants.filter(p => p.userId !== leftUserId);

      if (this.onStateChange) this.onStateChange(this.participants);
    });

    this.socket.on('chat-message', (data) => {
      const { userId, displayName, message, timestamp } = data;
      const isMe = userId === this.userId;
      if (this.onChatMessage) {
        this.onChatMessage(userId, displayName, message, timestamp, isMe);
      }
    });

    this.socket.on('display-name-updated', ({ userId, displayName }) => {
      const user = this.participants.find(p => p.userId === userId || p.id === userId);
      if (user) {
        user.displayName = displayName;
        if (this.onStateChange) this.onStateChange(this.participants);
      }
    });

    this.socket.on('new-reaction', (data) => {
      if (this.onReaction) {
        this.onReaction(data);
      }
    });
  }

  sendChatMessage(message) {
    this.socket.emit('chat-message', { message });
  }

  sendReaction(emojiId) {
    this.socket.emit('send-reaction', { emojiId });
  }

  updateDisplayName(newName) {
    this.displayName = newName;
    this.socket.emit('update-display-name', { roomId: this.roomId, userId: this.userId, displayName: newName });

    const localUser = this.participants.find(p => p.userId === this.userId || p.id === this.userId);
    if (localUser) {
      localUser.displayName = newName;
      if (this.onStateChange) this.onStateChange(this.participants);
    }
  }

  joinRoom(roomId, participantId) {
    this.roomId = roomId;
    if (participantId) this.userId = participantId;
    this.socket.emit('join-room', {
      roomId: this.roomId,
      userId: this.userId,
      displayName: this.displayName
    });
  }

  async createRoom(name) {
    try {
      const res = await fetch(`${this.apiUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name })
      });
      const data = await res.json();
      if (data.participantId) {
        this.userId = data.participantId;
      }
      return data;
    } catch (err) {
      console.error('Failed to create room:', err);
      throw err;
    }
  }

  setupSyncEngineCallbacks() {
    this.syncEngine.onSourceLoaded = (source, value) => {
      if (this.onStateChange) this.onStateChange(this.participants);

      if (!this.syncEngine.isHost) return;

      if (source === 'local') {
        this.syncEngine._hasCaptured = false;
      } else if (source !== 'screen') {
        this.peerManager.stopScreenShare();
      }
    };

    const originalOnPlayerEvent = this.syncEngine.onPlayerEvent.bind(this.syncEngine);
    this.syncEngine.onPlayerEvent = (type, data) => {
      originalOnPlayerEvent(type, data);

      if (this.syncEngine.isHost && this.syncEngine.currentSource === 'local') {
        if (type === 'play' && !this.syncEngine._hasCaptured) {
          const videoElement = this.syncEngine.player.video;
          if (videoElement) {
            this.syncEngine._hasCaptured = true;
            this.refreshLocalStream(videoElement);
          }
        }
      }
    };
  }

  refreshLocalStream(videoElement, retries = 8) {
    try {
      if (videoElement.paused) {
        videoElement.play().catch(e => console.warn('[RoomManager] Could not auto-play video:', e));
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const requiredWidth = isMobile ? 10 : 0;
      
      if (videoElement.videoWidth <= requiredWidth && retries > 0) {
        console.log(`[RoomManager] Waiting for video dimensions...`);
        setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 1000);
        return;
      }

      if (videoElement.readyState < 3 && retries > 0) {
        setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 500);
        return;
      }

      const rawStream = videoElement.captureStream
        ? videoElement.captureStream()
        : (videoElement.mozCaptureStream ? videoElement.mozCaptureStream() : null);

      if (!rawStream) {
        console.warn('[RoomManager] Browser does not support captureStream');
        return;
      }

      const tracks = rawStream.getTracks();
      if (tracks.length === 0 || tracks[0].readyState !== 'live') {
        console.warn('[RoomManager] Captured stream not ready yet, retrying...');
        if (retries > 0) setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 500);
        return;
      }

      const cleanupDelay = isMobile ? 1500 : 800;
      
      this.peerManager.stopScreenShare();
      setTimeout(() => {
        // Mute local video so host doesn't hear their own audio from speakers
        if (videoElement) {
          videoElement.muted = true;
        }

        // Send full stream (video + audio) to remote peers only - they won't receive their own stream
        this.peerManager.startScreenShare(rawStream, this.participants.map(p => p.userId));

        this.socket.emit('sync-event', {
          roomId: this.roomId,
          type: 'source-change',
          source: 'screen',
          sourceValue: this.userId,
          time: videoElement.currentTime
        });
        console.log('[RoomManager] Local stream captured and shared successfully.');
      }, cleanupDelay);
    } catch (err) {
      console.error('[RoomManager] captureStream error:', err);
      if (retries > 0) {
        setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 1000);
      }
    }
  }
}
