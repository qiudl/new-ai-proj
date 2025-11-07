// Document management types

export interface DocumentFolder {
  id: number;
  name: string;
  description?: string;
  parent_folder_id?: number;
  owner_id: number;
  visibility: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  // Additional fields for tree view
  children?: DocumentFolder[];
  documents_count?: number;
  subfolders_count?: number;
  owner_name?: string;
}

export type DocumentType = 'markdown' | 'html' | 'text' | 'json' | 'code' | 'pdf' | 'word' | 'excel' | 'image';
export type DocumentStatus = 'draft' | 'published' | 'archived';
export type DocumentVisibility = 'private' | 'team' | 'public';

// Phase 6: 统一文档类型 - 合并了UnifiedDocument, SimpleDocument, AdvancedTaskDocumentResponse
export interface Document {
  id: number;
  folder_id?: number;
  title: string;
  name?: string; // Alternative name field for compatibility
  content?: string;
  content_size?: number;
  type: DocumentType;
  status: DocumentStatus;
  file_url?: string;
  file_size?: number;
  file_extension?: string; // Added file extension property
  mime_type?: string;
  description?: string;
  tags: string[];
  metadata?: Record<string, any>;
  owner_id: number;
  visibility: 'private' | 'team' | 'public';
  version: number;
  parent_document_id?: number;
  is_template: boolean;
  is_favorite?: boolean;
  is_starred?: boolean; // Alias for is_favorite
  created_at: string;
  updated_at: string;
  created_by: number;
  // Additional fields for display
  owner_name?: string;
  folder_name?: string;
  creator_name?: string;
  // Business entity relationships
  project_id?: number;
  project_name?: string;
  customer_id?: number;
  customer_name?: string;
  task_id?: number;  // Phase 6: 添加任务关联
  task_title?: string;  // Phase 6: 添加任务标题
  // Categories
  category?: string;
  subcategory?: string;
  // Sharing
  shared_with?: string[];
  can_edit?: boolean;
  can_share?: boolean;
  can_delete?: boolean;  // Phase 6: 添加删除权限
  // Document state (for task documents)
  document_id?: number;  // Phase 6: 文档ID（当Document是关联记录时）
  document_exists?: boolean;  // Phase 6: 文档是否存在
  relations?: DocumentRelation[];  // Phase 6: 文档关系列表
  last_modified?: string;  // Phase 6: 最后修改时间
  // Rendering support
  createElement?: any;
}

export interface DocumentRelation {
  id: number;
  document_id: number;
  entity_type: 'customer' | 'project' | 'task';
  entity_id: number;
  relation_type: string;
  description?: string;
  created_at: string;
  created_by: number;
  updated_at?: string;
  // Additional fields for display
  entity_name?: string;
  creator_name?: string;
}

export interface DocumentCollaborator {
  id: number;
  document_id: number;
  user_id: number;
  permission_level: 'read' | 'comment' | 'edit' | 'admin';
  expires_at?: string;
  created_at: string;
  created_by: number;
  // Additional fields for display
  user_name: string;
  user_email: string;
  user_avatar?: string;
  creator_name: string;
}

export interface ShareLink {
  id: number;
  document_id: number;
  token: string;
  permission_level: 'read' | 'comment';
  expires_at?: string;
  password?: string;
  max_views?: number;
  current_views: number;
  is_active: boolean;
  created_at: string;
  created_by: number;
  creator_name: string;
}

export interface DocumentComment {
  id: number;
  document_id: number;
  user_id: number;
  content: string;
  created_at: string;
  // Additional fields for display
  user_name: string;
  user_avatar?: string;
}

// Search-related types
export interface SearchDocument extends Document {
  score?: number;
  highlights?: {
    title?: string[];
    content?: string[];
    description?: string[];
  };
}

export interface SearchFilters {
  type?: string[];
  status?: string[];
  tags?: string[];
  owner_id?: number[];
  folder_id?: number[];
  visibility?: string[];
  date_range?: [string, string];
  file_size_range?: [number, number];
  is_favorite?: boolean;
}

export interface DocumentFilter {
  folder_id?: number;
  type?: DocumentType[];
  status?: DocumentStatus[];
  owner_id?: number;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'title' | 'updated_at' | 'created_at';
  order?: 'asc' | 'desc';
  project_id?: number;
  task_id?: number;
  customer_id?: number;
  category?: string;
  visibility?: string;
  include_deleted?: boolean;
}

// API Request/Response types
export interface CreateDocumentRequest {
  folder_id?: number;
  title: string;
  content?: string;
  type: DocumentType;
  status?: DocumentStatus;
  description?: string;
  tags?: string[];
  visibility?: 'private' | 'team' | 'public';
  is_template?: boolean;
  metadata?: Record<string, any>;
  project_id?: number;
  customer_id?: number;
  task_id?: number; // ✅ FIXED - Added task_id to support task-document linking (TS2353)
  shared_with?: string[];
  category?: string;
  subcategory?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  type?: DocumentType;
  description?: string;
  tags?: string[];
  visibility?: 'private' | 'team' | 'public';
  status?: DocumentStatus;
  metadata?: Record<string, any>;
  project_id?: number;
  customer_id?: number;
  task_id?: number; // ✅ FIXED - Added task_id to support task-document linking (TS2353)
  shared_with?: string[];
  is_template?: boolean;
  category?: string;
  due_date?: string;
  priority?: string;
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  has_more?: boolean;
}

