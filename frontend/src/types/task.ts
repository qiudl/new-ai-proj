export type CustomFields = Record<string, any>;

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
  // Enhanced time management fields
  start_datetime?: string;
  due_datetime?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  time_unit_preference?: 'auto' | 'hours' | 'minutes' | 'days';
  work_hours_per_day?: number;
  time_tracking_mode?: 'manual' | 'automatic' | 'hybrid';
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
  priority?: 'low' | 'medium' | 'high';
  due_after?: string;
  due_before?: string;
  search?: string; // free-text search
  q?: string; // alias for search used by some endpoints
  task_id?: number;
  only_roots?: boolean;
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

// Enhanced Timeline Event Types
export type TaskTimelineEventType = 
  // 基础操作
  | 'created' | 'updated' | 'deleted' | 'restored'
  // 状态变更
  | 'status_changed' | 'completed' | 'started' | 'paused' | 'cancelled'
  // 分配和权限
  | 'assigned' | 'unassigned' | 'reassigned' | 'permission_changed'
  // 时间管理
  | 'deadline_changed' | 'due_date_extended' | 'schedule_updated'
  | 'time_logged' | 'estimate_updated'
  // 内容变更
  | 'title_changed' | 'description_updated' | 'priority_changed'
  | 'tags_updated' | 'attachment_added' | 'attachment_removed'
  // 关系变更
  | 'dependency_added' | 'dependency_removed' | 'parent_changed'
  | 'child_added' | 'child_removed'
  // 协作和沟通
  | 'comment_added' | 'comment_updated' | 'comment_deleted'
  | 'mention_added' | 'review_requested' | 'approval_given'
  // 系统操作
  | 'bulk_updated' | 'imported' | 'exported' | 'archived'
  | 'template_applied' | 'automation_triggered';

// Enhanced Timeline Event Metadata
export interface TaskTimelineEventMetadata {
  // 变更内容
  old_value?: any;
  new_value?: any;
  changed_fields?: string[];
  
  // 变更上下文
  change_reason?: string;
  change_source?: 'manual' | 'api' | 'bulk' | 'automation' | 'integration';
  batch_id?: string;  // 批量操作标识
  
  // 用户上下文
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  
  // 业务上下文
  project_phase?: string;
  workflow_step?: string;
  approval_chain?: any[];
  
  // 影响范围
  affected_tasks?: number[];
  cascade_changes?: boolean;
  
  // 时间相关
  duration_ms?: number;
  scheduled_at?: string;
  
  // 优先级和状态信息
  priority?: 'low' | 'medium' | 'high';
  new_status?: TaskStatus;
  old_status?: TaskStatus;
  
  // 额外信息
  custom_data?: Record<string, any>;
}

export interface TimelineEvent {
  id: number;
  task_id: number;
  event_type: TaskTimelineEventType;
  event_date: string;
  description: string;
  user_id?: number;
  metadata?: TaskTimelineEventMetadata;
  username?: string;
  task_title?: string;
  
  // 新增字段
  project_id?: number;
  correlation_id?: string;  // 关联ID，用于追踪相关事件
  parent_event_id?: number; // 父事件ID，用于事件层级关系
  severity?: 'info' | 'warning' | 'error' | 'critical'; // 事件严重性
  category?: 'system' | 'user' | 'automation' | 'integration'; // 事件分类
  
  created_at?: string;
  updated_at?: string;
}

// Timeline Event Group - 事件分组
export interface TimelineEventGroup {
  id: string;
  group_type: 'single' | 'batch' | 'session';
  time_range: {
    start: string;
    end: string;
  };
  events: TimelineEvent[];
  summary: string;
  affected_fields: string[];
  batch_id?: string;
  event_count: number;
}

// Timeline Event Filter - 时间线事件过滤器
export interface TimelineEventFilter {
  task_id?: number;
  task_ids?: number[];
  project_id?: number;
  event_types?: TaskTimelineEventType[];
  user_ids?: number[];
  categories?: ('system' | 'user' | 'automation' | 'integration')[];
  severities?: ('info' | 'warning' | 'error' | 'critical')[];
  start_date?: string;
  end_date?: string;
  batch_id?: string;
  include_system?: boolean;
  
  // 分页参数
  page?: number;
  page_size?: number;
  
  // 排序参数
  sort_by?: 'event_date' | 'created_at' | 'severity';
  sort_order?: 'asc' | 'desc';
}

// Timeline Statistics - 时间线统计
export interface TimelineStatistics {
  total_events: number;
  event_types_distribution: { [key in TaskTimelineEventType]?: number };
  user_activity: { user_id: number; username: string; event_count: number }[];
  daily_activity: { date: string; event_count: number }[];
  severity_distribution: { [key in 'info' | 'warning' | 'error' | 'critical']?: number };
  category_distribution: { [key in 'system' | 'user' | 'automation' | 'integration']?: number };
  most_active_days: string[];
  peak_hours: number[];
}