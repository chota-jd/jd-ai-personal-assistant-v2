'use client';

import { Task, TaskPriority, TaskStatus } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  isUrgent: boolean;
  now: number;
  deletingTaskId: string | null;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

export default function TaskCard({
  task,
  isUrgent,
  now,
  deletingTaskId,
  onComplete,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: TaskCardProps) {
  const isConfirmingDelete = deletingTaskId === task.id;
  const diffMs = task.scheduledTimestamp ? task.scheduledTimestamp - now : null;
  const minutesLeft = diffMs ? Math.ceil(diffMs / 60000) : null;
  const isOverdue = minutesLeft !== null && minutesLeft <= 0;
  const isWarning = minutesLeft !== null && minutesLeft <= 10 && !isOverdue;

  return (
    <div 
      className={`group relative glass-strong border p-7 rounded-xl transition-all duration-300 shadow-lg ${
        isUrgent ? 'border-cyan-400/50 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 shadow-cyan-500/20' : 'border-white/10'
      } ${isWarning ? 'notify-pulse border-yellow-400/50 shadow-yellow-500/30' : ''} ${isOverdue ? 'border-red-400/50 bg-gradient-to-r from-red-500/10 to-red-600/10 shadow-red-500/20' : ''} ${isConfirmingDelete ? 'border-red-500/70 bg-red-500/10 shadow-red-500/30' : ''} hover:shadow-xl hover:scale-[1.01]`}
    >
      <div className="flex items-center gap-10">
        <button 
          onClick={() => !isConfirmingDelete && onComplete(task.id)}
          disabled={isConfirmingDelete}
          className={`w-14 h-14 rounded-lg border-2 border-white/20 flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/40 hover:to-cyan-500/40 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 flex-shrink-0 ${isConfirmingDelete ? 'opacity-20 grayscale' : ''}`}
        >
          <svg className="w-7 h-7 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          {isConfirmingDelete ? (
            <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-400/50" />
                 <span className="text-xs font-black uppercase tracking-widest text-red-300">System Delete Confirmation Required</span>
               </div>
               <p className="text-[10px] text-white/70 uppercase font-mono tracking-tight">Erase: <span className="text-white">{task.name}</span>?</p>
               <div className="flex gap-4">
                  <button 
                    onClick={() => onDelete(task.id)}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:from-red-500 hover:to-red-600 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                  >
                    Erase
                  </button>
                  <button 
                    onClick={onCancelDelete}
                    className="px-6 py-2 glass text-white/80 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/20 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Abort
                  </button>
               </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5 mb-3">
                <h3 className="text-xl font-bold truncate tracking-tight uppercase italic text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:via-blue-300 group-hover:to-purple-300">{task.name}</h3>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${
                  task.priority === TaskPriority.HIGH 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/40' 
                    : task.priority === TaskPriority.MEDIUM
                    ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg shadow-yellow-500/30'
                    : 'glass text-white/70 border border-white/10'
                }`}>
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center gap-8 text-[10px] font-mono">
                {minutesLeft !== null && (
                  <span className={`flex items-center gap-2.5 ${isWarning ? 'text-yellow-300' : isOverdue ? 'text-red-300' : 'text-white/60'}`}>
                    <svg className={`w-4 h-4 ${isWarning ? 'text-yellow-400' : isOverdue ? 'text-red-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isOverdue ? 'OVERDUE_CRITICAL' : `T-MINUS ${minutesLeft} MIN`}
                  </span>
                )}
                <span className="text-white/40 font-bold uppercase tracking-tighter">OBJ_ID: <span className="text-cyan-300/80">{task.id}</span></span>
              </div>
            </>
          )}
        </div>

        {!isConfirmingDelete && (
          <button 
            onClick={() => onConfirmDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 transition-all p-3 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
            title="Delete Task"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
