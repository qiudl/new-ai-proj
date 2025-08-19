export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: 'high' | 'medium' | 'low';
  progress?: number;
  estimated_hours?: number;
  actual_hours?: number;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
  custom_fields?: Record<string, any>;
  parent_id?: number;
  task_level: number;
  sort_order: number;
  parent_title?: string;
  children_count?: number;
  // AI-enhanced fields
  dependencies?: number[];  // Array of task IDs this task depends on
  tags?: string[];          // AI-generated tags for categorization
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
  project_name?: string;
  total_time_seconds?: number;
}

export type TaskStatus = 'draft' | 'planning' | 'todo' | 'in_progress' | 'testing' | 'completed' | 'cancelled' | 'on_hold' | 'suspended' | 'blocked' | 'archived';

export interface TaskRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  assignee_id?: number;
  due_date?: string;
  custom_fields?: Record<string, any>;
  parent_id?: number;
  sort_order?: number;
  // AI-enhanced fields
  dependencies?: number[];  // Array of task IDs this task depends on
  priority?: 'low' | 'medium' | 'high';
  estimated_hours?: number;
  tags?: string[];          // AI-generated tags for categorization
  // Legacy fields (keeping for backward compatibility)
  actual_hours?: number;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface TaskFilter {
  status?: TaskStatus;
  assignee_id?: number;
  due_after?: string;
  due_before?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface BulkImportRequest {
  tasks: TaskRequest[];
}

export interface BulkImportResponse {
  total_tasks: number;
  success_count: number;
  failure_count: number;
  failed_tasks?: number[];
  imported_tasks: number[];
}

// 批量子任务创建相关接口
export interface SubTaskRow {
  key: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  assignee?: string;
  customFields?: Record<string, any>;
}

export interface BulkSubTaskCreateRequest {
  parentTaskId: number;
  tasks: SubTaskCreateRequest[];
}

export interface SubTaskCreateRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  custom_fields?: Record<string, any>;
  sequence?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Hierarchical task types
export interface HierarchicalTask {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
  custom_fields?: Record<string, any>;
  parent_id?: number;
  task_level: number;
  sort_order: number;
  // AI-enhanced fields
  dependencies?: number[];  // Array of task IDs this task depends on
  priority?: 'low' | 'medium' | 'high';
  estimated_hours?: number;
  tags?: string[];          // AI-generated tags for categorization
  created_at: string;
  updated_at: string;
  children?: HierarchicalTask[];
}

export interface TaskUpdate {
  id: number;
  task_id: number;
  update_type: string;
  old_value?: string;
  new_value?: string;
  updated_by?: number;
  notes?: string;
  created_at: string;
  updated_by_username?: string;
}

export interface TimelineEvent {
  id: number;
  task_id: number;
  event_type: string;
  event_date: string;
  description: string;
  user_id?: number;
  metadata?: Record<string, any>;
  username?: string;
  task_title?: string;
}