import api from './api';
import { 
  Document, 
  CreateDocumentRequest, 
  UpdateDocumentRequest,
  DocumentFilter as DocFilter,
  DocumentListResponse,
  DocumentStats,
  DocumentListItem,
  DocumentVersion,
  DocumentAssociation,
  ProjectOption,
  CustomerOption
} from '../types/document';

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

export interface ImageUploadRequest {
  file: File;
  project_id?: number;
  customer_id?: number;
  description?: string;
}

// 文档API服务类
export class DocumentService {
  // 获取所有文档列表
  static async getAllDocuments(filter?: DocFilter): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams();
    
    if (filter?.search) searchParams.append('search', filter.search);
    if (filter?.type) searchParams.append('type', filter.type);
    if (filter?.status) searchParams.append('status', filter.status);
    if (filter?.project_id) searchParams.append('project_id', filter.project_id.toString());
    if (filter?.customer_id) searchParams.append('customer_id', filter.customer_id.toString());
    if (filter?.owner_id) searchParams.append('owner_id', filter.owner_id.toString());
    if (filter?.category) searchParams.append('category', filter.category);
    if (filter?.visibility) searchParams.append('visibility', filter.visibility);
    if (filter?.sort_by) searchParams.append('sort_by', filter.sort_by);
    if (filter?.order) searchParams.append('order', filter.order);
    if (filter?.page) searchParams.append('page', filter.page.toString());
    if (filter?.limit) searchParams.append('limit', filter.limit.toString());
    if (filter?.tags) {
      filter.tags.forEach(tag => searchParams.append('tags', tag));
    }
    if (filter?.include_deleted) searchParams.append('include_deleted', 'true');

    const url = `/documents${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    // 后端返回的格式是 { data: [], total: number, page: number, limit: number }
    // 需要转换为前端期望的格式 { documents: [], total: number, ... }
    const response = await apiCall.get<{
      data: DocumentListItem[];
      total: number;
      page: number;
      limit: number;
    }>(url);
    
    return {
      documents: response.data,
      total: response.total,
      page: response.page,
      limit: response.limit,
      has_more: response.data.length === response.limit
    };
  }

  // 获取项目文档列表
  static async getProjectDocuments(
    projectId: number, 
    filter?: DocFilter
  ): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams();
    
    if (filter?.search) searchParams.append('search', filter.search);
    if (filter?.type) searchParams.append('type', filter.type);
    if (filter?.status) searchParams.append('status', filter.status);
    if (filter?.category) searchParams.append('category', filter.category);
    if (filter?.visibility) searchParams.append('visibility', filter.visibility);
    if (filter?.sort_by) searchParams.append('sort_by', filter.sort_by);
    if (filter?.order) searchParams.append('order', filter.order);
    if (filter?.page) searchParams.append('page', filter.page.toString());
    if (filter?.limit) searchParams.append('limit', filter.limit.toString());
    if (filter?.tags) {
      filter.tags.forEach(tag => searchParams.append('tags', tag));
    }
    if (filter?.include_deleted) searchParams.append('include_deleted', 'true');

    const url = `/projects/${projectId}/documents${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    // 后端返回的格式是 { data: [], total: number, page: number, limit: number }
    // 需要转换为前端期望的格式 { documents: [], total: number, ... }
    const response = await apiCall.get<{
      data: DocumentListItem[];
      total: number;
      page: number;
      limit: number;
    }>(url);
    
    return {
      documents: response.data,
      total: response.total,
      page: response.page,
      limit: response.limit,
      has_more: response.data.length === response.limit
    };
  }

  // 获取客户文档列表
  static async getCustomerDocuments(
    customerId: number,
    filter?: DocFilter
  ): Promise<DocumentListResponse> {
    const updatedFilter = { ...filter, customer_id: customerId };
    return this.getAllDocuments(updatedFilter);
  }

  // 获取个人文档列表
  static async getPersonalDocuments(
    userId: number,
    filter?: DocFilter
  ): Promise<DocumentListResponse> {
    const updatedFilter = { 
      ...filter, 
      owner_id: userId,
      project_id: undefined,
      customer_id: undefined
    };
    return this.getAllDocuments(updatedFilter);
  }

  // 获取单个文档
  static async getDocument(documentId: number): Promise<Document> {
    return apiCall.get<Document>(`/documents/${documentId}`);
  }

  // 创建文档
  static async createDocument(data: CreateDocumentRequest): Promise<Document> {
    // 根据关联类型选择不同的API端点
    if (data.project_id) {
      return apiCall.post<Document>(`/projects/${data.project_id}/documents`, data);
    } else if (data.customer_id) {
      return apiCall.post<Document>(`/customers/${data.customer_id}/documents`, data);
    } else {
      // 个人文档或全局文档
      return apiCall.post<Document>(`/documents`, data);
    }
  }

  // 更新文档
  static async updateDocument(
    documentId: number, 
    data: UpdateDocumentRequest
  ): Promise<Document> {
    return apiCall.put<Document>(`/documents/${documentId}`, data);
  }

