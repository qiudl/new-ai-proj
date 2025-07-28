import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

// 文档文件夹接口
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
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  owner_name?: string;
  documents_count?: number;
  subfolders_count?: number;
  children?: DocumentFolder[];
}

export interface CreateDocumentFolderRequest {
  name: string;
  description?: string;
  parent_folder_id?: number;
  visibility: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateDocumentFolderRequest {
  name?: string;
  description?: string;
  parent_folder_id?: number;
  visibility?: 'private' | 'team' | 'public';
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface ListFoldersRequest {
  parent_folder_id?: number;
  visibility?: string;
  owner_id?: number;
  include_stats?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListFoldersResponse {
  folders: DocumentFolder[];
  total_count: number;
  has_more: boolean;
}

export interface FolderTreeResponse {
  tree: DocumentFolder[];
  total_count: number;
}

export interface DocumentFolderStats {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  owner_name: string;
  documents_count: number;
  subfolders_count: number;
  last_document_updated?: string;
}

export interface MoveFolderRequest {
  parent_folder_id?: number;
  sort_order: number;
}

export interface FolderUpdate {
  id: number;
  parent_folder_id?: number;
  sort_order: number;
}

export interface BatchUpdateFoldersRequest {
  folders: FolderUpdate[];
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

class DocumentFolderService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || 'dummy-token-for-testing';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // 创建文件夹
  async createFolder(request: CreateDocumentFolderRequest): Promise<DocumentFolder> {
    try {
      const response = await axios.post<APIResponse<DocumentFolder>>(
        `${API_BASE_URL}/document-folders`,
        request,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create folder');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create folder');
    }
  }

  // 获取文件夹详情
  async getFolder(id: number): Promise<DocumentFolder> {
    try {
      const response = await axios.get<APIResponse<DocumentFolder>>(
        `${API_BASE_URL}/document-folders/${id}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder');
    }
  }

  // 更新文件夹
  async updateFolder(id: number, request: UpdateDocumentFolderRequest): Promise<DocumentFolder> {
    try {
      const response = await axios.put<APIResponse<DocumentFolder>>(
        `${API_BASE_URL}/document-folders/${id}`,
        request,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update folder');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating folder:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update folder');
    }
  }

  // 删除文件夹
  async deleteFolder(id: number): Promise<void> {
    try {
      const response = await axios.delete<APIResponse<void>>(
        `${API_BASE_URL}/document-folders/${id}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete folder');
      }
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete folder');
    }
  }

  // 列出文件夹
  async listFolders(request?: ListFoldersRequest): Promise<ListFoldersResponse> {
    try {
      const params = new URLSearchParams();
      if (request?.parent_folder_id !== undefined) {
        params.append('parent_folder_id', request.parent_folder_id.toString());
      }
      if (request?.visibility) {
        params.append('visibility', request.visibility);
      }
      if (request?.owner_id) {
        params.append('owner_id', request.owner_id.toString());
      }
      if (request?.include_stats) {
        params.append('include_stats', 'true');
      }
      if (request?.limit) {
        params.append('limit', request.limit.toString());
      }
      if (request?.offset) {
        params.append('offset', request.offset.toString());
      }

      const response = await axios.get<APIResponse<ListFoldersResponse>>(
        `${API_BASE_URL}/document-folders?${params}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to list folders');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error listing folders:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to list folders');
    }
  }

  // 获取文件夹树
  async getFolderTree(visibility?: string): Promise<FolderTreeResponse> {
    try {
      const params = new URLSearchParams();
      if (visibility) {
        params.append('visibility', visibility);
      }

      const response = await axios.get<APIResponse<FolderTreeResponse>>(
        `${API_BASE_URL}/document-folders/tree?${params}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder tree');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder tree:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder tree');
    }
  }

  // 获取文件夹统计信息
  async getFolderStats(id: number): Promise<DocumentFolderStats> {
    try {
      const response = await axios.get<APIResponse<DocumentFolderStats>>(
        `${API_BASE_URL}/document-folders/${id}/stats`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder stats');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder stats:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder stats');
    }
  }

  // 移动文件夹
  async moveFolder(id: number, request: MoveFolderRequest): Promise<void> {
    try {
      const response = await axios.post<APIResponse<void>>(
        `${API_BASE_URL}/document-folders/${id}/move`,
        request,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to move folder');
      }
    } catch (error: any) {
      console.error('Error moving folder:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to move folder');
    }
  }

  // 获取文件夹下的子文件夹
  async getFolderChildren(id: number): Promise<DocumentFolder[]> {
    try {
      const response = await axios.get<APIResponse<DocumentFolder[]>>(
        `${API_BASE_URL}/document-folders/${id}/children`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder children');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder children:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder children');
    }
  }

  // 获取文件夹下的文档
  async getFolderDocuments(id: number | 'root', limit = 50, offset = 0): Promise<{
    documents: any[];
    total_count: number;
    has_more: boolean;
  }> {
    try {
      const response = await axios.get<APIResponse<{
        documents: any[];
        total_count: number;
        has_more: boolean;
      }>>(
        `${API_BASE_URL}/document-folders/${id}/documents?limit=${limit}&offset=${offset}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get folder documents');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting folder documents:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get folder documents');
    }
  }

  // 移动文档到文件夹
  async moveDocument(documentId: number, folderId: number | 'root'): Promise<void> {
    try {
      const response = await axios.post<APIResponse<void>>(
        `${API_BASE_URL}/document-folders/move-document/${documentId}/to/${folderId}`,
        {},
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to move document');
      }
    } catch (error: any) {
      console.error('Error moving document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to move document');
    }
  }

  // 批量更新文件夹排序
  async batchUpdateFolders(request: BatchUpdateFoldersRequest): Promise<void> {
    try {
      const response = await axios.post<APIResponse<void>>(
        `${API_BASE_URL}/document-folders/batch-update`,
        request,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to batch update folders');
      }
    } catch (error: any) {
      console.error('Error batch updating folders:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to batch update folders');
    }
  }

  // 获取用户文件夹统计
  async getUserFolderStats(): Promise<any> {
    try {
      const response = await axios.get<APIResponse<any>>(
        `${API_BASE_URL}/document-folders/stats`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get user folder stats');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error getting user folder stats:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get user folder stats');
    }
  }
}

export const documentFolderService = new DocumentFolderService();