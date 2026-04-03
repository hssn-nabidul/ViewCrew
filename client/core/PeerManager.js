import { Peer } from 'peerjs';

function getIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USER;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: turnUser || 'user',
      credential: turnCred || ''
    });
  }

  return servers;
}

const ICE_SERVERS = getIceServers();

export class PeerManager {
  constructor(apiUrl, userId) {
    this.userId = userId;
    const url = new URL(apiUrl);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    this.peer = new Peer(userId, {
      host: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/peerjs',
      config: {
        iceServers: ICE_SERVERS,
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: isMobile ? 10 : 5,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      },
      debug: isMobile ? 2 : 0
    });

    this.screenStream = null;
    this.voiceStream = null;
    this._cachedScreenStream = null;
    this.calls = new Map();
    this.dataChannels = new Map();
    this.onRemoteStream = null;
    this.onRemoteStreamRemoved = null;
    this.onDataChannel = null;
    this.onDataChannelMessage = null;

    this.setupListeners();
  }

  setupListeners() {
    this.peer.on('open', (id) => {
      console.log(`[PeerManager] Connected to PeerJS server with ID: ${id}`);
    });

    this.peer.on('call', (call) => {
      const type = call.metadata?.type || 'screen';
      console.log(`[PeerManager] Receiving ${type} call from: ${call.peer}`);

      if (type === 'voice' && this.voiceStream) {
        call.answer(this.voiceStream);
      } else if (type === 'screen' && this.screenStream) {
        call.answer(this.screenStream);
      } else {
        call.answer(new MediaStream());
      }
      this.handleCall(call, type);
    });

    this.peer.on('error', (err) => {
      console.error('[PeerManager] PeerJS Error:', err.type, err);
    });

    this.peer.on('dataConnection', (conn) => {
      console.log(`[PeerManager] Incoming data connection from: ${conn.peer}`);
      this._setupDataChannel(conn);
    });
  }

  _setupDataChannel(conn) {
    conn.on('open', () => {
      console.log(`[PeerManager] DataChannel open with: ${conn.peer}`);
      if (this.onDataChannel) {
        this.onDataChannel(conn.peer, conn);
      }
    });

    conn.on('data', (data) => {
      if (this.onDataChannelMessage) {
        this.onDataChannelMessage(conn.peer, data);
      }
    });

    conn.on('close', () => {
      console.log(`[PeerManager] DataChannel closed with: ${conn.peer}`);
      this.dataChannels.delete(conn.peer);
    });

    conn.on('error', (err) => {
      console.error(`[PeerManager] DataChannel error with ${conn.peer}:`, err);
    });

    const channels = this.dataChannels.get(conn.peer) || [];
    channels.push(conn);
    this.dataChannels.set(conn.peer, channels);
  }

  createDataChannel(remoteUserId, label = 'file-stream') {
    const existing = this.dataChannels.get(remoteUserId);
    if (existing && existing.length > 0) {
      console.log(`[PeerManager] DataChannel already exists for ${remoteUserId}`);
      return existing[0];
    }

    console.log(`[PeerManager] Creating DataChannel to ${remoteUserId} (${label})`);
    const conn = this.peer.connect(remoteUserId, {
      label,
      reliable: true,
      serialization: 'binary',
      metadata: { type: 'file-stream' }
    });

    this._setupDataChannel(conn);
    return conn;
  }

  createDataChannelsToAll(remoteUserIds, label = 'file-stream') {
    const promises = [];
    remoteUserIds.forEach(id => {
      if (id !== this.userId) {
        const existing = this.dataChannels.get(id);
        if (existing && existing.length > 0 && existing[0].open) {
          promises.push(Promise.resolve());
          return;
        }

        promises.push(new Promise((resolve) => {
          const conn = this.createDataChannel(id, label);
          if (conn.open) {
            resolve();
          } else {
            conn.on('open', () => resolve());
          }
        }));
      }
    });
    return Promise.all(promises);
  }

  sendDataToAll(data) {
    this.dataChannels.forEach((channels) => {
      channels.forEach(conn => {
        if (conn.open) {
          try {
            conn.send(data);
          } catch (err) {
            console.warn('[PeerManager] Failed to send data:', err.message);
          }
        }
      });
    });
  }

  closeDataChannels() {
    this.dataChannels.forEach((channels) => {
      channels.forEach(conn => {
        try {
          conn.close();
        } catch {
          // Ignore close errors
        }
      });
    });
    this.dataChannels.clear();
  }

