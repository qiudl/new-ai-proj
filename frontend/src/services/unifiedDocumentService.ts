import api from './api';
import {
  Document,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentFilter as DocFilter,
  DocumentListResponse,
  DocumentVersion,
  ProjectOption,
  CustomerOption,
  DocumentType,
  DocumentStatus,
  DocumentVisibility
} from '../types/document';

// 从 simpleDocumentService 导入的简化类型
export interface SimpleDocument {
  id: number;
  folder_id?: number;
  title: string;
  content?: string;
  type: DocumentType;
  status: DocumentStatus;
  description?: string;
  tags: string[];
  owner_id: number;
  visibility: DocumentVisibility;
  version: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  owner_name?: string;
  folder_name?: string;
  project_id?: number;
  project_name?: string;
  customer_id?: number;
  customer_name?: string;
  category?: string;
  is_favorite?: boolean;
}

// API响应格式
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 类型适配器：将 SimpleDocument 转换为 Document
export const adaptSimpleToDocument = (simple: SimpleDocument): Document => {
  return {
    ...simple,
    content: simple.content || '',
    content_size: simple.content?.length || 0,
    tags: simple.tags || [],
    metadata: {},
    can_edit: true,
    can_share: true,
  };
};

// 类型适配器：将 Document 转换为 SimpleDocument
export const adaptDocumentToSimple = (doc: Document): SimpleDocument => {
  return {
    id: doc.id,
    folder_id: doc.folder_id,
    title: doc.title,
    content: doc.content,
    type: doc.type,
    status: doc.status,
    description: doc.description,
    tags: doc.tags || [],
    owner_id: doc.owner_id,
    visibility: doc.visibility,
    version: doc.version,
    is_template: doc.is_template,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    created_by: doc.created_by,
    owner_name: doc.owner_name,
    folder_name: doc.folder_name,
    project_id: doc.project_id,
    project_name: doc.project_name,
    customer_id: doc.customer_id,
    customer_name: doc.customer_name,
    category: doc.category,
    is_favorite: doc.is_favorite,
  };
};

// Type-safe API wrapper that knows about the response interceptor
const apiCall = {
  get: async <T>(url: string): Promise<T> => {
    const response = await api.get(url);
    return response as T;
  },
  post: async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.post(url, data);
    return response as T;
  },
  put: async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.put(url, data);
    return response as T;
  },
  delete: async (url: string): Promise<void> => {
    await api.delete(url);
  },
  postFormData: async <T>(url: string, formData: FormData): Promise<T> => {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as T;
  },
};

// 文件上传相关类型
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mime_type: string;
}

// 本地存储的mock数据管理
class LocalDocumentStore {
  private static readonly STORAGE_KEY = 'mock_documents';
  
