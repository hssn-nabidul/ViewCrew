export class VoiceChat {
  constructor() {
    this.localStream = null;
    this.isMuted = false;
  }

  async initLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[VoiceChat] Local stream captured successfully');
      return this.localStream;
    } catch (err) {
      console.error('[VoiceChat] Permission denied or capture error:', err);
      // Fallback: continue without audio
      return null;
    }
  }

  mute() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isMuted = true;
      console.log('[VoiceChat] Local audio muted');
    }
  }

  unmute() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isMuted = false;
      console.log('[VoiceChat] Local audio unmuted');
    }
  }

  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }
}
