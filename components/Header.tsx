'use client';

interface HeaderProps {
  userName: string | null;
  isLive: boolean;
  errorStatus: string | null;
  onToggleAssistant: () => void;
}

export default function Header({ userName, isLive, errorStatus, onToggleAssistant }: HeaderProps) {
  return (
    <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 border-b border-zinc-900 pb-10 relative z-10">
      <div>
        <h1 className="text-6xl font-black tracking-tighter mb-2 uppercase italic leading-none text-white flex items-center gap-3">
          JD <span className="text-zinc-800">/</span> Executive Assistant
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-zinc-600 font-bold uppercase text-[9px] tracking-[0.4em]">Personal Executive Protocol</p>
          <div className="h-px w-8 bg-zinc-800" />
          <p className="text-zinc-500 font-mono text-[9px]">SESSION_AUTH: {userName ? userName.toUpperCase() : 'ANONYMOUS'}</p>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-950 border border-zinc-900 px-5 py-3 rounded-sm flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-zinc-800'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{isLive ? 'LINK_ACTIVE' : 'SYSTEM_OFF'}</span>
          </div>
          <button
            onClick={onToggleAssistant}
            className={`px-10 py-4 rounded-sm font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
              isLive 
              ? 'bg-red-950 text-red-500 border border-red-900/40 hover:bg-red-900 hover:text-white' 
              : 'bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            }`}
          >
            {isLive ? 'Disengage [Ctrl+0]' : 'Engage [Ctrl+0]'}
          </button>
        </div>
        {errorStatus && (
          <span className="text-red-500 font-mono text-[8px] uppercase tracking-widest animate-pulse max-w-[200px] text-right">{errorStatus}</span>
        )}
      </div>
    </header>
  );
}
