import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// 简化的文档接口
export interface SimpleDocument {
  id: number;
  folder_id?: number;
  title: string;
  content?: string;
  type: 'markdown' | 'text' | 'pdf' | 'word' | 'image';
  status: 'draft' | 'published' | 'archived';
  description?: string;
  tags: string[];
  owner_id: number;
  visibility: 'private' | 'team' | 'public';
  version: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  owner_name?: string;
  folder_name?: string;
}

export interface CreateDocumentRequest {
  folder_id?: number;
  title: string;
  content?: string;
  type: 'markdown' | 'text' | 'pdf' | 'word' | 'image';
  status?: 'draft' | 'published' | 'archived';
  description?: string;
  tags?: string[];
  visibility?: 'private' | 'team' | 'public';
  is_template?: boolean;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  status?: 'draft' | 'published' | 'archived';
  description?: string;
  tags?: string[];
  visibility?: 'private' | 'team' | 'public';
  is_template?: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

class SimpleDocumentService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || 'dummy-token-for-testing';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // 创建文档
  async createDocument(request: CreateDocumentRequest): Promise<SimpleDocument> {
    try {
      const response = await axios.post<APIResponse<SimpleDocument>>(
        `${API_BASE_URL}/documents`,
        request,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create document');
    }
  }

  // 获取文档详情
  async getDocument(id: number): Promise<SimpleDocument> {
    try {
      const response = await axios.get<APIResponse<SimpleDocument>>(
        `${API_BASE_URL}/documents/${id}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get document');
    }
  }

  // 更新文档
  async updateDocument(id: number, request: UpdateDocumentRequest): Promise<SimpleDocument> {
    try {
      const response = await axios.put<APIResponse<SimpleDocument>>(
        `${API_BASE_URL}/documents/${id}`,
        request,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update document');
    }
  }

  // 删除文档
  async deleteDocument(id: number): Promise<void> {
    try {
      const response = await axios.delete<APIResponse<void>>(
        `${API_BASE_URL}/documents/${id}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete document');
      }
    } catch (error: any) {
      console.error('Error deleting document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete document');
    }
  }

  // 获取文档列表
  async getDocuments(folderId?: number): Promise<SimpleDocument[]> {
    try {
      const params = new URLSearchParams();
      if (folderId !== undefined) {
        params.append('folder_id', folderId.toString());
      }

      const response = await axios.get<APIResponse<SimpleDocument[]>>(
        `${API_BASE_URL}/documents?${params}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get documents');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting documents:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get documents');
    }
  }

  // 复制文档
  async copyDocument(id: number): Promise<SimpleDocument> {
    try {
      const response = await axios.post<APIResponse<SimpleDocument>>(
        `${API_BASE_URL}/documents/${id}/copy`,
        {},
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to copy document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error copying document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to copy document');
    }
  }

  // 切换模板状态
  async toggleTemplate(id: number): Promise<SimpleDocument> {
    try {
      const response = await axios.post<APIResponse<SimpleDocument>>(
        `${API_BASE_URL}/documents/${id}/toggle-template`,
        {},
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to toggle template status');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error toggling template status:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to toggle template status');
    }
  }
}

export const simpleDocumentService = new SimpleDocumentService();