  static getDocuments(): Document[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load local documents:', error);
      return [];
    }
  }
  
  static saveDocument(document: Document): void {
    try {
      const documents = this.getDocuments();
      const existingIndex = documents.findIndex(d => d.id === document.id);
      
      if (existingIndex >= 0) {
        documents[existingIndex] = document;
      } else {
        documents.push(document);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.warn('Failed to save document locally:', error);
    }
  }
  
  static deleteDocument(id: number): void {
    try {
      const documents = this.getDocuments().filter(d => d.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.warn('Failed to delete document locally:', error);
    }
  }
  
  static updateDocument(id: number, updates: Partial<Document>): Document | null {
    try {
      const documents = this.getDocuments();
      const index = documents.findIndex(d => d.id === id);
      
      if (index >= 0) {
        documents[index] = { ...documents[index], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
        return documents[index];
      }
      return null;
    } catch (error) {
      console.warn('Failed to update document locally:', error);
      return null;
    }
  }
}

/**
 * 统一的文档服务类
 * 合并了 documentService 和 simpleDocumentService 的功能
 */
export class UnifiedDocumentService {
  
  // ==================== 基础 CRUD 操作 ====================
  
  /**
   * 创建文档
   * 从 simpleDocumentService 迁移，使用统一 API 调用
   */
  async createDocument(request: CreateDocumentRequest): Promise<Document> {
    try {
      const response = await apiCall.post<Document>('/documents', request);
      return response;
    } catch (error: any) {
      console.error('Error creating document:', error);
      // 使用模拟数据降级处理
      console.warn('Document API failed, using local storage fallback:', error);
      
      // 生成一个负数ID以明确标识这是本地模拟数据
      const localDocuments = await this.getDocuments();
      const nextLocalId = Math.min(...localDocuments.map((d: Document) => d.id).filter((id: number) => id < 0), 0) - 1;
      
      const mockDocument: Document = {
        id: nextLocalId, // 使用负数ID，避免与数据库ID冲突
        folder_id: request.folder_id,
        title: request.title,
        content: request.content || '',
        content_size: request.content?.length || 0,
        type: request.type,
        status: request.status || 'draft',
        description: request.description,
        tags: request.tags || [],
        metadata: {},
        owner_id: 1, // 默认用户ID
        visibility: request.visibility || 'private',
        version: 1,
        is_template: request.is_template || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 1,
        owner_name: 'Current User',
        project_id: request.project_id,
        customer_id: request.customer_id,
        category: request.category,
        can_edit: true,
        can_share: true,
      };
      // 将创建的文档保存到本地存储
      LocalDocumentStore.saveDocument(mockDocument);
      return mockDocument;
    }
  }

  /**
   * 获取文档详情
   */
  async getDocument(id: number): Promise<Document> {
    try {
      const response = await apiCall.get<Document>(`/documents/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error getting document:', error);
      console.warn('Document API not available, trying local storage');
      
      // 尝试从本地存储获取文档
      const localDocuments = LocalDocumentStore.getDocuments();
      const document = localDocuments.find(d => d.id === id);
      
      if (document) {
        return document;
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Failed to get document');
    }
  }

  /**
   * 更新文档
   */
  async updateDocument(id: number, request: UpdateDocumentRequest): Promise<Document> {
    try {
      const response = await apiCall.put<Document>(`/documents/${id}`, request);
      return response;
    } catch (error: any) {
      console.error('Error updating document:', error);
      console.warn('Document API not available, using local storage');
      
      // 尝试更新本地存储中的文档
      const updated = LocalDocumentStore.updateDocument(id, request);
      if (updated) {
        return updated;
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Failed to update document');
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: number): Promise<void> {
    try {
      await apiCall.delete(`/documents/${id}`);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      console.warn('Document API not available, using local storage');
      
      // 从本地存储删除文档
      LocalDocumentStore.deleteDocument(id);
      // 删除操作不需要返回值，所以即使API失败也可以成功完成本地删除
    }
  }

  /**
   * 获取文档列表
   */
  async getDocuments(folderId?: number): Promise<Document[]> {
    try {
      // 检查认证状态
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        throw new Error('请先登录以查看文档');
      }

      const url = folderId ? `/documents?folder_id=${folderId}` : '/documents';
      console.log('getDocuments - 请求URL:', url);
      const response = await apiCall.get<any>(url);
      console.log('getDocuments - API原始响应:', response);
      
      // 适配API响应格式：API返回 {success: true, data: [...], message: "..."}
      // 但组件期望 Document[] 数组
      if (response.success && Array.isArray(response.data)) {
        const documents: Document[] = response.data.map((doc: any) => adaptSimpleToDocument({
          id: doc.id,
          folder_id: doc.folder_id,
          title: doc.title,
          content: doc.content,
          type: doc.type,
          status: doc.status,
          description: doc.description,
          tags: doc.tags || [],
          owner_id: doc.owner_id,
          visibility: doc.visibility,
          version: doc.version,
          is_template: doc.is_template,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          created_by: doc.created_by,
          owner_name: doc.owner_name,
          folder_name: doc.folder_name,
          project_id: doc.project_id,
          project_name: doc.project_name,
          customer_id: doc.customer_id,
          customer_name: doc.customer_name,
          category: doc.category,
          is_favorite: doc.is_favorite
        }));
        
        console.log('getDocuments - 适配后文档数组:', documents);
        return documents;
      } else if (response.success && response.data === null) {
        console.log('getDocuments - 数据库中暂无文档');
        return [];
      } else {
        console.warn('getDocuments - API响应格式不正确:', response);
        return [];
      }
    } catch (error: any) {
      console.error('Error getting documents:', error);
      
      // 区分错误类型，提供更精确的错误处理
      if (error.status === 401) {
        // 认证失败，清除无效token
        localStorage.removeItem('token');
        throw new Error('认证失败，请重新登录');
      } else if (error.status === 404) {
        // API端点不存在
        throw new Error('文档API不可用，请联系管理员');
      } else if (error.name === 'NetworkError' || !error.status) {
        // 网络错误，使用本地数据降级
        console.warn('Network error, using local storage fallback');
        const localDocuments = LocalDocumentStore.getDocuments();
        if (folderId !== undefined) {
          return localDocuments.filter(doc => doc.folder_id === folderId);
        }
        return localDocuments;
      }
      
      // 其他服务器错误，也使用降级处理但记录错误
      console.warn('Server error, using local storage fallback:', error.message);
      const localDocuments = LocalDocumentStore.getDocuments();
      if (folderId !== undefined) {
        return localDocuments.filter(doc => doc.folder_id === folderId);
      }
      return localDocuments;
    }
  }

  /**
   * 获取所有文档（带过滤）
   */
  async getAllDocuments(filter?: DocFilter): Promise<DocumentListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }
      
      const url = `/documents${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('getAllDocuments - 请求URL:', url);
      
      const response = await apiCall.get<any>(url);
      console.log('getAllDocuments - API原始响应:', response);
      
      // 适配API响应格式：API返回 {success: true, data: [...], message: "..."}
      // 但组件期望 {documents: [...], total: number, ...}
      if (response.success && response.data) {
        const adaptedResponse: DocumentListResponse = {
          documents: response.data.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            type: doc.type,
            status: doc.status,
            owner_name: doc.owner_name || 'Unknown',
            folder_name: doc.folder_name,
            tags: doc.tags || [],
            updated_at: doc.updated_at,
            file_size: doc.content?.length || 0,
            is_favorite: doc.is_favorite || false
          })),
          total: response.data.length,
          page: filter?.page || 1,
          limit: filter?.limit || 20,
          has_more: false
        };
        
        console.log('getAllDocuments - 适配后响应:', adaptedResponse);
        return adaptedResponse;
      } else {
        throw new Error('API响应格式不正确');
      }
    } catch (error: any) {
      console.error('Error getting all documents:', error);
      console.warn('Document API not available, using local mock data');
      
      // 从本地存储获取文档
      let localDocuments = LocalDocumentStore.getDocuments();
      
      // 应用过滤条件
      if (filter) {
        if (filter.folder_id !== undefined) {
          localDocuments = localDocuments.filter(doc => doc.folder_id === filter.folder_id);
        }
        if (filter.type && filter.type.length > 0) {
          localDocuments = localDocuments.filter(doc => filter.type!.includes(doc.type));
        }
        if (filter.status && filter.status.length > 0) {
          localDocuments = localDocuments.filter(doc => filter.status!.includes(doc.status));
        }
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          localDocuments = localDocuments.filter(doc => 
            doc.title.toLowerCase().includes(searchLower) ||
            (doc.content && doc.content.toLowerCase().includes(searchLower)) ||
            (doc.description && doc.description.toLowerCase().includes(searchLower))
          );
        }
        if (filter.tags && filter.tags.length > 0) {
          localDocuments = localDocuments.filter(doc => 
            filter.tags!.some(tag => doc.tags.includes(tag))
          );
        }
      }
      
      // 应用分页
      const page = filter?.page || 1;
      const limit = filter?.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDocs = localDocuments.slice(startIndex, endIndex);
      
      // 转换为DocumentListItem格式
      const documentItems = paginatedDocs.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        status: doc.status,
        owner_name: doc.owner_name || 'Current User',
        folder_name: doc.folder_name,
        tags: doc.tags,
        updated_at: doc.updated_at,
        file_size: doc.content_size,
        is_favorite: doc.is_favorite
      }));
      
      return {
        documents: documentItems,
        total: localDocuments.length,
        page,
        limit,
        has_more: endIndex < localDocuments.length
      };
    }
  }

  // ==================== 高级功能 ====================

  /**
   * 复制文档
   */
  async copyDocument(id: number): Promise<Document> {
    try {
      const response = await apiCall.post<Document>(`/documents/${id}/copy`);
      return response;
    } catch (error: any) {
      console.error('Error copying document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to copy document');
    }
  }

  /**
   * 切换模板状态
   */
  async toggleTemplate(id: number): Promise<Document> {
    try {
      const response = await apiCall.post<Document>(`/documents/${id}/toggle-template`);
      return response;
    } catch (error: any) {
      console.error('Error toggling template:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to toggle template');
    }
  }

  /**
   * 批量删除文档
   */
  async batchDeleteDocuments(documentIds: number[]): Promise<void> {
    try {
      await apiCall.post('/documents/batch-delete', { document_ids: documentIds });
    } catch (error: any) {
      console.error('Error batch deleting documents:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to batch delete documents');
    }
  }

  /**
   * 复制文档
   */
  async duplicateDocument(documentId: number, newTitle?: string): Promise<Document> {
    try {
      const response = await apiCall.post<Document>(`/documents/${documentId}/duplicate`, {
        title: newTitle
      });
      return response;
    } catch (error: any) {
      console.error('Error duplicating document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to duplicate document');
    }
  }

  /**
   * 导出文档
   */
  async exportDocument(documentId: number, format: 'txt' | 'md' = 'txt'): Promise<Blob> {
    try {
      const response = await api.get(`/documents/${documentId}/export`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data as Blob;
    } catch (error: any) {
      console.error('Error exporting document:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to export document');
    }
  }

  // ==================== 辅助功能 ====================

  /**
   * 获取可用项目列表
   */
  async getAvailableProjects(): Promise<ProjectOption[]> {
    try {
      const response = await apiCall.get<ProjectOption[]>('/projects/options');
      return response;
    } catch (error: any) {
      console.error('Error getting available projects:', error);
      return [];
    }
  }

  /**
   * 获取可用客户列表
   */
  async getAvailableCustomers(): Promise<CustomerOption[]> {
    try {
      const response = await apiCall.get<CustomerOption[]>('/customers/options');
      return response;
    } catch (error: any) {
      console.error('Error getting available customers:', error);
      return [];
    }
  }

  /**
   * 上传图片
   */
  async uploadImage(request: { file: File; alt_text?: string }): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      if (request.alt_text) {
        formData.append('alt_text', request.alt_text);
      }
      
      const response = await apiCall.postFormData<FileUploadResponse>('/documents/upload-image', formData);
      return response;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload image');
    }
  }

  /**
   * 获取文档版本列表
   */
  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    try {
      const response = await apiCall.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
      return response;
    } catch (error: any) {
      console.error('Error getting document versions:', error);
      return [];
    }
  }

  /**
   * 恢复文档版本
   */
  async restoreDocumentVersion(documentId: number, versionId: number): Promise<Document> {
    try {
      const response = await apiCall.post<Document>(`/documents/${documentId}/versions/${versionId}/restore`);
      return response;
    } catch (error: any) {
      console.error('Error restoring document version:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to restore document version');
    }
  }
}

// 导出单例实例
export const unifiedDocumentService = new UnifiedDocumentService();
export default unifiedDocumentService;