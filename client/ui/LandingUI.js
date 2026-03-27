export const LandingUI = {
  render: (displayName) => {
    return `
      <div class="bg-background text-on-surface font-body antialiased min-h-screen">
        <header class="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
          <nav class="flex items-center justify-between px-6 py-4 max-w-[1440px] mx-auto">
            <div class="text-2xl font-black tracking-tighter text-primary">ViewCrew</div>
            <div class="flex items-center gap-6">
              <button id="btnHeroCreate" class="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all">Start a Party</button>
            </div>
          </nav>
        </header>

        <main>
          <section class="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(229,9,20,0.15)_0%,transparent_70%)]"></div>
            
            <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
              <h1 class="text-6xl md:text-8xl font-black tracking-tighter leading-tight mb-6">
                Watch Together.<br/>
                <span class="text-primary">Perfectly Synced.</span>
              </h1>
              
              <p class="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-12 font-medium opacity-80">
                Experience movies, streams, and local videos with friends in real-time harmony. High-fidelity sync designed for digital theaters.
              </p>

              <div class="bg-surface p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md mx-auto">
                <div class="space-y-6">
                  <div class="space-y-2 text-left">
                    <label class="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">Your Name</label>
                    <input id="inputName" type="text" value="${displayName || ''}" placeholder="E.g. Captain Cine" 
                      class="w-full h-14 px-4 bg-background border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-lg font-bold"/>
                  </div>
                  
                  <button id="btnCreateRoom" class="w-full h-14 bg-primary text-on-primary rounded-lg font-black text-lg hover:bg-red-700 transition-all">
                    Create a Private Room
                  </button>

                  <div class="flex items-center gap-4">
                    <div class="h-px flex-1 bg-outline"></div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">OR JOIN PARTY</span>
                    <div class="h-px flex-1 bg-outline"></div>
                  </div>

                  <div class="flex gap-2">
                    <input id="inputRoomCode" type="text" maxlength="6" placeholder="ROOM CODE" 
                      class="flex-1 h-14 px-4 bg-background border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-lg font-bold tracking-widest text-center uppercase"/>
                    <button id="btnJoinRoom" class="h-14 px-6 bg-surface-container-high border border-outline rounded-lg text-white font-black hover:bg-outline transition-all">
                      Join
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;
  },

  initListeners: (callbacks) => {
    const btnCreate = document.querySelector('#btnCreateRoom');
    const btnHeroCreate = document.querySelector('#btnHeroCreate');
    const btnJoin = document.querySelector('#btnJoinRoom');
    const inputName = document.querySelector('#inputName');
    const inputRoomCode = document.querySelector('#inputRoomCode');

    const handleCreate = () => {
      const name = inputName.value.trim();
      callbacks.onCreateRoom(name);
    };

    if (btnCreate) btnCreate.onclick = handleCreate;
    if (btnHeroCreate) btnHeroCreate.onclick = handleCreate;

    if (btnJoin) {
      btnJoin.onclick = () => {
        const room = inputRoomCode.value.trim();
        const name = inputName.value.trim();
        if (room) callbacks.onJoinRoom(room, name);
      };
    }

    if (inputRoomCode) {
      inputRoomCode.onkeypress = (e) => {
        if (e.key === 'Enter') btnJoin.onclick();
      };
    }
  }
};
