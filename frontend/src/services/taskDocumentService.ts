import api from './api';
import axios, { AxiosProgressEvent } from 'axios';

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

export const taskDocumentService = {
  // 获取任务文档内容
  async get(projectId: number, taskId: number): Promise<TaskDocumentResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      return response.data;
    } catch (error) {
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

  // 保存任务文档内容
  async save(projectId: number, taskId: number, content: string): Promise<TaskDocumentResponse> {
    try {
      const requestData: DocumentRequest = { content };
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData);
      return response.data;
    } catch (error) {
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
   * 手工上传文档
   */
  async uploadDocument(
    projectId: number,
    taskId: number,
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<UploadedDocumentInfo> {
    try {
      // 验证文件
      this.validateFile(file);

      // 创建FormData
      const formData = new FormData();
      formData.append('document', file);

      // 配置请求
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress, progressEvent.loaded, progressEvent.total);
          }
        },
      };

      // 发送请求
      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/upload`,
        formData,
        config
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('上传文档失败:', error);
      throw error;
    }
  },

  /**
   * API方式上传文档
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

      const payload = {
        file_name: fileName,
        content: content, // base64 encoded
        mime_type: mimeType || this.getMimeTypeFromFileName(fileName),
        description: description || '',
      };

      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/upload-api`,
        payload
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'API upload failed');
      }
    } catch (error) {
      console.error('API上传文档失败:', error);
      throw error;
    }
  },

  /**
   * 获取任务的所有上传文档
   */
  async getTaskDocuments(projectId: number, taskId: number): Promise<DocumentListResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/uploads`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get documents');
      }
    } catch (error) {
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
    const allowedExtensions = ['.md', '.pdf', '.txt'];
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
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // ===== Task 307-09: 服务扩展功能 =====

  /**
   * 请求缓存管理
   */
  _cache: new Map<string, { data: any; timestamp: number; ttl: number }>(),
  _cacheSettings: {
    defaultTTL: 5 * 60 * 1000, // 5分钟默认缓存时间
    maxCacheSize: 100, // 最大缓存条目数
    enableCache: true,
  },

  /**
   * 生成缓存键
   */
  _generateCacheKey(method: string, projectId: number, taskId: number, params?: any): string {
    const baseKey = `${method}:${projectId}:${taskId}`;
    if (params) {
      const paramString = JSON.stringify(params);
      return `${baseKey}:${btoa(paramString)}`;
    }
    return baseKey;
  },

  /**
   * 获取缓存数据
   */
  _getCachedData<T>(key: string): T | null {
    if (!this._cacheSettings.enableCache) return null;

    const cached = this._cache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this._cache.delete(key);
      return null;
    }

    return cached.data as T;
  },

  /**
   * 设置缓存数据
   */
  _setCachedData(key: string, data: any, ttl?: number): void {
    if (!this._cacheSettings.enableCache) return;

    // 如果缓存已满，删除最旧的条目
    if (this._cache.size >= this._cacheSettings.maxCacheSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }

    this._cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this._cacheSettings.defaultTTL,
    });
  },

  /**
   * 清除特定模式的缓存
   */
  _clearCacheByPattern(pattern: string): void {
    const keys = Array.from(this._cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this._cache.delete(key);
      }
    });
  },

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
  _requestQueue: Promise<any>[] = [],
  _maxConcurrentRequests: number = 5,

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
      const cached = this._getCachedData<TaskDocumentResponse>(cacheKey);
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

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Upload failed');
      }

      return response.data.data;
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

    if (!completeResponse.data.success || !completeResponse.data.data) {
      throw new Error(completeResponse.data.message || 'Upload completion failed');
    }

    return completeResponse.data.data;
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
    let message = `${operation}失败`;
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
   * 获取服务统计信息
   */
  getServiceStats() {
    return {
      cacheSize: this._cache.size,
      maxCacheSize: this._cacheSettings.maxCacheSize,
      activeRequests: this._requestQueue.length,
      maxConcurrentRequests: this._maxConcurrentRequests,
      cacheEnabled: this._cacheSettings.enableCache,
    };
  },

  /**
   * 配置服务设置
   */
  configure(settings: {
    enableCache?: boolean;
    defaultTTL?: number;
    maxCacheSize?: number;
    maxConcurrentRequests?: number;
  }): void {
    if (settings.enableCache !== undefined) {
      this._cacheSettings.enableCache = settings.enableCache;
    }
    if (settings.defaultTTL !== undefined) {
      this._cacheSettings.defaultTTL = settings.defaultTTL;
    }
    if (settings.maxCacheSize !== undefined) {
      this._cacheSettings.maxCacheSize = settings.maxCacheSize;
    }
    if (settings.maxConcurrentRequests !== undefined) {
      this._maxConcurrentRequests = settings.maxConcurrentRequests;
    }
  },

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this._cache.clear();
  },

  /**
   * 获取文档内容用于预览
   */
  async getDocumentContent(projectId: number, taskId: number, documentId: number): Promise<string> {
    const cacheKey = `document_content_${projectId}_${taskId}_${documentId}`;
    
    try {
      // 尝试从缓存获取
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this._retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/projects/${projectId}/tasks/${taskId}/documents/${documentId}/content`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json',
          }
        });

        if (!res.ok) {
          throw new Error(`获取文档内容失败: ${res.status} ${res.statusText}`);
        }

        return res.text(); // 返回文本内容
      });

      // 缓存结果（30分钟）
      this._setCache(cacheKey, response, 30 * 60 * 1000);
      return response;
    } catch (error) {
      console.error('获取文档内容失败:', error);
      throw this._enhanceError(error, '获取文档内容', 'getDocumentContent');
    }
  },

  /**
   * 删除文档
   */
  async deleteDocument(projectId: number, taskId: number, documentId: number): Promise<void> {
    try {
      await this._retryRequest(async () => {
        const response = await fetch(`${this.baseURL}/projects/${projectId}/tasks/${taskId}/documents/${documentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `删除文档失败: ${response.status} ${response.statusText}`);
        }
      });

      // 清除相关缓存
      this._clearRelatedCache(`document_content_${projectId}_${taskId}_${documentId}`);
      this._clearRelatedCache(`task_documents_${projectId}_${taskId}`);
    } catch (error) {
      console.error('删除文档失败:', error);
      throw this._enhanceError(error, '删除文档', 'deleteDocument');
    }
  },

  /**
   * 下载单个文件
   */
  async downloadFile(filePath: string, fileName: string): Promise<void> {
    try {
      const response = await this._retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/files/download?path=${encodeURIComponent(filePath)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          }
        });

        if (!res.ok) {
          throw new Error(`下载文件失败: ${res.status} ${res.statusText}`);
        }

        return res;
      });

      const blob = await response.blob();
      this.triggerDownload(blob, fileName);
    } catch (error) {
      console.error('下载文件失败:', error);
      throw this._enhanceError(error, '下载文件', 'downloadFile');
    }
  },

  /**
   * 清除相关缓存
   */
  _clearRelatedCache(keyPattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this._cache.keys()) {
      if (key.includes(keyPattern) || keyPattern.includes(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this._cache.delete(key));
  }
};

export default taskDocumentService;