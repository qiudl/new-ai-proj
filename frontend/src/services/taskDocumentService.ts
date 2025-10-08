import api from './api';
import axios, { AxiosProgressEvent } from 'axios';
import { 
  apiCache, 
  performanceMonitor, 
  useOptimizedMemo,
  uploadFileInChunks,
  ChunkedUploadOptions 
} from '../utils/performanceOptimization';

interface TaskDocumentResponse {
  content: string;
}

// Task 307: 新增接口定义
interface UploadedDocumentInfo {
  id?: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  upload_type: 'manual' | 'api';
  uploaded_at: string;
  file_path?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface DocumentListResponse {
  documents: UploadedDocumentInfo[];
  total: number;
}

interface UploadProgressCallback {
  (progress: number, loaded: number, total: number): void;
}

interface AdvancedTaskDocumentResponse {
  id: number;
  task_id: number;
  project_id: number;
  document_id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  version: number;
  metadata: Record<string, any>;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  task_title: string;
  project_name: string;
  owner_name: string;
  creator_name: string;
  document_exists: boolean;
  can_edit: boolean;
  can_delete: boolean;
  relations: unknown[];
  last_modified?: string;
}

interface DocumentRequest {
  content: string;
}

// Task 307-12: 版本历史功能接口定义
interface DocumentVersionInfo {
  id: number;
  document_id: number;
  version_number: number;
  content: string;
  content_hash: string;
  created_at: string;
  created_by: number;
  creator_name: string;
  change_summary?: string;
  file_size: number;
  change_type: 'create' | 'update' | 'delete' | 'restore';
  metadata?: Record<string, any>;
}

interface DocumentVersionHistoryResponse {
  document_id: number;
  current_version: number;
  total_versions: number;
  versions: DocumentVersionInfo[];
  document_info: UploadedDocumentInfo;
}

interface DocumentVersionComparisonResult {
  version1: DocumentVersionInfo;
  version2: DocumentVersionInfo;
  differences: {
    additions: string[];
    deletions: string[];
    modifications: string[];
    statistics: {
      added_lines: number;
      deleted_lines: number;
      modified_lines: number;
      unchanged_lines: number;
    };
  };
}

interface DocumentRestoreRequest {
  version_id: number;
  restore_reason?: string;
}

export const taskDocumentService = {
  // 获取任务文档内容 - 已优化缓存和性能监控
  async get(projectId: number, taskId: number): Promise<TaskDocumentResponse> {
    const cacheKey = `get_document_${projectId}_${taskId}`;
    
    try {
      performanceMonitor.startMeasure('get_task_document', { projectId, taskId });
      
      // 尝试从优化缓存获取
      const cached = apiCache.get<TaskDocumentResponse>(cacheKey);
      if (cached) {
        performanceMonitor.endMeasure('get_task_document');
        return cached;
      }
      
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      const result = response.data;
      
      // 缓存结果 (3分钟TTL)
      apiCache.set(cacheKey, result, 3 * 60 * 1000);
      
      performanceMonitor.endMeasure('get_task_document');
      return result;
    } catch (error) {
      performanceMonitor.endMeasure('get_task_document');
      console.error('获取任务文档失败:', error);
      throw error;
    }
  },

  // 获取增强版任务文档
  async getAdvanced(projectId: number, taskId: number): Promise<AdvancedTaskDocumentResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/advanced`);
      return response.data;
    } catch (error) {
      console.error('获取增强版任务文档失败:', error);
      throw error;
    }
  },

  // 保存任务文档内容 - 已优化缓存清理和性能监控
  async save(projectId: number, taskId: number, content: string): Promise<TaskDocumentResponse> {
    try {
      performanceMonitor.startMeasure('save_task_document', { 
        projectId, 
        taskId, 
        contentLength: content.length 
      });
      
      const requestData: DocumentRequest = { content };
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData);
      const result = response.data;
      
      // 清除相关缓存
      const cacheKey = `get_document_${projectId}_${taskId}`;
      apiCache.remove(cacheKey);
      
      // 更新缓存中的内容
      apiCache.set(cacheKey, result, 3 * 60 * 1000);
      
      performanceMonitor.endMeasure('save_task_document');
      return result;
    } catch (error) {
      performanceMonitor.endMeasure('save_task_document');
      console.error('保存任务文档失败:', error);
      throw error;
    }
  },

  // 更新增强版任务文档
  async updateAdvanced(projectId: number, taskId: number, data: Partial<{ content: string }>): Promise<AdvancedTaskDocumentResponse> {
    try {
      const response = await api.patch(`/projects/${projectId}/tasks/${taskId}/document/advanced`, data);
      return response.data;
    } catch (error) {
      console.error('更新增强版任务文档失败:', error);
      throw error;
    }
  },

  // 删除任务文档
  async delete(projectId: number, taskId: number): Promise<void> {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}/document`);
    } catch (error) {
      console.error('删除任务文档失败:', error);
      throw error;
    }
  },

  // ===== Task 307: 新增文档上传下载功能 =====

  /**
   * 手工上传文档 - 使用新的数据库API端点
   */
  async uploadDocument(
    projectId: number,
    taskId: number,
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<UploadedDocumentInfo> {
    try {
      performanceMonitor.startMeasure('upload_document', {
        projectId,
        taskId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });
      
      // 验证文件
      this.validateFile(file);

      // 使用 FormData 准备文件上传到 TaskDocumentHandler
      const formData = new FormData();
      formData.append('document', file); // 后端期望的字段名是 'document'
      formData.append('title', file.name.replace(/\.[^/.]+$/, '')); // 可选标题

      // 模拟进度 - 上传到专门的任务文档上传接口
      onProgress?.(25, file.size / 4, file.size);

      // 上传到 TaskDocumentHandler 的专门接口 - 使用配置好的api实例
      const uploadResponse = await api.post(
        `/projects/${projectId}/tasks/${taskId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
            }
          }
        }
      );

      // uploadResponse.data 已经被 api interceptor 自动解包，直接是内层数据
      
      // 检查响应格式，uploadResponse.data 就是后端返回的数据
      const documentData = uploadResponse.data;
      
      if (!documentData) {
        throw new Error('Failed to upload document - no data returned');
      }

      // 完成进度
      onProgress?.(100, file.size, file.size);

      // 清除文档列表缓存
      const listCacheKey = `get_task_documents_${projectId}_${taskId}`;
      apiCache.remove(listCacheKey);
      
      performanceMonitor.endMeasure('upload_document');
      
      // 返回 TaskDocumentHandler 提供的上传信息
      // documentData 直接就是后端返回的数据结构
      return {
        id: documentData.id,
        file_name: documentData.file_name || file.name,
        original_name: documentData.original_name || file.name,
        file_size: documentData.file_size || file.size,
        mime_type: documentData.mime_type || file.type,
        upload_type: 'manual' as const,
        uploaded_at: documentData.uploaded_at || new Date().toISOString(),
        file_path: documentData.file_path
      };
    } catch (error) {
      performanceMonitor.endMeasure('upload_document');
      console.error('上传文档失败:', error);
      throw error;
    }
  },

  /**
   * 分片上传大文档 - 简化版，统一文档系统不支持分片，直接使用常规上传
   */
  async uploadDocumentChunked(
    projectId: number,
    taskId: number,
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<UploadedDocumentInfo> {
    // 统一文档系统不支持真正的分片上传，但我们可以读取文件并直接上传内容
    console.warn('统一文档系统不支持分片上传，使用常规方式处理大文件');
    return this.uploadDocument(projectId, taskId, file, onProgress);
  },

  /**
   * API方式上传文档 - 使用新的数据库API端点
   */
  async uploadDocumentAPI(
    projectId: number,
    taskId: number,
    fileName: string,
    content: string,
    mimeType?: string,
    description?: string
  ): Promise<UploadedDocumentInfo> {
    try {
      // 验证文件名
      this.validateFileName(fileName);

      // 如果内容是base64编码，需要解码为文本
      let textContent = content;
      try {
        // 尝试检测是否为base64并解码
        if (content.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
          textContent = atob(content);
        }
      } catch (e) {
        // 如果解码失败，使用原始内容
        textContent = content;
      }

      // 首先创建文档
      const createResponse = await api.post('/documents', {
        title: fileName.replace(/\.[^/.]+$/, ''), // 移除文件扩展名作为标题
        content: textContent,
        type: this.getDocumentTypeFromMimeType(mimeType || this.getMimeTypeFromFileName(fileName)),
        status: 'published',
        visibility: 'team',
        description: description || `文档通过API创建：${fileName}`,
        tags: ['API上传']
      });

      if (!createResponse.data || !createResponse.data.success) {
        throw new Error(createResponse.data?.message || 'Failed to create document via API');
      }

      const documentData = createResponse.data;
      
      // 然后将文档关联到任务
      await api.post(`/projects/${projectId}/tasks/${taskId}/documents/${documentData.id}/attach`, {
        relationship_type: 'attachment'
      });

      return {
        id: documentData.id,
        file_name: fileName,
        original_name: fileName,
        file_size: textContent.length,
        mime_type: mimeType || this.getMimeTypeFromFileName(fileName),
        upload_type: 'api' as const,
        uploaded_at: new Date().toISOString(),
        file_path: `/documents/${documentData.id}`
      };
    } catch (error) {
      console.error('API上传文档失败:', error);
      throw error;
    }
  },

  /**
   * 获取任务文档列表 - 使用新的数据库API端点（不需要projectId）
   */
  async getTaskDocuments(projectId: number, taskId: number): Promise<DocumentListResponse> {
    const cacheKey = `get_task_documents_${projectId}_${taskId}`;

    try {
      performanceMonitor.startMeasure('get_task_documents', { projectId, taskId });

      // 尝试从优化缓存获取
      const cached = apiCache.get<DocumentListResponse>(cacheKey);
      if (cached) {
        performanceMonitor.endMeasure('get_task_documents');
        return cached;
      }

      // 使用不需要projectId的API端点获取任务文档列表（自动从tasks表查询projectId）
      const response: any = await api.get(`/tasks/${taskId}/documents`);

      // 支持两种格式：
      // 1) 包装格式 { success, data: { documents: [...] } }
      // 2) axios解包后的直接数据 { documents: [...] }
      const isWrapped = response && typeof response === 'object' && 'success' in response;
      const payload = isWrapped ? response.data : (response && response.data ? response.data : response);
      if (isWrapped ? response.success : !!payload) {
        const responseData = payload?.data || payload || {};
        const documents = responseData.documents || [];
        
        const result: DocumentListResponse = {
          documents: documents.map((doc: any) => ({
            id: doc.id,
            file_name: doc.title || `document-${doc.id}.md`,
            original_name: doc.title || `document-${doc.id}.md`,
            file_size: doc.content ? doc.content.length : 0,
            mime_type: doc.type === 'markdown' ? 'text/markdown' : doc.mime_type || 'text/markdown',
            upload_type: 'api' as const,
            uploaded_at: doc.updated_at || doc.created_at || new Date().toISOString(),
            file_path: `/documents/${doc.id}`
          })),
          total: responseData.total_count || documents.length
        };
        
        // 缓存结果 (2分钟TTL)
        apiCache.set(cacheKey, result, 2 * 60 * 1000);
        
        performanceMonitor.endMeasure('get_task_documents');
        return result;
      } else {
        // 返回空列表
        const result: DocumentListResponse = {
          documents: [],
          total: 0
        };
        
        // 缓存空结果 (30秒TTL)
        apiCache.set(cacheKey, result, 30 * 1000);
        
        performanceMonitor.endMeasure('get_task_documents');
        return result;
      }
    } catch (error: any) {
      performanceMonitor.endMeasure('get_task_documents');
      
      // 如果是404错误，说明文档不存在，返回空列表
      if (error.response && error.response.status === 404) {
        const result: DocumentListResponse = {
          documents: [],
          total: 0
        };
        
        // 缓存空结果 (30秒TTL)
        apiCache.set(cacheKey, result, 30 * 1000);
        return result;
      }
      
      console.error('获取任务文档列表失败:', error);
      throw error;
    }
  },

  /**
   * 下载任务的Markdown格式文档
   */
  async downloadTaskMarkdown(projectId: number, taskId: number): Promise<Blob> {
    try {
      const response = await api.get(
        `/projects/${projectId}/tasks/${taskId}/download/md`,
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('下载Markdown文档失败:', error);
      throw error;
    }
  },

  /**
   * 下载任务的PDF格式文档
   */
  async downloadTaskPDF(projectId: number, taskId: number): Promise<Blob> {
    try {
      const response = await api.get(
        `/projects/${projectId}/tasks/${taskId}/download/pdf`,
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('下载PDF文档失败:', error);
      throw error;
    }
  },

  /**
   * 将文件转换为base64编码
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data:开头的部分，只保留base64内容
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * 将文件转换为文本内容
   */
  async fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file as text'));
      reader.readAsText(file, 'utf-8');
    });
  },

  /**
   * 触发文件下载
   */
  triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 批量上传文档
   */
  async uploadMultipleDocuments(
    projectId: number,
    taskId: number,
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<UploadedDocumentInfo[]> {
    const results: UploadedDocumentInfo[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.uploadDocument(
          projectId,
          taskId,
          file,
          onProgress ? (progress) => onProgress(i, progress) : undefined
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        // 继续上传其他文件
      }
    }
    
    return results;
  },

  // ===== 辅助方法 =====

  /**
   * 验证文件
   */
  validateFile(file: File): void {
    // 检查文件大小 (10MB限制)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`文件大小 ${this.formatFileSize(file.size)} 超过最大允许大小 ${this.formatFileSize(maxSize)}`);
    }

    // 检查文件扩展名
    this.validateFileName(file.name);
  },

  /**
   * 验证文件名
   */
  validateFileName(fileName: string): void {
    // 支持文档、PDF和常见图片格式
    const allowedExtensions = [
      '.md', '.pdf', '.txt',                             // 文档类型
      '.jpg', '.jpeg', '.png', '.svg', '.gif', '.bmp', '.webp'  // 图片类型
    ];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    if (!allowedExtensions.includes(extension)) {
      throw new Error(`文件扩展名 ${extension} 不被允许。允许的扩展名: ${allowedExtensions.join(', ')}`);
    }
  },

  /**
   * 根据文件名获取MIME类型
   */
  getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    switch (extension) {
      case '.md':
        return 'text/markdown';
      case '.pdf':
        return 'application/pdf';
      case '.txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  },

  /**
   * 根据MIME类型获取文档类型（用于新API）
   */
  getDocumentTypeFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'text/markdown':
        return 'markdown';
      case 'application/pdf':
        return 'pdf';
      case 'text/plain':
        return 'text';
      default:
        return 'markdown'; // 默认为markdown
    }
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // ===== Task 307-09: 服务扩展功能 - 已优化使用新的性能工具 =====

  /**
   * 请求重试机制
   */
  async _retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000,
    retryMultiplier: number = 2
  ): Promise<T> {
    let lastError: any;
    let currentDelay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // 如果是最后一次尝试，或者是不可重试的错误，直接抛出
        if (attempt === maxRetries || this._isNonRetryableError(error)) {
          throw error;
        }

        // 等待重试延迟
        await this._delay(currentDelay);
        currentDelay *= retryMultiplier;
      }
    }

    throw lastError;
  },

  /**
   * 判断是否为不可重试的错误
   */
  _isNonRetryableError(error: any): boolean {
    if (error.response) {
      const status = error.response.status;
      // 4xx错误通常不需要重试（除了429 Too Many Requests）
      return status >= 400 && status < 500 && status !== 429;
    }
    return false;
  },

  /**
   * 延迟函数
   */
  _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 网络请求队列管理
   */
  _requestQueue: [] as Promise<any>[],
  _maxConcurrentRequests: 5,

  /**
   * 执行带队列管理的请求
   */
  async _executeQueuedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    // 如果队列已满，等待
    while (this._requestQueue.length >= this._maxConcurrentRequests) {
      await Promise.race(this._requestQueue);
    }

    const requestPromise = requestFn().finally(() => {
      // 请求完成后从队列中移除
      const index = this._requestQueue.indexOf(requestPromise);
      if (index > -1) {
        this._requestQueue.splice(index, 1);
      }
    });

    this._requestQueue.push(requestPromise);
    return requestPromise;
  },

  /**
   * 增强版获取任务文档 - 带缓存
   */
  async getEnhanced(
    projectId: number, 
    taskId: number, 
    options: { 
      useCache?: boolean; 
      cacheTTL?: number; 
      retry?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<TaskDocumentResponse> {
    const { 
      useCache = true, 
      cacheTTL,
      retry = true,
      maxRetries = 3
    } = options;

    const cacheKey = this._generateCacheKey('get', projectId, taskId);
    
    // 尝试从缓存获取
    if (useCache) {
      const cached = (this as any)._getCachedData(cacheKey) as TaskDocumentResponse;
      if (cached) {
        return cached;
      }
    }

    // 执行请求
    const requestFn = () => this._executeQueuedRequest(() => 
      api.get(`/projects/${projectId}/tasks/${taskId}/document`)
        .then(response => response.data)
    );

    try {
      const result = retry 
        ? await this._retryRequest(requestFn, maxRetries)
        : await requestFn();

      // 缓存结果
      if (useCache) {
        this._setCachedData(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (error) {
      console.error('获取任务文档失败:', error);
      throw this._enhanceError(error, '获取任务文档');
    }
  },

  /**
   * 增强版保存任务文档 - 带缓存清理
   */
  async saveEnhanced(
    projectId: number, 
    taskId: number, 
    content: string,
    options: {
      retry?: boolean;
      maxRetries?: number;
      clearCache?: boolean;
    } = {}
  ): Promise<TaskDocumentResponse> {
    const { retry = true, maxRetries = 3, clearCache = true } = options;

    const requestFn = () => this._executeQueuedRequest(() => {
      const requestData: DocumentRequest = { content };
      return api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData)
        .then(response => response.data);
    });

    try {
      const result = retry 
        ? await this._retryRequest(requestFn, maxRetries)
        : await requestFn();

      // 清除相关缓存
      if (clearCache) {
        this._clearCacheByPattern(`${projectId}:${taskId}`);
      }

      return result;
    } catch (error) {
      console.error('保存任务文档失败:', error);
      throw this._enhanceError(error, '保存任务文档');
    }
  },

  /**
   * 增强版文档上传 - 带进度和重试
   */
  async uploadDocumentEnhanced(
    projectId: number,
    taskId: number,
    file: File,
    options: {
      onProgress?: UploadProgressCallback;
      retry?: boolean;
      maxRetries?: number;
      clearCache?: boolean;
      chunkSize?: number;
    } = {}
  ): Promise<UploadedDocumentInfo> {
    const { 
      onProgress, 
      retry = true, 
      maxRetries = 2, // 上传重试次数较少
      clearCache = true,
      chunkSize 
    } = options;

    // 验证文件
    this.validateFile(file);

    // 如果文件大于阈值，使用分片上传
    if (chunkSize && file.size > chunkSize) {
      return this._uploadInChunks(projectId, taskId, file, chunkSize, onProgress);
    }

    const requestFn = () => this._executeQueuedRequest(async () => {
      const formData = new FormData();
      formData.append('document', file);

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress, progressEvent.loaded, progressEvent.total);
          }
        },
        timeout: 300000, // 5分钟超时
      };

      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/upload`,
        formData,
        config
      );

      if (!response.data.success || !response.data) {
        throw new Error(response.data.message || 'Upload failed');
      }

      return response.data;
    });

    try {
      const result = retry 
        ? await this._retryRequest(requestFn, maxRetries)
        : await requestFn();

      // 清除文档列表缓存
      if (clearCache) {
        this._clearCacheByPattern(`getTaskDocuments:${projectId}:${taskId}`);
      }

      return result;
    } catch (error) {
      console.error('上传文档失败:', error);
      throw this._enhanceError(error, '上传文档');
    }
  },

  /**
   * 分片上传大文件
   */
  async _uploadInChunks(
    projectId: number,
    taskId: number,
    file: File,
    chunkSize: number,
    onProgress?: UploadProgressCallback
  ): Promise<UploadedDocumentInfo> {
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = `${Date.now()}_${Math.random().toString(36)}`;
    let uploadedBytes = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('uploadId', uploadId);
      formData.append('fileName', file.name);

      await this._retryRequest(async () => {
        const response = await api.post(
          `/projects/${projectId}/tasks/${taskId}/upload-chunk`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // 1分钟超时
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Chunk upload failed');
        }

        uploadedBytes += chunk.size;
        if (onProgress) {
          const progress = Math.round((uploadedBytes * 100) / file.size);
          onProgress(progress, uploadedBytes, file.size);
        }
      });
    }

    // 完成上传
    const completeResponse = await api.post(
      `/projects/${projectId}/tasks/${taskId}/upload-complete`,
      { uploadId, fileName: file.name, fileSize: file.size }
    );

    if (!completeResponse.data.success || !completeResponse.data) {
      throw new Error(completeResponse.data.message || 'Upload completion failed');
    }

    return completeResponse.data;
  },

  /**
   * 批量操作管理器
   */
  async batchOperation<T, R>(
    items: T[],
    operation: (item: T, index: number) => Promise<R>,
    options: {
      concurrency?: number;
      onProgress?: (completed: number, total: number, currentItem: T) => void;
      stopOnError?: boolean;
    } = {}
  ): Promise<Array<{ success: boolean; result?: R; error?: any; item: T }>> {
    const { concurrency = 3, onProgress, stopOnError = false } = options;
    const results: Array<{ success: boolean; result?: R; error?: any; item: T }> = [];
    let completed = 0;

    // 分批处理
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const itemIndex = i + batchIndex;
        try {
          const result = await operation(item, itemIndex);
          completed++;
          onProgress?.(completed, items.length, item);
          return { success: true, result, item };
        } catch (error) {
          completed++;
          onProgress?.(completed, items.length, item);
          if (stopOnError) {
            throw error;
          }
          return { success: false, error, item };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (stopOnError && batchResults.some(r => !r.success)) {
        break;
      }
    }

    return results;
  },

  /**
   * 增强错误信息
   */
  _enhanceError(error: any, operation: string): Error {
    const message = `${operation}失败`;
    let details = '';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          details = '请求参数错误';
          break;
        case 401:
          details = '身份验证失败，请重新登录';
          break;
        case 403:
          details = '权限不足';
          break;
        case 404:
          details = '资源不存在';
          break;
        case 413:
          details = '文件过大';
          break;
        case 429:
          details = '请求过于频繁，请稍后重试';
          break;
        case 500:
          details = '服务器内部错误';
          break;
        default:
          details = `服务器错误 (${status})`;
      }

      if (data?.message) {
        details += `: ${data.message}`;
      }
    } else if (error.request) {
      details = '网络连接失败，请检查网络设置';
    } else {
      details = error.message || '未知错误';
    }

    const enhancedError = new Error(`${message}: ${details}`);
    (enhancedError as any).originalError = error;
    (enhancedError as any).operation = operation;
    
    return enhancedError;
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.warn('健康检查失败:', error);
      return false;
    }
  },

  /**
   * 获取服务统计信息 - 基于新的性能工具
   */
  getServiceStats() {
    const cacheStats = apiCache.getStats();
    return {
      cache: cacheStats,
      activeRequests: this._requestQueue.length,
      maxConcurrentRequests: this._maxConcurrentRequests,
      performance: {
        averageResponseTime: (performanceMonitor as any).getAverageTime('get_task_document'),
        averageUploadTime: (performanceMonitor as any).getAverageTime('upload_document'),
        averageSaveTime: (performanceMonitor as any).getAverageTime('save_task_document'),
      }
    };
  },

  /**
   * 配置服务设置 - 简化版本
   */
  configure(settings: {
    maxConcurrentRequests?: number;
  }): void {
    if (settings.maxConcurrentRequests !== undefined) {
      this._maxConcurrentRequests = settings.maxConcurrentRequests;
    }
  },

  /**
   * 清除所有缓存 - 使用新的缓存系统
   */
  clearAllCache(): void {
    apiCache.clear();
  },

  /**
   * 获取文档内容用于预览 - 已优化性能监控和缓存
   */
  async getDocumentContent(projectId: number, taskId: number, documentId: number): Promise<string> {
    const cacheKey = `document_content_${projectId}_${taskId}_${documentId}`;
    
    try {
      performanceMonitor.startMeasure('get_document_content', { 
        projectId, 
        taskId, 
        documentId 
      });
      
      // 尝试从优化缓存获取
      const cached = apiCache.get<string>(cacheKey);
      if (cached) {
        performanceMonitor.endMeasure('get_document_content');
        return cached;
      }

      const response = await this._retryRequest(async () => {
        const result = await api.get(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}/content`);
        return result.data.content || result.data || '';
      });

      // 缓存结果（30分钟）
      apiCache.set(cacheKey, response, 30 * 60 * 1000);
      
      performanceMonitor.endMeasure('get_document_content');
      return response;
    } catch (error) {
      performanceMonitor.endMeasure('get_document_content');
      console.error('获取文档内容失败:', error);
      throw this._enhanceError(error, '获取文档内容');
    }
  },

  /**
   * 删除文档 - 已优化性能监控和缓存清理
   */
  async deleteDocument(projectId: number, taskId: number, documentId: number): Promise<void> {
    try {
      performanceMonitor.startMeasure('delete_document', { 
        projectId, 
        taskId, 
        documentId 
      });
      
      await this._retryRequest(async () => {
        await api.delete(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}`);
      });

      // 清除相关缓存
      const contentCacheKey = `document_content_${projectId}_${taskId}_${documentId}`;
      const listCacheKey = `get_task_documents_${projectId}_${taskId}`;
      
      apiCache.remove(contentCacheKey);
      apiCache.remove(listCacheKey);
      
      performanceMonitor.endMeasure('delete_document');
    } catch (error) {
      performanceMonitor.endMeasure('delete_document');
      console.error('删除文档失败:', error);
      throw this._enhanceError(error, '删除文档');
    }
  },

  /**
   * 下载单个文件
   */
  async downloadFile(filePath: string, fileName: string): Promise<void> {
    try {
      const response = await this._retryRequest(async () => {
        return api.get(`/files/download`, {
          params: { path: filePath },
          responseType: 'blob',
        });
      });

      this.triggerDownload(response.data, fileName);
    } catch (error) {
      console.error('下载文件失败:', error);
      throw this._enhanceError(error, '下载文件');
    }
  },


  // ===== Task 307-12: 版本历史功能实现 =====

  /**
   * 获取文档版本历史 - 已优化性能监控和缓存
   */
  async getDocumentVersionHistory(
    projectId: number, 
    taskId: number, 
    documentId: number,
    options: {
      limit?: number;
      offset?: number;
      includeContent?: boolean;
      useCache?: boolean;
    } = {}
  ): Promise<DocumentVersionHistoryResponse> {
    const { limit = 20, offset = 0, includeContent = false, useCache = true } = options;
    const cacheKey = `version_history_${projectId}_${taskId}_${documentId}_${limit}_${offset}_${includeContent}`;
    
    try {
      performanceMonitor.startMeasure('get_version_history', {
        projectId,
        taskId,
        documentId,
        limit,
        offset,
        includeContent
      });
      
      // 尝试从优化缓存获取
      if (useCache) {
        const cached = apiCache.get<DocumentVersionHistoryResponse>(cacheKey);
        if (cached) {
          performanceMonitor.endMeasure('get_version_history');
          return cached;
        }
      }

      const response = await this._retryRequest(async () => {
        return api.get(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions`, {
          params: { limit, offset, include_content: includeContent }
        });
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get version history');
      }

      const result = response.data as DocumentVersionHistoryResponse;
      
      // 缓存结果（10分钟）
      if (useCache) {
        apiCache.set(cacheKey, result, 10 * 60 * 1000);
      }

      performanceMonitor.endMeasure('get_version_history');
      return result;
    } catch (error) {
      performanceMonitor.endMeasure('get_version_history');
      console.error('获取文档版本历史失败:', error);
      throw this._enhanceError(error, '获取文档版本历史');
    }
  },

  /**
   * 获取特定版本的文档内容 - 已优化性能监控和缓存
   */
  async getDocumentVersion(
    projectId: number, 
    taskId: number, 
    documentId: number, 
    versionId: number,
    useCache: boolean = true
  ): Promise<DocumentVersionInfo> {
    const cacheKey = `document_version_${projectId}_${taskId}_${documentId}_${versionId}`;
    
    try {
      performanceMonitor.startMeasure('get_document_version', {
        projectId,
        taskId,
        documentId,
        versionId
      });
      
      // 尝试从优化缓存获取
      if (useCache) {
        const cached = apiCache.get<DocumentVersionInfo>(cacheKey);
        if (cached) {
          performanceMonitor.endMeasure('get_document_version');
          return cached;
        }
      }

      const response = await this._retryRequest(async () => {
        return api.get(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionId}`);
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get document version');
      }

      const result = response.data as DocumentVersionInfo;
      
      // 缓存结果（15分钟）
      if (useCache) {
        apiCache.set(cacheKey, result, 15 * 60 * 1000);
      }

      performanceMonitor.endMeasure('get_document_version');
      return result;
    } catch (error) {
      performanceMonitor.endMeasure('get_document_version');
      console.error('获取文档版本失败:', error);
      throw this._enhanceError(error, '获取文档版本');
    }
  },

  /**
   * 比较两个文档版本 - 已优化性能监控和缓存
   */
  async compareDocumentVersions(
    projectId: number, 
    taskId: number, 
    documentId: number, 
    version1Id: number, 
    version2Id: number
  ): Promise<DocumentVersionComparisonResult> {
    const cacheKey = `version_comparison_${projectId}_${taskId}_${documentId}_${version1Id}_${version2Id}`;
    
    try {
      performanceMonitor.startMeasure('compare_versions', {
        projectId,
        taskId,
        documentId,
        version1Id,
        version2Id
      });
      
      // 尝试从优化缓存获取
      const cached = apiCache.get<DocumentVersionComparisonResult>(cacheKey);
      if (cached) {
        performanceMonitor.endMeasure('compare_versions');
        return cached;
      }

      const response = await this._retryRequest(async () => {
        return api.get(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/compare`, {
          params: { version1: version1Id, version2: version2Id }
        });
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to compare versions');
      }

      const result = response.data as DocumentVersionComparisonResult;
      
      // 缓存结果（5分钟）
      apiCache.set(cacheKey, result, 5 * 60 * 1000);

      performanceMonitor.endMeasure('compare_versions');
      return result;
    } catch (error) {
      performanceMonitor.endMeasure('compare_versions');
      console.error('比较文档版本失败:', error);
      throw this._enhanceError(error, '比较文档版本');
    }
  },

  /**
   * 恢复到特定版本
   */
  async restoreDocumentVersion(
    projectId: number, 
    taskId: number, 
    documentId: number, 
    restoreRequest: DocumentRestoreRequest
  ): Promise<DocumentVersionInfo> {
    try {
      const response = await this._retryRequest(async () => {
        return api.post(
          `/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/restore`,
          restoreRequest
        );
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to restore version');
      }

      // 清除相关缓存 - 使用新的缓存系统
      const cachePatterns = [
        `document_version_${projectId}_${taskId}_${documentId}`,
        `version_history_${projectId}_${taskId}_${documentId}`,
        `document_content_${projectId}_${taskId}_${documentId}`
      ];
      
      // 手动清除相关缓存键
      cachePatterns.forEach(pattern => {
        const stats = apiCache.getStats();
        stats.entries.forEach(entry => {
          if (entry.key.includes(pattern)) {
            apiCache.remove(entry.key);
          }
        });
      });

      return response.data as DocumentVersionInfo;
    } catch (error) {
      console.error('恢复文档版本失败:', error);
      throw this._enhanceError(error, '恢复文档版本');
    }
  },

  /**
   * 创建版本标签/注释
   */
  async createVersionTag(
    projectId: number, 
    taskId: number, 
    documentId: number, 
    versionId: number, 
    tag: string,
    description?: string
  ): Promise<void> {
    try {
      await this._retryRequest(async () => {
        return api.post(
          `/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionId}/tags`,
          { tag, description }
        );
      });

      // 清除版本历史缓存
      const stats = apiCache.getStats();
      stats.entries.forEach(entry => {
        if (entry.key.includes(`version_history_${projectId}_${taskId}_${documentId}`)) {
          apiCache.remove(entry.key);
        }
      });
    } catch (error) {
      console.error('创建版本标签失败:', error);
      throw this._enhanceError(error, '创建版本标签');
    }
  },

  /**
   * 获取版本统计信息 - 已优化性能监控和缓存
   */
  async getVersionStatistics(
    projectId: number, 
    taskId: number, 
    documentId: number
  ): Promise<{
    total_versions: number;
    total_size_changes: number;
    most_active_contributor: string;
    version_frequency: Record<string, number>; // 按日期分组的版本数量
    change_types: Record<string, number>;
  }> {
    const cacheKey = `version_stats_${projectId}_${taskId}_${documentId}`;
    
    try {
      performanceMonitor.startMeasure('get_version_statistics', {
        projectId,
        taskId,
        documentId
      });
      
      // 尝试从优化缓存获取
      const cached = apiCache.get<any>(cacheKey);
      if (cached) {
        performanceMonitor.endMeasure('get_version_statistics');
        return cached;
      }

      const response = await this._retryRequest(async () => {
        return api.get(`/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/statistics`);
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get version statistics');
      }

      const result = response.data;
      
      // 缓存结果（30分钟）
      apiCache.set(cacheKey, result, 30 * 60 * 1000);

      performanceMonitor.endMeasure('get_version_statistics');
      return result;
    } catch (error) {
      performanceMonitor.endMeasure('get_version_statistics');
      console.error('获取版本统计失败:', error);
      throw this._enhanceError(error, '获取版本统计');
    }
  },

  /**
   * 批量操作版本（删除、标记等）
   */
  async batchVersionOperation(
    projectId: number, 
    taskId: number, 
    documentId: number,
    versionIds: number[],
    operation: 'delete' | 'tag' | 'export',
    operationData?: any
  ): Promise<Array<{ versionId: number; success: boolean; error?: string }>> {
    try {
      const results = await this.batchOperation(
        versionIds,
        async (versionId) => {
          switch (operation) {
            case 'delete':
              await api.delete(
                `/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionId}`
              );
              break;
            case 'tag':
              await api.post(
                `/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionId}/tags`,
                operationData
              );
              break;
            case 'export':
              const response = await api.get(
                `/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionId}/export`,
                { responseType: 'blob' }
              );
              const fileName = `document_${documentId}_v${versionId}.md`;
              this.triggerDownload(response.data, fileName);
              break;
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
        },
        {
          concurrency: 2,
          stopOnError: false
        }
      );

      // 清除相关缓存
      const cachePatterns = [
        `version_history_${projectId}_${taskId}_${documentId}`,
        `version_stats_${projectId}_${taskId}_${documentId}`
      ];
      
      cachePatterns.forEach(pattern => {
        const stats = apiCache.getStats();
        stats.entries.forEach(entry => {
          if (entry.key.includes(pattern)) {
            apiCache.remove(entry.key);
          }
        });
      });

      return results.map(result => ({
        versionId: result.item,
        success: result.success,
        error: result.error?.message
      }));
    } catch (error) {
      console.error('批量版本操作失败:', error);
      throw this._enhanceError(error, '批量版本操作');
    }
  },

  /**
   * 导出版本历史报告
   */
  async exportVersionHistory(
    projectId: number, 
    taskId: number, 
    documentId: number,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<Blob> {
    try {
      const response = await this._retryRequest(async () => {
        return api.get(
          `/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/export`,
          {
            params: { format },
            responseType: 'blob'
          }
        );
      });

      return response.data;
    } catch (error) {
      console.error('导出版本历史失败:', error);
      throw this._enhanceError(error, '导出版本历史');
    }
  }
};

export default taskDocumentService;