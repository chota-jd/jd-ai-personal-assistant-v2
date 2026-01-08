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
      className={`group relative bg-zinc-950 border p-7 transition-all duration-300 ${
        isUrgent ? 'border-zinc-700 bg-gradient-to-r from-zinc-950 to-zinc-900/50' : 'border-zinc-900'
      } ${isWarning ? 'notify-pulse border-white/20' : ''} ${isOverdue ? 'border-red-900/40 bg-red-950/5' : ''} ${isConfirmingDelete ? 'border-red-600 bg-red-950/10' : ''}`}
    >
      <div className="flex items-center gap-10">
        <button 
          onClick={() => !isConfirmingDelete && onComplete(task.id)}
          disabled={isConfirmingDelete}
          className={`w-14 h-14 rounded-sm border border-zinc-800 flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all duration-300 flex-shrink-0 ${isConfirmingDelete ? 'opacity-20 grayscale' : ''}`}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          {isConfirmingDelete ? (
            <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                 <span className="text-xs font-black uppercase tracking-widest text-red-500">System Delete Confirmation Required</span>
               </div>
               <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-tight">Erase: <span className="text-zinc-200">{task.name}</span>?</p>
               <div className="flex gap-4">
                  <button 
                    onClick={() => onDelete(task.id)}
                    className="px-6 py-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-red-500 transition-colors"
                  >
                    Erase
                  </button>
                  <button 
                    onClick={onCancelDelete}
                    className="px-6 py-2 bg-zinc-900 text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-sm border border-zinc-800 hover:text-white transition-colors"
                  >
                    Abort
                  </button>
               </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5 mb-3">
                <h3 className="text-xl font-bold truncate tracking-tight uppercase italic text-zinc-100 group-hover:text-white">{task.name}</h3>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-sm ${
                  task.priority === TaskPriority.HIGH ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center gap-8 text-[10px] font-mono">
                {minutesLeft !== null && (
                  <span className={`flex items-center gap-2.5 ${isWarning ? 'text-white' : isOverdue ? 'text-red-500' : 'text-zinc-600'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isOverdue ? 'OVERDUE_CRITICAL' : `T-MINUS ${minutesLeft} MIN`}
                  </span>
                )}
                <span className="text-zinc-800 font-bold uppercase tracking-tighter">OBJ_ID: {task.id}</span>
              </div>
            </>
          )}
        </div>

        {!isConfirmingDelete && (
          <button 
            onClick={() => onConfirmDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-3 text-zinc-700 hover:text-red-500"
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
