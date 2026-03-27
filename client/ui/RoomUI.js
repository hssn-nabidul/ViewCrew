export const RoomUI = {
  currentTab: 'watch', // 'watch' | 'chat' | 'people' | 'settings' | 'source'
  seekAnimationFrame: null,
  chatMessages: [],

  render: (roomId, participants, userId, currentSource) => {
    const isLobby = !currentSource;
    const isHost = participants.find(p => p.userId === userId || p.id === userId)?.isHost;
    
    // Determine which view to show
    let activeView = RoomUI.currentTab;
    if (isLobby && activeView === 'watch') activeView = 'lobby';

    return `
      <div class="bg-surface font-body text-on-surface overflow-x-hidden selection:bg-primary/30 min-h-screen flex flex-col">
        <!-- TopAppBar -->
        <header class="fixed top-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-[#131314] border-b border-white/5">
          <div class="flex items-center gap-4">
            <button id="btnBackToLobby" class="text-[#c0c1ff] hover:bg-surface-container-high transition-colors active:scale-95 duration-200 p-2 rounded-full">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 class="font-['Inter'] tracking-tight font-bold text-on-surface text-lg truncate max-w-[200px]">
              ${activeView === 'settings' ? 'Settings' : activeView === 'source' ? 'Select Source' : 'Movie Night: Interstellar'}
            </h1>
          </div>
          <button id="btnOpenSettings" class="text-[#c0c1ff] hover:bg-surface-container-high transition-colors active:scale-95 duration-200 p-2 rounded-full">
            <span class="material-symbols-outlined">settings</span>
          </button>
        </header>

        <main class="flex-1 flex flex-col pt-16 pb-24 overflow-y-auto">
          ${RoomUI.renderView(activeView, roomId, participants, userId, currentSource, isHost)}
        </main>

        <!-- BottomNavBar -->
        <nav class="fixed bottom-0 left-0 w-full flex justify-around items-center px-6 pb-6 pt-3 bg-[#131314]/80 backdrop-blur-xl z-50 shadow-2xl border-t border-white/5">
          <button data-tab="watch" class="flex flex-col items-center justify-center ${activeView === 'watch' || activeView === 'lobby' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-on-surface-variant/60'} rounded-xl px-4 py-1 active:scale-90 transition-all">
            <span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' ${activeView === 'watch' || activeView === 'lobby' ? 1 : 0};">theater_comedy</span>
            <span class="font-['Inter'] text-[11px] uppercase tracking-widest font-medium">${isLobby ? 'Lobby' : 'Watch'}</span>
          </button>
          <button data-tab="chat" class="flex flex-col items-center justify-center ${activeView === 'chat' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-on-surface-variant/60'} rounded-xl px-4 py-1 active:scale-90 transition-all">
            <span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' ${activeView === 'chat' ? 1 : 0};">forum</span>
            <span class="font-['Inter'] text-[11px] uppercase tracking-widest font-medium">Chat</span>
          </button>
          <button data-tab="people" class="flex flex-col items-center justify-center ${activeView === 'people' ? 'text-[#c0c1ff] bg-[#c0c1ff]/10' : 'text-on-surface-variant/60'} rounded-xl px-4 py-1 active:scale-90 transition-all">
            <span class="material-symbols-outlined mb-1" style="font-variation-settings: 'FILL' ${activeView === 'people' ? 1 : 0};">group</span>
            <span class="font-['Inter'] text-[11px] uppercase tracking-widest font-medium">People</span>
          </button>
        </nav>
      </div>
    `;
  },

  renderView: (view, roomId, participants, userId, currentSource, isHost) => {
    switch (view) {
      case 'lobby': return RoomUI.renderLobbyView(participants, userId, roomId);
      case 'watch': return RoomUI.renderWatchView(currentSource, participants, userId, isHost);
      case 'chat': return RoomUI.renderChatView(participants, userId);
      case 'people': return RoomUI.renderPeopleView(participants, userId);
      case 'settings': return RoomUI.renderSettingsView(participants, userId);
      case 'source': return RoomUI.renderSourceView();
      default: return RoomUI.renderLobbyView(participants, userId, roomId);
    }
  },

  renderLobbyView: (participants, userId, roomId) => {
    return `
      <div class="flex-1 flex flex-col px-6 pt-4 pb-8">
        <!-- Hero Section -->
        <section class="mb-10 text-center md:text-left">
          <h2 class="text-[3.5rem] leading-[1.1] font-headline font-extrabold tracking-tighter mb-4 text-on-surface">
            Interstellar
          </h2>
          <p class="text-on-surface-variant font-medium text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
            Waiting for Host to initiate the cinematic sequence. Grab your popcorn and settle in.
          </p>
        </section>

        <!-- Participant Bento Grid (2x2 Mobile) -->
        <div id="lobbyParticipantGrid" class="grid grid-cols-2 gap-4 flex-1 content-start">
          ${RoomUI.renderLobbyParticipants(participants, userId)}
        </div>

        <!-- Action Area -->
        <div class="mt-8 space-y-4">
          <button class="w-full h-14 bg-gradient-to-r from-primary to-primary-container rounded-xl font-bold tracking-tight text-on-primary shadow-2xl shadow-primary/20 active:scale-95 duration-200 transition-all uppercase text-sm">
            READY TO WATCH
          </button>
          <!-- Room Metadata -->
          <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
              <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">LIVE SYNC ENABLED</span>
            </div>
            <span class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60">CONNECTED</span>
          </div>
        </div>
      </div>
    `;
  },

  renderLobbyParticipants: (participants, userId) => {
    return participants.map(p => {
      const isMe = p.userId === userId || p.id === userId;
      return `
        <div class="aspect-square bg-surface-container-low rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden group transition-all duration-300">
          <div class="relative mb-3">
            <div class="w-20 h-20 rounded-full border-2 ${p.isSpeaking ? 'border-tertiary speaking-glow' : 'border-primary-container/40'} flex items-center justify-center text-3xl font-bold text-primary uppercase bg-surface-container-high">
              ${p.displayName.charAt(0)}
            </div>
            ${p.isSpeaking ? `
              <div class="absolute -bottom-1 -right-1 bg-tertiary text-on-tertiary rounded-full p-1 border-4 border-surface-container-low">
                <span class="material-symbols-outlined text-[12px] block" style="font-variation-settings: 'FILL' 1;">mic</span>
              </div>
            ` : ''}
          </div>
          <span class="font-headline font-bold text-sm tracking-tight text-on-surface truncate w-full text-center">${p.displayName}${isMe ? ' (You)' : ''}</span>
          <span class="font-label uppercase tracking-widest text-[10px] ${p.isSpeaking ? 'text-tertiary' : 'text-on-surface-variant'} mt-1">
            ${p.isHost ? 'Host • ' : ''}${p.isSpeaking ? 'Speaking' : 'Ready'}
          </span>
        </div>
      `;
    }).join('');
  },

  renderWatchView: (currentSource, participants, userId, isHost) => {
    return `
      <div class="flex flex-col min-h-full">
        <!-- YouTube-style Video Section -->
        <section id="video-stage" class="relative w-full aspect-video bg-black overflow-hidden group">
          <div id="video-container" class="w-full h-full relative z-0 flex items-center justify-center">
            <!-- Video element injected here -->
          </div>
          
          <!-- Optimized Mobile Controls Overlay -->
          <div id="video-controls" class="absolute inset-0 z-50 flex flex-col justify-between opacity-0 transition-opacity duration-300 bg-black/40 pointer-events-none">
            
            <!-- Top Bar -->
            <div class="p-4 flex items-center justify-between pointer-events-auto">
              <button id="btnExitWatch" class="text-white p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all">
                <span class="material-symbols-outlined">expand_more</span>
              </button>
              <div class="flex items-center gap-2">
                ${isHost ? `
                  <button id="btnMobileSource" class="text-white p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all">
                    <span class="material-symbols-outlined">add_to_queue</span>
                  </button>
                ` : ''}
                <button id="btnMobileSettings" class="text-white p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all">
                  <span class="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>

            <!-- Center Controls (Play/Pause) -->
            <div class="absolute inset-0 flex items-center justify-center gap-12 pointer-events-none">
              <button id="btnRewind" class="text-white p-4 rounded-full hover:bg-white/10 active:scale-90 transition-all pointer-events-auto opacity-0 group-hover:opacity-100">
                <span class="material-symbols-outlined text-4xl">replay_10</span>
              </button>
              <button id="btnCenterPlayPause" class="w-20 h-20 flex items-center justify-center rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/60 active:scale-90 transition-all pointer-events-auto">
                <span class="material-symbols-outlined text-5xl" id="centerPlayIcon">play_arrow</span>
              </button>
              <button id="btnForward" class="text-white p-4 rounded-full hover:bg-white/10 active:scale-90 transition-all pointer-events-auto opacity-0 group-hover:opacity-100">
                <span class="material-symbols-outlined text-4xl">forward_10</span>
              </button>
            </div>

            <!-- Bottom Progress & Info -->
            <div class="p-4 space-y-2 pointer-events-auto bg-gradient-to-t from-black/80 to-transparent">
              <div class="flex items-center justify-between text-white text-[10px] font-mono mb-1">
                <span id="video-time-display">00:00 / 00:00</span>
                <span class="text-primary font-bold tracking-widest uppercase">Live Sync</span>
              </div>
              
              <!-- Custom Mobile Seekbar -->
              <div id="seek-container" class="group/seek relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer overflow-visible">
                <div id="seek-progress" class="absolute top-0 left-0 h-full w-0 bg-primary rounded-full flex items-center justify-end">
                  <div class="w-4 h-4 bg-primary rounded-full shadow-lg scale-100 transition-transform translate-x-1/2"></div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2">
                <div class="flex items-center gap-4 text-white">
                  <button id="btnMuteToggle" class="hover:text-primary transition-colors">
                    <span class="material-symbols-outlined" id="volIcon">volume_up</span>
                  </button>
                </div>
                <button id="btnFullscreen" class="text-white hover:text-primary transition-colors">
                  <span class="material-symbols-outlined">fullscreen</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Details Section -->
        <section class="p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 px-3 py-1 bg-tertiary/10 border border-tertiary/20 rounded-full">
              <span class="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.4)]"></span>
              <span class="text-[0.6875rem] font-medium tracking-widest uppercase text-tertiary">Live Sync Enabled</span>
            </div>
            <div class="flex -space-x-2">
              ${participants.slice(0, 3).map(p => `
                <div class="w-8 h-8 rounded-full border-2 border-surface overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                  ${p.displayName.charAt(0)}
                </div>
              `).join('')}
              ${participants.length > 3 ? `<div class="w-8 h-8 rounded-full border-2 border-surface overflow-hidden bg-surface-container-high flex items-center justify-center text-[0.6rem] font-bold">+${participants.length - 3}</div>` : ''}
            </div>
          </div>

          <div class="space-y-2">
            <h2 class="text-5xl font-extrabold tracking-tighter text-on-surface leading-[1.1]">Interstellar</h2>
            <div class="flex items-center gap-3 text-on-surface-variant text-[0.6875rem] font-medium tracking-widest uppercase">
              <span>2014</span>
              <span class="w-1 h-1 rounded-full bg-on-surface-variant/30"></span>
              <span>Sci-Fi</span>
              <span class="w-1 h-1 rounded-full bg-on-surface-variant/30"></span>
              <span class="text-error font-bold">LIVE</span>
            </div>
          </div>

          <!-- Chat Preview Card -->
          <button data-tab="chat" class="w-full bg-surface-container-low rounded-xl p-4 flex items-center justify-between hover:bg-surface-container transition-colors group text-left">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined">chat_bubble</span>
              </div>
              <div>
                <p class="text-sm font-semibold">Active Discussion</p>
                <p class="text-[0.6875rem] text-on-surface-variant truncate max-w-[180px]" id="lastChatMessage">Tap to join the crew's chat...</p>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
          </button>
        </section>
      </div>
    `;
  },

  renderChatView: (participants, userId) => {
    return `
      <div class="flex flex-col h-[calc(100vh-160px)] px-4 pt-4">
        <div id="chatMessages" class="flex-1 overflow-y-auto flex flex-col gap-6 no-scrollbar pb-4">
          <div class="flex justify-center mb-2">
            <span class="text-[11px] uppercase tracking-[0.05em] font-medium text-on-surface-variant/40 bg-surface-container/50 px-3 py-1 rounded-full">
              Transmission initiated
            </span>
          </div>
          ${RoomUI.chatMessages.map(msg => RoomUI.renderMessageHtml(msg, userId)).join('')}
        </div>
        
        <footer class="p-4 bg-surface-container-lowest/80 backdrop-blur-md rounded-t-2xl border-t border-white/5">
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <button class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                <span class="material-symbols-outlined text-xl">mood</span>
              </button>
              <input id="inputChatMessage" class="w-full bg-surface-container h-12 pl-11 pr-4 rounded-full border-none focus:ring-1 focus:ring-primary/20 text-sm placeholder:text-on-surface-variant/40 transition-all text-on-surface" placeholder="Type a message..." type="text"/>
            </div>
            <button id="btnSendChat" class="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg active:scale-90 transition-transform">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">send</span>
            </button>
          </div>
        </footer>
      </div>
    `;
  },

  renderPeopleView: (participants, userId) => {
    return `
      <div class="px-6 py-8 space-y-8 max-w-md mx-auto w-full">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-bold tracking-tight text-on-surface">The Crew</h2>
          <span class="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">${participants.length} Active</span>
        </div>
        <div id="participantGrid" class="space-y-4">
          ${participants.map(p => `
            <div class="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border border-white/5 group">
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
                  <p class="text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                    ${p.isHost ? 'Commander' : 'Crew Member'}
                  </p>
                </div>
              </div>
              ${p.isHost ? `<span class="material-symbols-outlined text-primary">verified</span>` : ''}
            </div>
          `).join('')}
        </div>
        
        <button id="btnInvitePeople" class="w-full py-5 rounded-xl bg-surface-container-low border border-white/5 text-on-surface font-bold tracking-widest uppercase text-xs active:scale-95 transition-transform flex items-center justify-center gap-2 mt-8">
          <span class="material-symbols-outlined text-sm text-primary">person_add</span>
          Invite New Member
        </button>
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
              <input id="inputSettingsDisplayName" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-container/40" type="text" value="${me?.displayName || ''}"/>
            </div>
            <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-white/5">
              <div class="space-y-0.5">
                <p class="text-[14px] font-semibold text-on-surface">Cinematic Observer</p>
                <p class="text-[11px] text-on-surface-variant">Hide UI automatically</p>
              </div>
              <button class="w-12 h-6 rounded-full bg-primary relative transition-colors">
                <div class="absolute right-1 top-1 w-4 h-4 bg-on-primary-container rounded-full"></div>
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
              <div class="flex p-1 bg-surface-container-lowest rounded-xl border border-white/5">
                <button class="flex-1 py-2 text-xs font-semibold bg-surface-container-high text-primary rounded-lg">Default</button>
                <button class="flex-1 py-2 text-xs font-semibold text-on-surface-variant">External</button>
              </div>
            </div>
          </div>
        </section>

        <section class="pt-4 space-y-4">
          <button id="btnSaveSettings" class="w-full py-4 bg-primary text-on-primary rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-primary/10 active:scale-95 transition-transform">
            Apply Changes
          </button>
          <button id="btnLeaveRoom" class="w-full py-4 bg-error/10 text-error rounded-xl font-bold uppercase tracking-widest text-sm active:scale-95 transition-transform">
            Leave Mission
          </button>
        </section>
      </div>
    `;
  },

  renderSourceView: () => {
    return `
      <div class="px-6 pt-10 pb-20 max-w-md mx-auto flex flex-col justify-center min-h-[calc(100vh-160px)]">
        <div class="mb-10 text-center">
          <span class="text-[0.6875rem] uppercase tracking-[0.05em] font-medium text-primary mb-2 block">Choose Your Stage</span>
          <h2 class="text-[3.5rem] font-bold leading-none tracking-tighter text-on-surface">Source.</h2>
        </div>
        
        <div class="space-y-4 mb-10">
          <button data-source-type="youtube" class="w-full group relative flex items-center justify-between p-6 bg-surface-container-low rounded-xl active:scale-[0.98] transition-all border border-white/5">
            <div class="flex items-center gap-4 text-left">
              <div class="bg-surface-container-highest p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary">movie</span>
              </div>
              <div>
                <div class="text-on-surface font-semibold text-lg">YouTube</div>
                <div class="text-on-surface-variant text-sm">Stream online videos</div>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
          </button>

          <button data-source-type="screen" class="w-full group relative flex items-center justify-between p-6 bg-surface-container-low rounded-xl active:scale-[0.98] transition-all border border-white/5">
            <div class="flex items-center gap-4 text-left">
              <div class="bg-surface-container-highest p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary">screen_share</span>
              </div>
              <div>
                <div class="text-on-surface font-semibold text-lg">Screen Share</div>
                <div class="text-on-surface-variant text-sm">Broadcast your desktop</div>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
          </button>

          <button id="btnLocalFile" class="w-full group relative flex items-center justify-between p-6 bg-surface-container-low rounded-xl active:scale-[0.98] transition-all border border-white/5">
            <div class="flex items-center gap-4 text-left">
              <div class="bg-surface-container-highest p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary">upload_file</span>
              </div>
              <div>
                <div class="text-on-surface font-semibold text-lg">Local File</div>
                <div class="text-on-surface-variant text-sm">Sync your own media</div>
              </div>
            </div>
            <input type="file" id="inputLocalFile" class="hidden" accept="video/*">
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
          </button>
        </div>

        <div class="space-y-4">
          <div class="relative">
            <input id="inputSourceUrl" class="w-full h-14 bg-surface-container-lowest border border-white/5 rounded-xl px-4 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all outline-none" placeholder="Paste Video URL..." type="text"/>
            <span class="absolute right-4 top-4 material-symbols-outlined text-on-surface-variant/40">link</span>
          </div>
          <button id="btnStartWatching" class="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 uppercase tracking-widest text-sm">
            <span>START TRANSMISSION</span>
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
          </button>
        </div>
      </div>
    `;
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
          if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
        }
      };
    });

    // Top Bar Actions
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

    const btnSettings = document.querySelector('#btnOpenSettings');
    if (btnSettings) {
      btnSettings.onclick = () => {
        RoomUI.currentTab = 'settings';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    // Video Control Listeners
    const videoSection = document.querySelector('#video-stage');
    const videoControls = document.querySelector('#video-controls');
    if (videoSection && videoControls) {
      let hideTimeout;
      const showControls = () => {
        videoControls.classList.remove('opacity-0', 'pointer-events-none');
        videoControls.classList.add('opacity-100');
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          videoControls.classList.remove('opacity-100');
          videoControls.classList.add('opacity-0', 'pointer-events-none');
        }, 3000);
      };
      videoSection.onclick = showControls;
      videoSection.onmousemove = showControls;
    }

    const btnCenterPlay = document.querySelector('#btnCenterPlayPause');
    if (btnCenterPlay) {
      btnCenterPlay.onclick = (e) => {
        e.stopPropagation();
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;
        const player = roomManager.syncEngine.player;
        if (player) {
          if (player.isPaused()) player.play();
          else player.pause();
        }
      };
    }

    const btnFullscreen = document.querySelector('#btnFullscreen');
    if (btnFullscreen) {
      btnFullscreen.onclick = (e) => {
        e.stopPropagation();
        const stage = document.querySelector('#video-stage');
        if (!document.fullscreenElement) {
          stage.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen();
        }
      };
    }

    const btnMute = document.querySelector('#btnMuteToggle');
    if (btnMute) {
      btnMute.onclick = (e) => {
        e.stopPropagation();
        const player = roomManager.syncEngine.player;
        if (player && player.video) {
          player.video.muted = !player.video.muted;
          document.querySelector('#volIcon').textContent = player.video.muted ? 'volume_off' : 'volume_up';
        }
      };
    }

    const seekContainer = document.querySelector('#seek-container');
    if (seekContainer) {
      seekContainer.onclick = (e) => {
        e.stopPropagation();
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;
        const rect = seekContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const player = roomManager.syncEngine.player;
        if (player && player.getDuration()) {
          const newTime = pos * player.getDuration();
          player.seek(newTime);
          roomManager.syncEngine.onPlayerEvent('seek', { time: newTime });
        }
      };
    }

    // Settings & Source Listeners
    const btnSave = document.querySelector('#btnSaveSettings');
    if (btnSave) {
      btnSave.onclick = () => {
        const name = document.querySelector('#inputSettingsDisplayName')?.value.trim();
        if (name) roomManager.updateDisplayName(name);
        RoomUI.currentTab = 'watch';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    const btnStart = document.querySelector('#btnStartWatching');
    if (btnStart) {
      btnStart.onclick = () => {
        const url = document.querySelector('#inputSourceUrl')?.value.trim();
        if (!url) return;
        let source = 'url', val = url;
        const yt = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (yt) { source = 'youtube'; val = yt[1]; }
        RoomUI.currentTab = 'watch';
        roomManager.syncEngine.changeSource(source, val, roomManager.roomId);
      };
    }

    document.querySelectorAll('[data-source-type]').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-source-type');
        if (type === 'screen') { RoomUI.currentTab = 'watch'; roomManager.startScreenShare(); }
        else if (type === 'youtube') document.querySelector('#inputSourceUrl').focus();
      };
    });

    const btnLocal = document.querySelector('#btnLocalFile');
    const inputLocal = document.querySelector('#inputLocalFile');
    if (btnLocal && inputLocal) {
      btnLocal.onclick = () => { inputLocal.value = ''; inputLocal.click(); };
      inputLocal.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          RoomUI.currentTab = 'watch';
          roomManager.syncEngine.changeSource('local', URL.createObjectURL(file), roomManager.roomId);
        }
      };
    }

    // Chat Listeners
    const btnSend = document.querySelector('#btnSendChat');
    const inputChat = document.querySelector('#inputChatMessage');
    if (btnSend && inputChat) {
      const send = () => { const m = inputChat.value.trim(); if (m) { roomManager.sendChatMessage(m); inputChat.value = ''; } };
      btnSend.onclick = send;
      inputChat.onkeypress = (e) => { if (e.key === 'Enter') send(); };
    }

    // Progress Loop
    if (RoomUI.seekAnimationFrame) cancelAnimationFrame(RoomUI.seekAnimationFrame);
    const updateProgress = () => {
      const p = roomManager.syncEngine?.player;
      const bar = document.querySelector('#seek-progress');
      if (p && bar) {
        const cur = p.getCurrentTime(), dur = p.getDuration();
        if (dur) {
          bar.style.width = `${(cur / dur) * 100}%`;
          const display = document.querySelector('#video-time-display');
          if (display) {
            const fmt = (s) => new Date(s * 1000).toISOString().substr(11, 8);
            display.textContent = `${fmt(cur)} / ${fmt(dur)}`;
          }
        }
      }
      if (roomManager.roomId) RoomUI.seekAnimationFrame = requestAnimationFrame(updateProgress);
    };
    updateProgress();

    // Player Sync
    if (roomManager.syncEngine && !roomManager.syncEngine._uiListenerAttached) {
      roomManager.syncEngine._uiListenerAttached = true;
      const original = roomManager.syncEngine.onPlayerEvent.bind(roomManager.syncEngine);
      roomManager.syncEngine.onPlayerEvent = (type, data) => {
        original(type, data);
        const icon = document.querySelector('#centerPlayIcon');
        if (icon) icon.textContent = type === 'play' ? 'pause' : 'play_arrow';
      };
    }
  },

  updateParticipants: (participants, userId) => {
    // Handled by main.js re-render
  },

  addChatMessage: (userId, displayName, message, timestamp, isMe) => {
    const msg = { userId, displayName, message, timestamp, isMe };
    RoomUI.chatMessages.push(msg);
    const preview = document.querySelector('#lastChatMessage');
    if (preview) preview.textContent = `${displayName}: "${message}"`;
    const container = document.querySelector('#chatMessages');
    if (container) {
      container.insertAdjacentHTML('beforeend', RoomUI.renderMessageHtml(msg, userId));
      container.scrollTop = container.scrollHeight;
    }
  },

  showReaction: (data) => {
    const container = document.querySelector('#reactions-container');
    if (!container) return;
    const r = document.createElement('div');
    r.className = 'bg-white/10 backdrop-blur-md rounded-full p-2 text-xl animate-bounce';
    r.textContent = data.emojiId;
    container.appendChild(r);
    setTimeout(() => r.remove(), 2000);
  }
};
