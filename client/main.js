import './style.css';
import 'inter-ui/inter.css';
import { storage } from './utils/storage';
import { RoomManager } from './core/RoomManager';
import { LandingUI } from './ui/LandingUI';
import { RoomUI } from './ui/RoomUI';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
const app = document.querySelector('#app');

// Initialization
let userId = storage.getUserId();
let displayName = storage.getDisplayName(userId);
const roomId = new URLSearchParams(window.location.search).get('room');

const roomManager = new RoomManager(API_URL, userId, displayName);

const render = () => {
  if (roomId) {
    const currentSource = roomManager.syncEngine ? roomManager.syncEngine.currentSource : null;
    const currentSourceValue = roomManager.syncEngine ? roomManager.syncEngine.currentSourceValue : null;
    
    app.innerHTML = RoomUI.render(roomId, roomManager.participants, userId, currentSource, roomManager.hasEnteredTheater);
    RoomUI.initListeners(roomManager);

    // Apply any pending source now that the container should exist in the DOM
    if (roomManager.syncEngine && roomManager.syncEngine.tryApplyPendingSource) {
      console.log('[main.js] Calling tryApplyPendingSource, hasEnteredTheater:', roomManager.hasEnteredTheater);
      roomManager.syncEngine.tryApplyPendingSource();
    }
    
    // Re-attach player if it already existed (handles full re-renders)
    if (currentSource && roomManager.syncEngine) {
      roomManager.syncEngine.loadSource(currentSource, currentSourceValue);
    }
    
    let lastSource = currentSource;
    roomManager.onStateChange = (participants) => {
      const newSource = roomManager.syncEngine ? roomManager.syncEngine.currentSource : null;
      
      // If source changed, we need a full render to show/hide lobby or update controls
      if (newSource !== lastSource) {
        lastSource = newSource;
        render(); 
      } else {
        // Full re-render for UI updates (e.g. sidebar tabs, lobby state)
        render();
      }
    };
    
    roomManager.onChatMessage = (userId, displayName, message, timestamp, isMe) => {
      RoomUI.addChatMessage(userId, displayName, message, timestamp, isMe);
    };

    if (!roomManager.roomId) {
      roomManager.joinRoom(roomId, userId);
    }
  } else {
    app.innerHTML = LandingUI.render(displayName);
    LandingUI.initListeners({
      onCreateRoom: async (name) => {
        const finalName = name || `User_${userId}`;
        storage.setDisplayName(finalName);
        try {
          const data = await roomManager.createRoom(finalName);
          if (data.roomId && data.participantId) {
            // Store the backend-provided host ID
            userId = data.participantId;
            localStorage.setItem('watchsync-userId', userId);
            window.location.href = `?room=${data.roomId}`;
          }
        } catch (err) {
          alert('Failed to create room. Is the server running?');
        }
      },
      onJoinRoom: async (room, name) => {
        if (room.length === 6) {
          const finalName = name || `User_${userId}`;
          storage.setDisplayName(finalName);
          
          try {
            // Join via API first to get a valid participantId
            const res = await fetch(`${API_URL}/api/rooms/${room}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participantName: finalName })
            });
            const data = await res.json();
            
            if (data.participantId) {
              userId = data.participantId;
              localStorage.setItem('watchsync-userId', userId);
              window.location.href = `?room=${room}`;
            } else {
              alert(data.message || 'Failed to join room.');
            }
          } catch (err) {
            alert('Failed to join room. Is the server running?');
          }
        } else {
          alert('Please enter a valid 6-character room ID.');
        }
      }
    });
  }
};

render();
