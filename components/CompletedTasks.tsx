'use client';

import { Task } from '@/lib/types';

interface CompletedTasksProps {
  completedTasks: Task[];
  onDelete: (id: string) => void;
}

export default function CompletedTasks({ completedTasks, onDelete }: CompletedTasksProps) {
  if (completedTasks.length === 0) return null;

  return (
    <div className="mt-24 pt-12 border-t border-zinc-900/50">
      <div className="flex justify-between items-center mb-8">
        <h4 className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em]">Operation_Archives</h4>
        <span className="text-zinc-900 text-[9px] font-mono">COUNT: {completedTasks.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {completedTasks.slice(0, 6).map(t => (
          <div key={t.id} className="bg-zinc-950/50 border border-zinc-900 p-5 flex items-center gap-5 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 relative group/archive">
            <div className="w-6 h-6 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-sm">
               <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase truncate block text-zinc-400">{t.name}</span>
              <span className="text-[8px] font-mono text-zinc-800">EXEC_SUCCESS</span>
            </div>
            <button 
              onClick={() => onDelete(t.id)}
              className="opacity-0 group-hover/archive:opacity-100 transition-opacity p-2 text-zinc-800 hover:text-red-500 absolute right-2"
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
