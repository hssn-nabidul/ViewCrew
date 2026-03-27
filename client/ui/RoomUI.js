import { escapeHtml, escapeAttr } from './utils/sanitize.js';
export const RoomUI = {
  currentTab: 'watch', // 'watch' | 'chat' | 'people' | 'settings' | 'source'  
  sidebarTab: 'chat', // 'chat' | 'people'
  seekAnimationFrame: null,
  chatMessages: [],

  render: (roomId, participants, userId, currentSource, hasEnteredTheater) => {
    if (!hasEnteredTheater) {
      return RoomUI.renderLobbyView(participants, userId, roomId);
    }

    const isLobby = !currentSource;
    const isHost = participants.find(p => p.userId === userId || p.id === userId)?.isHost;

    let activeView = RoomUI.currentTab;
    if (isLobby && activeView === 'watch') activeView = 'lobby';

    return `
      <div class="bg-background font-body text-on-surface min-h-screen flex flex-col overflow-hidden selection:bg-primary/30">
        <!-- TopAppBar -->
        <header class="flex items-center justify-between px-6 h-16 bg-black border-b border-white/5 z-50">
          <div class="flex items-center gap-4">
            <button id="btnExitWatch" class="text-on-surface-variant hover:text-white transition-colors p-2 rounded-full">
              <span class="material-symbols-outlined">close</span>
            </button>
            <div class="text-xl font-black tracking-tighter text-primary">ViewCrew</div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-[10px] font-black uppercase tracking-widest text-tertiary px-3 py-1 bg-tertiary/10 rounded-full border border-tertiary/20">Synced</span>
            ${isHost ? `
              <button id="btnOpenSource" class="text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-surface transition-colors">
                <span class="material-symbols-outlined">add_to_queue</span>
              </button>
            ` : ''}
            <button id="btnOpenSettings" class="text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-surface transition-colors">
              <span class="material-symbols-outlined">settings</span>
            </button>
          </div>
        </header>

        <main class="flex-1 flex overflow-hidden">
          <!-- Main Cinema Stage -->
          <div class="flex-1 flex flex-col relative bg-black overflow-hidden">
            ${activeView === 'source' ? RoomUI.renderSourceView() : RoomUI.renderWatchView(currentSource, participants, userId, isHost)}
          </div>

          <!-- Desktop Sidebar (Chat & People) -->
          <aside class="hidden lg:flex flex-col w-[380px] bg-surface border-l border-white/5">
            <div class="flex-1 overflow-hidden flex flex-col">
              <div class="flex border-b border-white/5 bg-black/20">
                <button data-tab="chat" class="flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'chat' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface'}">Chat</button>
                <button data-tab="people" class="flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'people' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface'}">Crew</button>
              </div>
              <div class="flex-1 overflow-y-auto no-scrollbar">
                ${activeView === 'chat' ? RoomUI.renderChatView(participants, userId) : RoomUI.renderPeopleView(participants, userId)}
              </div>
            </div>
          </aside>
        </main>

        <!-- Mobile Bottom Nav -->
        <nav class="lg:hidden flex justify-around items-center px-6 py-4 bg-surface border-t border-white/5 z-50">
          <button data-tab="watch" class="flex flex-col items-center gap-1 transition-all ${activeView === 'watch' || activeView === 'lobby' ? 'text-primary' : 'text-on-surface-variant/60'}">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'watch' || activeView === 'lobby' ? 1 : 0};">movie</span>
            <span class="text-[9px] font-black uppercase tracking-widest">Watch</span>
          </button>
          <button data-tab="chat" class="flex flex-col items-center gap-1 transition-all ${activeView === 'chat' ? 'text-primary' : 'text-on-surface-variant/60'}">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'chat' ? 1 : 0};">forum</span>
            <span class="text-[9px] font-black uppercase tracking-widest">Chat</span>
          </button>
          <button data-tab="people" class="flex flex-col items-center gap-1 transition-all ${activeView === 'people' ? 'text-primary' : 'text-on-surface-variant/60'}">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${activeView === 'people' ? 1 : 0};">group</span>
            <span class="text-[9px] font-black uppercase tracking-widest">Crew</span>
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
    const me = participants.find(p => p.userId === userId || p.id === userId);
    const displayName = me ? me.displayName : '';

    return `
      <div class="min-h-screen bg-background flex items-center justify-center p-6">
        <div class="w-full max-w-sm bg-surface rounded-[2rem] p-10 shadow-2xl border border-white/5 flex flex-col items-center text-center space-y-10">

          <div class="space-y-3">
            <h2 class="text-4xl font-headline font-black tracking-tighter text-on-surface">Theater Gate</h2>
            <p class="text-on-surface-variant text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">Identify yourself, traveler</p>
          </div>

          <div class="relative group">
            <div class="w-28 h-28 rounded-full bg-gradient-to-tr from-primary to-primary/20 p-1 shadow-2xl shadow-primary/20">
              <div class="w-full h-full rounded-full bg-surface-container-high flex items-center justify-center text-5xl font-black text-primary border border-white/5">
                ${displayName.charAt(0) || '?'}
              </div>
            </div>
            <div class="absolute -bottom-1 -right-1 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-xl border-4 border-surface">
              <span class="material-symbols-outlined text-sm">edit</span>
            </div>
          </div>

          <div class="w-full space-y-8">
            <div class="space-y-3 text-left">
              <label for="inputLobbyDisplayName" class="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 ml-4">Your Stage Name</label>
              <input id="inputLobbyDisplayName"
                     class="w-full h-16 bg-background border border-white/10 rounded-2xl px-6 text-on-surface focus:ring-2 focus:ring-primary/50 transition-all outline-none text-center font-bold text-lg"
                     type="text"
                     value="${escapeAttr(displayName)}"
                     placeholder="Enter Name..."/>
            </div>

            <button id="btnEnterTheater"
                    class="w-full h-16 bg-primary text-on-primary font-black rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-primary/30 uppercase tracking-[0.2em] text-xs">
              <span>Enter Theater</span>
              <span class="material-symbols-outlined text-base">rocket_launch</span>
            </button>
          </div>

          <div class="pt-4 flex items-center gap-3 justify-center">
            <div class="flex -space-x-2">
               ${participants.slice(0, 3).map(p => `<div class="w-6 h-6 rounded-full bg-surface-container-highest border border-surface text-[8px] flex items-center justify-center font-black uppercase text-primary">${p.displayName.charAt(0)}</div>`).join('')}
            </div>
            <span class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">${participants.length} People Inside</span>
          </div>
        </div>
      </div>
    `;
  },

  renderWatchView: (currentSource, participants, userId, isHost) => {
    return `
      <div class="flex flex-col h-full bg-black relative group">
        <!-- Netflix-style Video Stage -->
        <section id="video-stage" class="flex-1 flex items-center justify-center relative overflow-hidden cursor-pointer">
          <div id="video-container" class="w-full h-full relative z-0 flex items-center justify-center">
            <!-- Video element injected here -->
          </div>

          <!-- Cinema Controls Overlay -->
          <div id="video-controls" class="absolute inset-0 z-50 flex flex-col justify-between opacity-0 transition-opacity duration-500 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none group-hover:opacity-100">

            <!-- Top Info Bar -->
            <div class="p-8 flex items-center justify-between pointer-events-auto">
              <div class="space-y-1">
                <h3 class="text-2xl font-black tracking-tighter text-white">Interstellar</h3>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">Live Sync</span>
                  <span class="w-1 h-1 rounded-full bg-white/20"></span>
                  <span id="video-time-display" class="text-[10px] font-mono font-bold text-white/60 tracking-widest">00:00:00 / 00:00:00</span>
                </div>
              </div>
              <div class="flex items-center gap-4">
                ${isHost ? `
                  <button id="btnMobileSource" class="text-white/60 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all">
                    <span class="material-symbols-outlined">add_to_queue</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Cinematic Playback Overlay -->
            <div class="absolute inset-0 flex items-center justify-center gap-16 pointer-events-none">
              <button id="btnRewind" class="text-white/40 hover:text-white p-6 rounded-full hover:bg-white/5 active:scale-90 transition-all pointer-events-auto scale-90 group-hover:scale-100 duration-500">
                <span class="material-symbols-outlined text-5xl">replay_10</span>
              </button>
              <button id="btnCenterPlayPause" class="w-24 h-24 flex items-center justify-center rounded-full bg-primary text-on-primary hover:scale-110 active:scale-90 transition-all pointer-events-auto shadow-2xl shadow-primary/40">
                <span class="material-symbols-outlined text-6xl" id="centerPlayIcon">play_arrow</span>
              </button>
              <button id="btnForward" class="text-white/40 hover:text-white p-6 rounded-full hover:bg-white/5 active:scale-90 transition-all pointer-events-auto scale-90 group-hover:scale-100 duration-500">
                <span class="material-symbols-outlined text-5xl">forward_10</span>
              </button>
            </div>

            <!-- Bottom Control Bar -->
            <div class="p-8 space-y-6 pointer-events-auto">
              <!-- Cinematic Seekbar -->
              <div id="seek-container" class="group/seek relative w-full h-1.5 bg-white/10 rounded-full cursor-pointer overflow-visible transition-all hover:h-2">
                <div id="seek-progress" class="absolute top-0 left-0 h-full w-0 bg-primary rounded-full flex items-center justify-end">
                  <div class="w-4 h-4 bg-primary rounded-full shadow-2xl scale-0 group-hover/seek:scale-100 transition-transform translate-x-1/2"></div>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center gap-8">
                  <div class="flex items-center gap-4 text-white/60">
                    <button id="btnMuteToggle" class="hover:text-primary transition-colors">
                      <span class="material-symbols-outlined" id="volIcon">volume_up</span>
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                   <button id="btnFullscreen" class="text-white/60 hover:text-primary transition-colors">
                    <span class="material-symbols-outlined">fullscreen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Room Metadata & Reactions (Desktop Sidebar Placeholder) -->
        <section class="lg:hidden p-6 space-y-6 bg-surface border-t border-white/5">
           <div class="flex items-center justify-between">
              <h4 class="text-sm font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Now Watching</h4>
              <div class="flex -space-x-2">
                ${participants.slice(0, 5).map(p => `
                  <div class="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-black text-primary uppercase">
                    ${p.displayName.charAt(0)}
                  </div>
                `).join('')}
              </div>
           </div>
           <button data-tab="chat" class="w-full bg-background border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:bg-surface-container transition-all group">
             <div class="flex items-center gap-4">
               <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                 <span class="material-symbols-outlined text-xl">chat_bubble</span>
               </div>
               <div class="text-left">
                 <p class="text-xs font-black uppercase tracking-widest text-on-surface">Live Chat</p>
                 <p class="text-[10px] font-bold text-on-surface-variant/60 truncate max-w-[150px]" id="lastChatMessage">No messages yet...</p>
               </div>
             </div>
             <span class="material-symbols-outlined text-on-surface-variant/20 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
           </button>
        </section>
      </div>
    `;
  },

  renderChatView: (participants, userId) => {
    return `
      <div class="flex flex-col h-full bg-transparent">
        <div id="chatMessages" class="flex-1 overflow-y-auto flex flex-col gap-6 p-6 no-scrollbar">
          <div class="flex justify-center mb-4">
            <span class="text-[9px] uppercase tracking-[0.2em] font-black text-on-surface-variant/30 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
              Secure Link Established
            </span>
          </div>
          ${RoomUI.chatMessages.map(msg => RoomUI.renderMessageHtml(msg, userId)).join('')}
        </div>

        <footer class="p-6 bg-black/40 backdrop-blur-xl border-t border-white/5">
          <div class="flex items-center gap-3">
            <div class="relative flex-1 group">
              <input id="inputChatMessage" 
                     class="w-full bg-background h-14 pl-6 pr-6 rounded-2xl border border-white/5 focus:border-primary/50 focus:ring-0 text-sm placeholder:text-on-surface-variant/20 transition-all text-on-surface font-medium" 
                     placeholder="Message the crew..." 
                     type="text"/>
            </div>
            <button id="btnSendChat" class="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary text-on-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-90 transition-all">
              <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">send</span>
            </button>
          </div>
        </footer>
      </div>
    `;
  },

  renderPeopleView: (participants, userId) => {
    return `
      <div class="flex flex-col h-full bg-transparent p-6 space-y-8">
        <div class="flex items-center justify-between">
          <h2 class="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">The Manifest</h2>
          <span class="text-[9px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">${participants.length} Online</span>
        </div>
        <div id="participantGrid" class="space-y-3 flex-1 overflow-y-auto no-scrollbar">
          ${participants.map(p => `
            <div class="bg-black/20 p-4 rounded-2xl flex items-center justify-between border border-white/5 group hover:bg-white/5 transition-colors">
              <div class="flex items-center gap-4">
                <div class="relative">
                  <div class="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-xl font-black text-primary border-2 border-white/5 transition-all">
                    ${p.displayName.charAt(0)}
                  </div>
                </div>
                <div>
                  <p class="font-black text-xs text-on-surface tracking-tight">${escapeHtml(p.displayName)}${p.userId === userId || p.id === userId ? ' <span class="text-primary/60">(You)</span>' : ''}</p>
                  <p class="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mt-0.5">
                    ${p.isHost ? 'Commander' : 'Crew Member'}
                  </p>
                </div>
              </div>
              ${p.isHost ? `<span class="material-symbols-outlined text-primary text-sm">verified</span>` : ''}
            </div>
          `).join('')}
        </div>

        <button id="btnInvitePeople" class="w-full py-5 rounded-2xl bg-primary/5 border border-primary/20 text-primary font-black tracking-[0.2em] uppercase text-[9px] hover:bg-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-xs">person_add</span>
          Expand the Crew
        </button>
      </div>
    `;
  },

  renderSettingsView: (participants, userId) => {
    const me = participants.find(p => p.userId === userId || p.id === userId);
    return `
      <div class="px-6 py-10 space-y-12 max-w-md mx-auto w-full pb-32">
        <section class="space-y-8">
          <div class="flex flex-col items-center">
            <div class="relative group">
              <div class="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary to-primary/20 shadow-2xl shadow-primary/20">
                <div class="w-full h-full rounded-full border-4 border-background bg-surface-container-high flex items-center justify-center text-5xl font-black text-primary uppercase">
                  ${me?.displayName?.charAt(0) || '?'}
                </div>
              </div>
              <button class="absolute bottom-1 right-1 bg-primary text-on-primary p-2 rounded-full shadow-xl border-4 border-background hover:scale-110 active:scale-90 transition-all">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
          </div>
          <div class="space-y-6">
            <div class="space-y-2 text-left">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 ml-4">Manifest Identity</label>
              <input id="inputSettingsDisplayName" class="w-full h-16 bg-surface border border-white/5 rounded-2xl px-6 text-on-surface font-bold text-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all" type="text" value="${escapeAttr(me?.displayName || '')}"/>
            </div>
          </div>
        </section>

        <section class="pt-8 space-y-4">
          <button id="btnSaveSettings" class="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
            Confirm Changes
          </button>
          <button id="btnLeaveRoom" class="w-full py-5 bg-white/5 text-white/40 hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 active:scale-95 transition-all">
            Abandon Mission
          </button>
        </section>
      </div>
    `;
  },

  renderSourceView: () => {
    return `
      <div class="px-8 py-20 max-w-lg mx-auto flex flex-col justify-center min-h-[calc(100vh-160px)]">
        <div class="mb-12 text-center space-y-4">
          <span class="text-[9px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-4 py-1.5 rounded-full inline-block">The Projector</span>
          <h2 class="text-6xl font-black leading-none tracking-tighter text-on-surface">Select Source.</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <button data-source-type="youtube" class="group relative flex flex-col items-start p-8 bg-surface rounded-3xl active:scale-[0.98] transition-all border border-white/5 hover:border-primary/40 hover:bg-primary/5">
            <div class="bg-background p-4 rounded-2xl group-hover:bg-primary/20 transition-colors mb-6 shadow-xl">
              <span class="material-symbols-outlined text-on-surface group-hover:text-primary text-3xl">movie</span>
            </div>
            <div class="text-on-surface font-black text-xl tracking-tight mb-2">YouTube</div>
            <div class="text-on-surface-variant/40 text-[10px] font-bold uppercase tracking-widest">Global Streams</div>
          </button>

          <button data-source-type="screen" class="group relative flex flex-col items-start p-8 bg-surface rounded-3xl active:scale-[0.98] transition-all border border-white/5 hover:border-primary/40 hover:bg-primary/5">
            <div class="bg-background p-4 rounded-2xl group-hover:bg-primary/20 transition-colors mb-6 shadow-xl">
              <span class="material-symbols-outlined text-on-surface group-hover:text-primary text-3xl">screen_share</span>
            </div>
            <div class="text-on-surface font-black text-xl tracking-tight mb-2">Screen Share</div>
            <div class="text-on-surface-variant/40 text-[10px] font-bold uppercase tracking-widest">Live Desktop</div>
          </button>

          <button id="btnLocalFile" class="md:col-span-2 group relative flex items-center justify-between p-8 bg-surface rounded-3xl active:scale-[0.98] transition-all border border-white/5 hover:border-primary/40 hover:bg-primary/5">
            <div class="flex items-center gap-6">
              <div class="bg-background p-4 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-xl">
                <span class="material-symbols-outlined text-on-surface group-hover:text-primary text-3xl">upload_file</span>
              </div>
              <div class="text-left">
                <div class="text-on-surface font-black text-xl tracking-tight mb-1">Local Media</div>
                <div class="text-on-surface-variant/40 text-[10px] font-bold uppercase tracking-widest">Personal Collection</div>
              </div>
            </div>
            <input type="file" id="inputLocalFile" class="hidden" accept="video/*">
            <span class="material-symbols-outlined text-on-surface-variant/20 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
          </button>
        </div>

        <div class="space-y-6">
          <div class="relative">
            <input id="inputSourceUrl" class="w-full h-18 bg-background border border-white/10 rounded-2xl px-6 text-on-surface placeholder:text-on-surface-variant/20 focus:ring-2 focus:ring-primary/50 transition-all outline-none font-bold text-lg" placeholder="Paste Transmission URL..." type="text"/>
            <span class="absolute right-6 top-6 material-symbols-outlined text-on-surface-variant/20">link</span>
          </div>
          <button id="btnStartWatching" class="w-full h-18 bg-primary text-on-primary font-black rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-primary/30 uppercase tracking-[0.3em] text-[10px]">
            <span>Ignite Transmission</span>
            <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
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
        <div class="flex flex-col items-end gap-2 self-end max-w-[90%]">
          <div class="bg-primary text-on-primary px-5 py-4 rounded-3xl rounded-tr-none shadow-xl shadow-primary/10">
            <p class="text-[13px] font-bold leading-relaxed tracking-tight">${escapeHtml(msg.message)}</p>
          </div>
          <div class="flex items-center gap-2 mr-1">
            <span class="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">${timeStr}</span>
            <span class="material-symbols-outlined text-[10px] text-tertiary" style="font-variation-settings: 'FILL' 1;">done_all</span>    
          </div>
        </div>
      `;
    }

    return `
      <div class="flex items-end gap-4 max-w-[90%] group">
        <div class="flex-shrink-0 relative mb-6">
          <div class="w-10 h-10 rounded-full bg-surface-container-high ring-4 ring-background flex items-center justify-center text-xs font-black text-primary uppercase border border-white/5">
            ${msg.displayName.charAt(0)}
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 ml-2">${escapeHtml(msg.displayName)}</span>
          <div class="bg-white/5 text-on-surface px-5 py-4 rounded-3xl rounded-tl-none shadow-xl border border-white/5">
            <p class="text-[13px] font-bold leading-relaxed tracking-tight">${escapeHtml(msg.message)}</p>
          </div>
          <span class="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/20 ml-2">${timeStr}</span>
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
    const btnExit = document.querySelector('#btnExitWatch');
    if (btnExit) {
      btnExit.onclick = () => {
        window.location.href = '/';
      };
    }

    const btnSettings = document.querySelector('#btnOpenSettings');
    if (btnSettings) {
      btnSettings.onclick = () => {
        RoomUI.currentTab = 'settings';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    const btnSource = document.querySelector('#btnOpenSource');
    if (btnSource) {
      btnSource.onclick = () => {
        RoomUI.currentTab = 'source';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    const btnMobileSource = document.querySelector('#btnMobileSource');
    if (btnMobileSource) {
      btnMobileSource.onclick = (e) => {
        e.stopPropagation();
        RoomUI.currentTab = 'source';
        if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
      };
    }

    // Video Control Listeners - auto-hide after 3 seconds of inactivity
    const videoSection = document.querySelector('#video-stage');
    const videoControls = document.querySelector('#video-controls');
    const videoContainer = document.querySelector('#video-container');
    if (videoSection && videoControls) {
      let hideTimeout;
      let lastShowTime = 0;
      const showControls = () => {
        const now = Date.now();
        if (now - lastShowTime < 100) return;
        lastShowTime = now;
        
        videoControls.style.opacity = '1';
        videoControls.style.pointerEvents = 'auto';
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          videoControls.style.opacity = '0';
          videoControls.style.pointerEvents = 'none';
        }, 3000);
      };
      videoSection.onclick = showControls;
      videoSection.onmousemove = showControls;
      videoSection.ontouchstart = showControls;
      if (videoContainer) {
        videoContainer.ontouchstart = showControls;
      }
      document.addEventListener('show-video-controls', showControls);
      
      // Auto-hide after 3 seconds initially
      hideTimeout = setTimeout(() => {
        videoControls.style.opacity = '0';
        videoControls.style.pointerEvents = 'none';
      }, 3000);
    }

    const btnCenterPlay = document.querySelector('#btnCenterPlayPause');
    if (btnCenterPlay) {
      btnCenterPlay.onclick = (e) => {
        e.stopPropagation();
        console.log('[RoomUI] Play button clicked');
        if (!roomManager.syncEngine) {
          console.warn('[RoomUI] syncEngine not ready');
          return;
        }
        const isHost = roomManager.participants.find(p => p.userId === roomManager.userId || p.id === roomManager.userId)?.isHost;
        console.log('[RoomUI] isHost:', isHost);
        if (!isHost) return;
        const player = roomManager.syncEngine.player;
        console.log('[RoomUI] player:', player ? 'exists' : 'null');
        if (player && player.play && player.pause) {
          if (player.isPaused()) {
            console.log('[RoomUI] Calling player.play()');
            player.play();
          } else {
            console.log('[RoomUI] Calling player.pause()');
            player.pause();
          }
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
        const dur = player?.getDuration?.();
        if (player && dur && isFinite(dur) && dur > 0) {
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
        
        // Auto-enter theater when starting to watch
        if (!roomManager.hasEnteredTheater) {
          roomManager.hasEnteredTheater = true;
        }
        
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
          const blobUrl = URL.createObjectURL(file);
          
          // Auto-enter theater
          if (!roomManager.hasEnteredTheater) {
            roomManager.hasEnteredTheater = true;
          }
          
          // Switch to watch view (in case user had source selector open)
          RoomUI.currentTab = 'watch';
          
          // Set pending source directly on syncEngine to update state before re-render
          if (roomManager.syncEngine) {
            roomManager.syncEngine._pendingSource = { source: 'local', value: blobUrl };
            roomManager.syncEngine.currentSource = 'local';
            roomManager.syncEngine.currentSourceValue = blobUrl;
          }
          
          // Trigger re-render BEFORE changeSource so container exists
          if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
          
          // Now change the source
          roomManager.syncEngine.changeSource('local', blobUrl, roomManager.roomId);
        }
      };
    }

    // Lobby / Waiting Room Listeners
    const btnEnter = document.querySelector('#btnEnterTheater');
    if (btnEnter) {
      btnEnter.onclick = () => {
        const nameInput = document.querySelector('#inputLobbyDisplayName');
        const name = nameInput ? nameInput.value.trim() : '';
        if (name) roomManager.updateDisplayName(name);

        if (roomManager.enterTheater) {
          roomManager.enterTheater();
        } else {
          // Fallback state if not yet implemented in core
          roomManager.hasEnteredTheater = true;
          if (roomManager.onStateChange) roomManager.onStateChange(roomManager.participants);
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
            const fmt = (s) => {
              const h = Math.floor(s / 3600);
              const m = Math.floor((s % 3600) / 60);
              const sec = Math.floor(s % 60);
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            };
            display.textContent = `${fmt(cur)} / ${fmt(dur)}`;
          }
        }
      }
      if (roomManager.roomId) RoomUI.seekAnimationFrame = requestAnimationFrame(updateProgress);
    };
    updateProgress();

    // Player Sync - attach listener if syncEngine exists, otherwise it will be attached on next render
    if (roomManager.syncEngine && !roomManager.syncEngine._uiListenerAttached) {
      roomManager.syncEngine._uiListenerAttached = true;
      const original = roomManager.syncEngine.onPlayerEvent.bind(roomManager.syncEngine);
      roomManager.syncEngine.onPlayerEvent = (type, data) => {
        original(type, data);
        const icon = document.querySelector('#centerPlayIcon');
        if (icon) icon.textContent = type === 'play' ? 'pause' : 'play_arrow';
      };
    } else if (!roomManager.syncEngine) {
      // syncEngine not created yet, will attach on next render
    }
    
    // Return cleanup function to remove listeners
    return () => {
      cancelAnimationFrame(RoomUI.seekAnimationFrame);
      document.removeEventListener('show-video-controls', RoomUI._showControlsHandler);
    };
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
    const container = document.querySelector('#video-container');
    if (!container) return;
    const r = document.createElement('div');
    r.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce pointer-events-none z-50';
    r.textContent = data.emojiId;
    container.appendChild(r);
    setTimeout(() => r.remove(), 2000);
  }
};
