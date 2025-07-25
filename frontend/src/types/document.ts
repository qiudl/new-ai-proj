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

export type DocumentType = 'markdown' | 'text' | 'pdf' | 'word' | 'excel' | 'image';
export type DocumentStatus = 'draft' | 'published' | 'archived';
export type DocumentVisibility = 'private' | 'team' | 'public';

export interface Document {
  id: number;
  folder_id?: number;
  title: string;
  content?: string;
  content_size?: number;
  type: DocumentType;
  status: DocumentStatus;
  file_url?: string;
  file_size?: number;
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
  // Categories
  category?: string;
  subcategory?: string;
  // Sharing
  shared_with?: string[];
  can_edit?: boolean;
  can_share?: boolean;
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
  shared_with?: string[];
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
  type: DocumentType;
  status: DocumentStatus;
  owner_name: string;
  folder_name?: string;
  tags: string[];
  updated_at: string;
  file_size?: number;
  file_url?: string;
  is_favorite?: boolean;
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