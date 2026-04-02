import './style.css';
import 'inter-ui/inter.css';
import { storage } from './utils/storage';
import { RoomManager } from './core/RoomManager';
import { LandingUI } from './ui/LandingUI';
import { RoomUI } from './ui/RoomUI';
import { ToastManager } from './utils/ToastManager';
import { ReactionManager } from './utils/ReactionManager';
import { ErrorBoundary } from './utils/ErrorBoundary';

const errorBoundary = new ErrorBoundary();
errorBoundary.init();

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
const app = document.querySelector('#app');

// Global managers
const toastManager = new ToastManager();
let reactionManager = null;

// Initialization
let userId = storage.getUserId();
let displayName = storage.getDisplayName(userId);
const roomId = new URLSearchParams(window.location.search).get('room');

const roomManager = new RoomManager(API_URL, userId, displayName);

// Track cleanup for event listeners
let cleanupRender = null;
let lastSource = null;
let lastEnteredTheater = false;

// Save YouTube player state before re-render
let _savedYouTubeState = null;

const cleanup = () => {
  if (cleanupRender) {
    cleanupRender();
    cleanupRender = null;
  }
  if (roomManager.syncEngine) {
    roomManager.syncEngine.cleanup();
  }
  roomManager.destroy();
  lastSource = null;
  lastEnteredTheater = false;
  _savedYouTubeState = null;
};