export interface DocumentListItem {
  id: number;
  title: string;
  name?: string; // Alternative name field for compatibility
  type: DocumentType;
  status: DocumentStatus;
  owner_name: string;
  folder_name?: string;
  tags: string[];
  updated_at: string;
  file_size?: number;
  file_url?: string;
  is_favorite?: boolean;
  task_id?: number; // Task relationship
  content?: string; // Document content
  visibility?: 'private' | 'team' | 'public'; // Visibility level
  project_id?: number; // Project relationship
  description?: string; // Document description
}

export interface DocumentStats {
  total_documents: number;
  documents_by_type: Record<DocumentType, number>;
  by_type: Record<DocumentType, number>;
  documents_by_status: Record<DocumentStatus, number>;
  recent_documents: DocumentListItem[];
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version: number;
  title: string;
  content?: string;
  created_at: string;
  created_by: number;
  creator_name: string;
  change_summary?: string;
}

// Association types  
export interface DocumentAssociation {
  id: number;
  document_id: number;
  entity_type: 'project' | 'customer' | 'task';
  entity_id: number;
  entity_name: string;
  association_type: string;
  type: DocumentAssociationType;
  created_at: string;
  created_by: number;
}

export interface DocumentAssociationType {
  key: string;
  label: string;
  description?: string;
}

export interface ProjectOption {
  id: number;
  name: string;
  status?: string;
  description?: string;
}

export interface CustomerOption {
  id: number;
  name: string;
  company_name?: string;
  type?: string;
  industry?: string;
  description?: string;
}

// ==================== Phase 6: 统一API响应和回调类型 ====================

/**
 * 统一的文件上传进度回调
 * Phase 6: 之前在documentService.ts, taskDocumentService.ts中重复定义
 */
export interface UploadProgressCallback {
  (progress: number, loaded: number, total: number): void;
}

/**
 * 统一的API响应格式
 * Phase 6: 之前在taskDocumentService.ts和unifiedDocumentService.ts中重复定义
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * 任务文档响应（简单版本）
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface TaskDocumentResponse {
  content: string;
  title?: string;
  type?: string;
  status?: string;
}

/**
 * 已上传文档信息
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface UploadedDocumentInfo {
  id?: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  upload_type: 'manual' | 'api';
  uploaded_at: string;
  file_path?: string;
  file_url?: string;
  title?: string; // Document title
  status?: DocumentStatus; // Document status
  type?: DocumentType; // Document type
}

/**
 * 增强型文档版本信息
 * Phase 6: 从taskDocumentService.ts迁移并扩展DocumentVersion
 */
export interface DocumentVersionInfo {
  id: number;
  document_id: number;
  version_number: number;
  content: string;
  content_hash: string;
  created_at: string;
  created_by: number;
  creator_name: string;
  change_summary?: string;
  file_size: number;
  change_type: 'create' | 'update' | 'delete' | 'restore';
  metadata?: Record<string, any>;
}

/**
 * 文档版本历史响应
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface DocumentVersionHistoryResponse {
  document_id: number;
  current_version: number;
  total_versions: number;
  versions: DocumentVersionInfo[];
  document_info: UploadedDocumentInfo;
}

/**
 * 版本差异详情
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface VersionDifference {
  line_number: number;
  type: 'added' | 'removed' | 'modified';
  old_content?: string;
  new_content?: string;
}

/**
 * 文档版本比较结果
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface DocumentVersionComparisonResult {
  version1: DocumentVersionInfo;
  version2: DocumentVersionInfo;
  differences: {
    total_changes: number;
    added_lines: number;
    removed_lines: number;
    modified_lines: number;
    details: VersionDifference[];
  };
  similarity_score: number;
}

/**
 * 批量操作请求
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface BatchOperationRequest {
  operation: 'delete' | 'archive' | 'restore' | 'tag' | 'move';
  document_ids: number[];
  params?: Record<string, any>;
}

/**
 * 批量操作响应
 * Phase 6: 从taskDocumentService.ts迁移
 */
export interface BatchOperationResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    document_id: number;
    success: boolean;
    error?: string;
  }>;
}

/**
 * 文件上传选项
 * Phase 6: 统一文件上传配置
 */
export interface FileUploadOptions {
  onProgress?: UploadProgressCallback;
  timeout?: number;
  maxRetries?: number;
  chunkSize?: number;
  enableChunking?: boolean;
  task_id?: number; // ✅ FIXED - Added task_id to support task-specific uploads (TS2353)
  project_id?: number; // ✅ FIXED - Added project_id to support project-specific uploads (TS2353)
}