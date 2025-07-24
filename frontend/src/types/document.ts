// 文档类型定义 - 与后端模型保持一致

export type DocumentType = 'markdown' | 'image' | 'pdf';

export type DocumentStatus = 'draft' | 'published' | 'archived';

export type DocumentVisibility = 'private' | 'team' | 'public';

export type DocumentAssociationType = 'project' | 'customer' | 'personal';

// 文档关联选择接口
export interface DocumentAssociation {
  type: DocumentAssociationType;
  id?: number;
  name?: string;
}

// 主文档接口
export interface Document {
  id: number;
  project_id: number | null;
  customer_id: number | null;
  owner_id: number;
  title: string;
  content: string;
  type: DocumentType;
  status: DocumentStatus;
  category?: string;
  subcategory?: string;
  visibility: DocumentVisibility;
  shared_with: number[];
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  tags: string[];
  description?: string;
  version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // 扩展字段（从后端获取）
  project_name?: string;
  customer_name?: string;
  owner_name?: string;
  creator_name?: string;
  association_type: DocumentAssociationType;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
}

// 文档列表响应接口（不包含完整内容）
export interface DocumentListItem {
  id: number;
  project_id: number | null;
  customer_id: number | null;
  owner_id: number;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  category?: string;
  subcategory?: string;
  visibility: DocumentVisibility;
  tags: string[];
  description?: string;
  version: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  content_size: number;
  file_url?: string;  // Add missing field for non-markdown files
  file_size?: number; // Add missing field
  mime_type?: string; // Add missing field
  
  // 扩展字段
  project_name?: string;
  customer_name?: string;
  owner_name?: string;
  creator_name?: string;
  association_type: DocumentAssociationType;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
}

// 创建文档请求接口
export interface CreateDocumentRequest {
  title: string;
  content: string;
  type: DocumentType;
  status: DocumentStatus;  // Make this required to match backend validation
  project_id?: number;
  customer_id?: number;
  category?: string;
  subcategory?: string;
  visibility?: DocumentVisibility;
  shared_with?: number[];
  tags?: string[];
  description?: string;
}

// 更新文档请求接口
export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  project_id?: number;
  customer_id?: number;
  category?: string;
  subcategory?: string;
  visibility?: DocumentVisibility;
  shared_with?: number[];
  tags?: string[];
  description?: string;
}

// 文档过滤器接口
export interface DocumentFilter {
  project_id?: number;
  customer_id?: number;
  owner_id?: number;
  type?: DocumentType;
  status?: DocumentStatus;
  category?: string;
  visibility?: DocumentVisibility;
  search?: string;
  tags?: string[];
  sort_by?: 'created_at' | 'updated_at' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  include_deleted?: boolean;
}

// 文档列表响应接口
export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// 文档统计接口
export interface DocumentStats {
  total_documents: number;
  project_documents: number;
  customer_documents: number;
  personal_documents: number;
  by_type: Record<DocumentType, number>;
  by_status: Record<DocumentStatus, number>;
  by_visibility: Record<DocumentVisibility, number>;
  recent_documents: number;
}

// 文档权限接口
export interface DocumentPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_read: boolean;
}

// 文档版本历史接口
export interface DocumentVersion {
  id: number;
  document_id: number;
  version: number;
  title: string;
  content: string;
  created_at: string;
  creator_name: string;
  change_summary?: string;
}

// 项目选项接口
export interface ProjectOption {
  id: number;
  name: string;
  description?: string;
  can_create_documents: boolean;
}

// 客户选项接口
export interface CustomerOption {
  id: number;
  company_name: string;
  industry?: string;
  can_create_documents: boolean;
}

// 文档分类配置
export interface DocumentCategoryConfig {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  color?: string;
  subcategories: DocumentSubcategoryConfig[];
}

export interface DocumentSubcategoryConfig {
  id: string;
  name: string;
  description: string;
}

// 文档分享接口
export interface DocumentShareRequest {
  user_ids: number[];
  message?: string;
  expires_at?: string;
}

export interface DocumentShareResponse {
  shared_users: SharedUser[];
  share_url?: string;
  expires_at?: string;
}

export interface SharedUser {
  id: number;
  username: string;
  email: string;
  shared_at: string;
}

// 文档搜索结果接口
export interface DocumentSearchResult {
  document: DocumentListItem;
  highlights: string[];
  match_score: number;
}

export interface DocumentSearchResponse {
  results: DocumentSearchResult[];
  total: number;
  query: string;
  took: number;
}

// 批量操作接口
export interface DocumentBatchOperation {
  action: 'delete' | 'archive' | 'publish' | 'move' | 'share';
  document_ids: number[];
  target_project_id?: number;
  target_customer_id?: number;
  target_status?: DocumentStatus;
  share_with?: number[];
}

export interface DocumentBatchOperationResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    document_id: number;
    error: string;
  }>;
}

// 文档创建流程状态
export interface DocumentCreationState {
  step: 'association' | 'type' | 'details';
  association?: DocumentAssociation;
  document_type?: DocumentType;
  form_data?: Partial<CreateDocumentRequest>;
}

// 文档导入/导出接口
export interface DocumentExportRequest {
  document_ids: number[];
  format: 'pdf' | 'docx' | 'markdown' | 'html';
  include_metadata: boolean;
}

export interface DocumentImportRequest {
  files: File[];
  project_id?: number;
  customer_id?: number;
  category?: string;
  visibility?: DocumentVisibility;
}

// 文档模板接口
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: DocumentType;
  category: string;
  content: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  default_value?: string;
  options?: string[];
}

// Utility types
export type DocumentFormData = Omit<CreateDocumentRequest, 'type'> & {
  type: DocumentType;
};

export type DocumentUpdateFormData = Partial<DocumentFormData>;

// Constants
export const DOCUMENT_TYPES: DocumentType[] = ['markdown', 'image', 'pdf'];
export const DOCUMENT_STATUSES: DocumentStatus[] = ['draft', 'published', 'archived'];
export const DOCUMENT_VISIBILITIES: DocumentVisibility[] = ['private', 'team', 'public'];
export const DOCUMENT_ASSOCIATION_TYPES: DocumentAssociationType[] = ['project', 'customer', 'personal'];

// Type guards
export const isProjectDocument = (doc: Document): boolean => doc.project_id !== null;
export const isCustomerDocument = (doc: Document): boolean => doc.customer_id !== null;
export const isPersonalDocument = (doc: Document): boolean => 
  doc.project_id === null && doc.customer_id === null;

// Helper functions
export const getDocumentDisplayName = (doc: Document): string => {
  switch (doc.association_type) {
    case 'project':
      return doc.project_name ? `${doc.project_name} - ${doc.title}` : doc.title;
    case 'customer':
      return doc.customer_name ? `${doc.customer_name} - ${doc.title}` : doc.title;
    case 'personal':
      return `个人 - ${doc.title}`;
    default:
      return doc.title;
  }
};

export const getDocumentAssociationDisplay = (doc: Document): string => {
  switch (doc.association_type) {
    case 'project':
      return doc.project_name || '未知项目';
    case 'customer':
      return doc.customer_name || '未知客户';
    case 'personal':
      return '个人文档';
    default:
      return '未知关联';
  }
};

export const canEditDocument = (doc: Document, currentUserId: number): boolean => {
  return doc.can_edit || doc.owner_id === currentUserId;
};

export const canDeleteDocument = (doc: Document, currentUserId: number): boolean => {
  return doc.can_delete || doc.owner_id === currentUserId;
};

export const canShareDocument = (doc: Document, currentUserId: number): boolean => {
  return doc.can_share || doc.owner_id === currentUserId;
};