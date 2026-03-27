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

    this.peer = new Peer(userId, {
      host: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/peerjs',
      config: {
        iceServers: ICE_SERVERS,
        iceTransportPolicy: 'all'
      }
    });

    this.localStream = null;
    this.screenStream = null;
    this.calls = new Map(); // userId -> { audio: call, screen: call }
    this.onRemoteStream = null; // (userId, stream, type)
    this.onRemoteStreamRemoved = null;

    this.setupListeners();
  }

  setLocalStream(stream) {
    this.localStream = stream;
  }

  setupListeners() {
    this.peer.on('open', (id) => {
      console.log(`[PeerManager] Connected to PeerJS server with ID: ${id}`);
    });

    this.peer.on('call', (call) => {
      const type = call.metadata?.type || 'audio';
      console.log(`[PeerManager] Receiving ${type} call from: ${call.peer}`);

      if (type === 'audio') {
        call.answer(this.localStream || new MediaStream());
      } else {
        // FIX: Some browsers require a more active SDP answer for video streams.
        // We still send an empty stream to avoid sending our own video back,
        // but we ensure it's handled as a proper receive-only connection.
        call.answer(new MediaStream());
      }

      this.handleCall(call, type);
    });

    this.peer.on('error', (err) => {
      console.error('[PeerManager] PeerJS Error:', err.type, err);
    });
  }

  callPeer(remoteUserId, type = 'audio') {
    const stream = type === 'audio' ? this.localStream : this.screenStream;

    if (!stream) {
      console.warn(`[PeerManager] Cannot call ${type} — stream not ready`);
      return;
    }

    console.log(`[PeerManager] Calling ${remoteUserId} (${type}) with ${stream.getTracks().length} tracks`);
    const call = this.peer.call(remoteUserId, stream, { metadata: { type } });
    this.handleCall(call, type);
  }

  handleCall(call, type) {
    const remoteUserId = call.peer;

    const existingCalls = this.calls.get(remoteUserId);
    if (existingCalls && existingCalls[type]) {
      console.log(`[PeerManager] Closing existing ${type} call from ${remoteUserId}`);
      try {
        existingCalls[type].close();
      } catch (e) {}
      delete existingCalls[type];
    }

    call.on('stream', (remoteStream) => {
      const trackCount = remoteStream.getTracks().length;
      console.log(`[PeerManager] Received remote ${type} stream from ${remoteUserId} with ${trackCount} tracks`);

      // FIX: Do NOT ignore empty streams here. In WebRTC, tracks can be added
      // asynchronously after the 'stream' event fires. The ScreenPlayer now
      // handles onaddtrack internally to detect when video actually arrives.
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
    if (calls) {
      delete calls[type];
      if (Object.keys(calls).length === 0) {
        this.calls.delete(userId);
      } else {
        this.calls.set(userId, calls);
      }
    }
  }

  startScreenShare(stream, remoteUserIds) {
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
        try { calls.screen.close(); } catch(e) {}
      }
    });
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
  }

  destroy() {
    this.calls.forEach(calls => {
      if (calls.audio) try { calls.audio.close(); } catch(e) {}
      if (calls.screen) try { calls.screen.close(); } catch(e) {}
    });
    this.calls.clear();
    if (this.peer) this.peer.destroy();
  }
}
