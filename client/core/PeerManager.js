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
    this.onRemoteStream = null;
    this.onRemoteStreamRemoved = null;

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
  }

  destroy() {
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
