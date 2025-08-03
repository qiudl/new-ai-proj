// Timer system types for task timing functionality
// 任务#243: 扩展统一计时器类型定义

// 基础API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 统一计时器类型枚举
export type TaskType = 'project_task' | 'personal_task' | 'quick_timer' | 'pomodoro';
export type TimerStatusType = 'running' | 'paused' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high';
export type Mood = 'focused' | 'distracted' | 'tired' | 'energetic' | 'neutral';

// 统一计时器状态接口
export interface TimerStatus {
  id: number;
  user_id: number;
  target_type: TaskType;
  target_id?: number;
  target_title: string;
  target_metadata?: Record<string, any>;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  actual_work_seconds?: number;
  status: TimerStatusType;
  pause_count: number;
  pause_total_seconds: number;
  pause_events: PauseEvent[];
  category?: string;
  tags: string[];
  priority?: Priority;
  description?: string;
  work_location?: string;
  mood?: Mood;
  interruption_count: number;
  project_id?: number;
  parent_task_id?: number;
  template_id?: number;
  inference_confidence?: number;
  inference_reasoning: string[];
  user_feedback?: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  source_type: string;
}

// 暂停事件接口
export interface PauseEvent {
  paused_at: string;
  resumed_at?: string;
  duration?: number;
  reason?: string;
}

// 统一启动计时器请求接口
export interface StartTimerRequest {
  task_type?: TaskType;
  task_id?: number;
  title: string;
  category?: string;
  estimated_minutes?: number;
  tags?: string[];
  template_id?: number;
  auto_stop_others?: boolean;
  description?: string;
  priority?: Priority;
  work_location?: string;
  metadata?: Record<string, any>;
}

// 智能建议接口
export interface TimerSuggestion {
  id: number;
  title: string;
  category: string;
  estimated_minutes: number;
  confidence: number;
  reasoning: string[];
  tags: string[];
  template_id?: number;
  priority?: Priority;
  task_type?: TaskType;
}

// 计时模板接口
export interface TimerTemplate {
  id: number;
  user_id?: number;
  name: string;
  description?: string;
  target_type: TaskType;
  default_title?: string;
  default_category?: string;
  default_duration_minutes?: number;
  default_tags?: string[];
  default_metadata?: Record<string, any>;
  auto_start?: boolean;
  auto_break_reminder?: boolean;
  break_duration_minutes?: number;
  daily_limit_hours?: number;
  usage_count?: number;
  last_used_at?: string;
  is_system_template?: boolean;
  is_shared?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 键盘快捷键接口
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
  description: string;
  enabled?: boolean;
}

// 旧版计时器请求接口（兼容性）
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

export interface TimerPauseResponse {
  task_id: number;
  task_title: string;
  elapsed_seconds: number;
  formatted_time: string;
  status: string;
  message: string;
}

export interface TimerResumeResponse {
  task_id: number;
  task_title: string;
  status: string;
  message: string;
}

export interface TimerCurrentResponse {
  is_running: boolean;
  is_paused?: boolean;
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
  isPaused?: boolean;
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