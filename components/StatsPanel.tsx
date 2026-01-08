'use client';

import { Task, TaskPriority, TaskStatus } from '@/lib/types';

interface StatsPanelProps {
  tasks: Task[];
  pendingTasks: Task[];
  completedTasks: Task[];
  urgentTask: Task | undefined;
}

export default function StatsPanel({ tasks, pendingTasks, completedTasks, urgentTask }: StatsPanelProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-sm relative overflow-hidden group">
      <h2 className="text-zinc-600 uppercase text-[9px] font-black tracking-widest mb-10 flex items-center gap-2">
        <span className="w-1 h-1 bg-zinc-600 rounded-full animate-ping" /> Logic_Core
      </h2>
      <div className="space-y-8">
        <div className="flex justify-between items-end border-b border-zinc-900/50 pb-5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">Pending_Targets</span>
          <span className="text-4xl font-mono leading-none tracking-tighter">{pendingTasks.length}</span>
        </div>
        <div className="flex justify-between items-end border-b border-zinc-900/50 pb-5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase">Completion_Ratio</span>
          <span className="text-4xl font-mono leading-none tracking-tighter text-zinc-400">
            {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}<span className="text-lg opacity-30">%</span>
          </span>
        </div>
        <div className="pt-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-3">Priority_Focus</span>
          <div className={`text-[11px] font-black uppercase px-4 py-2 border rounded-sm inline-block ${
            urgentTask?.priority === TaskPriority.HIGH 
            ? 'bg-red-950/20 text-red-500 border-red-900/50' 
            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
          }`}>
            {urgentTask ? (urgentTask.name.length > 20 ? urgentTask.name.substring(0, 20) + '...' : urgentTask.name) : 'OPERATIONAL_IDLE'}
          </div>
        </div>
      </div>
    </div>
  );
}
