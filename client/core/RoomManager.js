import { io } from 'socket.io-client';
import { PeerManager } from './PeerManager';
import { SyncEngine } from './SyncEngine';
import { ScreenShare } from '../media/ScreenShare';
import { VoiceChat } from '../media/VoiceChat';

export class RoomManager {
  constructor(apiUrl, userId, displayName) {
    this.apiUrl = apiUrl;
    this.userId = userId;
    this.displayName = displayName;
    this.socket = io(apiUrl);
    this.peerManager = new PeerManager(apiUrl, userId);
    this.syncEngine = null;
    this.screenShare = new ScreenShare();
    this.voiceChat = new VoiceChat();
    this.roomId = null;
    this.hostToken = null;
    this.participants = [];
    this.onStateChange = null;
    this.onConnectionChange = null;
    this._pendingScreenStream = null;
    this.hasEnteredTheater = false;
    this.isReconnecting = false;
    this._refreshTimeouts = [];
    this._voiceStreams = new Map();
    this.micPermissionDenied = false;

    this.setupListeners();
    this.setupPeerManagerCallbacks();
  }

  setupPeerManagerCallbacks() {
    this.peerManager.onRemoteStream = (remoteUserId, remoteStream, type) => {
      console.log('[RoomManager] onRemoteStream called:', { remoteUserId, type, hasStream: !!remoteStream });
      if (type === 'screen') {
        console.log('[RoomManager] Screen stream received from peer:', remoteUserId);

        if (this.syncEngine) {
          this.syncEngine.attachScreenStream(remoteStream);
        } else {
          console.warn('[RoomManager] SyncEngine not ready, buffering screen stream');
          this._pendingScreenStream = remoteStream;
        }
      } else if (type === 'voice') {
        console.log('[RoomManager] Voice stream received from peer:', remoteUserId);
        this._playRemoteVoice(remoteUserId, remoteStream);
      }
    };

    this.peerManager.onRemoteStreamRemoved = (remoteUserId, type) => {
      if (type === 'screen') {
        console.log('[RoomManager] Screen stream removed from peer:', remoteUserId);
        this._pendingScreenStream = null;
      } else if (type === 'voice') {
        console.log('[RoomManager] Voice stream removed from peer:', remoteUserId);
        this._stopRemoteVoice(remoteUserId);
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

    if (this.syncEngine) {
      this.syncEngine.changeSource(null, null, this.roomId);
    }
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log(`[RoomManager] Connected: ${this.socket.id}`);
      this.isReconnecting = false;
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
      // Re-join room on reconnect
      if (this.roomId) {
        this.socket.emit('join-room', {
          roomId: this.roomId,
          userId: this.userId,
          displayName: this.displayName,
          hostToken: this.hostToken
        });
      }
      // Re-establish voice calls after reconnect
      if (this.voiceChat.isReady && this.participants.length > 0) {
        setTimeout(() => {
          const remoteUserIds = this.participants
            .filter(p => p.userId !== this.userId)
            .map(p => p.userId);
          this.peerManager.callAllWithVoice(remoteUserIds);
          console.log('[RoomManager] Voice calls re-established after reconnect');
        }, 1000);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[RoomManager] Disconnected: ${reason}`);
      this.isReconnecting = true;
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error(`[RoomManager] Connection error: ${err.message}`);
      this.isReconnecting = true;
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    });

    this.socket.on('room-state', (state) => {
      console.log('[RoomManager] State received:', state);
      this.participants = state.participants;
      this.roomId = state.roomId;

      // Mark as having entered the room (theater mode)
      this.hasEnteredTheater = true;
      console.log('[RoomManager] hasEnteredTheater set to true, onStateChange:', !!this.onStateChange);

      const isHost = state.hostId === this.userId;
      if (!this.syncEngine) {
        this.syncEngine = new SyncEngine(this.socket, 'video-container', isHost, this.roomId);
        this.setupSyncEngineCallbacks();
      } else {
        this.syncEngine.isHost = isHost;
        this.syncEngine.roomId = this.roomId;
      }

      if (state.isScreenSharing && state.screenSharingUserId !== this.userId) {
        this.syncEngine.loadSource('screen', state.screenSharingUserId, state.currentTime, state.isPlaying);
        // Request screen stream from host since we're a late joiner
        setTimeout(() => {
          console.log('[RoomManager] Requesting screen stream from host');
          this.socket.emit('request-screen', { roomId: state.roomId });
        }, 500);
      }

      if (state.currentSource && state.currentSource !== 'local' && state.currentSource !== 'screen') {
        this.syncEngine.loadSource(state.currentSource, state.currentSourceValue, state.currentTime, state.isPlaying);
      }

      if (this._pendingScreenStream) {
        console.log('[RoomManager] Flushing buffered screen stream to SyncEngine');
        this.syncEngine.attachScreenStream(this._pendingScreenStream);
        this._pendingScreenStream = null;
      }

      if (this.onStateChange) this.onStateChange(this.participants);

      this.initVoice();
    });

    this.socket.on('user-joined', (user) => {
      console.log(`[RoomManager] User joined: ${user.displayName}`);
      if (!this.participants.find(p => p.userId === user.userId)) {
        this.participants.push(user);

        if (user.userId !== this.userId) {
          if (this.screenShare.isActive()) {
            this.peerManager.callPeer(user.userId, 'screen');
          }
        if (this.voiceChat.isReady) {
          this.peerManager.callPeer(user.userId, 'voice');
        }
        }

        if (this.onUserJoined) {
          this.onUserJoined(user);
        }
        if (this.onStateChange) this.onStateChange(this.participants);
      }
    });

    this.socket.on('user-left', (leftUserId) => {
      console.log(`[RoomManager] User left: ${leftUserId}`);
      const leftUser = this.participants.find(p => p.userId === leftUserId);
      this.participants = this.participants.filter(p => p.userId !== leftUserId);
      
      // Clean up peer connections
      this.peerManager.removeCallReference(leftUserId, 'screen');
      this.peerManager.removeCallReference(leftUserId, 'voice');
      this._stopRemoteVoice(leftUserId);

      if (this.onUserLeft) {
        this.onUserLeft(leftUser);
      }
      if (this.onStateChange) this.onStateChange(this.participants);
    });

    // screen-requested: Late joiner requesting screen stream from host
    this.socket.on('screen-requested', ({ requesterId, requesterName }) => {
      console.log(`[RoomManager] ${requesterName} (${requesterId}) requested screen stream`);
      const cachedStream = this.peerManager._cachedScreenStream;
      if (cachedStream) {
        console.log('[RoomManager] Sending cached screen stream to requester');
        this.peerManager.callPeer(requesterId, 'screen');
      } else {
        console.log('[RoomManager] No cached screen stream available');
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

    this.socket.on('user-speaking', ({ userId, isSpeaking }) => {
      const user = this.participants.find(p => p.userId === userId || p.id === userId);
      if (user) {
        user.isSpeaking = isSpeaking;
        if (this.onSpeakingChange) {
          this.onSpeakingChange(userId, isSpeaking);
        }
      }
    });

    this.socket.on('host-changed', ({ newHostId, displayName }) => {
      console.log(`[RoomManager] Host changed to: ${displayName} (${newHostId})`);
      this.participants.forEach(p => {
        p.isHost = p.userId === newHostId || p.id === newHostId;
      });
      if (this.onStateChange) this.onStateChange(this.participants);
      if (this.onHostChanged) {
        this.onHostChanged(newHostId, displayName);
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

  joinRoom(roomId, participantId, hostToken, password = null) {
    this.roomId = roomId;
    this.socket.emit('join-room', {
      roomId,
      userId: participantId,
      displayName: this.displayName,
      hostToken,
      password
    });
  }

  async createRoom(name, password = null) {
    try {
      const res = await fetch(`${this.apiUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name, password })
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
      // Viewers should not trigger re-render when their source loads - only the host should
      if (!this.syncEngine.isHost) return;

      if (this.onStateChange) this.onStateChange(this.participants);

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
        const id = setTimeout(() => {
          this._refreshTimeouts = this._refreshTimeouts.filter(t => t !== id);
          this.refreshLocalStream(videoElement, retries - 1);
        }, 1000);
        this._refreshTimeouts.push(id);
        return;
      }

      if (videoElement.readyState < 3 && retries > 0) {
        const id = setTimeout(() => {
          this._refreshTimeouts = this._refreshTimeouts.filter(t => t !== id);
          this.refreshLocalStream(videoElement, retries - 1);
        }, 500);
        this._refreshTimeouts.push(id);
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
        if (retries > 0) {
          const id = setTimeout(() => {
            this._refreshTimeouts = this._refreshTimeouts.filter(t => t !== id);
            this.refreshLocalStream(videoElement, retries - 1);
          }, 500);
          this._refreshTimeouts.push(id);
        }
        return;
      }

      // Apply high-quality constraints to improve stream quality
      tracks.forEach(track => {
        if (track.kind === 'video') {
          const currentSettings = track.getSettings();
          console.log('[RoomManager] Video track settings:', currentSettings);
          
          // Try to get higher quality - request 720p or native resolution
          track.applyConstraints({
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 }
          }).then(() => {
            console.log('[RoomManager] Video constraints applied, new settings:', track.getSettings());
          }).catch(err => {
            console.warn('[RoomManager] Could not apply video constraints:', err);
          });
        }
      });

      const cleanupDelay = isMobile ? 1500 : 800;
      
      this.peerManager.stopScreenShare();
      const id = setTimeout(() => {
        this._refreshTimeouts = this._refreshTimeouts.filter(t => t !== id);
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
      this._refreshTimeouts.push(id);
    } catch (err) {
      console.error('[RoomManager] captureStream error:', err);
      if (retries > 0) {
        const id = setTimeout(() => {
          this._refreshTimeouts = this._refreshTimeouts.filter(t => t !== id);
          this.refreshLocalStream(videoElement, retries - 1);
        }, 1000);
        this._refreshTimeouts.push(id);
      }
    }
  }

  _playRemoteVoice(remoteUserId, remoteStream) {
    if (remoteStream.getAudioTracks().length === 0) {
      console.log('[RoomManager] Ignoring voice stream with no audio tracks from:', remoteUserId);
      return;
    }

    this._stopRemoteVoice(remoteUserId);

    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audio.srcObject = remoteStream;
    audio.style.display = 'none';
    audio.style.position = 'fixed';
    audio.style.left = '-9999px';
    audio.id = `voice-${remoteUserId}`;
    document.body.appendChild(audio);

    audio.play().catch(err => {
      console.warn('[RoomManager] Voice autoplay failed:', err.message);
    });

    this._voiceStreams.set(remoteUserId, { element: audio, stream: remoteStream });
    console.log('[RoomManager] Remote voice playback started for:', remoteUserId);
  }

  _stopRemoteVoice(remoteUserId) {
    const entry = this._voiceStreams.get(remoteUserId);
    if (entry) {
      if (entry.element) {
        entry.element.pause();
        entry.element.srcObject = null;
        entry.element.remove();
      }
      this._voiceStreams.delete(remoteUserId);
      console.log('[RoomManager] Remote voice playback stopped for:', remoteUserId);
    }
  }

  async initVoice() {
    if (this.micPermissionDenied) return;

    try {
      await this.voiceChat.start();
      this.peerManager.setVoiceStream(this.voiceChat.getStream());

      this.voiceChat.onSpeakingChange = (isSpeaking) => {
        if (this.roomId) {
          this.socket.emit('user-speaking', {
            roomId: this.roomId,
            userId: this.userId,
            isSpeaking
          });
        }
      };

      if (this.roomId && this.participants.length > 0) {
        const remoteUserIds = this.participants
          .filter(p => p.userId !== this.userId)
          .map(p => p.userId);
        this.peerManager.callAllWithVoice(remoteUserIds);
      }

      if (this.onMicChange) {
        this.onMicChange(false);
      }

      console.log('[RoomManager] Voice chat initialized');
    } catch (err) {
      if (err.message === 'MIC_PERMISSION_DENIED') {
        this.micPermissionDenied = true;
        console.warn('[RoomManager] Microphone permission denied');
        if (this.onMicPermissionDenied) {
          this.onMicPermissionDenied();
        }
      } else {
        console.error('[RoomManager] Voice chat init failed:', err.message);
      }
    }
  }

  toggleMicMute() {
    if (!this.voiceChat.isReady) return;
    this.voiceChat.toggleMute();
    if (this.onMicChange) {
      this.onMicChange(this.voiceChat.isMuted);
    }
  }

  destroy() {
    console.log('[RoomManager] Cleaning up resources...');
    
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    
    this._refreshTimeouts.forEach(id => clearTimeout(id));
    this._refreshTimeouts = [];
    
    if (this.voiceChat) {
      this.voiceChat.stop();
    }
    
    this._voiceStreams.forEach(({ element }) => {
      if (element) {
        element.pause();
        element.srcObject = null;
        element.remove();
      }
    });
    this._voiceStreams.clear();
    
    if (this.socket) {
      this.socket.off('connect');
      this.socket.off('room-state');
      this.socket.off('user-joined');
      this.socket.off('user-left');
      this.socket.off('sync-event');
      this.socket.off('chat-message');
      this.socket.off('display-name-updated');
      this.socket.off('user-speaking');
      this.socket.off('leave-room');
      this.socket.off('disconnect');
    }
    
    if (this.peerManager) {
      this.peerManager.destroy();
    }
    
    this.participants = [];
    this.syncEngine = null;
    this.roomId = null;
    this.userId = null;
    
    console.log('[RoomManager] Cleanup complete');
  }
};
