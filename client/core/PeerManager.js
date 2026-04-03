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

  startScreenShare(stream, remoteUserIds) {
    this.screenStream = stream;
    remoteUserIds.forEach(id => {
      if (id !== this.userId) {
        this.callPeer(id, 'screen');
      }
    });
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
    const existingCalls = this.calls.get(call.peer) || {};
    
    if (existingCalls[type]) {
      console.log(`[PeerManager] Closing existing ${type} call from ${call.peer} before handling new one`);
      existingCalls[type].close();
    }

    existingCalls[type] = call;
    this.calls.set(call.peer, existingCalls);

    call.on('stream', (remoteStream) => {
      console.log(`[PeerManager] Received remote ${type} stream from: ${call.peer}`);
      if (this.onRemoteStream) {
        this.onRemoteStream(call.peer, remoteStream, type);
      }
    });

    call.on('close', () => {
      console.log(`[PeerManager] ${type} call closed with: ${call.peer}`);
      const calls = this.calls.get(call.peer);
      if (calls) {
        delete calls[type];
        if (this.onRemoteStreamRemoved) {
          this.onRemoteStreamRemoved(call.peer, type);
        }
      }
    });

    call.on('error', (err) => {
      console.error(`[PeerManager] ${type} call error with ${call.peer}:`, err);
    });
  }

  removeCallReference(remoteUserId, type) {
    const calls = this.calls.get(remoteUserId);
    if (calls) {
      delete calls[type];
    }
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
