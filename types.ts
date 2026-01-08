
export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed'
}

export interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  deadline?: string;
  scheduledTimestamp?: number; // Absolute time for notifications
  notified: boolean; // Tracking if 10m warning was played
  status: TaskStatus;
  createdAt: number;
}

export interface AppState {
  tasks: Task[];
  isListening: boolean;
  isProcessing: boolean;
  highestPriorityTask: Task | null;
}