  // 删除文档
  static async deleteDocument(documentId: number): Promise<void> {
    return apiCall.delete(`/documents/${documentId}`);
  }

  // 上传文件
  static async uploadFile(
    file: File, 
    type: 'image' | 'pdf' | 'document',
    options?: {
      project_id?: number;
      customer_id?: number;
      description?: string;
    }
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.project_id) {
      formData.append('project_id', options.project_id.toString());
    }
    if (options?.customer_id) {
      formData.append('customer_id', options.customer_id.toString());
    }
    if (options?.description) {
      formData.append('description', options.description);
    }

    const endpoint = type === 'image' ? '/upload/image' : 
                    type === 'pdf' ? '/upload/pdf' : '/upload/document';
    return apiCall.postFormData<FileUploadResponse>(endpoint, formData);
  }

  // 向后兼容的方法
  static async uploadImage(request: ImageUploadRequest): Promise<FileUploadResponse> {
    return this.uploadFile(request.file, 'image', {
      project_id: request.project_id,
      customer_id: request.customer_id,
      description: request.description,
    });
  }

  // 获取文档统计信息
  static async getDocumentStats(options?: {
    project_id?: number;
    customer_id?: number;
  }): Promise<DocumentStats> {
    const searchParams = new URLSearchParams();
    if (options?.project_id) searchParams.append('project_id', options.project_id.toString());
    if (options?.customer_id) searchParams.append('customer_id', options.customer_id.toString());
    
    const url = `/documents/stats${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return apiCall.get<DocumentStats>(url);
  }

  // 搜索文档
  static async searchDocuments(
    searchTerm: string,
    options?: { 
      project_id?: number;
      customer_id?: number;
      limit?: number; 
      offset?: number;
      type?: string;
      status?: string;
    }
  ): Promise<DocumentListResponse> {
    const filter: DocFilter = {
      search: searchTerm,
      project_id: options?.project_id,
      customer_id: options?.customer_id,
      type: options?.type as any,
      status: options?.status as any,
      limit: options?.limit,
      page: options?.offset ? Math.floor(options.offset / (options.limit || 20)) + 1 : undefined,
    };

    return this.getAllDocuments(filter);
  }

  // 获取文档版本历史
  static async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    return apiCall.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
  }

  // 恢复文档版本
  static async restoreDocumentVersion(documentId: number, versionId: number): Promise<Document> {
    return apiCall.post<Document>(`/documents/${documentId}/versions/${versionId}/restore`);
  }

  // 分享文档
  static async shareDocument(
    documentId: number, 
    userIds: number[], 
    message?: string
  ): Promise<{ shared_users: Array<{ id: number; username: string; email: string }> }> {
    return apiCall.post(`/documents/${documentId}/share`, {
      user_ids: userIds,
      message,
    });
  }

  // 批量操作文档
  static async batchDeleteDocuments(documentIds: number[]): Promise<void> {
    return apiCall.post('/documents/batch', {
      action: 'delete',
      document_ids: documentIds,
    });
  }

  // 复制文档
  static async duplicateDocument(documentId: number, newTitle?: string): Promise<Document> {
    const originalDoc = await this.getDocument(documentId);
    const duplicatedDoc: CreateDocumentRequest = {
      title: newTitle || `${originalDoc.title} (副本)`,
      content: originalDoc.content,
      type: originalDoc.type,
      project_id: originalDoc.project_id || undefined,
      customer_id: originalDoc.customer_id || undefined,
      status: originalDoc.status,
      category: originalDoc.category,
      subcategory: originalDoc.subcategory,
      visibility: originalDoc.visibility,
      tags: originalDoc.tags,
      description: originalDoc.description,
    };
    return this.createDocument(duplicatedDoc);
  }

  // 导出文档（预留接口）
  static async exportDocument(documentId: number, format: 'txt' | 'md' = 'txt'): Promise<Blob> {
    const document = await this.getDocument(documentId);
    const content = format === 'md' 
      ? `# ${document.title}\n\n${document.content}`
      : `${document.title}\n\n${document.content}`;
    
    return new Blob([content], { 
      type: format === 'md' ? 'text/markdown' : 'text/plain' 
    });
  }

  // 获取可用项目列表（用于关联选择）
  static async getAvailableProjects(): Promise<ProjectOption[]> {
    // 这里应该调用项目服务，暂时返回空数组
    return [];
  }

  // 获取可用客户列表（用于关联选择）
  static async getAvailableCustomers(): Promise<CustomerOption[]> {
    // 这里应该调用客户服务，暂时返回空数组
    return [];
  }
}

// 默认导出服务实例
export const documentService = DocumentService;

// Re-export types for convenience
export type {
  Document,
  CreateDocumentRequest as DocumentRequest,
  UpdateDocumentRequest,
  DocumentFilter as DocFilter,
  DocumentListResponse,
  DocumentStats,
  DocumentListItem,
  DocumentVersion,
  DocumentAssociation,
  ProjectOption,
  CustomerOption
} from '../types/document';

// Legacy compatibility types
export type DocumentListParams = DocFilter;
export type { DocumentListItem as DocumentItem } from '../types/document';