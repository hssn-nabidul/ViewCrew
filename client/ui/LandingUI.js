export const LandingUI = {
  render: (displayName) => {
    return `
      <div class="bg-[#131314] text-[#e5e2e3] font-['Inter'] antialiased min-h-screen selection:bg-primary/30">
        <!-- TopNavBar -->
        <header class="fixed top-0 w-full z-50 bg-[#131314]/80 backdrop-blur-xl border-b border-white/5">
          <nav class="flex items-center justify-between px-6 py-4 max-w-[1440px] mx-auto">
            <div class="text-xl font-black tracking-tighter text-[#e5e2e3] cursor-pointer hover:opacity-80 transition-opacity">WatchSync</div>
            <div class="hidden md:flex items-center gap-8">
              <a class="text-[#c0c1ff] font-bold transition-colors duration-300" href="#">Watch Together</a>
              <a class="text-[#e5e2e3]/70 hover:text-[#c0c1ff] transition-colors duration-300 font-medium" href="#">Features</a>
              <a class="text-[#e5e2e3]/70 hover:text-[#c0c1ff] transition-colors duration-300 font-medium" href="#">Sources</a>
            </div>
            <div class="flex items-center gap-4">
              <button class="text-[#e5e2e3]/70 text-sm font-bold hover:text-[#c0c1ff] transition-colors">Sign In</button>
              <button id="btnHeroCreate" class="cinematic-gradient text-[#0d0096] px-6 py-2 rounded-xl font-black text-sm scale-95 active:scale-100 transition-all shadow-[0_0_20px_rgba(192,193,255,0.2)]">Start a Party</button>
            </div>
          </nav>
        </header>

        <main>
          <!-- Hero Section -->
          <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 z-0">
              <img alt="Cinematic Space" class="w-full h-full object-cover opacity-40 blur-sm scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA954ZF2QJVZC8FadmuVvX9ecujZ0S3zcvq_GsAYGRV5OXTGyaG45aQKnU4uilji4LvNeM6RM_vAv8O-oWbrIsUYPjyZGzceNUK6xwWxyp1b1hnec5Fjrs3s5Y1AFgUQakvHUam8inzi0UtC-1KNUVwRUnmgH-Q1zQJjOeGTTSLDyl_AZFUA-U0MPCwcX0589gvv-i0dIDISd3zCBbWF1k6yczGRFkPC290oq3TdSV2ClNt6Pl1Ma-Hg4ACyCnZMmT7SdVG2s2oJY6E"/>
              <div class="absolute inset-0 bg-gradient-to-t from-[#131314] via-transparent to-transparent"></div>
            </div>
            
            <div class="relative z-10 text-center px-4 max-w-5xl mx-auto">
              <div class="mb-8 inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                <p class="text-[10px] uppercase tracking-[0.2em] font-black text-primary">The Cinematic Observer</p>
              </div>
              
              <h1 class="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] mb-8">
                Watch Together.<br/>
                <span class="text-transparent bg-clip-text cinematic-gradient">Synchronized.</span>
              </h1>
              
              <p class="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-12 font-medium leading-relaxed opacity-80">
                Experience movies, streams, and local videos with friends in perfect real-time harmony. High-fidelity voice chat designed for digital theaters.
              </p>

              <!-- Join/Create Controls -->
              <div class="flex flex-col items-center gap-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl max-w-2xl mx-auto shadow-2xl">
                <div class="w-full flex flex-col md:flex-row items-center gap-4">
                  <div class="flex-1 w-full relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary/40">person</span>
                    <input id="inputName" type="text" value="${displayName || ''}" placeholder="Your Stage Name" 
                      class="w-full h-16 pl-12 pr-4 bg-black/40 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all text-lg font-bold placeholder:text-white/20"/>
                  </div>
                  <button id="btnCreateRoom" class="cinematic-gradient w-full md:w-auto h-16 px-10 rounded-2xl text-[#0d0096] font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                    Start Party
                  </button>
                </div>

                <div class="w-full flex items-center gap-4 px-4">
                  <div class="h-px flex-1 bg-white/10"></div>
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">OR JOIN EXISTING</span>
                  <div class="h-px flex-1 bg-white/10"></div>
                </div>

                <div class="w-full flex flex-col md:flex-row items-center gap-4">
                  <div class="flex-1 w-full relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary/40">confirmation_number</span>
                    <input id="inputRoomCode" type="text" maxlength="6" placeholder="Enter 6-Digit Code" 
                      class="w-full h-16 pl-12 pr-4 bg-black/20 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all text-lg font-bold tracking-[0.3em] uppercase placeholder:tracking-normal placeholder:text-white/20"/>
                  </div>
                  <button id="btnJoinRoom" class="w-full md:w-auto h-16 px-10 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white/10 active:scale-95 transition-all">
                    Join
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- Features Bento Grid -->
          <section class="py-32 px-6 max-w-7xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
              <!-- Large Feature -->
              <div class="md:col-span-8 bg-surface-container-low rounded-[2rem] p-12 flex flex-col justify-between overflow-hidden relative group border border-white/5">
                <div class="relative z-10">
                  <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8">
                    <span class="material-symbols-outlined text-primary text-4xl">sync</span>
                  </div>
                  <h3 class="text-4xl font-black mb-4 tracking-tighter">Real-time Sync</h3>
                  <p class="text-on-surface-variant text-lg max-w-md font-medium opacity-70 leading-relaxed">Our proprietary millisecond-precision protocol ensures everyone sees the same frame at exactly the same time. No more "where are you at?"</p>
                </div>
                <div class="mt-12 opacity-40 group-hover:opacity-60 transition-all duration-700 group-hover:scale-105">
                  <img alt="Sync Visualization" class="rounded-2xl object-cover h-64 w-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpPGcC1PN0hYC8HOR3rm_PDVaTeiHntGWpPmUsiCVRyDqB153yQ-2xhMEm9q8Sary-b6CF28jbR6y2JMcvbTqvlILhoYp4ZCn4mM8dWwGkJ9bbyYXnPFZJWHQOSmijvXD7IG2OXwdT_gO4ygEzdb8CB9fr0S_0X6s7IJnVvsod894o3d4m8fwGWRSrdE6m22oGDaAeEuRcpC0Vi1J3CVlnGzId14aOjHUup4fsoLCb38Ko_QKrVg4i_hpr_lUysSXqLWeV-OAQmwjl"/>
                </div>
              </div>

              <!-- Small Feature 1 -->
              <div class="md:col-span-4 bg-surface-container-lowest border border-white/5 rounded-[2rem] p-10 flex flex-col items-center text-center hover:bg-white/[0.02] transition-all group">
                <div class="w-20 h-20 bg-tertiary/10 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-tertiary text-4xl">mic</span>
                </div>
                <h3 class="text-2xl font-black mb-4 tracking-tight">Voice Chat</h3>
                <p class="text-on-surface-variant font-medium opacity-60 leading-relaxed">Spatial audio support that makes it feel like your friends are sitting right next to you.</p>
              </div>

              <!-- Integration Highlight -->
              <div class="md:col-span-12 bg-surface-container rounded-[2.5rem] p-12 flex flex-col md:flex-row items-center gap-12 border border-white/5">
                <div class="flex-1">
                  <h3 class="text-4xl font-black mb-6 tracking-tighter">Limitless Sources</h3>
                  <p class="text-on-surface-variant text-lg font-medium opacity-70 leading-relaxed">From global streaming giants to your own private collection. WatchSync handles it all with ease through native player integration.</p>
                </div>
                <div class="flex-1 grid grid-cols-3 gap-6 w-full">
                  ${['YOUTUBE', 'TWITCH', 'LOCAL'].map(source => `
                    <div class="aspect-square bg-black/40 rounded-[1.5rem] flex flex-col items-center justify-center border border-white/5 hover:border-primary/20 transition-colors group cursor-default">
                      <span class="material-symbols-outlined text-3xl mb-3 text-white/20 group-hover:text-primary transition-colors">
                        ${source === 'LOCAL' ? 'upload_file' : source === 'TWITCH' ? 'podcasts' : 'play_circle'}
                      </span>
                      <span class="font-black text-[10px] tracking-widest text-white/20 group-hover:text-white transition-colors">${source}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </section>

          <!-- Visual "Cinematic" Break -->
          <section class="py-24 bg-black/20">
            <div class="max-w-[1440px] mx-auto px-6">
              <div class="relative rounded-[3rem] overflow-hidden aspect-video shadow-2xl shadow-black ring-1 border-white/10">
                <img alt="Cinema Experience" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGhc0FQvDzO84i0EmGxfJE-fbhO9eV90fpjjtgGFw8b2LaXBxMluSJrNe59mWRggVdWXMs-g5-oxpDyzxyK4nZl-r4O9Jp0s-utGGK3h-XNjHrjMCEEJjOKSPTHP-g7W8viykot1enVt7mOvkIH4pztquFIXh-2uxF3I6EdUP0EFSdbxeex9ImFoCtwKpME0ModyqTMfFNLAEkM3vjDsmy8hl2Gsd2Skie0ralkgaT1D1j6Uo_z7WVr1CWbkm-Sh0t9NuVv5QmbZzq"/>
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div class="w-24 h-24 cinematic-gradient rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-2xl">
                    <span class="material-symbols-outlined text-on-primary text-5xl" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="w-full border-t border-white/5 bg-black/40 py-20">
          <div class="max-w-[1440px] mx-auto px-8 flex flex-col md:flex-row justify-between items-start gap-12">
            <div class="space-y-6">
              <div class="text-2xl font-black text-[#e5e2e3] tracking-tighter">WatchSync</div>
              <p class="text-on-surface-variant font-medium opacity-50 max-w-xs leading-relaxed">
                The Cinematic Observer. Designed for those who appreciate the shared experience of digital media.
              </p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-12">
              <div class="space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Platform</h4>
                <div class="flex flex-col gap-2">
                  <a class="text-sm font-bold hover:text-primary transition-colors" href="#">Watch Together</a>
                  <a class="text-sm font-bold hover:text-primary transition-colors" href="#">Mobile App</a>
                  <a class="text-sm font-bold hover:text-primary transition-colors" href="#">Desktop Client</a>
                </div>
              </div>
              <div class="space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Legal</h4>
                <div class="flex flex-col gap-2">
                  <a class="text-sm font-bold hover:text-primary transition-colors" href="#">Privacy</a>
                  <a class="text-sm font-bold hover:text-primary transition-colors" href="#">Terms</a>
                </div>
              </div>
            </div>
          </div>
          <div class="max-w-[1440px] mx-auto px-8 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/20">
            <span>© 2026 WATCHSYNC. ALL RIGHTS RESERVED.</span>
            <span>DESIGNED BY CINEMATIC OBSERVERS.</span>
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
