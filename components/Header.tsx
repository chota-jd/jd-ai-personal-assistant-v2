'use client';

interface HeaderProps {
  userName: string | null;
  isLive: boolean;
  errorStatus: string | null;
  onToggleAssistant: () => void;
}

export default function Header({ userName, isLive, errorStatus, onToggleAssistant }: HeaderProps) {
  return (
    <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-16 border-b border-white/10 pb-6 md:pb-10 relative z-10 px-4 md:px-0">
      <div className="w-full md:w-auto">
        <h1 className="font-black tracking-tighter mb-2 uppercase italic leading-none flex items-center gap-2 sm:gap-3">
          <span className="gradient-text text-4xl sm:text-5xl md:text-6xl">JD</span>
          <span className="text-white/30 text-3xl sm:text-4xl md:text-5xl">/</span> 
          <span className="text-white/90 text-xl sm:text-2xl md:text-3xl">Executive Assistant</span> 
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-4">
          <p className="text-cyan-300/80 font-bold uppercase text-xs sm:text-sm tracking-[0.3em] sm:tracking-[0.4em]">Personal Executive Protocol</p>
          <div className="hidden sm:block h-px w-8 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-transparent" />
          <p className="text-white/60 font-mono text-xs sm:text-sm">SESSION_AUTH: <span className="text-cyan-400">{userName ? userName.toUpperCase() : 'ANONYMOUS'}</span></p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full md:w-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="glass px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg flex items-center justify-center sm:justify-start gap-3 shadow-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-white/20'}`} />
            <span className="text-xs sm:text-sm font-semibold tracking-widest text-white/90">{isLive ? 'LINK_ACTIVE' : 'SYSTEM_OFF'}</span>
          </div>
          <button
            onClick={onToggleAssistant}
            className={`px-4 sm:px-4 py-3.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm  tracking-wider transition-all duration-300 shadow-lg ${
              isLive 
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/50 hover:from-red-500 hover:to-red-600 hover:shadow-red-500/50' 
              : 'bg-gradient-to-r from-white to-gray-100 font-semibold text-black border border-white/20 hover:from-gray-100 hover:to-white  shadow-white/20 hover:shadow-white/30'
            }`}
          >
            {isLive ? 'Disengage [Ctrl+0]' : 'Engage [Ctrl+0]'}
          </button>
        </div>
        {errorStatus && (
          <span className="text-red-400 font-mono text-[8px] uppercase tracking-widest animate-pulse w-full sm:max-w-[200px] text-center sm:text-right bg-red-500/10 px-3 py-1 rounded border border-red-500/30">{errorStatus}</span>
        )}
      </div>
    </header>
  );
}