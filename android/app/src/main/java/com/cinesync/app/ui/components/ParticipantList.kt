package com.cinesync.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cinesync.app.data.model.ConnectionStatus
import com.cinesync.app.data.model.Participant

/**
 * Participant avatar colors based on participant index
 */
private val participantColors = listOf(
    Color(0xFF6750A4),  // Purple
    Color(0xFF2196F3),  // Blue
    Color(0xFF4CAF50),  // Green
    Color(0xFFFF9800),   // Orange
    Color(0xFFE91E63),  // Pink
    Color(0xFF00BCD4)   // Cyan
)

/**
 * Get avatar color based on participant ID
 */
private fun getParticipantColor(participantId: String): Color {
    val hash = participantId.hashCode().let { if (it < 0) -it else it }
    return participantColors[hash % participantColors.size]
}

/**
 * Get initial from display name
 */
private fun getInitial(name: String): String {
    return name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

/**
 * Participant list display component
 */
@Composable
fun ParticipantList(
    participants: List<Participant>,
    currentParticipantId: String?,
    isHost: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            .padding(8.dp)
    ) {
        // Header
        Text(
            text = "Participants (${participants.size})",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        // Participant list
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(
                items = participants,
                key = { it.participantId }
            ) { participant ->
                ParticipantItem(
                    participant = participant,
                    isCurrentUser = participant.participantId == currentParticipantId,
                    isHost = isHost
                )
            }
        }
    }
}

/**
 * Single participant item
 */
@Composable
private fun ParticipantItem(
    participant: Participant,
    isCurrentUser: Boolean,
    isHost: Boolean
) {
    val backgroundColor = if (isCurrentUser) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surface
    }
    
    val borderModifier = if (isCurrentUser) {
        Modifier.border(
            width = 2.dp,
            color = MaterialTheme.colorScheme.primary,
            shape = MaterialTheme.shapes.medium
        )
    } else {
        Modifier
    }
    
    Card(
        modifier = modifier
            .fillMaxWidth()
            .then(borderModifier),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar with initial
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(getParticipantColor(participant.participantId)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = getInitial(participant.name),
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
            
            // Name and badges
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = participant.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (isCurrentUser) FontWeight.Bold else FontWeight.Normal
                    )
                    
                    // Host badge
                    if (participant.isHost) {
                        HostBadge()
                    }
                    
                    // You badge
                    if (isCurrentUser) {
                        YouBadge()
                    }
                }
                
                // Connection status
                ConnectionStatusIndicator(status = participant.connectionStatus)
            }
            
            // Mute indicator
            MuteIndicator(isMuted = participant.isMuted)
        }
    }
}

/**
 * Host role badge
 */
@Composable
private fun HostBadge() {
    Surface(
        color = MaterialTheme.colorScheme.primary,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = "HOST",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

/**
 * "You" badge for current user
 */
@Composable
private fun YouBadge() {
    Surface(
        color = MaterialTheme.colorScheme.secondary,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = "YOU",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSecondary,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

/**
 * Connection status indicator dot
 */
@Composable
private fun ConnectionStatusIndicator(status: ConnectionStatus) {
    val (color, text) = when (status) {
        ConnectionStatus.CONNECTED -> Color(0xFF4CAF50) to "Connected"
        ConnectionStatus.CONNECTING -> Color(0xFFFFC107) to "Connecting..."
        ConnectionStatus.DISCONNECTED -> Color(0xFFF44336) to "Disconnected"
        ConnectionStatus.RECONNECTING -> Color(0xFFFF9800) to "Reconnecting..."
    }
    
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(color)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Mute status icon
 */
@Composable
private fun MuteIndicator(isMuted: Boolean) {
    val tint = if (isMuted) {
        Color(0xFFF44336) // Red when muted
    } else {
        Color(0xFF4CAF50) // Green when unmuted
    }
    
    Icon(
        imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
        contentDescription = if (isMuted) "Muted" else "Unmuted",
        tint = tint,
        modifier = Modifier.size(24.dp)
    )
}
