/**
 * Document-related type definitions
 */

// ========== Core Document Types ==========

export interface TaskDocument {
  id: number;
  task_id: number;
  project_id: number;
  title: string;
  content: string;
  type: DocumentType;
  format: DocumentFormat;
  status: DocumentStatus;
  version: number;
  size?: number;
  created_by: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  
  // Additional fields
  tags?: string[];
  category?: string;
  visibility?: DocumentVisibility;
  is_template?: boolean;
  parent_document_id?: number;
  attachments?: DocumentAttachment[];
  metadata?: DocumentMetadata;
}

export type DocumentType = 
  | 'specification'
  | 'design'
  | 'technical'
  | 'user_guide'
  | 'api'
  | 'test_plan'
  | 'meeting_notes'
  | 'general';

export type DocumentFormat = 
  | 'markdown'
  | 'html'
  | 'text'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx';

export type DocumentStatus = 
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived'
  | 'deprecated';

export type DocumentVisibility = 
  | 'private'
  | 'team'
  | 'project'
  | 'public';

// ========== Document Attachments ==========

export interface DocumentAttachment {
  id: number;
  document_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  uploaded_by: number;
  uploaded_at: string;
}

// ========== Document Metadata ==========

export interface DocumentMetadata {
  word_count?: number;
  read_time?: number;
  last_accessed?: string;
  access_count?: number;
  contributors?: number[];
  related_documents?: number[];
  external_links?: string[];
  references?: DocumentReference[];
}

export interface DocumentReference {
  type: 'task' | 'document' | 'external';
  id: string;
  title: string;
  url?: string;
}

// ========== Document Operations ==========

export interface DocumentCreate {
  task_id: number;
  title: string;
  content: string;
  type?: DocumentType;
  format?: DocumentFormat;
  status?: DocumentStatus;
  tags?: string[];
  visibility?: DocumentVisibility;
  is_template?: boolean;
}

export interface DocumentUpdate {
  title?: string;
  content?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  tags?: string[];
  visibility?: DocumentVisibility;
}

export interface DocumentFilter {
  task_id?: number;
  type?: DocumentType[];
  status?: DocumentStatus[];
  format?: DocumentFormat[];
  created_by?: number[];
  tags?: string[];
  search?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface DocumentSort {
  field: 'created_at' | 'updated_at' | 'title' | 'type' | 'status';
  direction: 'asc' | 'desc';
}

// ========== Document Version Control ==========

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  content: string;
  changes_summary?: string;
  created_by: number;
  created_at: string;
  is_current: boolean;
  metadata?: {
    lines_added: number;
    lines_removed: number;
    size_delta: number;
  };
}

export interface DocumentDiff {
  from_version: number;
  to_version: number;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    line_number: number;
    content: string;
  }>;
  summary: {
    additions: number;
    deletions: number;
    modifications: number;
  };
}

// ========== Document Collaboration ==========

export interface DocumentComment {
  id: number;
  document_id: number;
  parent_comment_id?: number;
  user_id: number;
  user_name: string;
  content: string;
  line_number?: number;
  selection?: string;
  created_at: string;
  updated_at?: string;
  resolved?: boolean;
  resolved_by?: number;
  resolved_at?: string;
}

export interface DocumentCollaborator {
  user_id: number;
  user_name: string;
  role: 'viewer' | 'editor' | 'reviewer' | 'owner';
  last_accessed?: string;
  contributions?: number;
  active?: boolean;
}

// ========== Document Templates ==========

export interface DocumentTemplate {
  id: number;
  name: string;
  description?: string;
  type: DocumentType;
  format: DocumentFormat;
  content: string;
  variables?: TemplateVariable[];
  category?: string;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  default_value?: any;
  options?: any[];
  description?: string;
}

// ========== Document Export/Import ==========

export interface DocumentExport {
  format: 'pdf' | 'docx' | 'html' | 'markdown' | 'json';
  options?: {
    include_comments?: boolean;
    include_versions?: boolean;
    include_metadata?: boolean;
    include_attachments?: boolean;
    style?: 'default' | 'custom';
    template_id?: number;
  };
}

export interface DocumentImport {
  format: 'docx' | 'html' | 'markdown' | 'text';
  file: File | string;
  options?: {
    preserve_formatting?: boolean;
    convert_to_markdown?: boolean;
    extract_metadata?: boolean;
  };
}

// ========== Document Search ==========

export interface DocumentSearchResult {
  document_id: number;
  title: string;
  excerpt: string;
  matches: Array<{
    field: 'title' | 'content' | 'tags';
    text: string;
    position: number;
  }>;
  score: number;
  task_id: number;
  task_title: string;
}

export interface DocumentSearchOptions {
  query: string;
  fields?: ('title' | 'content' | 'tags')[];
  fuzzy?: boolean;
  limit?: number;
  offset?: number;
  filters?: DocumentFilter;
}

// ========== Document Permissions ==========

export interface DocumentPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  canShare: boolean;
  canExport: boolean;
  canManageVersions: boolean;
  canManageCollaborators: boolean;
}