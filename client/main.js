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

// Track cleanup for event listeners
let cleanupRender = null;
let lastSource = null;

const cleanup = () => {
  if (cleanupRender) {
    cleanupRender();
    cleanupRender = null;
  }
  if (roomManager.syncEngine) {
    roomManager.syncEngine.cleanup();
  }
  roomManager.destroy();
};

const render = () => {
  if (roomId) {
    const currentSource = roomManager.syncEngine ? roomManager.syncEngine.currentSource : null;
    const currentSourceValue = roomManager.syncEngine ? roomManager.syncEngine.currentSourceValue : null;
    const hasEnteredTheater = roomManager.hasEnteredTheater;
    
    console.log('[render] Rendering, hasEnteredTheater:', hasEnteredTheater, 'currentSource:', currentSource);
    app.innerHTML = RoomUI.render(roomId, roomManager.participants, userId, currentSource, currentSourceValue, hasEnteredTheater);
    
    const container = document.getElementById('video-container');
    const lobbyView = document.querySelector('[data-lobby]');
    console.log('[render] Container exists:', !!container, 'Lobby exists:', !!lobbyView);
    console.log('[render] Active view:', RoomUI.currentTab);
    
    // Cleanup previous render listeners before setting new ones
    if (cleanupRender) {
      cleanupRender();
    }
    cleanupRender = RoomUI.initListeners(roomManager);

    // Apply any pending source now that the container should exist in the DOM
    if (roomManager.syncEngine && roomManager.syncEngine.tryApplyPendingSource) {
      roomManager.syncEngine.tryApplyPendingSource();
    }
    
    // Re-attach player if it already existed (handles full re-renders)
    if (currentSource && roomManager.syncEngine) {
      roomManager.syncEngine.loadSource(currentSource, currentSourceValue);
    }
    
    lastSource = currentSource;
    let lastEnteredTheater = currentSource ? roomManager.hasEnteredTheater : false;
    roomManager.onStateChange = (participants) => {
      const newSource = roomManager.syncEngine ? roomManager.syncEngine.currentSource : null;
      const newEnteredTheater = roomManager.hasEnteredTheater;
      
      // Re-render if source OR hasEnteredTheater changed
      if (newSource !== lastSource || newEnteredTheater !== lastEnteredTheater) {
        lastSource = newSource;
        lastEnteredTheater = newEnteredTheater;
        render(); 
      }
      // Participant changes are handled by the UI reactively, no full re-render needed
    };
    
    roomManager.onChatMessage = (userId, displayName, message, timestamp, isMe) => {
      RoomUI.addChatMessage(userId, displayName, message, timestamp, isMe);
    };

    if (!roomManager.roomId) {
      roomManager.joinRoom(roomId, userId);
    }
  } else {
    app.innerHTML = LandingUI.render(displayName);
    
    if (cleanupRender) {
      cleanupRender();
      cleanupRender = null;
    }
    
    LandingUI.initListeners({
      onCreateRoom: async (name) => {
        const finalName = name || `User_${userId}`;
        storage.setDisplayName(finalName);
        try {
          const data = await roomManager.createRoom(finalName);
          if (data.roomId && data.participantId) {
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

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

render();
