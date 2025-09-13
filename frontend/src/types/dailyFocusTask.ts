export type DailyFocusTaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface DailyFocusTask {
  id: number;
  task_id: number;
  task_title: string;
  task_description?: string;
  task_status: string;
  task_priority?: string;
  task_progress?: number;
  task_due_date?: string;
  task_assignee_name?: string;
  project_id: number;
  project_name?: string;
  priority: DailyFocusTaskPriority;
  notes?: string;
  sort_order: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  enterprise_id: number;
}

export interface DailyFocusTaskRequest {
  task_id: number;
  priority: DailyFocusTaskPriority;
  notes?: string;
  sort_order?: number;
}

export interface DailyFocusTaskUpdate {
  priority?: DailyFocusTaskPriority;
  notes?: string;
  sort_order?: number;
}

export interface DailyFocusTaskReorderItem {
  id: number;
  sort_order: number;
}

export interface DailyFocusTaskStats {
  total_count: number;
  completed_count: number;
  pending_count: number;
  completion_rate: number;
  priority_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface DailyFocusTaskFilter {
  priority?: DailyFocusTaskPriority;
  completed?: boolean;
  search?: string;
}

export interface DailyFocusTaskResponse {
  tasks: DailyFocusTask[];
  stats: DailyFocusTaskStats;
  total_count: number;
}

export interface DailyFocusTaskBatchRequest {
  task_ids: number[];
  priority?: DailyFocusTaskPriority;
  notes?: string;
}

export interface DailyFocusTaskBatchResponse {
  success_count: number;
  failure_count: number;
  failed_task_ids: number[];
  success_task_ids: number[];
}