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
    <div className="glass-strong p-6 md:p-8 rounded-xl relative overflow-hidden group shadow-2xl border-white/10 w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-50" />
      <h2 className="text-cyan-300/90 uppercase text-[9px] font-black tracking-widest mb-6 md:mb-10 flex items-center gap-2 relative z-10">
        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping shadow-lg shadow-cyan-400/50" /> Logic_Core
      </h2>
      <div className="space-y-6 md:space-y-8 relative z-10">
        <div className="flex justify-between items-end border-b border-white/10 pb-4 md:pb-5">
          <span className="text-[10px] text-white/70 font-bold uppercase">Pending_Targets</span>
          <span className="text-3xl md:text-4xl font-mono leading-none tracking-tighter bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{pendingTasks.length}</span>
        </div>
        <div className="flex justify-between items-end border-b border-white/10 pb-4 md:pb-5">
          <span className="text-[10px] text-white/70 font-bold uppercase">Completion_Ratio</span>
          <span className="text-3xl md:text-4xl font-mono leading-none tracking-tighter bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}<span className="text-base md:text-lg opacity-50">%</span>
          </span>
        </div>
        <div className="pt-2">
          <span className="text-[10px] text-white/70 font-bold uppercase block mb-3">Priority_Focus</span>
          <div className={`text-[11px] font-black uppercase px-3 md:px-4 py-2 rounded-lg inline-block transition-all ${
            urgentTask?.priority === TaskPriority.HIGH 
            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-400/50 shadow-lg shadow-red-500/20' 
            : 'glass text-white/60 border border-white/10'
          }`}>
            {urgentTask ? (urgentTask.name.length > 20 ? urgentTask.name.substring(0, 20) + '...' : urgentTask.name) : 'OPERATIONAL_IDLE'}
          </div>
        </div>
      </div>
    </div>
  );
}
