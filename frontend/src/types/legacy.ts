// Legacy types for backward compatibility

export interface DocumentFolder {
  id: number;
  name: string;
  parent_id?: number;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: number;
  project_id?: number;
}

export interface UpdateFolderRequest {
  name?: string;
  parent_id?: number;
}

// For components that need content field in DocumentListItem
export interface DocumentWithContent {
  id: number;
  title: string;
  content: string;
  type: string;
  project_id: number;
  customer_id?: number;
  owner_id?: number;
  creator_id?: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  status: string;
  tags: string[];
  version?: number;
  visibility?: string;
  shared_with?: number[];
  description?: string;
  association_type?: string;
  can_edit?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
}

// Enhanced DocumentFolder with all required fields
export interface EnhancedDocumentFolder extends DocumentFolder {
  path: string;
  document_count: number;
  children?: EnhancedDocumentFolder[];
}

// Search result type for components that need content
export interface DocumentSearchResultWithContent {
  document: DocumentWithContent;
  highlights: string[];
  match_score: number;
}