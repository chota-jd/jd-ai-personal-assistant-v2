'use client';

interface HeaderProps {
  userName: string | null;
  isLive: boolean;
  errorStatus: string | null;
  onToggleAssistant: () => void;
}

export default function Header({ userName, isLive, errorStatus, onToggleAssistant }: HeaderProps) {
  return (
    <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 border-b border-white/10 pb-10 relative z-10">
      <div>
      <h1 className="text-6xl font-black tracking-tighter mb-2 uppercase italic leading-none flex items-center gap-3">
          <span className="gradient-text">JD</span>
          <span className="text-white/30 text-4xl ml-1">|</span> 

        <span className="text-white/90 text-4xl ml-2">Executive Assistant</span> 
        </h1>
        <div className="flex items-center gap-4 mt-3">
          <p className="text-cyan-300/80 font-bold uppercase text-[9px] tracking-[0.4em]">Personal Executive Protocol</p>
          <div className="h-px w-8 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-transparent" />
          <p className="text-white/60 font-mono text-[9px]">SESSION_AUTH: <span className="text-cyan-400">{userName ? userName.toUpperCase() : 'ANONYMOUS'}</span></p>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-4">
          <div className="glass px-5 py-3 rounded-lg flex items-center gap-3 shadow-lg">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-white/20'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">{isLive ? 'LINK_ACTIVE' : 'SYSTEM_OFF'}</span>
          </div>
          <button
            onClick={onToggleAssistant}
            className={`px-10 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg ${
              isLive 
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/50 hover:from-red-500 hover:to-red-600 hover:shadow-red-500/50 active:scale-95' 
              : 'bg-gradient-to-r from-white to-gray-100 text-gray-900 hover:from-gray-100 hover:to-white active:scale-95 shadow-white/20 hover:shadow-white/30'
            }`}
          >
            {isLive ? 'Disengage [Ctrl+0]' : 'Engage [Ctrl+0]'}
          </button>
        </div>
        {errorStatus && (
          <span className="text-red-400 font-mono text-[8px] uppercase tracking-widest animate-pulse max-w-[200px] text-right bg-red-500/10 px-3 py-1 rounded border border-red-500/30">{errorStatus}</span>
        )}
      </div>
    </header>
  );
}
