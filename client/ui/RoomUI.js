export const RoomUI = {
  currentTab: 'watch', // 'watch' | 'chat' | 'people' | 'settings' | 'source'
  seekAnimationFrame: null,
  chatMessages: [],

  render: (roomId, participants, userId, currentSource) => {
    const isLobby = !currentSource;
    const isHost = participants.find(p => p.userId === userId || p.id === userId)?.isHost;
    
    // If we are in lobby but on 'watch' tab, show lobby
    const activeView = isLobby ? 'lobby' : RoomUI.currentTab;

    return `
      <div class="bg-surface font-body text-on-surface overflow-x-hidden selection:bg-primary/30 min-h-screen flex flex-col">
        <!-- TopAppBar -->
        <header class="fixed top-0 w-full z-50 bg-[#131314]/80 backdrop-blur-md flex justify-between items-center px-4 h-16 border-b border-white/5">
          <div class="flex items-center gap-4">
            <button id="btnBackToLobby" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#353436] transition-colors scale-95 active:duration-100 text-[#c0c1ff]">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 class="font-['Inter'] tracking-[-0.02em] font-bold text-[1.125rem] text-[#c0c1ff] truncate max-w-[180px]">
              ${activeView === 'settings' ? 'Settings' : activeView === 'source' ? 'Select Source' : 'Midnight Movie Night'}
            </h1>
          </div>
          <div class="flex items-center gap-2">
            <div id="btnCopyRoomCode" class="hidden sm:flex items-center bg-surface-container-high px-3 py-1.5 rounded-xl gap-2 hover:bg-surface-container-highest transition-all cursor-pointer group">
              <span class="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant">Code: ${roomId}</span>
              <span class="material-symbols-outlined text-sm text-primary">content_copy</span>
            </div>
            <button id="btnOpenSettings" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#353436] transition-colors scale-95 active:duration-100 text-[#c0c1ff]">
              <span class="material-symbols-outlined">settings</span>
            </button>
          </div>
        </header>

        <main class="flex-1 mt-16 mb-24 overflow-y-auto">
          ${RoomUI.renderView(activeView, roomId, participants, userId, currentSource, isHost)}
        </main>

        <!-- BottomNavBar -->
        <nav class="fixed bottom-0 left-0 w-full flex justify-around items-center h-20 pb-safe bg-[#131314]/90 backdrop-blur-xl rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)] z-50 border-t border-white/5">
          <button data-tab="watch" class="flex flex-col items-center justify-center ${activeView === 'watch' || activeView === 'lobby' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-[#e5e2e3]/60'} rounded-xl px-3 py-1 transition-all duration-200">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'watch' || activeView === 'lobby' ? 1 : 0};">movie</span>
            <span class="font-['Inter'] text-[0.6875rem] uppercase tracking-widest font-medium mt-1">${isLobby ? 'Lobby' : 'Watch'}</span>
          </button>
          <button data-tab="chat" class="flex flex-col items-center justify-center ${activeView === 'chat' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-[#e5e2e3]/60'} rounded-xl px-3 py-1 transition-all duration-200">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'chat' ? 1 : 0};">chat_bubble</span>
            <span class="font-['Inter'] text-[0.6875rem] uppercase tracking-widest font-medium mt-1">Chat</span>
          </button>
          <button data-tab="people" class="flex flex-col items-center justify-center ${activeView === 'people' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-[#e5e2e3]/60'} rounded-xl px-3 py-1 transition-all duration-200">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'people' ? 1 : 0};">group</span>
            <span class="font-['Inter'] text-[0.6875rem] uppercase tracking-widest font-medium mt-1">People</span>
          </button>
          ${isHost ? `
            <button id="btnOpenSource" class="flex flex-col items-center justify-center ${activeView === 'source' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-[#e5e2e3]/60'} rounded-xl px-3 py-1 transition-all duration-200">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'source' ? 1 : 0};">add_to_queue</span>
              <span class="font-['Inter'] text-[0.6875rem] uppercase tracking-widest font-medium mt-1">Source</span>
            </button>
          ` : `
            <button id="btnInvite" class="flex flex-col items-center justify-center text-[#e5e2e3]/60 hover:text-[#c0c1ff] transition-all duration-200">
              <span class="material-symbols-outlined">person_add</span>
              <span class="font-['Inter'] text-[0.6875rem] uppercase tracking-widest font-medium mt-1">Invite</span>
            </button>
          `}
        </nav>
      </div>
    `;
  },

  renderView: (view, roomId, participants, userId, currentSource, isHost) => {
    switch (view) {
      case 'lobby': return RoomUI.renderLobbyView(participants, userId, roomId);
      case 'watch': return RoomUI.renderWatchView(currentSource, participants, userId);
      case 'chat': return RoomUI.renderChatView(participants, userId);
      case 'people': return RoomUI.renderPeopleView(participants, userId);
      case 'settings': return RoomUI.renderSettingsView(participants, userId);
      case 'source': return RoomUI.renderSourceView();
      default: return RoomUI.renderLobbyView(participants, userId, roomId);
    }
  },

  renderLobbyView: (participants, userId, roomId) => {
    return `
      <div class="px-6 pt-8 pb-12">
        <!-- Hero Section / Cinema Stage -->
        <section class="mb-12">
          <div class="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-surface-container-lowest border border-white/5">
            <img alt="Lobby" class="w-full h-full object-cover opacity-40" src="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800"/>
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span class="material-symbols-outlined text-primary text-5xl mb-2" style="font-variation-settings: 'FILL' 1;">theater_comedy</span>
              <span class="text-[0.6875rem] uppercase tracking-widest text-primary font-bold">Waiting for Host</span>
            </div>
          </div>
          <h2 class="text-4xl font-extrabold tracking-tighter text-on-surface mb-2 leading-none">The Lobby</h2>
          <p class="text-on-surface-variant text-sm leading-relaxed">Prepare for a cinematic journey. We'll begin as soon as the commander gives the signal.</p>
        </section>

        <!-- Participant Grid -->
        <section class="mb-12">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-on-surface">The Crew</h3>
            <span class="text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">${participants.length} Active</span>
          </div>
          <div id="lobbyParticipantGrid" class="grid grid-cols-2 gap-4">
            ${RoomUI.renderLobbyParticipants(participants, userId)}
          </div>
        </section>

        <!-- Connectivity Indicators -->
        <section class="flex flex-col items-center gap-2 mb-10">
          <div class="flex items-center gap-4 bg-surface-container-highest/30 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/10">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></div>
              <span class="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Live Sync Enabled</span>
            </div>
            <div class="w-[1px] h-3 bg-outline-variant/30"></div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-on-surface-variant">signal_cellular_alt</span>
              <span class="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Connected</span>
            </div>
          </div>
        </section>

        <!-- Primary CTA -->
        <section class="px-2">
          <button class="bg-gradient-to-br from-primary to-primary-container w-full py-5 rounded-xl text-on-primary-container font-black tracking-widest uppercase text-sm shadow-[0_8px_24px_rgba(128,131,255,0.3)] active:scale-95 transition-transform">
            Ready to Watch
          </button>
        </section>
      </div>
    `;
  },

  renderWatchView: (currentSource, participants, userId) => {
    return `
      <div class="flex flex-col min-h-full">
        <!-- Video Player Section (The Stage) -->
        <section class="relative w-full aspect-video bg-surface-container-lowest overflow-hidden border-b border-white/5">
          <div id="video-container" class="w-full h-full relative z-0 flex items-center justify-center">
            <!-- Video injected here -->
          </div>
          
          <!-- Video Overlays -->
          <div id="video-controls" class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 opacity-0 transition-opacity duration-300">
            <!-- Floating Reactions Overlay -->
            <div id="reactions-container" class="absolute right-4 bottom-16 flex flex-col gap-2 pointer-events-none"></div>
            
            <!-- Custom Seekbar -->
            <div class="group/seek w-full h-1 bg-white/20 rounded-full mb-4 relative cursor-pointer overflow-visible">
              <div id="seek-progress" class="absolute left-0 top-0 h-full w-0 bg-primary rounded-full flex items-center justify-end">
                <div class="w-3 h-3 bg-primary rounded-full shadow-lg scale-0 group-hover/seek:scale-100 transition-transform translate-x-1/2"></div>
              </div>
            </div>
            
            <!-- Basic Controls Row -->
            <div class="flex items-center justify-between text-on-surface">
              <div class="flex items-center gap-4">
                <span id="btnBottomPlayPause" class="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">play_arrow</span>
                <div class="flex items-center gap-2 group/vol">
                  <span id="btnMuteToggle" class="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">volume_up</span>
                  <input type="range" id="volume-slider" min="0" max="100" value="100" class="w-0 group-hover/vol:w-20 transition-all accent-white appearance-none h-1 bg-white/20 rounded-full cursor-pointer">
                </div>
                <span class="text-[10px] font-mono opacity-80" id="video-time-display">00:00 / 00:00</span>
              </div>
              <div class="flex items-center gap-4">
                <span id="btnFullscreen" class="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">fullscreen</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Movie Details & Status Section -->
        <section class="p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 px-3 py-1 bg-tertiary/10 border border-tertiary/20 rounded-full">
                <span class="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.4)]"></span>
                <span class="text-[0.6875rem] font-medium tracking-widest uppercase text-tertiary">Live Sync Enabled</span>
              </div>
            </div>
            <div id="participantSmallGrid" class="flex -space-x-2">
              ${participants.slice(0, 3).map(p => `
                <div class="w-8 h-8 rounded-full border-2 border-surface overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                  ${p.displayName.charAt(0)}
                </div>
              `).join('')}
              ${participants.length > 3 ? `<div class="w-8 h-8 rounded-full border-2 border-surface overflow-hidden bg-surface-container-high flex items-center justify-center text-[0.6rem] font-bold">+${participants.length - 3}</div>` : ''}
            </div>
          </div>

          <div class="space-y-2">
            <h2 class="text-5xl font-extrabold tracking-tighter text-on-surface leading-[1.1]">
              ${currentSource === 'local' ? 'Local Video' : currentSource === 'youtube' ? 'YouTube' : 'Screen Share'}
            </h2>
            <div class="flex items-center gap-3 text-on-surface-variant text-[0.6875rem] font-medium tracking-widest uppercase">
              <span id="live-badge" class="text-error font-bold flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span> LIVE
              </span>
              <span class="w-1 h-1 rounded-full bg-on-surface-variant/30"></span>
              <span>Cinema Mode</span>
            </div>
            <p class="text-sm leading-relaxed text-on-surface-variant max-w-lg pt-2">
              Enjoy the show with your crew. Use the chat to discuss scenes in real-time.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 pt-4">
            <button data-tab="chat" class="bg-surface-container-low rounded-xl p-4 flex items-center justify-between hover:bg-surface-container transition-colors group">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined">chat_bubble</span>
                </div>
                <div class="text-left">
                  <p class="text-sm font-semibold">Active Discussion</p>
                  <p class="text-[0.6875rem] text-on-surface-variant truncate max-w-[200px]" id="lastChatMessage">No messages yet...</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
          </div>
        </section>
      </div>
    `;
  },

  renderChatView: (participants, userId) => {
    return `
      <div class="flex flex-col h-[calc(100vh-160px)] px-4 py-6">
        <div id="chatMessages" class="flex-1 overflow-y-auto flex flex-col gap-6 custom-scrollbar no-scrollbar">
          <div class="flex justify-center">
            <span class="text-[11px] uppercase tracking-[0.05em] font-medium text-on-surface-variant/40 bg-surface-container/50 px-3 py-1 rounded-full">
              Cinema discussion started
            </span>
          </div>
          ${RoomUI.chatMessages.map(msg => RoomUI.renderMessageHtml(msg, userId)).join('')}
        </div>
        
        <footer class="mt-4 pb-4">
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <button class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-xl">mood</span>
              </button>
              <input id="inputChatMessage" class="w-full bg-surface-container h-12 pl-11 pr-4 rounded-full border-none focus:ring-1 focus:ring-primary/20 text-sm placeholder:text-on-surface-variant/40 transition-all text-on-surface" placeholder="Type a message..." type="text"/>
            </div>
            <button id="btnSendChat" class="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_4px_16px_rgba(128,131,255,0.4)] active:scale-90 transition-transform">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">send</span>
            </button>
          </div>
        </footer>
      </div>
    `;
  },

  renderPeopleView: (participants, userId) => {
    return `
      <div class="px-6 py-8 space-y-10 max-w-md mx-auto w-full">
        <section class="space-y-6">
          <div class="flex items-center space-x-2">
            <span class="material-symbols-outlined text-primary text-xl">group</span>
            <h2 class="text-[15px] font-bold tracking-tight uppercase text-on-surface">The Crew (${participants.length})</h2>
          </div>
          <div id="participantGrid" class="space-y-4">
            ${participants.map(p => `
              <div class="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between group">
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <div class="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-2xl font-bold text-primary border-2 ${p.isSpeaking ? 'border-tertiary shadow-[0_0_12px_rgba(78,222,163,0.4)] animate-pulse' : 'border-white/5'}">
                      ${p.displayName.charAt(0)}
                    </div>
                    ${p.isSpeaking ? `
                      <div class="absolute -bottom-1 -right-1 bg-tertiary rounded-full p-1 border-2 border-surface">
                        <span class="material-symbols-outlined text-[10px] text-on-tertiary" style="font-variation-settings: 'FILL' 1;">mic</span>
                      </div>
                    ` : ''}
                  </div>
                  <div>
                    <p class="font-bold text-on-surface">${p.displayName}${p.userId === userId || p.id === userId ? ' (You)' : ''}</p>
                    <p class="text-[10px] uppercase tracking-widest ${p.isSpeaking ? 'text-tertiary font-bold' : 'text-on-surface-variant/60'}">
                      ${p.isHost ? 'Commander' : 'Crew Member'}
                    </p>
                  </div>
                </div>
                ${p.isHost ? `<span class="material-symbols-outlined text-primary">verified</span>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
        
        <section class="fixed bottom-24 left-0 w-full px-6">
          <button id="btnInvitePeople" class="bg-surface-container-low border border-white/5 w-full py-5 rounded-xl text-on-surface font-bold tracking-widest uppercase text-xs active:scale-95 transition-transform flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-sm text-primary">person_add</span>
            Invite Guest
          </button>
        </section>
      </div>
    `;
  },

  renderSettingsView: (participants, userId) => {
    const me = participants.find(p => p.userId === userId || p.id === userId);
    return `
      <div class="px-4 py-6 space-y-10 max-w-md mx-auto w-full pb-32">
        <section class="space-y-6">
          <div class="flex flex-col items-center">
            <div class="relative group">
              <div class="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-primary-container">
                <div class="w-full h-full rounded-full border-4 border-background bg-surface-container-high flex items-center justify-center text-4xl font-bold text-primary uppercase">
                  ${me?.displayName?.charAt(0) || '?'}
                </div>
              </div>
              <button class="absolute bottom-0 right-0 bg-primary-container text-on-primary-container p-1.5 rounded-full shadow-lg active:scale-90 transition-transform">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
          </div>
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="text-[11px] font-medium uppercase tracking-widest text-on-surface-variant ml-1">Display Name</label>
              <input id="inputSettingsDisplayName" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-container/40 placeholder-on-surface-variant/30" type="text" value="${me?.displayName || ''}"/>
            </div>
            <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
              <div class="space-y-0.5">
                <p class="text-[14px] font-semibold text-on-surface">Cinematic Observer</p>
                <p class="text-[11px] text-on-surface-variant">Minimize UI during playback automatically</p>
              </div>
              <button class="w-12 h-6 rounded-full bg-primary relative transition-colors duration-300">
                <div class="absolute right-1 top-1 w-4 h-4 bg-on-primary-container rounded-full shadow-sm"></div>
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-6">
          <div class="flex items-center space-x-2">
            <span class="material-symbols-outlined text-primary text-xl">tune</span>
            <h2 class="text-[15px] font-bold tracking-tight uppercase text-on-surface">Audio & Video</h2>
          </div>
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-[11px] font-medium uppercase tracking-widest text-on-surface-variant ml-1">Input Device</label>
              <div class="flex p-1 bg-surface-container-lowest rounded-xl">
                <button class="flex-1 py-2 text-xs font-semibold bg-surface-container-high text-primary rounded-lg shadow-sm">System Default</button>
                <button class="flex-1 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors">External Mic</button>
              </div>
            </div>
            <div class="space-y-4">
              <div class="flex justify-between items-end">
                <label class="text-[11px] font-medium uppercase tracking-widest text-on-surface-variant ml-1">Mic Sensitivity</label>
                <span class="text-[11px] font-bold text-tertiary flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></span> ACTIVE
                </span>
              </div>
              <input class="w-full h-1 bg-surface-container-highest rounded-full appearance-none accent-primary cursor-pointer" type="range"/>
            </div>
          </div>
        </section>

        <section class="space-y-4 pt-4 border-t border-white/5">
          <button id="btnSaveSettings" class="bg-primary text-on-primary w-full py-4 rounded-xl font-bold tracking-widest uppercase text-sm active:scale-95 transition-transform shadow-lg shadow-primary/20">
            Save Changes
          </button>
          <button id="btnLeaveRoom" class="bg-error/10 text-error w-full py-4 rounded-xl font-bold tracking-widest uppercase text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-sm">logout</span>
            Leave Room
          </button>
        </section>
      </div>
    `;
  },

  renderSourceView: () => {
    return `
      <div class="px-6 max-w-md mx-auto h-full flex flex-col justify-center min-h-[calc(100vh-160px)]">
        <div class="mb-10">
          <span class="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-primary mb-2 block font-headline">Choose Your Stage</span>
          <h2 class="text-[3.5rem] font-bold leading-none tracking-tighter text-on-surface font-headline">Source.</h2>
        </div>
        
        <div class="space-y-4 mb-10">
          <button data-source-type="youtube" class="w-full group relative flex items-center justify-between p-6 bg-surface-container-low rounded-xl overflow-hidden active:scale-[0.98] transition-all duration-200">
            <div class="flex items-center gap-4 z-10 text-left">
              <div class="bg-surface-container-highest p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary">movie</span>
              </div>
              <div>
                <div class="text-on-surface font-semibold text-lg">YouTube</div>
                <div class="text-on-surface-variant text-sm">Stream from your favorite creators</div>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
          </button>

          <button data-source-type="screen" class="w-full group relative flex items-center justify-between p-6 bg-surface-container-low rounded-xl overflow-hidden active:scale-[0.98] transition-all duration-200">
            <div class="flex items-center gap-4 z-10 text-left">
              <div class="bg-surface-container-highest p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary">screen_share</span>
              </div>
              <div>
                <div class="text-on-surface font-semibold text-lg">Screen Share</div>
                <div class="text-on-surface-variant text-sm">Broadcast your desktop or tab</div>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
          </button>

          <button id="btnLocalFile" class="w-full group relative flex items-center justify-between p-6 bg-surface-container-low rounded-xl overflow-hidden active:scale-[0.98] transition-all duration-200">
            <div class="flex items-center gap-4 z-10 text-left">
              <div class="bg-surface-container-highest p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary">upload_file</span>
              </div>
              <div>
                <div class="text-on-surface font-semibold text-lg">Local File</div>
                <div class="text-on-surface-variant text-sm">Sync media from your device</div>
              </div>
            </div>
            <input type="file" id="inputLocalFile" class="hidden" accept="video/*">
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
          </button>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col gap-1">
            <label class="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-on-surface-variant ml-1 font-headline">Direct URL</label>
            <div class="relative">
              <input id="inputSourceUrl" class="w-full h-14 bg-surface-container-lowest border-none rounded-xl px-4 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all outline-none" placeholder="https://youtube.com/watch?v=..." type="text"/>
              <span class="absolute right-4 top-4 material-symbols-outlined text-on-surface-variant/40">link</span>
            </div>
          </div>
          <button id="btnStartWatching" class="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10">
            <span>Start Watching</span>
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
          </button>
        </div>
      </div>
    `;
  },

  renderLobbyParticipants: (participants, userId) => {
    return participants.map(p => `
      <div class="bg-surface-container-low p-4 rounded-xl flex flex-col items-center text-center group">
        <div class="relative mb-3">
          <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-2xl font-bold text-primary border-2 ${p.isSpeaking ? 'border-tertiary shadow-[0_0_12px_rgba(78,222,163,0.4)] animate-pulse' : 'border-white/5'} uppercase transition-all duration-300">
            ${p.displayName.charAt(0)}
          </div>
          ${p.isSpeaking ? `
            <div class="absolute -bottom-1 -right-1 bg-tertiary rounded-full p-1 border-2 border-surface">
              <span class="material-symbols-outlined text-[12px] text-on-tertiary" style="font-variation-settings: 'FILL' 1;">mic</span>
            </div>
          ` : ''}
        </div>
        <span class="text-sm font-bold text-on-surface truncate w-full">${p.displayName}</span>
        <div class="flex items-center gap-1 mt-1">
          ${p.isHost ? `<span class="bg-primary/20 text-primary text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">Host</span>` : ''}
          <span class="${p.isSpeaking ? 'text-tertiary' : 'text-on-surface-variant/40'} text-[8px] font-bold uppercase">${p.isSpeaking ? 'Speaking' : 'Ready'}</span>
        </div>
      </div>
    `).join('');
  },

  renderMessageHtml: (msg, userId) => {
    const isMe = msg.userId === userId || msg.id === userId;
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isMe) {
      return `
        <div class="flex flex-col items-end gap-1.5 self-end max-w-[85%]">
          <div class="bg-primary-container text-on-primary-container px-4 py-3 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-[0_8px_24px_rgba(128,131,255,0.2)]">
            <p class="text-[14px] font-medium leading-relaxed">${msg.message}</p>
          </div>
          <div class="flex items-center gap-1 mr-1">
            <span class="text-[10px] font-medium text-outline/50">${timeStr}</span>
            <span class="material-symbols-outlined text-[12px] text-tertiary" style="font-variation-settings: 'FILL' 1;">done_all</span>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="flex items-end gap-3 max-w-[85%] group">
        <div class="flex-shrink-0 relative">
          <div class="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden ring-2 ring-white/5 ring-offset-2 ring-offset-background flex items-center justify-center text-xs font-bold text-primary uppercase">
            ${msg.displayName.charAt(0)}
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant/60 ml-1">${msg.displayName}</span>
          <div class="bg-surface-container-low text-on-surface px-4 py-3 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-lg border border-white/5">
            <p class="text-[14px] leading-relaxed">${msg.message}</p>
          </div>
          <span class="text-[10px] font-medium text-outline/50 ml-1">${timeStr}</span>
        </div>
      </div>
    `;
  },

  initListeners: (roomManager) => {
    // Tab Switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-tab');
        if (tab !== RoomUI.currentTab) {
          RoomUI.currentTab = tab;
          // Trigger a re-render in main.js
          if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
        }
      };
    });

    // Logo / Back logic
    const btnBack = document.querySelector('#btnBackToLobby');
    if (btnBack) {
      btnBack.onclick = () => {
        if (RoomUI.currentTab !== 'watch' && roomManager.syncEngine?.currentSource) {
          RoomUI.currentTab = 'watch';
        } else {
          window.location.href = '/';
        }
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    // Settings Toggle
    const btnOpenSettings = document.querySelector('#btnOpenSettings');
    if (btnOpenSettings) {
      btnOpenSettings.onclick = () => {
        RoomUI.currentTab = 'settings';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    // Source Toggle
    const btnOpenSource = document.querySelector('#btnOpenSource');
    if (btnOpenSource) {
      btnOpenSource.onclick = () => {
        RoomUI.currentTab = 'source';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    // Room Code Copy
    const btnCopy = document.querySelector('#btnCopyRoomCode');
    if (btnCopy) {
      btnCopy.onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        const text = btnCopy.querySelector('span:first-child');
        const original = text.textContent;
        text.textContent = 'COPIED!';
        setTimeout(() => text.textContent = original, 2000);
      };
    }

    // Invite Button (fallback)
    const btnInvite = document.querySelector('#btnInvite') || document.querySelector('#btnInvitePeople');
    if (btnInvite) {
      btnInvite.onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Room link copied to clipboard!');
      };
    }

    // Settings Functionality
    const btnSaveSettings = document.querySelector('#btnSaveSettings');
    const inputDisplayName = document.querySelector('#inputSettingsDisplayName');
    if (btnSaveSettings && inputDisplayName) {
      btnSaveSettings.onclick = () => {
        const newName = inputDisplayName.value.trim();
        if (newName) {
          roomManager.updateDisplayName(newName);
          RoomUI.currentTab = 'watch';
          if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
        }
      };
    }

    const btnLeaveRoom = document.querySelector('#btnLeaveRoom');
    if (btnLeaveRoom) {
      btnLeaveRoom.onclick = () => window.location.href = '/';
    }

    // Source Selection Functionality
    const btnStartWatching = document.querySelector('#btnStartWatching');
    const inputUrl = document.querySelector('#inputSourceUrl');
    if (btnStartWatching && inputUrl) {
      btnStartWatching.onclick = () => {
        const url = inputUrl.value.trim();
        if (!url) return;
        let source = 'url';
        let value = url;
        const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          source = 'youtube';
          value = ytMatch[1];
        }
        RoomUI.currentTab = 'watch';
        roomManager.syncEngine.changeSource(source, value, roomManager.roomId);
      };
    }

    document.querySelectorAll('[data-source-type]').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-source-type');
        if (type === 'screen') {
          RoomUI.currentTab = 'watch';
          roomManager.startScreenShare();
        } else if (type === 'youtube') {
          inputUrl.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          inputUrl.focus();
        }
      };
    });

    const btnLocalFile = document.querySelector('#btnLocalFile');
    const inputLocalFile = document.querySelector('#inputLocalFile');
    if (btnLocalFile && inputLocalFile) {
      btnLocalFile.onclick = () => {
        inputLocalFile.value = '';
        inputLocalFile.click();
      };
      inputLocalFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          RoomUI.currentTab = 'watch';
          roomManager.syncEngine.changeSource('local', url, roomManager.roomId);
        }
      };
    }

    // Chat Functionality
    const btnSendChat = document.querySelector('#btnSendChat');
    const inputChat = document.querySelector('#inputChatMessage');
    if (btnSendChat && inputChat) {
      const sendMsg = () => {
        const msg = inputChat.value.trim();
        if (msg) {
          roomManager.sendChatMessage(msg);
          inputChat.value = '';
        }
      };
      btnSendChat.onclick = sendMsg;
      inputChat.onkeypress = (e) => { if (e.key === 'Enter') sendMsg(); };
    }

    // Video Controls
    const videoControls = document.querySelector('#video-controls');
    const videoSection = document.querySelector('#video-container')?.parentElement;
    if (videoSection && videoControls) {
      let hideTimeout;
      const showControls = () => {
        videoControls.classList.remove('opacity-0');
        videoControls.classList.add('opacity-100');
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          videoControls.classList.remove('opacity-100');
          videoControls.classList.add('opacity-0');
        }, 3000);
      };
      videoSection.onclick = showControls;
      videoSection.onmousemove = showControls;
    }

    const btnPlayPause = document.querySelector('#btnBottomPlayPause');
    if (btnPlayPause) {
      btnPlayPause.onclick = (e) => {
        e.stopPropagation();
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;
        if (roomManager.syncEngine.player) {
          const isPaused = roomManager.syncEngine.player.isPaused();
          if (isPaused) roomManager.syncEngine.player.play();
          else roomManager.syncEngine.player.pause();
        }
      };
    }

    const btnMuteToggle = document.querySelector('#btnMuteToggle');
    const volumeSlider = document.querySelector('#volume-slider');
    if (btnMuteToggle && volumeSlider) {
      btnMuteToggle.onclick = (e) => {
        e.stopPropagation();
        const player = roomManager.syncEngine.player;
        if (player) {
          const isMuted = player.video ? player.video.muted : false;
          if (player.video) player.video.muted = !isMuted;
          btnMuteToggle.textContent = !isMuted ? 'volume_off' : 'volume_up';
        }
      };
      volumeSlider.oninput = (e) => {
        const val = e.target.value / 100;
        roomManager.syncEngine.player?.setVolume(val);
      };
    }

    // Seek Logic
    const seekProgress = document.querySelector('#seek-progress');
    const seekContainer = seekProgress?.parentElement;
    if (seekContainer) {
      seekContainer.onclick = (e) => {
        e.stopPropagation();
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;
        const rect = seekContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const player = roomManager.syncEngine.player;
        if (player) {
          const duration = player.getDuration();
          if (duration) {
            const newTime = pos * duration;
            player.seek(newTime);
            roomManager.syncEngine.onPlayerEvent('seek', { time: newTime });
          }
        }
      };
    }

    // Periodic UI Updates
    if (RoomUI.seekAnimationFrame) cancelAnimationFrame(RoomUI.seekAnimationFrame);
    const updateUI = () => {
      const player = roomManager.syncEngine?.player;
      if (player && seekProgress) {
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration) {
          const percent = (current / duration) * 100;
          seekProgress.style.width = `${percent}%`;
          const display = document.querySelector('#video-time-display');
          if (display) {
            const format = (s) => new Date(s * 1000).toISOString().substr(11, 8);
            display.textContent = `${format(current)} / ${format(duration)}`;
          }
        }
      }
      if (roomManager.roomId) RoomUI.seekAnimationFrame = requestAnimationFrame(updateUI);
    };
    updateUI();

    // Player Event listener for icons
    if (roomManager.syncEngine && !roomManager.syncEngine._uiListenerAttached) {
      roomManager.syncEngine._uiListenerAttached = true;
      const originalOnPlayerEvent = roomManager.syncEngine.onPlayerEvent.bind(roomManager.syncEngine);
      roomManager.syncEngine.onPlayerEvent = (type, data) => {
        originalOnPlayerEvent(type, data);
        const icon = document.querySelector('#btnBottomPlayPause');
        if (icon) icon.textContent = type === 'play' ? 'pause' : 'play_arrow';
      };
    }
  },

  updateParticipants: (participants, userId) => {
    // For mobile, most participants updates are handled by re-rendering the whole view
    // through the roomManager.onStateChange loop in main.js
  },

  addChatMessage: (userId, displayName, message, timestamp, isMe) => {
    const msg = { userId, displayName, message, timestamp, isMe };
    RoomUI.chatMessages.push(msg);
    
    // Update "last message" preview in watch view
    const lastMsgPreview = document.querySelector('#lastChatMessage');
    if (lastMsgPreview) {
      lastMsgPreview.textContent = `${displayName}: "${message}"`;
    }

    // Append to history if in chat tab
    const chatContainer = document.querySelector('#chatMessages');
    if (chatContainer) {
      const html = RoomUI.renderMessageHtml(msg, userId);
      chatContainer.insertAdjacentHTML('beforeend', html);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  },

  showReaction: (data) => {
    const container = document.querySelector('#reactions-container');
    if (!container) return;
    const reaction = document.createElement('div');
    reaction.className = 'bg-white/10 backdrop-blur-md rounded-full p-2 text-xl animate-bounce';
    reaction.textContent = data.emojiId;
    container.appendChild(reaction);
    setTimeout(() => reaction.remove(), 2000);
  }
};
