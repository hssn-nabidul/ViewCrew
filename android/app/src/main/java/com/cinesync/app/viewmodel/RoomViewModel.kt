package com.cinesync.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinesync.app.data.model.ConnectionStatus
import com.cinesync.app.data.model.Participant
import com.cinesync.app.data.repository.RoomRepository
import com.cinesync.app.data.repository.SocketEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class RoomUiState {
    data object Idle : RoomUiState()
    data object Loading : RoomUiState()
    data class Success(val roomId: String) : RoomUiState()
    data class Error(val message: String) : RoomUiState()
}

data class RoomScreenState(
    val roomId: String? = null,
    val isHost: Boolean = false,
    val participantName: String = "",
    val participants: List<Participant> = emptyList(),
    val currentParticipantId: String? = null,
    val connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED,
    val isMuted: Boolean = true,
    val showShareDialog: Boolean = false,
    val copiedToClipboard: Boolean = false,
    val navigateToRoom: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class RoomViewModel @Inject constructor(
    private val repository: RoomRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<RoomUiState>(RoomUiState.Idle)
    val uiState: StateFlow<RoomUiState> = _uiState.asStateFlow()
    
    private val _screenState = MutableStateFlow(RoomScreenState())
    val screenState: StateFlow<RoomScreenState> = _screenState.asStateFlow()
    
    private val _createRoomState = MutableStateFlow<RoomUiState>(RoomUiState.Idle)
    val createRoomState: StateFlow<RoomUiState> = _createRoomState.asStateFlow()
    
    private val _joinRoomState = MutableStateFlow<RoomUiState>(RoomUiState.Idle)
    val joinRoomState: StateFlow<RoomUiState> = _joinRoomState.asStateFlow()
    
    private var socketJob: kotlinx.coroutines.Job? = null
    private var participantId: String? = null
    
    fun createRoom(hostName: String) {
        viewModelScope.launch {
            _createRoomState.value = RoomUiState.Loading
            _screenState.update { it.copy(participantName = hostName) }
            
            repository.createRoom(hostName).fold(
                onSuccess = { response ->
                    _createRoomState.value = RoomUiState.Success(response.roomId)
                    participantId = response.participantId
                    _screenState.update { 
                        it.copy(
                            roomId = response.roomId,
                            isHost = true,
                            currentParticipantId = response.participantId,
                            connectionStatus = ConnectionStatus.CONNECTED,
                            navigateToRoom = true
                        )
                    }
                    observeSocketEvents(response.roomId, response.participantId)
                },
                onFailure = { e ->
                    _createRoomState.value = RoomUiState.Error(e.message ?: "Failed to create room")
                    _screenState.update { it.copy(errorMessage = e.message) }
                }
            )
        }
    }
    
    fun joinRoom(roomId: String, participantName: String) {
        viewModelScope.launch {
            _joinRoomState.value = RoomUiState.Loading
            _screenState.update { it.copy(participantName = participantName) }
            
            // Validate room ID format (6 alphanumeric chars)
            val normalizedRoomId = roomId.uppercase().trim()
            if (normalizedRoomId.length != 6 || !normalizedRoomId.all { it.isLetterOrDigit() }) {
                _joinRoomState.value = RoomUiState.Error("Invalid room ID. Must be 6 alphanumeric characters.")
                _screenState.update { it.copy(errorMessage = "Invalid room ID format") }
                return@launch
            }
            
            repository.joinRoom(normalizedRoomId, participantName).fold(
                onSuccess = { result ->
                    _joinRoomState.value = RoomUiState.Success(result.roomInfo.id)
                    participantId = result.participantId
                    _screenState.update {
                        it.copy(
                            roomId = result.roomInfo.id,
                            isHost = false,
                            currentParticipantId = result.participantId,
                            connectionStatus = ConnectionStatus.CONNECTED,
                            navigateToRoom = true
                        )
                    }
                    observeSocketEvents(result.roomInfo.id, result.participantId)
                },
                onFailure = { e ->
                    _joinRoomState.value = RoomUiState.Error(e.message ?: "Failed to join room")
                    _screenState.update { it.copy(errorMessage = e.message) }
                }
            )
        }
    }
    
    private fun observeSocketEvents(roomId: String, pId: String) {
        socketJob?.cancel()
        socketJob = viewModelScope.launch {
            repository.observeSocketEvents(roomId, pId).collect { event ->
                when (event) {
                    is SocketEvent.RoomJoined -> {
                        _screenState.update { state ->
                            state.copy(participants = event.participants)
                        }
                    }
                    is SocketEvent.ParticipantJoined -> {
                        _screenState.update { state ->
                            val updatedParticipants = state.participants.toMutableList()
                            if (updatedParticipants.none { it.id == event.participant.id }) {
                                updatedParticipants.add(event.participant)
                            }
                            state.copy(participants = updatedParticipants)
                        }
                    }
                    is SocketEvent.ParticipantLeft -> {
                        _screenState.update { state ->
                            state.copy(
                                participants = state.participants.filter { 
                                    it.id != event.participantId 
                                }
                            )
                        }
                    }
                    is SocketEvent.RoomClosed -> {
                        _uiState.value = RoomUiState.Error("Room was closed: ${event.reason}")
                        leaveRoom()
                    }
                    is SocketEvent.Error -> {
                        _uiState.value = RoomUiState.Error(event.message)
                    }
                }
            }
        }
    }
    
    fun leaveRoom() {
        viewModelScope.launch {
            socketJob?.cancel()
            repository.leaveRoom()
            _screenState.value = RoomScreenState()
            _uiState.value = RoomUiState.Idle
        }
    }
    
    fun closeRoom() {
        viewModelScope.launch {
            socketJob?.cancel()
            repository.closeRoom()
            _screenState.value = RoomScreenState()
            _uiState.value = RoomUiState.Idle
        }
    }
    
    fun toggleMute() {
        _screenState.update { it.copy(isMuted = !it.isMuted) }
    }
    
    fun showShareDialog() {
        _screenState.update { it.copy(showShareDialog = true) }
    }
    
    fun hideShareDialog() {
        _screenState.update { it.copy(showShareDialog = false) }
    }
    
    fun onLinkCopied() {
        _screenState.update { it.copy(copiedToClipboard = true) }
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _screenState.update { it.copy(copiedToClipboard = false) }
        }
    }
    
    fun clearNavigation() {
        _screenState.update { it.copy(navigateToRoom = false) }
    }
    
    fun clearError() {
        _uiState.value = RoomUiState.Idle
        _createRoomState.value = RoomUiState.Idle
        _joinRoomState.value = RoomUiState.Idle
        _screenState.update { it.copy(errorMessage = null) }
    }
    
    override fun onCleared() {
        super.onCleared()
        socketJob?.cancel()
    }
}
