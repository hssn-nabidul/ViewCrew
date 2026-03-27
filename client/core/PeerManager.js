import { Peer } from 'peerjs';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Free TURN fallback — handles mobile CGNAT where STUN alone fails
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
      // FIX 1: Explicit ICE config — PeerJS default STUN is unreliable on
      // mobile networks (carrier-grade NAT). Without TURN, video streams
      // silently fail on ~30% of mobile connections.
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
        // FIX: Never pass null to call.answer(). When mic permission is denied,
        // this.localStream is null. Passing null to PeerJS causes it to fail the
        // entire RTCPeerConnection — which then also breaks the screen share call
        // because the peer is in a broken state. An empty MediaStream is safe:
        // it tells PeerJS "I accept this call, I just have nothing to send back."
        call.answer(this.localStream || new MediaStream());
      } else {
        // FIX 2: Pass an empty MediaStream instead of nothing.
        // call.answer() with no args causes PeerJS to skip video codec
        // negotiation in the SDP answer. The ICE connection succeeds but
        // the video track is never transferred — producing a permanent black screen.
        // An empty MediaStream forces proper video negotiation while still
        // making this a receive-only connection.
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

    console.log(`[PeerManager] Calling ${remoteUserId} (${type})`);
    const call = this.peer.call(remoteUserId, stream, { metadata: { type } });
    this.handleCall(call, type);
  }

  handleCall(call, type) {
    const remoteUserId = call.peer;

    // FIX: If we already have a screen call from this peer, close the old one first.
    // This prevents overlapping WebRTC connections which cause Android Chrome to
    // receive a second stream but fail to render it (showing a black screen).
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

      // FIX 3: Guard against empty streams from the fix above.
      // The empty MediaStream we send in answer() comes back here on the
      // caller's side — ignore it since it has no tracks.
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
      if (calls.audio) calls.audio.close();
      if (calls.screen) calls.screen.close();
    });
    this.calls.clear();
    if (this.peer) this.peer.destroy();
  }
}
