import { Peer } from 'peerjs';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

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

      // Always answer with empty stream for screen share
      call.answer(new MediaStream());
      this.handleCall(call, type);
    });

    this.peer.on('error', (err) => {
      console.error('[PeerManager] PeerJS Error:', err.type, err);
    });
  }

  callPeer(remoteUserId, type = 'screen') {
    const stream = this.screenStream;

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
          OfferToReceiveAudio: false,
          OfferToReceiveVideo: true
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
    remoteUserIds.forEach(id => {
      if (id !== this.userId) {
        this.callPeer(id, 'screen');
      }
    });
  }

  stopScreenShare() {
    this.calls.forEach((calls) => {
      if (calls.screen) {
        calls.screen.close();
      }
    });
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
  }

  destroy() {
    this.calls.forEach(calls => {
      if (calls.screen) calls.screen.close();
    });
    this.calls.clear();
    if (this.peer) this.peer.destroy();
  }
}
