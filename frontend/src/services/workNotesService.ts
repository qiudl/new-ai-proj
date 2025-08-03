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

class WorkNotesService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || 'dummy-token-for-testing';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // 创建工作笔记
  async createWorkNote(request: CreateWorkNoteRequest): Promise<WorkNote> {
    try {
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes`,
        request,
        { headers: this.getAuthHeaders() }
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
      const response = await axios.get<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}`,
        { headers: this.getAuthHeaders() }
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
      const response = await axios.put<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}`,
        request,
        { headers: this.getAuthHeaders() }
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
      const response = await axios.delete<APIResponse<void>>(
        `${API_BASE_URL}/work-notes/${id}`,
        { headers: this.getAuthHeaders() }
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
  async listWorkNotes(folderId?: number): Promise<WorkNotesListResponse> {
    try {
      const params = new URLSearchParams();
      if (folderId !== undefined) {
        params.append('folder_id', folderId.toString());
      }

      const response = await axios.get<APIResponse<WorkNotesListResponse>>(
        `${API_BASE_URL}/work-notes?${params}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to list work notes');
      }
      
      return response.data.data;
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

      const response = await axios.get<APIResponse<{ documents: WorkNote[] }>>(
        `${API_BASE_URL}/work-notes/search?${params}`,
        { headers: this.getAuthHeaders() }
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
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}/copy`,
        {},
        { headers: this.getAuthHeaders() }
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
      const response = await axios.post<APIResponse<WorkNote>>(
        `${API_BASE_URL}/work-notes/${id}/toggle-template`,
        {},
        { headers: this.getAuthHeaders() }
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
      const response = await axios.get<APIResponse<{
        documents: WorkNote[];
        total_count: number;
        has_more: boolean;
      }>>(
        `${API_BASE_URL}/document-folders/${folderId}/documents?limit=${limit}&offset=${offset}`,
        { headers: this.getAuthHeaders() }
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
}

export const workNotesService = new WorkNotesService();