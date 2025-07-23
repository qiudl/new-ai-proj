import api from './api';

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
};

// 文档数据类型
export interface Document {
  id: number;
  project_id: number;
  project_name?: string;
  title: string;
  content: string;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

// 文档列表项类型
export interface DocumentListItem {
  id: number;
  project_id: number;
  project_name?: string;
  title: string;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  content_size: number;
}

// 文档请求类型
export interface DocumentRequest {
  title: string;
  content: string;
}

// 文档过滤器类型
export interface DocumentFilter {
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// 文档列表响应类型
export interface DocumentListResponse {
  data: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
}

// 文档API服务类
export class DocumentService {
  // 获取所有文档列表
  static async getAllDocuments(filter?: DocumentFilter): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    
    if (filter?.search) params.append('search', filter.search);
    if (filter?.sort_by) params.append('sort_by', filter.sort_by);
    if (filter?.order) params.append('order', filter.order);
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());

    const url = `/documents${params.toString() ? '?' + params.toString() : ''}`;
    return apiCall.get<DocumentListResponse>(url);
  }

  // 获取项目文档列表
  static async getProjectDocuments(
    projectId: number, 
    filter?: DocumentFilter
  ): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    
    if (filter?.search) params.append('search', filter.search);
    if (filter?.sort_by) params.append('sort_by', filter.sort_by);
    if (filter?.order) params.append('order', filter.order);
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());

    const url = `/projects/${projectId}/documents${params.toString() ? '?' + params.toString() : ''}`;
    return apiCall.get<DocumentListResponse>(url);
  }

  // 获取单个文档
  static async getDocument(documentId: number): Promise<Document> {
    return apiCall.get<Document>(`/documents/${documentId}`);
  }

  // 创建文档
  static async createDocument(
    projectId: number, 
    data: DocumentRequest
  ): Promise<Document> {
    return apiCall.post<Document>(`/projects/${projectId}/documents`, data);
  }

  // 更新文档
  static async updateDocument(
    documentId: number, 
    data: DocumentRequest
  ): Promise<Document> {
    return apiCall.put<Document>(`/documents/${documentId}`, data);
  }

  // 删除文档
  static async deleteDocument(documentId: number): Promise<void> {
    return apiCall.delete(`/documents/${documentId}`);
  }

  // 搜索文档
  static async searchDocuments(
    projectId: number,
    searchTerm: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DocumentListResponse> {
    const params = new URLSearchParams({
      search: searchTerm,
    });
    
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('page', Math.floor(options.offset / (options.limit || 20) + 1).toString());

    return apiCall.get<DocumentListResponse>(`/projects/${projectId}/documents?${params.toString()}`);
  }

  // 批量操作文档（预留接口）
  static async batchDeleteDocuments(documentIds: number[]): Promise<void> {
    // TODO: 实现批量删除API
    return Promise.all(documentIds.map(id => this.deleteDocument(id))).then(() => void 0);
  }

  // 复制文档（预留接口）
  static async duplicateDocument(documentId: number, newTitle?: string): Promise<Document> {
    const originalDoc = await this.getDocument(documentId);
    const duplicatedDoc: DocumentRequest = {
      title: newTitle || `${originalDoc.title} (副本)`,
      content: originalDoc.content,
    };
    return this.createDocument(originalDoc.project_id, duplicatedDoc);
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

  // 获取文档统计信息（预留接口）
  static async getDocumentStats(projectId: number): Promise<{
    total: number;
    totalSize: number;
    lastUpdated?: string;
  }> {
    // TODO: 实现文档统计API，暂时通过列表接口计算
    const response = await this.getProjectDocuments(projectId, { limit: 1000 });
    return {
      total: response.total,
      totalSize: response.data.reduce((sum, doc) => sum + doc.content_size, 0),
      lastUpdated: response.data.length > 0 
        ? response.data.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0].updated_at 
        : undefined,
    };
  }
}

// 默认导出服务实例
export const documentService = DocumentService;