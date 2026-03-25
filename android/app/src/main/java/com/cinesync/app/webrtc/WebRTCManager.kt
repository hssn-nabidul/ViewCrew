package com.cinesync.app.webrtc

import android.content.Context
import com.cinesync.app.data.model.Participant
import io.getstream.webrtc.android.webRTCStreamModule
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import org.webrtc.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages WebRTC peer-to-peer voice connections for the watch party.
 * Implements mesh topology where each participant connects directly to all others.
 */
@Singleton
class WebRTCManager @Inject constructor(
    private val socket: Socket,
    private val webRTCFactory: webRTCStreamModule
) {
    private val _isMuted = MutableStateFlow(true)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()
    
    private val _localAudioTrack = MutableStateFlow<AudioTrack?>(null)
    val localAudioTrack: StateFlow<AudioTrack?> = _localAudioTrack.asStateFlow()
    
    private val _remoteAudioTracks = MutableStateFlow<Map<String, AudioTrack>>(emptyMap())
    val remoteAudioTracks: StateFlow<Map<String, AudioTrack>> = _remoteAudioTracks.asStateFlow()
    
    private val _participants = MutableStateFlow<List<Participant>>(emptyList())
    val participants: StateFlow<List<Participant>> = _participants.asStateFlow()
    
    private val _connectionStatus = MutableStateFlow<Map<String, PeerConnectionState>>(
        emptyMap()
    )
    val connectionStatus: StateFlow<Map<String, PeerConnectionState>> = _connectionStatus.asStateFlow()
    
    private var peerConnections = mutableMapOf<String, PeerConnection>()
    private var currentRoomId: String? = null
    private var localParticipantId: String? = null
    
    // STUN servers for NAT traversal
    private val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302")
            .createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302")
            .createIceServer()
    )
    
    // Audio constraints for voice quality
    private val audioConstraints = MediaConstraints().apply {
        mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
        mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "true"))
        mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
        mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "true"))
        // Use Opus codec for voice
        mandatory.add(MediaConstraints.KeyValuePair("voiceActivityDetection", "true"))
    }
    
    /**
     * Initialize WebRTC and create local audio track
     */
    fun initialize() {
        createLocalAudioTrack()
    }
    
    /**
     * Join room and set up socket listeners for signaling
     */
    fun joinRoom(roomId: String, participantId: String) {
        currentRoomId = roomId
        localParticipantId = participantId
        
        // Initialize audio
        initialize()
        
        // Set up socket listeners
        setupSocketListeners(roomId)
        
        // Emit join event
        socket.emit("join_room", JSONObject().apply {
            put("roomId", roomId)
            put("participantId", participantId)
        })
    }
    
    /**
     * Create local audio track with echo cancellation and noise suppression
     */
    private fun createLocalAudioTrack() {
        try {
            val audioConstraints = AudioConstraints().apply {
                // Enable echo cancellation
                // Note: Actual audio processing is handled by the WebRTC engine
            }
            
            // Create audio source
            val audioSource = webRTCFactory.createAudioSource(audioConstraints)
            
            // Create audio track
            val trackId = "audio_${localParticipantId ?: "local"}"
            val audioTrack = webRTCFactory.createAudioTrack(trackId, audioSource)
            
            // Start muted (user can unmute)
            audioTrack.setEnabled(false)
            
            _localAudioTrack.value = audioTrack
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Set up Socket.io listeners for WebRTC signaling
     */
    private fun setupSocketListeners(roomId: String) {
        val namespace = "/room/$roomId"
        
        // Handle when a new participant joins
        socket.on("${namespace}_join", { args ->
            try {
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val participantId = data.getString("participantId")
                    // Create peer connection for new participant
                    createPeerConnection(participantId)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        })
        
        // Handle when a participant leaves
        socket.on("${namespace}_leave", { args ->
            try {
                if (args.isNotEmpty()) {
                    val participantId = args[0] as String
                    closePeerConnection(participantId)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        })
        
        // Handle WebRTC offer
        socket.on("offer", { args ->
            try {
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val callerId = data.getString("callerId")
                    val offer = data.getString("offer")
                    handleOffer(callerId, offer)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        })
        
        // Handle WebRTC answer
        socket.on("answer", { args ->
            try {
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val callerId = data.getString("callerId")
                    val answer = data.getString("answer")
                    handleAnswer(callerId, answer)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        })
        
        // Handle ICE candidate
        socket.on("ice_candidate", { args ->
            try {
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val senderId = data.getString("senderId")
                    val candidate = data.getString("candidate")
                    handleIceCandidate(senderId, candidate)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        })
        
        // Handle mute status update
        socket.on("mute_status", { args ->
            try {
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val participantId = data.getString("participantId")
                    val isMuted = data.getBoolean("isMuted")
                    updateParticipantMuteStatus(participantId, isMuted)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        })
    }
    
    /**
     * Create peer connection for a remote participant
     */
    fun createPeerConnection(peerId: String): PeerConnection? {
        if (peerConnections.containsKey(peerId)) {
            return peerConnections[peerId]
        }
        
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }
        
        val peerConnection = webRTCFactory.createPeerConnection(
            rtcConfig,
            object : PeerConnection.Observer {
                override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
                
                override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                    updateConnectionStatus(peerId, state ?: PeerConnection.IceConnectionState.FAILED)
                }
                
                override fun onIceConnectionReceivingChange(receiving: Boolean) {}
                
                override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
                
                override fun onIceCandidate(candidate: IceCandidate?) {
                    candidate?.let {
                        sendIceCandidate(peerId, it)
                    }
                }
                
                override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
                
                override fun onAddStream(stream: MediaStream?) {
                    stream?.audioTracks?.firstOrNull()?.let { audioTrack ->
                        val updated = _remoteAudioTracks.value.toMutableMap()
                        updated[peerId] = audioTrack
                        _remoteAudioTracks.value = updated
                    }
                }
                
                override fun onRemoveStream(stream: MediaStream?) {}
                
                override fun onDataChannel(channel: DataChannel?) {}
                
                override fun onRenegotiationNeeded() {
                    // Handle renegotiation if needed
                }
                
                override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {
                    receiver?.track()?.let { track ->
                        if (track is AudioTrack) {
                            val updated = _remoteAudioTracks.value.toMutableMap()
                            updated[peerId] = track
                            _remoteAudioTracks.value = updated
                        }
                    }
                }
            }
        )
        
        // Add local audio track if not muted
        _localAudioTrack.value?.let { track ->
            peerConnection?.addTrack(track, listOf("stream"))
        }
        
        peerConnections[peerId] = peerConnection
        updateConnectionStatus(peerId, PeerConnection.IceConnectionState.CHECKING)
        
        return peerConnection
    }
    
    /**
     * Close peer connection for a participant
     */
    fun closePeerConnection(peerId: String) {
        peerConnections[peerId]?.close()
        peerConnections.remove(peerId)
        
        val updated = _remoteAudioTracks.value.toMutableMap()
        updated.remove(peerId)
        _remoteAudioTracks.value = updated
        
        val statusUpdated = _connectionStatus.value.toMutableMap()
        statusUpdated.remove(peerId)
        _connectionStatus.value = statusUpdated
    }
    
    /**
     * Toggle mute state for local audio
     */
    fun toggleMute() {
        val newMuteState = !_isMuted.value
        _isMuted.value = newMuteState
        
        _localAudioTrack.value?.setEnabled(!newMuteState)
        
        // Broadcast mute status to other participants
        localParticipantId?.let { participantId ->
            socket.emit("mute_status", JSONObject().apply {
                put("participantId", participantId)
                put("isMuted", newMuteState)
            })
        }
    }
    
    /**
     * Set mute state explicitly
     */
    fun setMuted(muted: Boolean) {
        _isMuted.value = muted
        _localAudioTrack.value?.setEnabled(!muted)
        
        localParticipantId?.let { participantId ->
            socket.emit("mute_status", JSONObject().apply {
                put("participantId", participantId)
                put("isMuted", muted)
            })
        }
    }
    
    /**
     * Handle incoming offer from a peer
     */
    private fun handleOffer(callerId: String, offerSdp: String) {
        val peerConnection = createPeerConnection(callerId) ?: return
        
        try {
            val sessionDescription = SessionDescription(
                SessionDescription.Type.OFFER,
                offerSdp
            )
            
            peerConnection.setRemoteDescription(object : SdpObserver {
                override fun onCreateSuccess(p0: SessionDescription?) {}
                override fun onSetSuccess() {
                    // Create and send answer
                    peerConnection.createAnswer(object : SdpObserver {
                        override fun onCreateSuccess(p0: SessionDescription?) {
                            p0?.let {
                                peerConnection.setLocalDescription(object : SdpObserver {
                                    override fun onCreateSuccess(p0: SessionDescription?) {}
                                    override fun onSetSuccess() {
                                        sendAnswer(callerId, it.sdp ?: "")
                                    }
                                    override fun onSetFailure(error: String?) {}
                                    override fun onCreateFailure(error: String?) {}
                                }, it)
                            }
                        }
                        override fun onSetFailure(error: String?) {}
                        override fun onSetSuccess() {}
                        override fun onCreateFailure(error: String?) {}
                    }, MediaConstraints())
                }
                override fun onSetFailure(error: String?) {}
            }, sessionDescription)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Handle incoming answer from a peer
     */
    private fun handleAnswer(callerId: String, answerSdp: String) {
        val peerConnection = peerConnections[callerId] ?: return
        
        try {
            val sessionDescription = SessionDescription(
                SessionDescription.Type.ANSWER,
                answerSdp
            )
            
            peerConnection.setRemoteDescription(object : SdpObserver {
                override fun onCreateSuccess(p0: SessionDescription?) {}
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String?) {}
            }, sessionDescription)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Handle incoming ICE candidate
     */
    private fun handleIceCandidate(senderId: String, candidateJson: String) {
        val peerConnection = peerConnections[senderId] ?: return
        
        try {
            // Parse the candidate JSON
            val json = JSONObject(candidateJson)
            val iceCandidate = IceCandidate(
                json.getString("sdpMid"),
                json.getInt("sdpMLineIndex"),
                json.getString("candidate")
            )
            
            peerConnection.addIceCandidate(iceCandidate)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * Send offer to a peer
     */
    fun sendOffer(targetId: String) {
        val peerConnection = createPeerConnection(targetId) ?: return
        
        peerConnection.createOffer(object : SdpObserver {
            override fun onCreateSuccess(p0: SessionDescription?) {
                p0?.let {
                    peerConnection.setLocalDescription(object : SdpObserver {
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onSetSuccess() {
                            socket.emit("offer", JSONObject().apply {
                                put("targetId", targetId)
                                put("offer", it.sdp ?: "")
                                put("callerId", localParticipantId)
                            })
                        }
                        override fun onSetFailure(error: String?) {}
                        override fun onCreateFailure(error: String?) {}
                    }, it)
                }
            }
            override fun onSetFailure(error: String?) {}
            override fun onSetSuccess() {}
            override fun onCreateFailure(error: String?) {}
        }, MediaConstraints())
    }
    
    /**
     * Send answer to a peer
     */
    private fun sendAnswer(targetId: String, answerSdp: String) {
        socket.emit("answer", JSONObject().apply {
            put("targetId", targetId)
            put("answer", answerSdp)
            put("callerId", localParticipantId)
        })
    }
    
    /**
     * Send ICE candidate to a peer
     */
    private fun sendIceCandidate(targetId: String, candidate: IceCandidate) {
        socket.emit("ice_candidate", JSONObject().apply {
            put("targetId", targetId)
            put("candidate", JSONObject().apply {
                put("candidate", candidate.sdp)
                put("sdpMid", candidate.sdpMid)
                put("sdpMLineIndex", candidate.sdpMLineIndex)
            })
            put("senderId", localParticipantId)
        })
    }
    
    /**
     * Update connection status for a peer
     */
    private fun updateConnectionStatus(peerId: String, state: PeerConnection.IceConnectionState) {
        val updated = _connectionStatus.value.toMutableMap()
        when (state) {
            PeerConnection.IceConnectionState.CONNECTED,
            PeerConnection.IceConnectionState.COMPLETED -> updated[peerId] = PeerConnectionState.CONNECTED
            PeerConnection.IceConnectionState.DISCONNECTED -> updated[peerId] = PeerConnectionState.DISCONNECTED
            PeerConnection.IceConnectionState.FAILED -> updated[peerId] = PeerConnectionState.FAILED
            else -> updated[peerId] = PeerConnectionState.CONNECTING
        }
        _connectionStatus.value = updated
    }
    
    /**
     * Update mute status for a participant
     */
    private fun updateParticipantMuteStatus(participantId: String, isMuted: Boolean) {
        val updated = _participants.value.map { participant ->
            if (participant.participantId == participantId) {
                participant.copy(isMuted = isMuted)
            } else {
                participant
            }
        }
        _participants.value = updated
    }
    
    /**
     * Update participants list
     */
    fun updateParticipants(participants: List<Participant>) {
        _participants.value = participants
    }
    
    /**
     * Leave room and clean up all connections
     */
    fun leaveRoom() {
        currentRoomId?.let { roomId ->
            socket.emit("leave_room", JSONObject().apply {
                put("roomId", roomId)
                put("participantId", localParticipantId)
            })
            
            // Remove socket listeners
            socket.off("${"/room/$roomId"}_join")
            socket.off("${"/room/$roomId"}_leave")
            socket.off("offer")
            socket.off("answer")
            socket.off("ice_candidate")
            socket.off("mute_status")
        }
        
        // Close all peer connections
        peerConnections.values.forEach { it.close() }
        peerConnections.clear()
        
        // Release audio track
        _localAudioTrack.value?.setEnabled(false)
        _localAudioTrack.value?.dispose()
        _localAudioTrack.value = null
        
        // Clear remote tracks
        _remoteAudioTracks.value = emptyMap()
        
        // Reset state
        currentRoomId = null
        localParticipantId = null
        _isMuted.value = true
        _participants.value = emptyList()
        _connectionStatus.value = emptyMap()
    }
    
    enum class PeerConnectionState {
        CONNECTING,
        CONNECTED,
        DISCONNECTED,
        FAILED
    }
}
