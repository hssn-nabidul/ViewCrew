import { io } from 'socket.io-client';
import { PeerManager } from './PeerManager';
import { SyncEngine } from './SyncEngine';
import { VoiceChat } from '../media/VoiceChat';
import { ScreenShare } from '../media/ScreenShare';
import { VAD } from '../media/VAD';

export class RoomManager {
  constructor(apiUrl, userId, displayName) {
    this.apiUrl = apiUrl;
    this.userId = userId;
    this.displayName = displayName;
    this.socket = io(apiUrl);
    this.peerManager = new PeerManager(apiUrl, userId);
    this.syncEngine = null;
    this.voiceChat = new VoiceChat();
    this.screenShare = new ScreenShare();
    this.vad = null;
    this.roomId = null;
    this.participants = [];
    this.onStateChange = null;
    this._pendingScreenStream = null;
    this.hasEnteredTheater = false;

    this.setupListeners();
    this.initVoice();
  }

  async initVoice() {
    this.peerManager.onRemoteStream = (remoteUserId, remoteStream, type) => {
      if (type === 'audio') {
        this.handleRemoteAudioStream(remoteUserId, remoteStream);
      } else if (type === 'screen') {
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

    const stream = await this.voiceChat.initLocalStream();
    if (stream) {
      this.peerManager.setLocalStream(stream);

      this.vad = new VAD(stream, (isSpeaking) => {
        if (this.roomId) {
          this.socket.emit('user-speaking', { roomId: this.roomId, userId: this.userId, isSpeaking });
        }
        const localUser = this.participants.find(p => p.userId === this.userId);
        if (localUser) {
          localUser.isSpeaking = isSpeaking;
          if (this.onStateChange) this.onStateChange(this.participants);
        }
      });
    }
  }

  handleRemoteAudioStream(remoteUserId, remoteStream) {
    if (remoteUserId === this.userId) return;

    let audio = document.getElementById(`audio-${remoteUserId}`);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = `audio-${remoteUserId}`;
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
    if (audio.srcObject !== remoteStream) {
      audio.srcObject = remoteStream;
      audio.play().catch(err => {
        console.warn(`[RoomManager] Audio autoplay blocked for ${remoteUserId}:`, err);
      });
    }
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
          this.peerManager.callPeer(user.userId, 'audio');

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

      const audio = document.getElementById(`audio-${leftUserId}`);
      if (audio) audio.remove();

      if (this.onStateChange) this.onStateChange(this.participants);
    });

    this.socket.on('user-speaking', ({ userId, isSpeaking }) => {
      const user = this.participants.find(p => p.userId === userId || p.id === userId);
      if (user) {
        user.isSpeaking = isSpeaking;
        if (this.onStateChange) this.onStateChange(this.participants);
      }
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
        setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 1000); // Wait longer for mobile
        return;
      }

      if (videoElement.readyState < 3 && retries > 0) {
        setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 500);
        return;
      }

      const stream = videoElement.captureStream
        ? videoElement.captureStream()
        : (videoElement.mozCaptureStream ? videoElement.mozCaptureStream() : null);

      if (!stream) {
        console.warn('[RoomManager] Browser does not support captureStream');
        return;
      }

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
        console.warn('[RoomManager] Captured stream not ready yet, retrying...');
        if (retries > 0) setTimeout(() => this.refreshLocalStream(videoElement, retries - 1), 500);
        return;
      }

      // FIX: Increase delay to 1500ms for mobile. 
      // This ensures the previous session's decoder is fully released.
      const cleanupDelay = isMobile ? 1500 : 800;
      
      this.peerManager.stopScreenShare();
      setTimeout(() => {
        this.peerManager.startScreenShare(stream, this.participants.map(p => p.userId));

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
