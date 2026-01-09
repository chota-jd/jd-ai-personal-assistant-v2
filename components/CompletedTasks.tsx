'use client';

import { Task } from '@/lib/types';

interface CompletedTasksProps {
  completedTasks: Task[];
  onDelete: (id: string) => void;
}

export default function CompletedTasks({ completedTasks, onDelete }: CompletedTasksProps) {
  if (completedTasks.length === 0) return null;

  return (
    <div className="mt-12 md:mt-24 pt-8 md:pt-12 border-t border-white/10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6 md:mb-8">
        <h4 className="text-[10px] text-white/60 font-black uppercase tracking-[0.5em]">Operation_Archives</h4>
        <span className="text-white/50 text-[9px] font-mono bg-white/5 px-3 py-1 rounded border border-white/10">COUNT: {completedTasks.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-5">
        {completedTasks.slice(0, 6).map(t => (
          <div key={t.id} className="glass p-4 md:p-5 flex items-center gap-4 md:gap-5 opacity-60 hover:opacity-100 transition-all grayscale hover:grayscale-0 relative group/archive rounded-lg border border-white/10 hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10 w-full">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-400/50 flex items-center justify-center rounded-lg flex-shrink-0">
               <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase truncate block text-white/80">{t.name}</span>
              <span className="text-[8px] font-mono text-emerald-400/60">EXEC_SUCCESS</span>
            </div>
            <button 
              onClick={() => onDelete(t.id)}
              className="opacity-100 sm:opacity-0 sm:group-hover/archive:opacity-100 transition-all p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg flex-shrink-0"
            >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
