// 类型定义文件

// UUID and sync metadata mixin for cross-database synchronization
export interface SyncMixin {
  uuid: string;
  sync_source?: string;
  sync_remote_id?: number;
  synced_at?: string;
  sync_version: number;
}

export interface Task extends Partial<SyncMixin> {
  id: number;
  title: string;
  status: 'draft' | 'planning' | 'todo' | 'in_progress' | 'testing' | 'completed' | 'cancelled' | 'on_hold' | 'suspended' | 'blocked' | 'archived';
  project_id: number;
  parent_id?: number | null;
  parent_task_id?: number | null;  // Alternative field name for parent
  description?: string;
  created_at: string;
  updated_at: string;
  due_date?: string | null;
  assignee_id?: number | null;
  estimated_hours?: number;
  actual_hours?: number;
  custom_fields?: {
    priority?: 'low' | 'medium' | 'high';
    estimated_hours?: number;
    tags?: string[];
    [key: string]: any;
  };
}

export interface Project extends Partial<SyncMixin> {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateTaskOptions {
  status?: Task['status'];
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  parent_id?: number;
  estimated_hours?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface SubTaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  estimated_hours?: number | null;
  status?: Task['status'];
  tags?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: Task['status'];
  due_date?: string | null;
  assignee_id?: number | null;
  priority?: 'low' | 'medium' | 'high';
  parent_id?: number | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | { message: string; code?: string };
  message?: string;
  [key: string]: any;
}

export interface TimerData {
  id: number;
  task_id: number;
  started_at: string;
  stopped_at?: string;
  duration_seconds?: number;
  description?: string;
}

export interface WorkNote extends Partial<SyncMixin> {
  id: number;
  title: string;
  content: string;
  type?: 'markdown' | 'text' | 'html';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'private' | 'team' | 'public';
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Document extends Partial<SyncMixin> {
  id: number;
  title: string;
  content: string;
  type?: 'markdown' | 'txt' | 'pdf';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'private' | 'team' | 'public';
  tags?: string[];
  project_id?: number;
  task_id?: number;
  created_at: string;
  updated_at: string;
}

// 工作笔记选项
export interface WorkNoteOptions {
  status?: WorkNote['status'];
  type?: WorkNote['type'];
  visibility?: WorkNote['visibility'];
  tags?: string[];
}

// 文档选项
export interface DocumentOptions {
  status?: Document['status'];
  type?: Document['type'];
  visibility?: Document['visibility'];
  tags?: string[];
  project_id?: number;
}

// 搜索选项
export interface SearchOptions {
  limit?: number;
  page?: number;
  tags?: string[];
}

// 批量操作选项
export interface BatchOptions {
  batch_size?: number;
  skip_existing?: boolean;
  auto_attach?: boolean;
}

// ===== Sync-related types for cross-database synchronization =====

// Entity types that support sync
export type SyncableEntityType = 'task' | 'project' | 'enterprise' | 'user' | 'document' | 'requirement';

// Sync direction
export type SyncDirection = 'to_remote' | 'from_remote';

// Conflict resolution strategy
export type ConflictStrategy = 'newer_wins' | 'local_wins' | 'remote_wins' | 'version_wins';

// Sync request for a single entity
export interface SyncEntityRequest {
  entity_type: SyncableEntityType;
  entity_id: number;
  direction: SyncDirection;
  include_related?: boolean;
  force_update?: boolean;
}

// Sync response for a single entity
export interface SyncEntityResponse {
  success: boolean;
  entity_type: SyncableEntityType;
  uuid: string;
  local_id: number;
  remote_id?: number;
  action: 'created' | 'updated' | 'skipped' | 'conflict' | 'failed';
  sync_version: number;
  synced_at: string;
  message?: string;
  error?: string;
}

// Batch sync request
export interface BatchSyncRequest {
  entities: SyncEntityRequest[];
  strategy?: ConflictStrategy;
  dry_run?: boolean;
}

// Batch sync response
export interface BatchSyncResponse {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: SyncEntityResponse[];
}

// Get entity by UUID request
export interface GetByUUIDRequest {
  entity_type: SyncableEntityType;
  uuid: string;
  source?: 'local' | 'remote';
}

// Sync status for an entity
export interface SyncStatus {
  uuid: string;
  local_id: number;
  remote_id?: number;
  sync_source?: string;
  sync_version: number;
  synced_at?: string;
  is_synced: boolean;
  has_local_changes: boolean;
  has_remote_changes: boolean;
}