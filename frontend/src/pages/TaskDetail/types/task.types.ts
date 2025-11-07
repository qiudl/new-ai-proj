/**
 * Task-related type definitions
 */

// ✅ FIXED - Import Task from central types to avoid type duplication (TS2322, TS2304)
import type { Task } from '../../../types/task';
export type { Task };

// ========== Core Task Types ==========

// Note: Task interface now imported from central types
// Keeping this commented for reference of what fields were here
/*
export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: number;
  parent_id?: number;
  due_date?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Additional fields
  task_level?: number;
  sort_order?: number;
  children_count?: number;
  depth?: number;
  has_children?: boolean;
  dependencies?: number[];
  estimated_hours?: number;
  actual_hours?: number;
  completion_percentage?: number;
}
*/

export type TaskStatus = 
  | 'draft'
  | 'planning'
  | 'todo'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'cancelled'
  | 'on_hold'
  | 'suspended'
  | 'blocked'
  | 'archived';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

// ========== Task Relations ==========

export interface TaskRelations {
  parent: Task | null;
  subtasks: Task[];
  siblings: Task[];
  dependencies?: Task[];
  dependents?: Task[];
}

export interface TaskHierarchy {
  task: Task;
  children: TaskHierarchy[];
  level: number;
  path: number[];
}

// ========== Task Progress ==========

export interface TaskProgress {
  completionRate: number;
  totalSubtasks: number;
  completedSubtasks: number;
  inProgressSubtasks: number;
  todoSubtasks: number;
  blockedSubtasks: number;
  timeSpent: number;
  estimatedTime: number;
  remainingTime: number;
  efficiency: EfficiencyMetrics;
}

export interface EfficiencyMetrics {
  plannedVsActual: number;
  velocityTrend: number[];
  productivityScore: number;
  qualityScore: number;
}

// ========== Task Statistics ==========

export interface TaskStatistics {
  completion: CompletionStats;
  time: TimeStats;
  quality: QualityStats;
  team: TeamStats;
}

export interface CompletionStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  blocked: number;
  rate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeStats {
  totalEstimated: number;
  totalActual: number;
  totalRemaining: number;
  averageCompletionTime: number;
  overdueCount: number;
}

export interface QualityStats {
  bugCount: number;
  reworkCount: number;
  reviewScore: number;
  testCoverage: number;
}

export interface TeamStats {
  assignedMembers: number;
  activeMembers: number;
  workload: Record<number, number>;
  productivity: Record<number, number>;
}

// ========== Task Operations ==========

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: number;
  due_date?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface TaskCreate {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id: number;
  parent_id?: number;
  assignee_id?: number;
  due_date?: string;
  tags?: string[];
  estimated_hours?: number;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee_id?: number[];
  tags?: string[];
  search?: string;
  parent_id?: number;
  has_children?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface TaskSort {
  field: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'status';
  direction: 'asc' | 'desc';
}

// ========== Task Permissions ==========

export interface TaskPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
  canAssign: boolean;
  canComment: boolean;
  canAttachFiles: boolean;
  canManageSubtasks: boolean;
  canManageDependencies: boolean;
}

// ========== Task Timeline ==========

export interface TaskTimelineEvent {
  id: string;
  task_id: number;
  type: TimelineEventType;
  actor_id: number;
  actor_name: string;
  timestamp: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export type TimelineEventType = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'commented'
  | 'file_attached'
  | 'subtask_added'
  | 'subtask_completed'
  | 'dependency_added'
  | 'dependency_removed';

// ========== Task Batch Operations ==========

export interface TaskBatchOperation {
  type: 'update' | 'delete' | 'archive' | 'move';
  task_ids: number[];
  data?: any;
  options?: {
    include_subtasks?: boolean;
    preserve_hierarchy?: boolean;
    skip_validation?: boolean;
  };
}

export interface TaskBatchResult {
  success: number[];
  failed: Array<{
    task_id: number;
    error: string;
  }>;
  total: number;
  duration: number;
}

// ========== Task Export/Import ==========

export interface TaskExport {
  version: string;
  exported_at: string;
  tasks: Task[];
  relations: TaskRelations[];
  metadata: {
    project_id: number;
    total_tasks: number;
    export_format: 'json' | 'csv' | 'xml';
  };
}

export interface TaskImport {
  format: 'json' | 'csv' | 'xml';
  data: string | File;
  options: {
    preserve_ids?: boolean;
    skip_existing?: boolean;
    update_existing?: boolean;
    parent_id?: number;
  };
}