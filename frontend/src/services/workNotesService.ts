import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

// 工作笔记接口
export interface WorkNote {
  id: number;
  project_id?: number;
  folder_id?: number;
  title: string;
  content?: string;
  type: 'markdown' | 'image' | 'pdf' | 'doc' | 'xlsx' | 'pptx' | 'txt' | 'html';
  status: 'draft' | 'published' | 'archived' | 'template';
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  tags?: string[];
  metadata?: any;
  owner_id: number;
  visibility: 'private' | 'team' | 'public';
  version: number;
  parent_document_id?: number;
  is_template: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  owner_name?: string;
  folder_name?: string;
  relations?: any[];
  related_tasks?: number[];
  related_notes?: number[];
}

export interface CreateWorkNoteRequest {
  folder_id?: number;
  title: string;
  content?: string;
  type: 'markdown' | 'image' | 'pdf' | 'doc' | 'xlsx' | 'pptx' | 'txt' | 'html';
  status?: 'draft' | 'published' | 'archived' | 'template';
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  tags?: string[];
  metadata?: any;
  visibility?: 'private' | 'team' | 'public';
  is_template?: boolean;
}

export interface UpdateWorkNoteRequest {
  folder_id?: number;
  title?: string;
  content?: string;
  status?: 'draft' | 'published' | 'archived' | 'template';
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  tags?: string[];
  metadata?: any;
  visibility?: 'private' | 'team' | 'public';
}

export interface WorkNotesListResponse {
  documents: WorkNote[];
  total: number;
  page: number;
  page_size: number;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 转换相关类型（需在类外声明以通过 TS 编译）
export interface ConversionOptions {
  preserve_original: boolean;
  copy_relations: boolean;
  convert_format: 'markdown' | 'txt' | 'html';
  visibility: 'private' | 'team' | 'public';
  relation_type?: string;
}

export interface ConvertToTaskDocumentRequest {
  target_task_id: number;
  conversion_options: ConversionOptions;
}

export interface ConversionResult {
  original_work_note_id: number;
  created_task_document: {
    id: number;
    task_id: number;
    title: string;
    format: string;
    created_at: string;
  };
  conversion_summary: {
    content_migrated: boolean;
    relations_copied: number;
    attachments_moved: number;
  };
}

export interface ConvertPreviewRequest {
  target_task_id: number;
  conversion_options: ConversionOptions;
}

export interface BatchConversionItem {
  work_note_id: number;
  target_task_id: number;
  options: ConversionOptions;
}

export interface BatchConvertRequest {
  conversions: BatchConversionItem[];
  global_options: {
    transaction_mode: boolean;
    error_handling: 'continue' | 'stop';
  };
}

class WorkNotesService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token = localStorage.getItem('token');
    
    // 如果没有token，在开发环境下尝试自动获取
    if (!token && process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch('/api/v1/auth/dev-quick-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin' })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.access_token) {
            token = data.data.access_token;
            localStorage.setItem('token', token);
            localStorage.setItem('currentUser', JSON.stringify({
              id: data.data.user.id,
              username: data.data.user.username,
              role: data.data.user.role
            }));
          }
        }
      } catch (error) {
        console.warn('⚠️ 工作笔记服务自动获取token失败:', error);
      }
    }
    
    return {
      'Authorization': `Bearer ${token || 'dummy-token-for-testing'}`,
      'Content-Type': 'application/json',
    };
  }

  // 创建工作笔记
  async createWorkNote(request: CreateWorkNoteRequest): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create work note');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create work note');
    }
  }

  // 获取工作笔记详情
  async getWorkNote(id: number): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get work note');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get work note');
    }
  }

  // 更新工作笔记
  async updateWorkNote(id: number, request: UpdateWorkNoteRequest): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.put<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update work note');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update work note');
    }
  }

  // 删除工作笔记
  async deleteWorkNote(id: number): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.delete<APIResponse<void>>(
        `${API_BASE_URL}/work-notes/${id}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete work note');
      }
    } catch (error: any) {
      console.error('Error deleting work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete work note');
    }
  }

  // 列出工作笔记
  async listWorkNotes(folderId?: number, page?: number, limit?: number): Promise<WorkNotesListResponse> {
    try {
      const params = new URLSearchParams();
      if (folderId !== undefined) {
        params.append('folder_id', folderId.toString());
      }
      if (page !== undefined) {
        params.append('page', page.toString());
      }
      if (limit !== undefined) {
        params.append('limit', limit.toString());
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{notes: WorkNote[], pagination: any}>>(
        `${API_BASE_URL}/work-notes?${params}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to list work notes');
      }
      
      // 适配后端返回格式 {notes: [], pagination: {}} 到前端期望格式 {documents: [], total: number}
      const backendData = response.data.data;
      return {
        documents: backendData.notes || [],
        total: backendData.pagination?.total || backendData.notes?.length || 0,
        page: backendData.pagination?.page || 1,
        page_size: backendData.pagination?.page_size || 20
      };
    } catch (error: any) {
      console.error('Error listing work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to list work notes');
    }
  }

  // 搜索工作笔记
  async searchWorkNotes(query: string): Promise<WorkNote[]> {
    try {
      const params = new URLSearchParams();
      if (query) {
        params.append('query', query);
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
        `${API_BASE_URL}/work-notes/search?${params}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to search work notes');
      }
      
      return response.data.data.documents;
    } catch (error: any) {
      console.error('Error searching work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to search work notes');
    }
  }

  // 复制工作笔记
  async copyWorkNote(id: number): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}/copy`,
        {},
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to copy work note');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error copying work note:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to copy work note');
    }
  }

  // 切换模板状态
  async toggleTemplate(id: number): Promise<WorkNote> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}/toggle-template`,
        {},
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to toggle template');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error toggling template:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to toggle template');
    }
  }

  // 获取文件夹下的工作笔记
  async getFolderWorkNotes(folderId: number | 'root', limit = 50, offset = 0): Promise<{
    documents: WorkNote[];
    total_count: number;
    has_more: boolean;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<APIResponse<{
        documents: WorkNote[];
        total_count: number;
        has_more: boolean;
      }>>(
        `${API_BASE_URL}/document-folders/${folderId}/documents?limit=${limit}&offset=${offset}`,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder work notes');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder work notes');
    }
  }

  // =============================================================================
  // 工作笔记转任务文档功能
  // =============================================================================

  // 单个工作笔记转任务文档
  async convertToTaskDocument(workNoteId: number, request: ConvertToTaskDocumentRequest): Promise<ConversionResult> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<ConversionResult>>(
        `${API_BASE_URL}/work-notes/${workNoteId}/convert-to-task-document`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to convert work note to task document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error converting work note to task document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to convert work note');
    }
  }

  // 转换预览
  async getConversionPreview(workNoteId: number, request: ConvertPreviewRequest): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<any>>(
        `${API_BASE_URL}/work-notes/${workNoteId}/convert-preview`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get conversion preview');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting conversion preview:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get conversion preview');
    }
  }

  // 批量转换
  async batchConvertToTaskDocuments(request: BatchConvertRequest): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post<APIResponse<any>>(
        `${API_BASE_URL}/work-notes/batch-convert-to-task-documents`,
        request,
        { headers }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to batch convert work notes');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error batch converting work notes:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to batch convert work notes');
    }
  }
}

export const workNotesService = new WorkNotesService();
