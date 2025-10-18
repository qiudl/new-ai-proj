import api from './api';
import { 
  apiCache, 
  performanceMonitor, 
  useOptimizedMemo 
} from '../utils/performanceOptimization';

// 统一文档接口定义
export interface UnifiedDocument {
  id: number;
  title: string;
  content: string;
  description?: string;
  type: 'markdown' | 'txt' | 'pdf';
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'team' | 'public';
  tags: string[];
  version: number;
  file_size: number;
  mime_type: string;
  
  // 关联信息
  task_id?: number;
  project_id?: number;
  owner_id: number;
  created_by: number;
  
  // 时间戳
  created_at: string;
  updated_at: string;
  
  // 扩展信息
  owner_name?: string;
  project_name?: string;
  task_title?: string;
  is_template: boolean;
  is_favorite?: boolean;
  
  // 权限
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
}

export interface DocumentListResponse {
  documents: UnifiedDocument[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadProgressCallback {
  (progress: number, loaded: number, total: number): void;
}

export interface DocumentFilter {
  search?: string;
  type?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  project_id?: number;
  task_id?: number;
  owner_id?: number;
  created_after?: string;
  created_before?: string;
}

// 统一文档服务
export class DocumentService {
  private static instance: DocumentService;
  
  // 单例模式
  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  // ===== 核心CRUD操作 =====

  /**
   * 获取文档详情
   */
  async getDocument(documentId: number): Promise<UnifiedDocument> {
    const cacheKey = `document_${documentId}`;
    
    try {
      performanceMonitor.startMeasure('get_document', { documentId });
      
      // 尝试从缓存获取
      const cached = apiCache.get<UnifiedDocument>(cacheKey);
      if (cached) {
        performanceMonitor.endMeasure('get_document');
        return cached;
      }
      
      const response = await api.get(`/documents/${documentId}`);
      
      const documentData = response.data || response;
      if (!documentData) {
        throw new Error('获取文档失败：服务器未返回文档数据');
      }
      
      const document = this.normalizeDocument(documentData);
      
      // 缓存结果 (5分钟)
      apiCache.set(cacheKey, document, 5 * 60 * 1000);
      
      performanceMonitor.endMeasure('get_document');
      return document;
    } catch (error) {
      performanceMonitor.endMeasure('get_document');
      console.error('获取文档失败:', error);
      throw this.enhanceError(error, '获取文档');
    }
  }

  /**
   * 创建文档
   */
  async createDocument(
    title: string,
    content: string,
    options: {
      description?: string;
      type?: string;
      status?: string;
      visibility?: string;
      tags?: string[];
      task_id?: number;
      project_id?: number;
      is_template?: boolean;
    } = {}
  ): Promise<UnifiedDocument> {
    try {
      performanceMonitor.startMeasure('create_document', { title });
      
      const requestData = {
        title,
        content,
        description: options.description || '',
        type: options.type || 'markdown',
        status: options.status || 'draft',
        visibility: options.visibility || 'team',
        tags: options.tags || [],
        task_id: options.task_id,
        project_id: options.project_id,
        is_template: options.is_template || false
      };
      
      const response = await api.post('/documents', requestData);
      
      // API 拦截器已经自动解包响应，response.data 直接是文档对象或 null
      const documentData = response.data || response;
      
      if (!documentData) {
        throw new Error('创建文档失败：服务器未返回文档数据');
      }
      
      const document = this.normalizeDocument(documentData);
      
      // 清除列表缓存
      this.clearListCache();
      
      performanceMonitor.endMeasure('create_document');
      return document;
    } catch (error) {
      performanceMonitor.endMeasure('create_document');
      console.error('创建文档失败:', error);
      throw this.enhanceError(error, '创建文档');
    }
  }

  /**
   * 更新文档
   */
  async updateDocument(
    documentId: number,
    updates: Partial<{
      title: string;
      content: string;
      description: string;
      type: string;
      status: string;
      visibility: string;
      tags: string[];
      is_template: boolean;
    }>
  ): Promise<UnifiedDocument> {
    try {
      performanceMonitor.startMeasure('update_document', { documentId });
      
      const response = await api.put(`/documents/${documentId}`, updates);
      
      const documentData = response.data || response;
      if (!documentData) {
        throw new Error('更新文档失败：服务器未返回文档数据');
      }
      
      const document = this.normalizeDocument(documentData);
      
      // 更新缓存
      const cacheKey = `document_${documentId}`;
      apiCache.set(cacheKey, document, 5 * 60 * 1000);
      
      // 清除列表缓存
      this.clearListCache();
      
      performanceMonitor.endMeasure('update_document');
      return document;
    } catch (error) {
      performanceMonitor.endMeasure('update_document');
      console.error('更新文档失败:', error);
      throw this.enhanceError(error, '更新文档');
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: number): Promise<void> {
    try {
      await api.delete(`/documents/${documentId}`);
      
      // 清除缓存
      const cacheKey = `document_${documentId}`;
      apiCache.remove(cacheKey);
      this.clearListCache();
    } catch (error) {
      console.error('删除文档失败:', error);
      throw this.enhanceError(error, '删除文档');
    }
  }

  // ===== 任务文档相关操作 =====

  /**
   * 获取任务的主文档
   */
  async getTaskDocument(projectId: number, taskId: number): Promise<UnifiedDocument | null> {
    const cacheKey = `task_document_${projectId}_${taskId}`;
    
    try {
      // 尝试从缓存获取
      const cached = apiCache.get<UnifiedDocument | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
      
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      let document = null;
      if (response.data || response) {
        const documentData = response.data || response;
        if (documentData) {
          document = this.normalizeDocument(documentData);
        }
      }
      
      // 缓存结果 (3分钟)
      apiCache.set(cacheKey, document, 3 * 60 * 1000);
      
      return document;
    } catch (error: any) {
      // 404表示文档不存在，返回null
      if (error.response?.status === 404) {
        apiCache.set(cacheKey, null, 3 * 60 * 1000);
        return null;
      }
      console.error('获取任务文档失败:', error);
      throw this.enhanceError(error, '获取任务文档');
    }
  }

  /**
   * 保存任务文档
   */
  async saveTaskDocument(
    projectId: number, 
    taskId: number, 
    content: string
  ): Promise<UnifiedDocument> {
    try {
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, {
        content
      });
      
      const documentData = response.data || response;
      if (!documentData) {
        throw new Error('保存任务文档失败：服务器未返回文档数据');
      }
      
      const document = this.normalizeDocument(documentData);
      
      // 更新缓存
      const cacheKey = `task_document_${projectId}_${taskId}`;
      apiCache.set(cacheKey, document, 3 * 60 * 1000);
      
      return document;
    } catch (error) {
      console.error('保存任务文档失败:', error);
      throw this.enhanceError(error, '保存任务文档');
    }
  }

  /**
   * 获取任务相关的所有文档
   */
  async getTaskDocuments(
    projectId: number, 
    taskId: number,
    options: {
      page?: number;
      page_size?: number;
      include_main?: boolean;
    } = {}
  ): Promise<DocumentListResponse> {
    const { page = 1, page_size = 20, include_main = true } = options;
    const cacheKey = `task_documents_${projectId}_${taskId}_${page}_${page_size}_${include_main}`;
    
    try {
      // 尝试从缓存获取
      const cached = apiCache.get<DocumentListResponse>(cacheKey);
      if (cached) {
        return cached;
      }
      
      const response: any = await api.get(`/projects/${projectId}/tasks/${taskId}/documents`, {
        params: { page, page_size, include_main }
      });
      
      const payload = response && response.data ? response.data : response;
      const docsArray = Array.isArray(payload?.documents)
        ? payload.documents
        : Array.isArray(payload?.data?.documents)
          ? payload.data.documents
          : Array.isArray(payload)
            ? payload
            : [];
      const totalCount = payload?.total_count ?? payload?.total ?? payload?.data?.total_count ?? payload?.data?.total ?? docsArray.length;
      const pageNum = payload?.page ?? payload?.data?.page ?? page;
      const pageSizeNum = payload?.page_size ?? payload?.data?.page_size ?? page_size;

      const result: DocumentListResponse = {
        documents: (docsArray as any[]).map((doc: any) => this.normalizeDocument(doc)),
        total: totalCount,
        page: pageNum,
        page_size: pageSizeNum
      };
      
      // 缓存结果 (2分钟)
      apiCache.set(cacheKey, result, { ttl: 2 * 60 * 1000 });

      return result;
    } catch (error) {
      console.error('获取任务文档列表失败:', error);
      throw this.enhanceError(error, '获取任务文档列表');
    }
  }

  /**
   * 将文档关联到任务
   */
  async attachDocumentToTask(
    projectId: number,
    taskId: number,
    documentId: number,
    relationshipType: 'main' | 'attachment' | 'reference' = 'attachment'
  ): Promise<void> {
    try {
      await api.post(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}/attach`, {
        relationship_type: relationshipType
      });
      
      // 清除任务文档缓存
      this.clearTaskDocumentCache(projectId, taskId);
    } catch (error) {
      console.error('关联文档到任务失败:', error);
      throw this.enhanceError(error, '关联文档到任务');
    }
  }

  // ===== 文档搜索和列表 =====

  /**
   * 搜索文档
   */
  async searchDocuments(
    filter: DocumentFilter = {},
    options: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<DocumentListResponse> {
    const { page = 1, page_size = 20, sort_by = 'updated_at', sort_order = 'desc' } = options;
    
    try {
      const params = {
        ...filter,
        page,
        page_size,
        sort_by,
        sort_order
      };
      
      const response = await api.get('/documents/search', { params });
      
      return {
        documents: response.data.documents.map((doc: any) => this.normalizeDocument(doc)),
        total: response.data.total,
        page: response.data.page || page,
        page_size: response.data.page_size || page_size
      };
    } catch (error) {
      console.error('搜索文档失败:', error);
      throw this.enhanceError(error, '搜索文档');
    }
  }

  /**
   * 获取文档列表
   */
  async listDocuments(
    options: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      filter?: DocumentFilter;
    } = {}
  ): Promise<DocumentListResponse> {
    return this.searchDocuments(options.filter || {}, options);
  }

  // ===== 文件上传相关 =====

  /**
   * 上传文件并创建文档
   */
  async uploadFile(
    file: File,
    options: {
      task_id?: number;
      project_id?: number;
      title?: string;
      description?: string;
      onProgress?: UploadProgressCallback;
    } = {}
  ): Promise<UnifiedDocument> {
    try {
      // 验证文件
      this.validateFile(file);
      
      // 读取文件内容
      const content = await this.fileToText(file);
      
      // 模拟进度更新
      options.onProgress?.(50, file.size / 2, file.size);
      
      // 创建文档
      const document = await this.createDocument(
        options.title || file.name.replace(/\.[^/.]+$/, ''),
        content,
        {
          description: options.description || `从文件 ${file.name} 上传`,
          type: this.getDocumentTypeFromFile(file),
          tags: ['文件上传'],
          task_id: options.task_id,
          project_id: options.project_id
        }
      );
      
      // 如果指定了任务，自动关联
      if (options.task_id && options.project_id) {
        await this.attachDocumentToTask(
          options.project_id,
          options.task_id,
          document.id,
          'attachment'
        );
      }
      
      options.onProgress?.(100, file.size, file.size);
      
      return document;
    } catch (error) {
      console.error('上传文件失败:', error);
      throw this.enhanceError(error, '上传文件');
    }
  }

  // ===== 工具方法 =====

  /**
   * 标准化文档数据格式
   */
  private normalizeDocument(data: any): UnifiedDocument {
    // 检查数据有效性
    if (!data || typeof data !== 'object') {
      throw new Error('无效的文档数据格式');
    }
    
    if (!data.id) {
      throw new Error('文档数据缺少必需的 id 字段');
    }

    return {
      id: data.id,
      title: data.title || `文档-${data.id}`,
      content: data.content || '',
      description: data.description || '',
      type: data.type || 'markdown',
      status: data.status || 'draft',
      visibility: data.visibility || 'team',
      tags: Array.isArray(data.tags) ? data.tags : [],
      version: data.version || 1,
      file_size: data.file_size || data.content?.length || 0,
      mime_type: data.mime_type || this.getMimeTypeFromType(data.type),
      
      task_id: data.task_id,
      project_id: data.project_id,
      owner_id: data.owner_id || data.created_by,
      created_by: data.created_by,
      
      created_at: data.created_at,
      updated_at: data.updated_at,
      
      owner_name: data.owner_name,
      project_name: data.project_name,
      task_title: data.task_title,
      is_template: data.is_template || false,
      is_favorite: data.is_favorite || false,
      
      can_edit: data.can_edit !== false,
      can_delete: data.can_delete !== false,
      can_share: data.can_share !== false
    };
  }

  /**
   * 清除列表缓存
   */
  private clearListCache(): void {
    const stats = apiCache.getStats();
    stats.entries.forEach(entry => {
      if (entry.key.includes('documents_') || entry.key.includes('task_documents_')) {
        apiCache.remove(entry.key);
      }
    });
  }

  /**
   * 清除任务文档缓存
   */
  private clearTaskDocumentCache(projectId: number, taskId: number): void {
    const patterns = [
      `task_document_${projectId}_${taskId}`,
      `task_documents_${projectId}_${taskId}`
    ];
    
    patterns.forEach(pattern => {
      const stats = apiCache.getStats();
      stats.entries.forEach(entry => {
        if (entry.key.includes(pattern)) {
          apiCache.remove(entry.key);
        }
      });
    });
  }

  /**
   * 验证文件
   */
  private validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`文件大小 ${this.formatFileSize(file.size)} 超过最大允许大小 ${this.formatFileSize(maxSize)}`);
    }

    // 扩展的文件类型支持
    const allowedMimeTypes = [
      // 文本类型
      'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/javascript', 'text/csv',
      // PDF文档
      'application/pdf',
      // Office文档
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      // 图片类型
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // 代码文件
      'application/json', 'application/xml', 'text/xml',
      // 压缩文件
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // 其他文档
      'application/rtf'
    ];

    // 文件扩展名映射 - 作为MIME类型的备用验证
    const allowedExtensions = [
      '.txt', '.md', '.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.json', '.csv',
      '.pdf',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.xml', '.zip', '.rar', '.7z', '.rtf'
    ];

    // 获取文件扩展名
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    // 验证文件类型：优先检查MIME类型，如果MIME类型为空或未识别，则检查扩展名
    const isValidMimeType = file.type && allowedMimeTypes.includes(file.type);
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    if (!isValidMimeType && !isValidExtension) {
      const supportedFormats = allowedExtensions.join(', ');
      throw new Error(`文件类型 "${file.type || '未知'}" (${fileExtension}) 不被允许。支持的格式：${supportedFormats}`);
    }
  }

  /**
   * 将文件转换为文本
   */
  private async fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * 根据文件获取文档类型
   */
  private getDocumentTypeFromFile(file: File): string {
    switch (file.type) {
      case 'text/markdown':
        return 'markdown';
      case 'application/pdf':
        return 'pdf';
      case 'text/plain':
        return 'txt';
      default:
        return 'markdown';
    }
  }

  /**
   * 根据类型获取MIME类型
   */
  private getMimeTypeFromType(type: string): string {
    switch (type) {
      case 'markdown':
        return 'text/markdown';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      default:
        return 'text/markdown';
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===== 版本控制相关操作 =====

  /**
   * 获取文档版本历史
   */
  async getDocumentVersions(documentId: number): Promise<any> {
    try {
      const response = await api.get(`/documents/${documentId}/versions`);
      return response.data;
    } catch (error) {
      console.error('获取版本历史失败:', error);
      throw this.enhanceError(error, '获取版本历史');
    }
  }

  /**
   * 创建文档版本
   */
  async createDocumentVersion(
    documentId: number,
    file: File,
    options: {
      title?: string;
      description?: string;
      changesSummary: string;
    }
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options.title) formData.append('title', options.title);
      if (options.description) formData.append('description', options.description);
      formData.append('changes_summary', options.changesSummary);

      const response = await api.post(`/documents/${documentId}/versions`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('创建版本失败:', error);
      throw this.enhanceError(error, '创建版本');
    }
  }

  /**
   * 恢复文档版本
   */
  async restoreDocumentVersion(
    documentId: number,
    versionNumber: number,
    changesSummary?: string
  ): Promise<any> {
    try {
      const response = await api.post(`/documents/${documentId}/versions/${versionNumber}/restore`, {
        changes_summary: changesSummary
      });
      return response.data;
    } catch (error) {
      console.error('恢复版本失败:', error);
      throw this.enhanceError(error, '恢复版本');
    }
  }

  /**
   * 比较文档版本
   */
  async compareDocumentVersions(
    documentId: number,
    fromVersion: number,
    toVersion: number
  ): Promise<any> {
    try {
      const response = await api.get(`/documents/${documentId}/versions/compare`, {
        params: {
          from_version: fromVersion,
          to_version: toVersion
        }
      });
      return response.data;
    } catch (error) {
      console.error('版本比较失败:', error);
      throw this.enhanceError(error, '版本比较');
    }
  }

  /**
   * 删除文档版本
   */
  async deleteDocumentVersion(documentId: number, versionNumber: number): Promise<void> {
    try {
      await api.delete(`/documents/${documentId}/versions/${versionNumber}`);
    } catch (error) {
      console.error('删除版本失败:', error);
      throw this.enhanceError(error, '删除版本');
    }
  }

  /**
   * 下载文档版本
   */
  async downloadDocumentVersion(documentId: number, versionNumber: number): Promise<Blob> {
    try {
      const response = await api.get(`/documents/${documentId}/versions/${versionNumber}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('下载版本失败:', error);
      throw this.enhanceError(error, '下载版本');
    }
  }

  /**
   * 增强错误信息
   */
  private enhanceError(error: any, operation: string): Error {
    let message = `${operation}失败`;
    
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 400: message += ': 请求参数错误'; break;
        case 401: message += ': 身份验证失败'; break;
        case 403: message += ': 权限不足'; break;
        case 404: message += ': 资源不存在'; break;
        case 413: message += ': 文件过大'; break;
        case 500: message += ': 服务器内部错误'; break;
        default: message += `: 服务器错误 (${status})`;
      }
      
      if (error.response.data?.message) {
        message += ` - ${error.response.data.message}`;
      }
    } else if (error.request) {
      message += ': 网络连接失败';
    } else {
      message += `: ${error.message}`;
    }
    
    const enhancedError = new Error(message);
    (enhancedError as any).originalError = error;
    return enhancedError;
  }
}

// 导出单例实例
export const documentService = DocumentService.getInstance();
export default documentService;