// Timer system types for task timing functionality

export interface TimerStartRequest {
  task_id: number;
}

export interface TimerStartResponse {
  task_id: number;
  task_title: string;
  start_time: string;
  status: string;
  message: string;
}

export interface TimerStopResponse {
  task_id: number;
  task_title: string;
  duration_seconds: number;
  formatted_time: string;
  status: string;
  message: string;
}

export interface TimerCurrentResponse {
  is_running: boolean;
  task_id?: number;
  task_title?: string;
  start_time?: string;
  elapsed_seconds: number;
  formatted_time: string;
}

export interface RecentTimedTask {
  task_id: number;
  task_title: string;
  project_name: string;
  last_timed_at: string;
  total_seconds: number;
  formatted_time: string;
  status: string;
}

export interface TaskTimeBreakdown {
  task_id: number;
  task_title: string;
  project_name: string;
  total_seconds: number;
  formatted_time: string;
}

export interface TimerStatsResponse {
  today_total_seconds: number;
  today_formatted_time: string;
  completed_tasks_today: number;
  in_progress_tasks: number;
  recent_tasks: RecentTimedTask[];
  task_time_breakdown: TaskTimeBreakdown[];
}

export interface TaskTimeLog {
  id: number;
  task_id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

// Timer state management
export interface TimerState {
  isRunning: boolean;
  taskId?: number;
  taskTitle?: string;
  startTime?: Date;
  elapsedSeconds: number;
  formattedTime: string;
}

// Task selection options
export interface TaskOption {
  id: number;
  title: string;
  project_name: string;
  status: string;
}