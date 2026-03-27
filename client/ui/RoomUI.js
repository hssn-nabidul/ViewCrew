export const RoomUI = {
  seekAnimationFrame: null,

  render: (roomId, participants, userId, currentSource) => {
    const isLobby = !currentSource;
    const isHost = participants.find(p => p.userId === userId || p.id === userId)?.isHost;

    return `
      <div class="flex flex-col h-screen overflow-hidden bg-background text-on-surface">
        <!-- TopAppBar -->
        <header class="flex justify-between items-center h-16 w-full px-6 bg-surface z-50 antialiased tracking-tight border-b border-surface-container-highest">
          <div class="flex items-center gap-6">
            <span class="text-xl font-black tracking-tighter text-on-surface cursor-pointer" id="logo">WatchSync</span>
            <nav class="hidden md:flex gap-6 items-center">
              <a class="text-primary font-bold border-b-2 border-primary pb-1" href="#">Watch</a>
              <a class="text-on-surface/60 hover:text-on-surface transition-colors" href="#">Friends</a>
              <a class="text-on-surface/60 hover:text-on-surface transition-colors" href="#">Library</a>
            </nav>
          </div>
          <div class="flex items-center gap-4">
            <div id="btnCopyRoomCode" class="flex items-center bg-surface-container-high px-3 py-1.5 rounded-xl gap-2 hover:bg-surface-container-highest transition-all duration-200 cursor-pointer group">
              <span class="text-[0.6875rem] font-bold tracking-widest uppercase text-on-surface-variant">Room Code: ${roomId}</span>
              <span class="material-symbols-outlined text-sm text-primary">content_copy</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="p-2 rounded-full hover:bg-surface-container-highest transition-all duration-200 scale-95 active:scale-90">
                <span class="material-symbols-outlined text-primary">share</span>
              </button>
              <button id="btnSettings" class="p-2 rounded-full hover:bg-surface-container-highest transition-all duration-200 scale-95 active:scale-90">
                <span class="material-symbols-outlined text-primary">settings</span>
              </button>
              <button class="ml-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-1.5 rounded-xl text-sm font-bold scale-95 active:scale-90 transition-transform">
                Invite
              </button>
            </div>
          </div>
        </header>

        <main class="flex flex-1 overflow-hidden w-full relative">
          <!-- The Stage: Video Player or Lobby -->
          <section id="video-stage" class="w-[60%] shrink-0 relative bg-black group overflow-hidden flex flex-col transition-all duration-300">
            <div id="video-container" class="w-full h-full relative z-0 flex items-center justify-center">
              ${isLobby ? RoomUI.renderLobby(participants, userId, roomId) : ''}
            </div>

            <!-- Placeholder for video controls (only show if not lobby) -->
            ${!isLobby ? `
              <!-- Netflix-style Controls Overlay -->
              <div id="video-controls" class="absolute inset-0 z-50 flex flex-col justify-between opacity-0 transition-opacity duration-300 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none">
                
                <!-- Top Bar (Back / Title) -->
                <div class="p-8 flex items-center gap-6 pointer-events-auto">
                  <button class="text-white hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-4xl">arrow_back</span>
                  </button>
                  <h2 class="text-2xl font-medium text-white tracking-wide">${currentSource === 'local' ? 'Watching Local File' : currentSource === 'youtube' ? 'Watching YouTube' : 'Watching Stream'}</h2>
                </div>

                <!-- Center Play/Pause (Large) -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button id="btnCenterPlayPause" class="w-24 h-24 flex items-center justify-center rounded-full bg-black/20 border-2 border-white/40 text-white hover:bg-black/40 hover:border-white transition-all active:scale-90 pointer-events-auto">
                    <span class="material-symbols-outlined text-6xl" id="centerPlayIcon">play_arrow</span>
                  </button>
                </div>

                <!-- Floating Reactions Overlay -->
                <div id="reactions-container" class="absolute bottom-32 right-12 flex flex-col items-center gap-4 pointer-events-none z-30"></div>

                <!-- Bottom Controls -->
                <div class="px-8 pb-8 space-y-4 pointer-events-auto">
                  <!-- Progress Bar -->
                  <div class="group/seek relative w-full h-1.5 bg-white/30 rounded-full cursor-pointer overflow-visible">
                    <div id="seek-progress" class="absolute top-0 left-0 h-full w-0 bg-red-600 rounded-full flex items-center justify-end">
                      <div class="w-4 h-4 bg-red-600 rounded-full shadow-lg scale-0 group-hover/seek:scale-100 transition-transform translate-x-1/2"></div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-8">
                      <button id="btnBottomPlayPause" class="text-white hover:scale-110 transition-all">
                        <span class="material-symbols-outlined text-4xl" id="bottomPlayIcon">play_arrow</span>
                      </button>
                      <button id="btnRewind" class="text-white hover:scale-110 transition-all">
                        <span class="material-symbols-outlined text-4xl">replay_10</span>
                      </button>
                      <button id="btnForward" class="text-white hover:scale-110 transition-all">
                        <span class="material-symbols-outlined text-4xl">forward_10</span>
                      </button>
                      <div class="flex items-center gap-4 group/vol">
                        <span class="material-symbols-outlined text-3xl text-white">volume_up</span>
                        <div class="w-0 group-hover/vol:w-24 h-1 bg-white/30 rounded-full transition-all duration-300 overflow-hidden flex items-center">
                          <input type="range" id="volume-slider" min="0" max="100" value="100" class="w-24 accent-white bg-transparent appearance-none h-1 cursor-pointer">
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-8">
                      <button id="btnReaction" class="text-white hover:text-red-500 transition-colors relative group/emoji">
                        <span class="material-symbols-outlined text-3xl">add_reaction</span>
                        <!-- Quick Picker -->
                        <div id="emojiPicker" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 p-3 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 hidden group-hover/emoji:flex items-center gap-4 shadow-2xl">
                          <button class="emoji-btn hover:scale-150 transition-transform duration-200 text-2xl" data-emoji="💖">💖</button>
                          <button class="emoji-btn hover:scale-150 transition-transform duration-200 text-2xl" data-emoji="🔥">🔥</button>
                          <button class="emoji-btn hover:scale-150 transition-transform duration-200 text-2xl" data-emoji="😂">😂</button>
                          <button class="emoji-btn hover:scale-150 transition-transform duration-200 text-2xl" data-emoji="😮">😮</button>
                          <button class="emoji-btn hover:scale-150 transition-transform duration-200 text-2xl" data-emoji="👏">👏</button>
                        </div>
                      </button>
                      <button class="text-white hover:scale-110 transition-all">
                        <span class="material-symbols-outlined text-3xl">subtitles</span>
                      </button>
                      <button class="text-white hover:scale-110 transition-all">
                        <span class="material-symbols-outlined text-3xl">speed</span>
                      </button>
                      <button id="btnFullscreen" class="text-white hover:scale-110 transition-all">
                        <span class="material-symbols-outlined text-4xl">fullscreen</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
          </section>

          <!-- SideNavBar / Right Sidebar -->
          <aside class="flex flex-col w-[40%] h-full py-6 px-4 gap-8 bg-surface-container-lowest border-l border-surface-container relative z-[60] transition-all duration-300">
            <!-- Participants Section -->
            <div class="flex flex-col gap-4">
              <header class="flex justify-between items-center px-2">
                <h3 class="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Participants (<span id="participantCount">${participants.length}</span>)</h3>
                <span class="material-symbols-outlined text-tertiary text-lg">group</span>
              </header>
              <div id="participantGrid" class="grid grid-cols-4 gap-3 px-2">
                ${RoomUI.renderParticipantGrid(participants, userId)}
              </div>
            </div>

            <!-- Chat Area -->
            <div class="flex-1 flex flex-col gap-4 min-h-0">
              <header class="px-2 flex items-center justify-between">
                <h3 class="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">Live Chat</h3>
                <span class="text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-tighter">Live</span>
              </header>
              <div id="chatMessages" class="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 px-2">
                <!-- Messages will be injected here -->
                <div class="flex flex-col gap-1.5 max-w-[90%]">
                  <span class="text-[0.6875rem] font-bold text-on-surface-variant tracking-wide">System</span>
                  <div class="bg-surface-container-highest p-3 rounded-xl rounded-tl-none">
                    <p class="text-sm text-on-surface leading-relaxed italic">Welcome to the room! Waiting for content...</p>
                  </div>
                </div>
              </div>
              <!-- Chat Input -->
              <div class="mt-auto px-2 pb-2">
                <div class="relative">
                  <input id="inputChatMessage" class="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant/40 transition-all text-on-surface" placeholder="Type a message..." type="text"/>
                  <button id="btnSendChat" class="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Bottom Controls (Mute/ScreenShare) -->
            <div class="mt-auto pt-4 border-t border-surface-container flex items-center justify-between px-2">
               <div class="flex items-center gap-2">
                <button id="btnToggleMute" class="p-2 rounded-full hover:bg-surface-container-highest transition-all text-on-surface-variant hover:text-primary">
                  <span id="micIcon" class="material-symbols-outlined">mic</span>
                  <span id="micOffIcon" class="material-symbols-outlined hidden">mic_off</span>
                </button>
                <button id="btnShareScreen" class="p-2 rounded-full hover:bg-surface-container-highest transition-all text-on-surface-variant hover:text-primary hidden">
                  <span class="material-symbols-outlined">screen_share</span>
                </button>
                <button id="btnSourceSelect" class="p-2 rounded-full hover:bg-surface-container-highest transition-all text-on-surface-variant hover:text-primary ${isHost ? '' : 'hidden'}">
                  <span class="material-symbols-outlined">add_to_queue</span>
                </button>
              </div>
              <button id="btnLeave" class="flex items-center gap-2 text-on-surface-variant hover:text-error transition-colors">
                <span class="material-symbols-outlined text-lg">logout</span>
                <span class="text-xs">Leave</span>
              </button>
            </div>
          </aside>
        </main>

        <!-- Source Select Modal -->
        <div id="sourceModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm hidden">
          <div class="glass-panel w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-outline-variant/20">
            <div class="p-8 flex items-start justify-between">
              <div>
                <h2 class="text-5xl font-black leading-none tracking-tighter text-on-surface mb-2">Select Source</h2>
                <p class="text-sm tracking-wide text-on-surface-variant/80 uppercase">The Stage Awaits Your Choice</p>
              </div>
              <button id="btnCloseSourceModal" class="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-full transition-colors active:scale-95">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="px-8 pb-10 space-y-10">
              <div class="grid grid-cols-3 gap-4">
                <button data-source="youtube" class="group flex flex-col items-center justify-center p-6 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-transparent hover:border-error/30 active:scale-[0.98]">
                  <div class="w-12 h-12 flex items-center justify-center mb-4 text-error bg-error/10 rounded-full group-hover:bg-error group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-3xl">play_circle</span>
                  </div>
                  <span class="text-on-surface font-bold text-lg mb-1">YouTube</span>
                </button>
                <button data-source="twitch" class="group flex flex-col items-center justify-center p-6 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-transparent hover:border-primary/30 active:scale-[0.98]">
                  <div class="w-12 h-12 flex items-center justify-center mb-4 text-primary bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <span class="material-symbols-outlined text-3xl">podcasts</span>
                  </div>
                  <span class="text-on-surface font-bold text-lg mb-1">Twitch</span>
                </button>
                <button id="btnLocalFile" class="group flex flex-col items-center justify-center p-6 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-transparent hover:border-tertiary/30 active:scale-[0.98]">
                  <div class="w-12 h-12 flex items-center justify-center mb-4 text-tertiary bg-tertiary/10 rounded-full group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                    <span class="material-symbols-outlined text-3xl">upload_file</span>
                  </div>
                  <span class="text-on-surface font-bold text-lg mb-1">Local</span>
                  <input type="file" id="inputLocalFile" class="hidden" accept="video/*">
                </button>
              </div>
              <div class="space-y-4">
                <div class="relative">
                  <label class="block text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-[0.1em] mb-2 ml-1">Paste Stream or Video URL</label>
                  <div class="relative flex items-center">
                    <div class="absolute left-4 text-on-surface-variant/40">
                      <span class="material-symbols-outlined">link</span>
                    </div>
                    <input id="inputSourceUrl" class="w-full h-14 pl-12 pr-4 bg-surface-container-low border-none focus:ring-1 focus:ring-primary/40 rounded-lg text-on-surface placeholder-on-surface-variant/30 text-sm transition-all" placeholder="https://www.youtube.com/watch?v=..." type="text"/>
                  </div>
                </div>
                <div class="pt-4">
                  <button id="btnStartWatching" class="cinematic-gradient w-full h-14 rounded-lg flex items-center justify-center gap-2 text-on-primary font-bold text-base tracking-tight hover:brightness-110 active:scale-[0.99] transition-all">
                    Start Watching
                    <span class="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Modal -->
        <div id="settingsModal" class="fixed inset-0 z-[150] flex bg-background/60 backdrop-blur-sm hidden">
          <!-- Sidebar -->
          <aside class="w-80 flex flex-col py-8 px-4 bg-surface-container-lowest font-body text-sm font-medium border-r border-outline-variant/10">
            <div class="px-4 mb-8">
              <h1 class="text-lg font-bold text-on-surface">Settings</h1>
              <p class="text-xs text-on-surface-variant mt-1">Manage your cinematic experience</p>
            </div>
            <nav class="flex flex-col gap-2">
              <button class="flex items-center gap-3 px-4 py-3 text-primary font-bold border-r-2 border-primary transition-transform active:translate-x-1">
                <span class="material-symbols-outlined">person</span>
                <span>Profile</span>
              </button>
              <button class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                <span class="material-symbols-outlined">settings_input_component</span>
                <span>Audio & Video</span>
              </button>
              <button class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                <span class="material-symbols-outlined">groups</span>
                <span>Room Management</span>
              </button>
            </nav>
            <div class="mt-auto px-4 py-6 border-t border-outline-variant/10">
              <button id="btnCloseSettings" class="flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Back to Theater</span>
              </button>
            </div>
          </aside>

          <!-- Main Settings Canvas -->
          <section class="flex-1 bg-surface overflow-y-auto p-12 custom-scrollbar">
            <div class="max-w-4xl mx-auto space-y-16 pb-24">
              <div class="space-y-2">
                <h2 class="text-6xl font-black tracking-tighter leading-none text-on-surface">User Profile</h2>
                <p class="text-on-surface-variant font-medium">Personalize how others see you in the digital theater.</p>
              </div>

              <div class="grid grid-cols-12 gap-6">
                <!-- Avatar Upload Card -->
                <div class="col-span-12 md:col-span-5 bg-surface-container-low p-8 rounded-xl flex flex-col items-center justify-center space-y-6">
                  <div class="relative group">
                    <div class="w-40 h-40 rounded-full border-4 border-surface-container-highest p-1 flex items-center justify-center text-6xl font-bold text-primary bg-surface uppercase">
                      ${participants.find(p => p.userId === userId || p.id === userId)?.displayName?.charAt(0) || '?'}
                    </div>
                    <button class="absolute bottom-2 right-2 bg-primary text-on-primary p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                      <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Status</p>
                    <div class="flex items-center gap-2 justify-center">
                      <div class="w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.4)]"></div>
                      <span class="text-xs text-tertiary uppercase tracking-widest font-bold">Online</span>
                    </div>
                  </div>
                </div>

                <!-- Username & Identity Card -->
                <div class="col-span-12 md:col-span-7 bg-surface-container-low p-8 rounded-xl flex flex-col justify-between">
                  <div class="space-y-6">
                    <div class="space-y-2">
                      <label class="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">Display Name</label>
                      <input id="inputSettingsDisplayName" class="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary/20 rounded-md py-3 px-4 text-on-surface" type="text" value="${participants.find(p => p.userId === userId || p.id === userId)?.displayName || ''}"/>
                    </div>
                    <div class="flex items-center justify-between py-4 border-y border-outline-variant/10">
                      <div class="space-y-0.5">
                        <p class="text-base font-bold">Cinematic Observer</p>
                        <p class="text-sm text-on-surface-variant">Enable distraction-free viewing status</p>
                      </div>
                      <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                        <span class="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition"></span>
                      </button>
                    </div>
                  </div>
                  <div class="flex justify-end gap-4 mt-8">
                    <button id="btnCancelSettings" class="px-6 py-2 text-on-surface-variant font-bold hover:bg-surface-container-highest transition-colors rounded-md text-sm">Cancel</button>
                    <button id="btnSaveSettings" class="px-8 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-md text-sm shadow-[0_4px_20px_rgba(192,193,255,0.2)]">Save Profile</button>
                  </div>
                </div>
              </div>

              <!-- Audio & Video Section -->
              <div class="space-y-8">
                <div class="flex items-center gap-4">
                  <h3 class="text-2xl font-bold tracking-tight">Audio & Video</h3>
                  <div class="h-px flex-1 bg-surface-container-highest"></div>
                </div>
                <div class="grid grid-cols-12 gap-8">
                  <div class="col-span-12 lg:col-span-6 space-y-6">
                    <div class="space-y-4">
                      <label class="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">Input Device</label>
                      <div class="bg-surface-container-low rounded-md p-1 flex">
                        <button class="flex-1 bg-surface-container-highest py-2 px-4 rounded font-bold text-xs text-on-surface">System Default</button>
                        <button class="flex-1 py-2 px-4 rounded font-bold text-xs text-on-surface-variant hover:text-on-surface">Pro Mic 400</button>
                      </div>
                    </div>
                    <div class="space-y-4">
                      <div class="flex justify-between items-end">
                        <label class="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">Mic Sensitivity</label>
                        <span class="text-tertiary text-xs font-bold">-12dB</span>
                      </div>
                      <div class="relative w-full h-8 flex items-center">
                        <input class="w-full cursor-pointer accent-primary" max="100" min="0" type="range" value="65"/>
                      </div>
                    </div>
                  </div>
                  <div class="col-span-12 lg:col-span-6 space-y-6">
                    <div class="space-y-4">
                      <label class="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">Video Resolution</label>
                      <div class="grid grid-cols-3 gap-2">
                        <button class="bg-surface-container-low border border-outline-variant/20 py-3 rounded-md flex flex-col items-center gap-1">
                          <span class="text-xs font-bold text-on-surface">1080p</span>
                        </button>
                        <button class="bg-surface-container-highest border-2 border-primary/50 py-3 rounded-md flex flex-col items-center gap-1 shadow-[0_0_15px_rgba(192,193,255,0.1)]">
                          <span class="text-xs font-bold text-primary">1440p</span>
                        </button>
                        <button class="bg-surface-container-low border border-outline-variant/20 py-3 rounded-md flex flex-col items-center gap-1">
                          <span class="text-xs font-bold text-on-surface">2160p</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  },

  renderLobby: (participants, userId, roomId) => {
    const host = participants.find(p => p.isHost);
    return `
      <div class="flex-1 flex flex-col relative overflow-y-auto px-12 py-16 scrollbar-hide w-full h-full bg-surface-container-lowest">
        <div class="absolute inset-0 -z-10 opacity-20 pointer-events-none">
          <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full"></div>
          <div class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-tertiary-container blur-[100px] rounded-full"></div>
        </div>
        
        <div class="max-w-4xl w-full mx-auto mb-16 text-center md:text-left">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span class="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-primary opacity-80 mb-2 block">Lobby Active</span>
              <h1 class="text-6xl font-black leading-tight tracking-[-0.02em] font-headline">Room Lobby</h1>
              <p class="text-on-surface-variant mt-2 max-w-xl">Waiting for Host to initiate the cinematic sequence. Grab your popcorn and settle in.</p>
            </div>
          </div>
        </div>

        <div id="lobbyParticipantGrid" class="max-w-5xl w-full mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          ${RoomUI.renderLobbyParticipants(participants, userId)}
          <!-- Add Friend Slot -->
          <button id="btnInviteFriend" class="flex flex-col items-center group">
            <div class="w-24 h-24 mb-4 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center group-hover:border-primary group-hover:bg-surface-container-high transition-all">
              <span class="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary">person_add</span>
            </div>
            <span class="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">Invite Guest</span>
          </button>
        </div>

        <div class="mt-auto pt-24 flex flex-col items-center gap-6">
          <button class="cinematic-gradient px-12 py-5 rounded-lg text-on-primary font-black text-lg tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(192,193,255,0.2)]">
            Ready to Watch
          </button>
          <div class="flex items-center gap-4 text-on-surface-variant opacity-60">
            <span class="material-symbols-outlined text-sm">info</span>
            <p class="text-xs uppercase tracking-[0.1em]">Movie starts when ${host ? host.displayName : 'Host'} triggers play</p>
          </div>
        </div>
      </div>
    `;
  },

  renderParticipantGrid: (participants, userId) => {
    return participants.map(p => `
      <div class="relative group cursor-pointer flex flex-col items-center">
        <div class="w-12 h-12 rounded-full ring-2 ${p.isSpeaking ? 'ring-tertiary speaking-glow' : 'ring-primary/30'} ring-offset-2 ring-offset-background overflow-hidden bg-surface-container-high flex items-center justify-center text-lg font-bold text-primary uppercase transition-all duration-300">
          ${p.displayName ? p.displayName.charAt(0) : '?'}
        </div>
        ${p.isHost ? `
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface-container-lowest flex items-center justify-center">
            <span class="material-symbols-outlined text-[8px] text-on-primary font-bold">star</span>
          </div>
        ` : ''}
        <span class="text-[10px] mt-1 font-bold truncate max-w-full text-on-surface-variant">${p.displayName}</span>
      </div>
    `).join('');
  },

  renderLobbyParticipants: (participants, userId) => {
    return participants.map(p => `
      <div class="flex flex-col items-center group">
        <div class="relative w-24 h-24 mb-4">
          <div class="w-full h-full rounded-full overflow-hidden ${p.isSpeaking ? 'speaking-glow border-tertiary' : 'border-2 border-primary'} p-1 bg-surface flex items-center justify-center text-4xl font-bold text-primary uppercase">
            ${p.displayName ? p.displayName.charAt(0) : '?'}
          </div>
          ${p.isHost ? `
            <div class="absolute -bottom-1 right-0 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Host</div>
          ` : ''}
        </div>
        <span class="text-sm font-bold text-on-surface">${p.displayName}${p.userId === userId || p.id === userId ? ' (You)' : ''}</span>
        <span class="text-[10px] uppercase tracking-widest ${p.isSpeaking ? 'text-tertiary font-bold' : 'text-on-surface-variant opacity-60'} flex items-center gap-1">
          ${p.isSpeaking ? '<span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> Speaking' : 'Ready'}
        </span>
      </div>
    `).join('');
  },

  initListeners: (roomManager) => {
    // Logo redirect
    const logo = document.querySelector('#logo');
    if (logo) logo.onclick = () => window.location.href = '/';

    // Copy Room Code
    const btnCopyRoomCode = document.querySelector('#btnCopyRoomCode');
    const btnInviteFriend = document.querySelector('#btnInviteFriend');
    const handleCopy = () => {
      navigator.clipboard.writeText(window.location.href);
      const originalHtml = btnCopyRoomCode.innerHTML;
      btnCopyRoomCode.innerHTML = '<span class="text-[0.6875rem] font-bold tracking-widest uppercase text-primary">Copied!</span>';
      setTimeout(() => btnCopyRoomCode.innerHTML = originalHtml, 2000);
    };
    if (btnCopyRoomCode) btnCopyRoomCode.onclick = handleCopy;
    if (btnInviteFriend) btnInviteFriend.onclick = handleCopy;

    // Mute Toggle
    const btnToggleMute = document.querySelector('#btnToggleMute');
    if (btnToggleMute && roomManager) {
      btnToggleMute.onclick = () => {
        const isMuted = roomManager.voiceChat.toggleMute();
        document.querySelector('#micIcon').classList.toggle('hidden', isMuted);
        document.querySelector('#micOffIcon').classList.toggle('hidden', !isMuted);
        btnToggleMute.classList.toggle('text-error', isMuted);
        btnToggleMute.classList.toggle('text-on-surface-variant', !isMuted);
      };
    }

    // Screen Share
    const btnShareScreen = document.querySelector('#btnShareScreen');
    if (btnShareScreen && roomManager) {
      btnShareScreen.onclick = async () => {
        if (roomManager.screenShare.isActive()) {
          roomManager.stopScreenShare();
          btnShareScreen.classList.remove('text-primary');
        } else {
          try {
            await roomManager.startScreenShare();
            btnShareScreen.classList.add('text-primary');
          } catch (err) {
            console.error('Failed to start screen share:', err);
          }
        }
      };
    }

    // Source Selection Modal
    const btnSourceSelect = document.querySelector('#btnSourceSelect');
    const sourceModal = document.querySelector('#sourceModal');
    const btnCloseSourceModal = document.querySelector('#btnCloseSourceModal');
    const btnStartWatching = document.querySelector('#btnStartWatching');
    const inputSourceUrl = document.querySelector('#inputSourceUrl');

    if (btnSourceSelect) btnSourceSelect.onclick = () => sourceModal.classList.remove('hidden');
    if (btnCloseSourceModal) btnCloseSourceModal.onclick = () => sourceModal.classList.add('hidden');
    
    // Quick select buttons
    document.querySelectorAll('[data-source]').forEach(btn => {
      btn.onclick = () => {
        const source = btn.getAttribute('data-source');
        if (source === 'youtube') inputSourceUrl.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Example
      };
    });

    const btnLocalFile = document.querySelector('#btnLocalFile');
    const inputLocalFile = document.querySelector('#inputLocalFile');
    if (btnLocalFile && inputLocalFile) {
      btnLocalFile.onclick = () => {
        inputLocalFile.value = ''; // Clear to allow re-selection of the same file
        inputLocalFile.click();
      };
      inputLocalFile.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          sourceModal.classList.add('hidden');
          roomManager.syncEngine.changeSource('local', url, roomManager.roomId);
        }
      };
    }

    if (btnStartWatching && inputSourceUrl && roomManager) {
      btnStartWatching.onclick = () => {
        const url = inputSourceUrl.value.trim();
        if (!url) return;

        let source = 'url';
        let value = url;

        const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          source = 'youtube';
          value = ytMatch[1];
        }

        sourceModal.classList.add('hidden');
        roomManager.syncEngine.changeSource(source, value, roomManager.roomId);
      };
    }

    // Video Controls
    const handlePlayPause = () => {
      const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
      if (!isHost) return;
      
      if (roomManager.syncEngine.player) {
        const isPaused = roomManager.syncEngine.player.isPaused();
        if (isPaused) {
          roomManager.syncEngine.player.play();
        } else {
          roomManager.syncEngine.player.pause();
        }
      }
    };

    const btnCenterPlayPause = document.querySelector('#btnCenterPlayPause');
    const btnBottomPlayPause = document.querySelector('#btnBottomPlayPause');
    if (btnCenterPlayPause) btnCenterPlayPause.onclick = handlePlayPause;
    if (btnBottomPlayPause) btnBottomPlayPause.onclick = handlePlayPause;

    // Rewind / Forward
    const btnRewind = document.querySelector('#btnRewind');
    const btnForward = document.querySelector('#btnForward');
    
    if (btnRewind) {
      btnRewind.onclick = () => {
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;
        const player = roomManager.syncEngine.player;
        if (player) {
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seek(newTime);
          roomManager.syncEngine.onPlayerEvent('seek', { time: newTime });
        }
      };
    }

    if (btnForward) {
      btnForward.onclick = () => {
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;
        const player = roomManager.syncEngine.player;
        if (player) {
          const newTime = Math.min(player.getDuration(), player.getCurrentTime() + 10);
          player.seek(newTime);
          roomManager.syncEngine.onPlayerEvent('seek', { time: newTime });
        }
      };
    }

    // Fullscreen
    const btnFullscreen = document.querySelector('#btnFullscreen');
    if (btnFullscreen) {
      btnFullscreen.onclick = () => {
        const container = document.querySelector('#video-stage');
        const aside = document.querySelector('aside');
        
        if (!document.fullscreenElement) {
          container.requestFullscreen().then(() => {
            if (aside) aside.classList.add('hidden');
          }).catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message}`));
        } else {
          document.exitFullscreen();
        }
      };
    }

    // Handle fullscreen change to restore aside
    document.onfullscreenchange = () => {
      const aside = document.querySelector('aside');
      if (!document.fullscreenElement && aside) {
        aside.classList.remove('hidden');
      }
    };

    // Volume Control
    const volumeSlider = document.querySelector('#volume-slider');
    if (volumeSlider && roomManager.syncEngine) {
      volumeSlider.oninput = (e) => {
        const volume = e.target.value / 100;
        const player = roomManager.syncEngine.player;
        if (player && typeof player.setVolume === 'function') {
          player.setVolume(volume);
        }
      };
    }

    // Auto-hide controls
    const videoSection = document.querySelector('#video-stage');
    const controlsOverlay = document.querySelector('#video-controls');
    let hideTimeout;

    if (videoSection && controlsOverlay) {
      const showControls = () => {
        controlsOverlay.classList.remove('opacity-0', 'pointer-events-none');
        controlsOverlay.classList.add('opacity-100');
        videoSection.style.cursor = 'default';
        
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          if (roomManager.syncEngine?.currentSource) {
            controlsOverlay.classList.remove('opacity-100');
            controlsOverlay.classList.add('opacity-0', 'pointer-events-none');
            videoSection.style.cursor = 'none';
          }
        }, 5000);
      };

      videoSection.onmousemove = showControls;
      videoSection.onclick = showControls;
      // Also reset on hover enter
      videoSection.onmouseenter = showControls;
      
      // Initial show
      showControls();
    }

    // Seek Control
    const seekProgress = document.querySelector('#seek-progress');
    const seekContainer = seekProgress?.parentElement;
    if (seekContainer && roomManager.syncEngine) {
      seekContainer.onclick = (e) => {
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        if (!isHost) return;

        const rect = seekContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const player = roomManager.syncEngine.player;
        if (player) {
          const duration = player.getDuration();
          if (duration) {
            const newTime = pos * duration;
            roomManager.syncEngine.player.seek(newTime);
            roomManager.syncEngine.onPlayerEvent('seek', { time: newTime });
          }
        }
      };
    }

    // Update seek bar periodically
    if (RoomUI.seekAnimationFrame) cancelAnimationFrame(RoomUI.seekAnimationFrame);
    const updateSeekBar = () => {
      const player = roomManager.syncEngine?.player;
      if (player && seekProgress) {
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration) {
          const percent = (current / duration) * 100;
          seekProgress.style.width = `${percent}%`;
        }
      }
      if (roomManager.roomId) {
        RoomUI.seekAnimationFrame = requestAnimationFrame(updateSeekBar);
      }
    };
    updateSeekBar();

    // Listen for player events to update icons
    if (roomManager.syncEngine && !roomManager.syncEngine._uiListenerAttached) {
      roomManager.syncEngine._uiListenerAttached = true;
      const originalOnPlayerEvent = roomManager.syncEngine.onPlayerEvent.bind(roomManager.syncEngine);
      roomManager.syncEngine.onPlayerEvent = (type, data) => {
        originalOnPlayerEvent(type, data);
        
        const centerIcon = document.querySelector('#centerPlayIcon');
        const bottomIcon = document.querySelector('#bottomPlayIcon');
        if (centerIcon && bottomIcon) {
          if (type === 'play') {
            centerIcon.textContent = 'pause';
            bottomIcon.textContent = 'pause';
          } else if (type === 'pause') {
            centerIcon.textContent = 'play_arrow';
            bottomIcon.textContent = 'play_arrow';
          }
        }
      };
    }
    
    // Chat Input
    const inputChat = document.querySelector('#inputChatMessage');
    const btnSendChat = document.querySelector('#btnSendChat');
    const handleSendChat = () => {
      const msg = inputChat.value.trim();
      if (msg && roomManager) {
        roomManager.sendChatMessage(msg);
        inputChat.value = '';
      }
    };
    if (btnSendChat) btnSendChat.onclick = handleSendChat;
    if (inputChat) {
      inputChat.onkeypress = (e) => {
        if (e.key === 'Enter') handleSendChat();
      };
    }

    // Emoji Reactions
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const emojiId = btn.getAttribute('data-emoji');
        if (roomManager) {
          roomManager.sendReaction(emojiId);
        }
      };
    });

    if (roomManager) {
      roomManager.onReaction = (data) => {
        RoomUI.showReaction(data.emojiId, data.displayName);
      };
    }
  },

  showReaction: (emojiId, displayName) => {
    const container = document.querySelector('#reactions-container');
    if (!container) return;

    const reaction = document.createElement('div');
    reaction.className = 'flex flex-col items-center pointer-events-none animate-float-up opacity-0';
    reaction.innerHTML = `
      <span class="text-4xl filter drop-shadow-lg">${emojiId}</span>
      <span class="text-[9px] font-black uppercase tracking-widest text-primary/80 bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm mt-1 border border-primary/20">${displayName}</span>
    `;

    container.appendChild(reaction);

    // Animation via JS if not in CSS
    const startPos = 0;
    const endPos = 300;
    const duration = 3000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        const y = startPos + (endPos - startPos) * progress;
        const opacity = progress < 0.2 ? progress * 5 : 1 - (progress - 0.8) * 5;
        const x = Math.sin(progress * 10) * 20; // Sway

        reaction.style.transform = `translate(${x}px, -${y}px) scale(${1 + progress * 0.5})`;
        reaction.style.opacity = Math.max(0, Math.min(1, opacity));
        requestAnimationFrame(animate);
      } else {
        reaction.remove();
      }
    };

    requestAnimationFrame(animate);
  },

  updateParticipants: (participants, userId) => {
    const count = document.querySelector('#participantCount');
    const grid = document.querySelector('#participantGrid');
    const lobbyGrid = document.querySelector('#lobbyParticipantGrid');
    
    if (count) count.textContent = participants.length;
    if (grid) grid.innerHTML = RoomUI.renderParticipantGrid(participants, userId);
    if (lobbyGrid) lobbyGrid.innerHTML = RoomUI.renderLobbyParticipants(participants, userId);

    const isHost = participants.find(p => p.userId === userId || p.id === userId)?.isHost;
    const btnShareScreen = document.querySelector('#btnShareScreen');
    const btnSourceSelect = document.querySelector('#btnSourceSelect');
    
    if (btnShareScreen) btnShareScreen.classList.toggle('hidden', !isHost);
    if (btnSourceSelect) btnSourceSelect.classList.toggle('hidden', !isHost);
  },
  
  addChatMessage: (userId, displayName, message, timestamp, isMe) => {
    const chatContainer = document.querySelector('#chatMessages');
    if (!chatContainer) return;
    
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msgHtml = `
      <div class="flex flex-col gap-1.5 max-w-[90%] ${isMe ? 'self-end items-end' : ''}">
        <div class="flex items-center gap-2">
          <span class="text-[0.6875rem] font-bold ${isMe ? 'text-primary' : 'text-on-surface-variant'} tracking-wide">${displayName}</span>
          <span class="text-[9px] opacity-40 uppercase tracking-widest">${timeStr}</span>
        </div>
        <div class="${isMe ? 'bg-primary/10 border border-primary/20' : 'bg-surface-container-highest'} p-3 rounded-xl ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}">
          <p class="text-sm text-on-surface leading-relaxed">${message}</p>
        </div>
      </div>
    `;
    
    chatContainer.insertAdjacentHTML('beforeend', msgHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};