  callPeer(remoteUserId, type = 'screen') {
    let stream;
    if (type === 'voice') {
      stream = this.voiceStream;
    } else {
      stream = this.screenStream;
    }

    if (!stream) {
      console.warn(`[PeerManager] Cannot call ${type} — stream not ready`);
      return;
    }

    const tracks = stream.getTracks();
    if (tracks.length === 0) {
      console.warn(`[PeerManager] Cannot call ${type} — stream has no tracks`);
      return;
    }

    const liveTracks = tracks.filter(t => t.readyState === 'live');
    console.log(`[PeerManager] Calling ${remoteUserId} (${type}) with ${liveTracks.length}/${tracks.length} live tracks`);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const options = {
      metadata: { type },
      constraints: {
        mandatory: {
          OfferToReceiveAudio: type === 'voice',
          OfferToReceiveVideo: type === 'screen'
        }
      },
      sdpTransform: isMobile ? (sdp) => {
        const h264Regex = /(a=rtpmap:\d+ H264\/\d+)/;
        const match = sdp.match(h264Regex);
        if (match) {
          const payloadType = match[0].match(/\d+/)[0];
          sdp = sdp.replace(/(m=video \d+ [A-Z]+\/TLS\/RTP\/SAVPF )(.+)/, (match, prefix, payloads) => {
            const payloadList = payloads.split(' ');
            const h264Index = payloadList.indexOf(payloadType);
            if (h264Index > 0) {
              payloadList.splice(h264Index, 1);
              payloadList.unshift(payloadType);
              return prefix + payloadList.join(' ');
            }
            return match;
          });
        }
        return sdp;
      } : undefined
    };

    const call = this.peer.call(remoteUserId, stream, options);
    this.handleCall(call, type);
  }

  handleCall(call, type) {
    const remoteUserId = call.peer;

    const existingCalls = this.calls.get(remoteUserId);
    if (existingCalls && existingCalls[type]) {
      console.log(`[PeerManager] Closing existing ${type} call from ${remoteUserId} before handling new one`);
      try {
        existingCalls[type].close();
      } catch (e) {
        // Ignore close errors on stale calls
      }
      delete existingCalls[type];
    }

    call.on('stream', (remoteStream) => {
      console.log(`[PeerManager] Received remote ${type} stream from: ${remoteUserId}`);

      if (type === 'screen' && remoteStream.getTracks().length === 0) {
        console.log('[PeerManager] Ignoring empty stream from screen share answer');
        return;
      }

      if (this.onRemoteStream) {
        this.onRemoteStream(remoteUserId, remoteStream, type);
      }
    });

    call.on('close', () => {
      console.log(`[PeerManager] ${type} call closed with: ${remoteUserId}`);
      this.removeCallReference(remoteUserId, type);
      if (this.onRemoteStreamRemoved) this.onRemoteStreamRemoved(remoteUserId, type);
    });

    const calls = this.calls.get(remoteUserId) || {};
    calls[type] = call;
    this.calls.set(remoteUserId, calls);
  }

  removeCallReference(userId, type) {
    const calls = this.calls.get(userId);
    if (calls && calls[type]) {
      const call = calls[type];
      
      // Remove event listeners to prevent memory leaks
      call.off('stream');
      call.off('close');
      
      // Close the call connection
      try {
        call.close();
      } catch (e) {
        // Ignore errors when closing stale connections
      }
      
      delete calls[type];
      if (Object.keys(calls).length === 0) {
        this.calls.delete(userId);
      } else {
        this.calls.set(userId, calls);
      }
    }
  }

  startScreenShare(stream, remoteUserIds) {
    if (!stream) {
      console.error('[PeerManager] startScreenShare called with null stream');
      return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    console.log(`[PeerManager] Starting screen share with ${videoTracks.length} video, ${audioTracks.length} audio tracks`);

    if (videoTracks.length === 0) {
      console.error('[PeerManager] Cannot start screen share — no video tracks in stream');
      return;
    }

    this.screenStream = stream;
    this._cachedScreenStream = stream;
    remoteUserIds.forEach(id => {
      if (id !== this.userId) {
        this.callPeer(id, 'screen');
      }
    });
  }

  stopScreenShare() {
    this.calls.forEach(calls => {
      if (calls.screen) {
        calls.screen.close();
      }
    });
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this._cachedScreenStream = null;
  }

  setVoiceStream(stream) {
    this.voiceStream = stream;
  }

  callAllWithVoice(remoteUserIds) {
    if (!this.voiceStream) {
      console.warn('[PeerManager] Cannot start voice — voice stream not set');
      return;
    }
    remoteUserIds.forEach(id => {
      if (id !== this.userId) {
        this.callPeer(id, 'voice');
      }
    });
  }

  stopVoiceCalls() {
    this.calls.forEach(calls => {
      if (calls.voice) {
        calls.voice.close();
      }
    });
  }

  destroy() {
    this.closeDataChannels();
    this.calls.forEach(calls => {
      if (calls.screen) calls.screen.close();
      if (calls.voice) calls.voice.close();
    });
    this.calls.clear();
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    this._cachedScreenStream = null;
    if (this.voiceStream) {
      this.voiceStream.getTracks().forEach(t => t.stop());
      this.voiceStream = null;
    }
    if (this.peer) this.peer.destroy();
  }
}
