export const LandingUI = {
  render: (displayName) => {
    return `
      <div class="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col">
        <header class="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5">
          <nav class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto" role="navigation" aria-label="Main navigation">
            <a href="/" class="text-xl md:text-2xl font-black tracking-tighter text-primary" aria-label="ViewCrew Home">
              ViewCrew
            </a>
            <button 
              id="btnHeroCreate" 
              class="btn-primary touch-target text-sm md:text-base"
              aria-label="Start a new watch party"
            >
              Start a Party
            </button>
          </nav>
        </header>

        <main class="flex-1 flex items-center justify-center pt-16">
          <section class="relative w-full min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden px-4 py-8 md:py-12">
            <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(229,9,20,0.12)_0%,transparent_60%)] pointer-events-none" aria-hidden="true"></div>
            <div class="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(229,9,20,0.05)_0%,transparent_50%)] pointer-events-none" aria-hidden="true"></div>
            
            <div class="relative z-10 w-full max-w-md animate-fade-in">
              <div class="text-center mb-8 md:mb-10 space-y-4">
                <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1]">
                  Watch Together.<br/>
                  <span class="text-primary">Perfectly Synced.</span>
                </h1>
                
                <p class="text-base md:text-lg text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                  Experience movies, streams, and local videos with friends in real-time harmony.
                </p>
              </div>

              <div class="card p-6 md:p-8 shadow-hard animate-slide-up" role="form" aria-label="Join or create a watch party">
                <div class="space-y-5">
                  <div class="space-y-2">
                    <label for="inputName" class="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      Your Name
                    </label>
                    <input 
                      id="inputName" 
                      type="text" 
                      value="${displayName || ''}" 
                      placeholder="Enter your name" 
                      class="input-field"
                      aria-describedby="name-hint"
                      autocomplete="name"
                      required
                    />
                    <span id="name-hint" class="sr-only">Enter your display name for the watch party</span>
                  </div>
                  
                  <button 
                    id="btnCreateRoom" 
                    class="btn-primary w-full h-12 md:h-14 text-base md:text-lg"
                    aria-label="Create a new private room"
                  >
                    Create a Private Room
                  </button>

                  <div class="flex items-center gap-3 md:gap-4">
                    <div class="h-px flex-1 bg-white/10" aria-hidden="true"></div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant" aria-hidden="true">Or Join Party</span>
                    <div class="h-px flex-1 bg-white/10" aria-hidden="true"></div>
                  </div>

                  <div class="flex gap-2 md:gap-3">
                    <div class="flex-1 relative">
                      <input 
                        id="inputRoomCode" 
                        type="text" 
                        maxlength="6" 
                        placeholder="Room Code" 
                        class="input-field text-center tracking-[0.25em] font-bold text-lg"
                        aria-label="Room code to join"
                        autocomplete="off"
                        inputmode="text"
                      />
                    </div>
                    <button 
                      id="btnJoinRoom" 
                      class="btn-secondary h-12 md:h-14 px-5 md:px-6 min-w-[80px]"
                      aria-label="Join room with code"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>

              <p class="text-center text-xs text-on-surface-muted mt-6 md:mt-8">
                No account required. Start watching instantly.
              </p>
            </div>
          </section>
        </main>

        <footer class="py-4 md:py-6 border-t border-white/5" role="contentinfo">
          <div class="max-w-7xl mx-auto px-4 text-center">
            <p class="text-xs text-on-surface-muted">
              ViewCrew &copy; ${new Date().getFullYear()} — Watch together, anywhere.
            </p>
          </div>
        </footer>
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
      const name = inputName?.value.trim();
      if (!name) {
        inputName?.focus();
        inputName?.setAttribute('aria-invalid', 'true');
        return;
      }
      inputName?.setAttribute('aria-invalid', 'false');
      callbacks.onCreateRoom(name);
    };

    if (btnCreate) {
      btnCreate.onclick = handleCreate;
      btnCreate.onkeydown = (e) => {
        if (e.key === 'Enter') handleCreate();
      };
    }

    if (btnHeroCreate) {
      btnHeroCreate.onclick = handleCreate;
    }

    if (btnJoin) {
      btnJoin.onclick = () => {
        const room = inputRoomCode?.value.trim();
        const name = inputName?.value.trim();
        
        if (!room) {
          inputRoomCode?.focus();
          inputRoomCode?.setAttribute('aria-invalid', 'true');
          return;
        }
        
        if (!name) {
          inputName?.focus();
          inputName?.setAttribute('aria-invalid', 'true');
          return;
        }
        
        inputRoomCode?.setAttribute('aria-invalid', 'false');
        inputName?.setAttribute('aria-invalid', 'false');
        callbacks.onJoinRoom(room, name);
      };
    }

    if (inputRoomCode) {
      inputRoomCode.onkeydown = (e) => {
        if (e.key === 'Enter') {
          btnJoin?.click();
        }
      };
      
      inputRoomCode.oninput = (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.setAttribute('aria-invalid', 'false');
      };
    }

    if (inputName) {
      inputName.oninput = () => {
        inputName.setAttribute('aria-invalid', 'false');
      };
    }
  }
};