const render = () => {
  if (roomId) {
    const currentSource = roomManager.syncEngine ? roomManager.syncEngine.currentSource : null;
    const currentSourceValue = roomManager.syncEngine ? roomManager.syncEngine.currentSourceValue : null;
    const hasEnteredTheater = roomManager.hasEnteredTheater;
    
    console.log('[render] Rendering, hasEnteredTheater:', hasEnteredTheater, 'currentSource:', currentSource);
    
    // Render the new HTML
    app.innerHTML = RoomUI.render(roomId, roomManager.participants, userId, currentSource, currentSourceValue, hasEnteredTheater, roomManager.isReconnecting);
    
    const container = document.getElementById('video-container');
    const lobbyView = document.querySelector('[data-lobby]');
    console.log('[render] Container exists:', !!container, 'Lobby exists:', !!lobbyView);
    console.log('[render] Active view:', RoomUI.currentTab);
    
    // Cleanup previous render listeners before setting new ones
    if (cleanupRender) {
      cleanupRender();
    }
    cleanupRender = RoomUI.initListeners(roomManager, render);

    // Apply any pending source now that the container should exist in the DOM
    if (roomManager.syncEngine && roomManager.syncEngine.tryApplyPendingSource) {
      roomManager.syncEngine.tryApplyPendingSource();
    }
    
    // Update lastSource to match current source (handles case where source was applied via _pendingSource)
    if (roomManager.syncEngine && roomManager.syncEngine.currentSource) {
      lastSource = roomManager.syncEngine.currentSource;
    }
    
    // Re-attach player if it already existed (handles full re-renders)
    if (currentSource && roomManager.syncEngine) {
      roomManager.syncEngine.loadSource(currentSource, currentSourceValue);
      
      // If we had saved YouTube state, restore playback position
      if (currentSource === 'youtube' && _savedYouTubeState && _savedYouTubeState.currentTime > 0) {
        const player = roomManager.syncEngine.player;
        if (player && player.seek) {
          setTimeout(() => {
            player.seek(_savedYouTubeState.currentTime);
            if (!_savedYouTubeState.isPaused && player.play) {
              player.play();
            }
            _savedYouTubeState = null;
          }, 500);
        }
      }
    }
    
    // Always update state tracking after render
    lastSource = currentSource;
    lastEnteredTheater = hasEnteredTheater;
    
    roomManager.onStateChange = (participants) => {
      const newSource = roomManager.syncEngine ? roomManager.syncEngine.currentSource : null;
      const newEnteredTheater = roomManager.hasEnteredTheater;
      
      // Use syncEngine.lastSource for comparison - this is updated when source is applied
      const trackLastSource = roomManager.syncEngine ? roomManager.syncEngine.lastSource : lastSource;
      const sourceChanged = newSource !== trackLastSource;
      const theaterChanged = newEnteredTheater !== lastEnteredTheater;
      
      console.log('[onStateChange] Called - source:', newSource, 'theater:', newEnteredTheater);
      console.log('[onStateChange] sourceChanged:', sourceChanged, 'theaterChanged:', theaterChanged, 'trackLastSource:', trackLastSource, 'lastEnteredTheater:', lastEnteredTheater);
      console.log('[onStateChange] Participants:', participants?.length);
      
      // Skip if nothing actually changed (participant joins don't need re-render)
      if (!sourceChanged && !theaterChanged) {
        console.log('[onStateChange] Skipping re-render - no changes');
        return;
      }
      
      // Save YouTube player state before re-render
      if (newSource === 'youtube' && roomManager.syncEngine && roomManager.syncEngine.player) {
        const player = roomManager.syncEngine.player;
        _savedYouTubeState = {
          videoId: roomManager.syncEngine.currentSourceValue,
          currentTime: player.getCurrentTime ? player.getCurrentTime() : 0,
          isPaused: player.isPaused ? player.isPaused() : true
        };
        console.log('[onStateChange] Saved YouTube state:', _savedYouTubeState);
      } else {
        _savedYouTubeState = null;
      }
      
      // Re-render if source OR hasEnteredTheater changed
      if (sourceChanged || theaterChanged) {
        console.log('[onStateChange] Triggering re-render due to:', sourceChanged ? 'source change' : 'theater change');
        render(); 
      } else {
        console.log('[onStateChange] Skipping re-render - participant change only');
      }
    };
    
    roomManager.onChatMessage = (userId, displayName, message, timestamp, isMe) => {
      RoomUI.addChatMessage(userId, displayName, message, timestamp, isMe);
    };

    roomManager.onConnectionChange = (isReconnecting) => {
      if (isReconnecting) {
        toastManager.show('Reconnecting...', { type: 'warning', duration: 0 });
      } else {
        toastManager.dismissAll();
        toastManager.show('Reconnected', { type: 'success', duration: 2000 });
      }
      render();
    };

    roomManager.onUserJoined = (user) => {
      if (user.userId === roomManager.userId) return;
      toastManager.show(`${user.displayName} joined`, { type: 'user', icon: 'person_add' });
    };

    roomManager.onUserLeft = (user) => {
      if (!user || user.userId === roomManager.userId) return;
      toastManager.show(`${user.displayName} left`, { type: 'info', icon: 'person_off' });
    };

    // Reaction manager
    if (!reactionManager) {
      reactionManager = new ReactionManager('video-stage', (emojiId) => {
        roomManager.sendReaction(emojiId);
      });
    }

    roomManager.onReactionToggle = () => {
      reactionManager.toggle();
    };

    roomManager.onReaction = (data) => {
      reactionManager.handleRemoteReaction(data);
    };

    roomManager.onSpeakingChange = () => {
      // Update speaking indicators without full re-render
      const peoplePanel = document.getElementById('people-panel');
      if (peoplePanel && RoomUI.currentTab === 'people') {
        peoplePanel.innerHTML = RoomUI.renderPeopleView(roomManager.participants, userId);
      }
      // Also update desktop sidebar if visible
      const chatPanel = document.getElementById('chat-panel');
      if (chatPanel && RoomUI.currentTab === 'chat') {
        // Speaking indicators only in people panel, skip
      }
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
            storage.setUserId(userId);
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
              body: JSON.stringify({ participantName: finalName, participantId: userId })
            });
            const data = await res.json();
            
            if (data.participantId) {
              userId = data.participantId;
              storage.setUserId(userId);
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
