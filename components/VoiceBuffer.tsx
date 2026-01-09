'use client';

interface VoiceBufferProps {
  isLive: boolean;
  isProcessing: boolean;
  userInputLog: string;
  jdOutputLog: string;
}

export default function VoiceBuffer({ isLive, isProcessing, userInputLog, jdOutputLog }: VoiceBufferProps) {
  return (
    <div className="glass-strong p-6 md:p-8 rounded-xl min-h-[180px] md:min-h-[220px] relative flex flex-col shadow-2xl border-white/10 w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5 opacity-50 rounded-xl" />
      <h2 className="text-cyan-300/90 uppercase text-[9px] font-black tracking-widest mb-4 md:mb-6 flex justify-between items-center relative z-10">
        <span>Voice_Buffer</span>
        {isProcessing && <span className="text-cyan-400 animate-pulse flex items-center gap-1">
          <span className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />PROC_
        </span>}
      </h2>
      
      <div className="flex-1 space-y-3 md:space-y-4 overflow-hidden relative z-10">
        {isLive ? (
          <>
            <div className={`transition-all duration-300 ${userInputLog ? 'opacity-100' : 'opacity-30'}`}>
              <p className="text-cyan-300/80 text-[8px] uppercase font-black mb-1">User_Input</p>
              <p className="text-white/90 text-xs italic font-medium leading-relaxed truncate-2-lines">
                {userInputLog || "Listening..."}
              </p>
            </div>
            <div className={`transition-all duration-300 ${jdOutputLog ? 'opacity-100' : 'opacity-30'}`}>
              <p className="text-purple-300/80 text-[8px] uppercase font-black mb-1">JD_Output</p>
              <p className="text-white/80 text-xs font-medium leading-relaxed truncate-2-lines">
                {jdOutputLog || "Waiting..."}
              </p>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest text-center leading-loose">Standby_For_Auth<br/>[Ctrl+0]</p>
          </div>
        )}
      </div>
    </div>
  );
}
