'use client';

interface VoiceBufferProps {
  isLive: boolean;
  isProcessing: boolean;
  userInputLog: string;
  jdOutputLog: string;
}

export default function VoiceBuffer({ isLive, isProcessing, userInputLog, jdOutputLog }: VoiceBufferProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-sm min-h-[220px] relative flex flex-col">
      <h2 className="text-zinc-600 uppercase text-[9px] font-black tracking-widest mb-6 flex justify-between items-center">
        <span>Voice_Buffer</span>
        {isProcessing && <span className="text-white animate-pulse">PROC_</span>}
      </h2>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        {isLive ? (
          <>
            <div className={`transition-opacity duration-300 ${userInputLog ? 'opacity-100' : 'opacity-20'}`}>
              <p className="text-zinc-600 text-[8px] uppercase font-black mb-1">User_Input</p>
              <p className="text-zinc-200 text-xs italic font-medium leading-relaxed truncate-2-lines">
                {userInputLog || "Listening..."}
              </p>
            </div>
            <div className={`transition-opacity duration-300 ${jdOutputLog ? 'opacity-100' : 'opacity-20'}`}>
              <p className="text-white text-[8px] uppercase font-black mb-1">JD_Output</p>
              <p className="text-zinc-400 text-xs font-medium leading-relaxed truncate-2-lines">
                {jdOutputLog || "Waiting..."}
              </p>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-zinc-800 text-[9px] font-black uppercase tracking-widest text-center leading-loose">Standby_For_Auth<br/>[Ctrl+0]</p>
          </div>
        )}
      </div>
    </div>
  );
}
