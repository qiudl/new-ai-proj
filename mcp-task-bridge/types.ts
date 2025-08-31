// 类型定义文件
export interface Task {
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

export interface Project {
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

export interface WorkNote {
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

export interface Document {
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