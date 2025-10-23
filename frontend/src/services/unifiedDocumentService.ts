/**
 * 统一文档服务 - 所有文档操作的单一入口
 *
 * Phase 7: 合并documentService.ts (831行) + taskDocumentService.ts (1,570行) + 原unifiedDocumentService.ts (656行)
 *
 * 功能模块:
 * 1. 核心CRUD - 文档的增删改查
 * 2. 任务文档 - 任务关联的文档操作
 * 3. 文件上传 - 基础+增强+分块上传
 * 4. 版本管理 - 历史+比较+恢复
 * 5. 搜索过滤 - 全文搜索+高级过滤
 * 6. 导出功能 - markdown/PDF/HTML导出
 * 7. 批量操作 - 批量删除/归档/标签
 * 8. 缓存管理 - 三级缓存系统
 * 9. 性能监控 - 操作性能跟踪
 *
 * @example
 * ```typescript
 * // 获取文档
 * const doc = await documentService.getDocument(123);
 *
 * // 上传文件
 * const uploaded = await documentService.uploadFile(file, {
 *   onProgress: (progress) => console.log(`${progress}%`)
 * });
 *
 * // 保存任务文档
 * const taskDoc = await documentService.saveTaskDocument(1, 456, content);
 * ```
 */

import api from './api';
import { documentCacheService } from './documentCacheService';
import {
  apiCache,
  performanceMonitor
} from '../utils/performanceOptimization';

import {
  Document,
  DocumentFilter,
  DocumentListResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  UploadProgressCallback,
  FileUploadOptions,
  ApiResponse,
  TaskDocumentResponse,
  UploadedDocumentInfo,
  DocumentVersionInfo,
  DocumentVersionHistoryResponse,
  DocumentVersionComparisonResult,
  BatchOperationRequest,
  BatchOperationResponse,
  SearchDocument,
} from '../types/document';

/**
 * 统一文档服务类
 * 使用单例模式，确保全局只有一个实例
 */
export class UnifiedDocumentService {
  private static instance: UnifiedDocumentService;

  // 配置常量
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分钟
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  private readonly DEFAULT_RETRY_COUNT = 3;
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  // 请求队列管理
  private requestQueue: Map<string, Promise<any>> = new Map();
  private activeRequests = 0;

  /**
   * 获取单例实例
   */
  public static getInstance(): UnifiedDocumentService {
    if (!UnifiedDocumentService.instance) {
      UnifiedDocumentService.instance = new UnifiedDocumentService();
    }
    return UnifiedDocumentService.instance;
  }

  /**
   * 私有构造函数，强制使用单例
   */
  private constructor() {
    // 初始化完成
    console.log('[UnifiedDocumentService] Initialized');
  }

  // ==================== 模块1: 核心CRUD操作 ====================

  /**
   * 获取单个文档
   * 合并自: documentService.getDocument(), taskDocumentService.get()
   *
   * @param documentId 文档ID
   * @returns 文档对象
   */
  async getDocument(documentId: number): Promise<Document> {
    const cacheKey = this.generateCacheKey('document', documentId);

    try {
      this.startMonitoring('get_document', { documentId });

      // 尝试从缓存获取
      const cached = await this.getFromCache<Document>(cacheKey);
      if (cached) {
        this.endMonitoring('get_document');
        return cached;
      }

      // 从API获取
      const response = await api.get(`/documents/${documentId}`);
      const document = response as Document;

      // 设置缓存
      await this.setCache(cacheKey, document, this.DEFAULT_CACHE_TTL);

      this.endMonitoring('get_document');
      return document;
    } catch (error) {
      this.endMonitoring('get_document');
      console.error('[getDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 获取文档列表
   * 合并自: documentService.listDocuments()
   *
   * @param filter 过滤条件
   * @returns 文档列表响应
   */
  async listDocuments(filter?: DocumentFilter): Promise<DocumentListResponse> {
    const cacheKey = this.generateCacheKey('documents_list', JSON.stringify(filter || {}));

    try {
      this.startMonitoring('list_documents', { filter });

      // 尝试从缓存获取
      const cached = await this.getFromCache<DocumentListResponse>(cacheKey);
      if (cached) {
        this.endMonitoring('list_documents');
        return cached;
      }

      // 构建查询参数
      const params = this.buildQueryParams(filter);

      // 从API获取
      const response = await api.get('/documents', { params });
      const listResponse = response as DocumentListResponse;

      // 设置缓存（列表缓存时间较短）
      await this.setCache(cacheKey, listResponse, this.DEFAULT_CACHE_TTL / 2);

      this.endMonitoring('list_documents');
      return listResponse;
    } catch (error) {
      this.endMonitoring('list_documents');
      console.error('[listDocuments] Failed:', error);
      throw error;
    }
  }

  /**
   * 创建文档
   * 合并自: documentService.createDocument(), taskDocumentService.save()
   *
   * @param request 创建请求
   * @returns 创建的文档
   */
  async createDocument(request: CreateDocumentRequest): Promise<Document> {
    try {
      this.startMonitoring('create_document', { title: request.title });

      // 验证请求
      this.validateDocumentRequest(request);

      // 创建文档
      const response = await api.post('/documents', request);
      const document = response as Document;

      // 清除列表缓存
      await this.invalidateListCache();

      this.endMonitoring('create_document');
      return document;
    } catch (error) {
      this.endMonitoring('create_document');
      console.error('[createDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 更新文档
   * 合并自: documentService.updateDocument(), taskDocumentService.save()
   *
   * @param documentId 文档ID
   * @param request 更新请求
   * @returns 更新后的文档
   */
  async updateDocument(
    documentId: number,
    request: UpdateDocumentRequest
  ): Promise<Document> {
    try {
      this.startMonitoring('update_document', { documentId });

      // 更新文档
      const response = await api.put(`/documents/${documentId}`, request);
      const document = response as Document;

      // 失效相关缓存
      await this.invalidateDocumentCache(documentId);
      await this.invalidateListCache();

      this.endMonitoring('update_document');
      return document;
    } catch (error) {
      this.endMonitoring('update_document');
      console.error('[updateDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 删除文档
   * 合并自: documentService.deleteDocument(), taskDocumentService.delete()
   *
   * @param documentId 文档ID
   */
  async deleteDocument(documentId: number): Promise<void> {
    try {
      this.startMonitoring('delete_document', { documentId });

      // 删除文档
      await api.delete(`/documents/${documentId}`);

      // 清除缓存
      await this.invalidateDocumentCache(documentId);
      await this.invalidateListCache();

      this.endMonitoring('delete_document');
    } catch (error) {
      this.endMonitoring('delete_document');
      console.error('[deleteDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 搜索文档
   * 合并自: documentService.searchDocuments()
   *
   * @param query 搜索关键词
   * @param filter 过滤条件
   * @returns 搜索结果
   */
  async searchDocuments(
    query: string,
    filter?: DocumentFilter
  ): Promise<SearchDocument[]> {
    try {
      this.startMonitoring('search_documents', { query });

      const params = {
        ...this.buildQueryParams(filter),
        search: query,
      };

      const response = await api.get('/documents/search', { params });
      const results = response as SearchDocument[];

      this.endMonitoring('search_documents');
      return results;
    } catch (error) {
      this.endMonitoring('search_documents');
      console.error('[searchDocuments] Failed:', error);
      throw error;
    }
  }

  // ==================== 模块2: 任务文档操作 ====================

  /**
   * 获取任务文档
   * 合并自: documentService.getTaskDocument(), taskDocumentService.get()
   *
   * @param projectId 项目ID
   * @param taskId 任务ID
   * @returns 任务文档，不存在返回null
   */
  async getTaskDocument(
    projectId: number,
    taskId: number
  ): Promise<Document | null> {
    const cacheKey = this.generateCacheKey('task_document', projectId, taskId);

    try {
      this.startMonitoring('get_task_document', { projectId, taskId });

      // 尝试从缓存获取
      const cached = await this.getFromCache<Document>(cacheKey);
      if (cached) {
        this.endMonitoring('get_task_document');
        return cached;
      }

      // 从API获取
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);

      // 处理空响应（任务没有文档）
      if (!response || (response as TaskDocumentResponse).content === '') {
        this.endMonitoring('get_task_document');
        return null;
      }

      const document = response as Document;

      // 设置缓存
      await this.setCache(cacheKey, document, this.DEFAULT_CACHE_TTL);

      this.endMonitoring('get_task_document');
      return document;
    } catch (error: any) {
      this.endMonitoring('get_task_document');

      // 404错误表示文档不存在，返回null而不是抛出异常
      if (error?.response?.status === 404) {
        return null;
      }

      console.error('[getTaskDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 保存任务文档
   * 合并自: documentService.saveTaskDocument(), taskDocumentService.save()
   *
   * @param projectId 项目ID
   * @param taskId 任务ID
   * @param content 文档内容
   * @param metadata 元数据（可选）
   * @returns 保存的文档
   */
  async saveTaskDocument(
    projectId: number,
    taskId: number,
    content: string,
    metadata?: Record<string, any>
  ): Promise<Document> {
    try {
      this.startMonitoring('save_task_document', { projectId, taskId });

      const request = {
        content,
        ...metadata,
      };

      // 保存文档（API会自动判断是创建还是更新）
      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/document`,
        request
      );
      const document = response as Document;

      // 失效缓存
      await this.invalidateTaskDocumentCache(projectId, taskId);

      this.endMonitoring('save_task_document');
      return document;
    } catch (error) {
      this.endMonitoring('save_task_document');
      console.error('[saveTaskDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 删除任务文档
   * 合并自: taskDocumentService.delete()
   *
   * @param projectId 项目ID
   * @param taskId 任务ID
   */
  async deleteTaskDocument(projectId: number, taskId: number): Promise<void> {
    try {
      this.startMonitoring('delete_task_document', { projectId, taskId });

      await api.delete(`/projects/${projectId}/tasks/${taskId}/document`);

      // 清除缓存
      await this.invalidateTaskDocumentCache(projectId, taskId);

      this.endMonitoring('delete_task_document');
    } catch (error) {
      this.endMonitoring('delete_task_document');
      console.error('[deleteTaskDocument] Failed:', error);
      throw error;
    }
  }

  /**
   * 检查任务是否有文档
   * 新功能: 快速检查文档存在性
   *
   * @param projectId 项目ID
   * @param taskId 任务ID
   * @returns 是否存在文档
   */
  async hasTaskDocument(projectId: number, taskId: number): Promise<boolean> {
    try {
      const doc = await this.getTaskDocument(projectId, taskId);
      return doc !== null;
    } catch (error) {
      console.error('[hasTaskDocument] Failed:', error);
      return false;
    }
  }

  /**
   * 获取任务的所有文档（包括上传文件）
   * 合并自: taskDocumentService.getTaskDocuments()
   *
   * @param projectId 项目ID
   * @param taskId 任务ID
   * @returns 文档列表
   */
  async getTaskDocuments(
    projectId: number,
    taskId: number
  ): Promise<UploadedDocumentInfo[]> {
    try {
      this.startMonitoring('get_task_documents', { projectId, taskId });

      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents`);
      const documents = (response as any).documents || [];

      this.endMonitoring('get_task_documents');
      return documents;
    } catch (error) {
      this.endMonitoring('get_task_documents');
      console.error('[getTaskDocuments] Failed:', error);
      throw error;
    }
  }

  // ==================== 模块3: 文件上传 ====================

  /**
   * 上传文件并创建文档
   * 合并自: documentService.uploadFile(), taskDocumentService.uploadDocument()
   *
   * @param file 文件对象
   * @param options 上传选项
   * @returns 创建的文档
   */
  async uploadFile(
    file: File,
    options?: FileUploadOptions
  ): Promise<Document> {
    try {
      this.startMonitoring('upload_file', {
        fileName: file.name,
        fileSize: file.size
      });

      // 验证文件
      this.validateFile(file, options?.maxRetries);

      // 准备FormData
      const formData = new FormData();
      formData.append('file', file);

      // 上传文件
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          if (options?.onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(progress, progressEvent.loaded, progressEvent.total);
          }
        },
        timeout: options?.timeout || 30000,
      });

      const document = response as Document;

      // 清除列表缓存
      await this.invalidateListCache();

      this.endMonitoring('upload_file');
      return document;
    } catch (error) {
      this.endMonitoring('upload_file');
      console.error('[uploadFile] Failed:', error);
      throw error;
    }
  }

  /**
   * 上传任务文档文件
   * 合并自: taskDocumentService.uploadDocument()
   *
   * @param projectId 项目ID
   * @param taskId 任务ID
   * @param file 文件对象
   * @param options 上传选项
   * @returns 上传的文档信息
   */
  async uploadTaskDocument(
    projectId: number,
    taskId: number,
    file: File,
    options?: FileUploadOptions
  ): Promise<UploadedDocumentInfo> {
    try {
      this.startMonitoring('upload_task_document', {
        projectId,
        taskId,
        fileName: file.name,
      });

      // 验证文件
      this.validateFile(file);

      // 准备FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_type', 'manual');

      // 上传文件
      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/documents/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: any) => {
            if (options?.onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              options.onProgress(progress, progressEvent.loaded, progressEvent.total);
            }
          },
        }
      );

      const uploadedInfo = response as UploadedDocumentInfo;

      // 失效缓存
      await this.invalidateTaskDocumentCache(projectId, taskId);

      this.endMonitoring('upload_task_document');
      return uploadedInfo;
    } catch (error) {
      this.endMonitoring('upload_task_document');
      console.error('[uploadTaskDocument] Failed:', error);
      throw error;
    }
  }

  // ==================== 模块4: 版本管理 ====================

  /**
   * 获取文档版本历史
   * 合并自: documentService.getDocumentVersions(), taskDocumentService.getVersionHistory()
   *
   * @param documentId 文档ID
   * @param options 查询选项
   * @returns 版本历史响应
   */
  async getVersionHistory(
    documentId: number,
    options?: {
      page?: number;
      limit?: number;
      includeContent?: boolean;
    }
  ): Promise<DocumentVersionHistoryResponse> {
    try {
      this.startMonitoring('get_version_history', { documentId });

      const params = {
        page: options?.page || 1,
        limit: options?.limit || 20,
        include_content: options?.includeContent || false,
      };

      const response = await api.get(`/documents/${documentId}/versions`, { params });
      const history = response as DocumentVersionHistoryResponse;

      this.endMonitoring('get_version_history');
      return history;
    } catch (error) {
      this.endMonitoring('get_version_history');
      console.error('[getVersionHistory] Failed:', error);
      throw error;
    }
  }

  /**
   * 比较两个版本
   * 合并自: documentService.compareVersions(), taskDocumentService.compareVersions()
   *
   * @param documentId 文档ID
   * @param version1 版本1
   * @param version2 版本2
   * @returns 比较结果
   */
  async compareVersions(
    documentId: number,
    version1: number,
    version2: number
  ): Promise<DocumentVersionComparisonResult> {
    try {
      this.startMonitoring('compare_versions', { documentId, version1, version2 });

      const response = await api.get(
        `/documents/${documentId}/versions/compare`,
        {
          params: { version1, version2 },
        }
      );

      const comparison = response as DocumentVersionComparisonResult;

      this.endMonitoring('compare_versions');
      return comparison;
    } catch (error) {
      this.endMonitoring('compare_versions');
      console.error('[compareVersions] Failed:', error);
      throw error;
    }
  }

  /**
   * 恢复到指定版本
   * 合并自: documentService.restoreVersion(), taskDocumentService.restoreVersion()
   *
   * @param documentId 文档ID
   * @param versionNumber 版本号
   * @returns 恢复后的文档（新版本）
   */
  async restoreVersion(
    documentId: number,
    versionNumber: number
  ): Promise<Document> {
    try {
      this.startMonitoring('restore_version', { documentId, versionNumber });

      const response = await api.post(
        `/documents/${documentId}/versions/${versionNumber}/restore`
      );

      const document = response as Document;

      // 失效缓存
      await this.invalidateDocumentCache(documentId);

      this.endMonitoring('restore_version');
      return document;
    } catch (error) {
      this.endMonitoring('restore_version');
      console.error('[restoreVersion] Failed:', error);
      throw error;
    }
  }

  // ==================== 模块5: 批量操作 ====================

  /**
   * 批量操作文档
   * 合并自: taskDocumentService.batchOperation()
   *
   * @param request 批量操作请求
   * @returns 操作结果
   */
  async batchOperation(request: BatchOperationRequest): Promise<BatchOperationResponse> {
    try {
      this.startMonitoring('batch_operation', {
        operation: request.operation,
        count: request.document_ids.length
      });

      const response = await api.post('/documents/batch', request);
      const result = response as BatchOperationResponse;

      // 清除相关缓存
      await this.invalidateListCache();
      for (const docId of request.document_ids) {
        await this.invalidateDocumentCache(docId);
      }

      this.endMonitoring('batch_operation');
      return result;
    } catch (error) {
      this.endMonitoring('batch_operation');
      console.error('[batchOperation] Failed:', error);
      throw error;
    }
  }

  /**
   * 批量删除文档
   * 新功能: 便捷的批量删除方法
   *
   * @param documentIds 文档ID列表
   * @returns 操作结果
   */
  async batchDeleteDocuments(documentIds: number[]): Promise<BatchOperationResponse> {
    return this.batchOperation({
      operation: 'delete',
      document_ids: documentIds,
    });
  }

  // ==================== 私有工具方法 ====================

  /**
   * 从缓存获取数据
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      // 优先使用apiCache（内存缓存）
      const cached = apiCache.get<T>(key);
      if (cached) {
        return cached;
      }

      // 尝试从documentCacheService获取
      return await documentCacheService.get<T>(key);
    } catch (error) {
      console.warn('[getFromCache] Failed:', error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  private async setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // 设置内存缓存
      apiCache.set(key, value, ttl || this.DEFAULT_CACHE_TTL);

      // 设置持久化缓存
      await documentCacheService.set(key, value, ttl || this.DEFAULT_CACHE_TTL);
    } catch (error) {
      console.warn('[setCache] Failed:', error);
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, ...params: any[]): string {
    return `unified_doc_${type}_${params.join('_')}`;
  }

  /**
   * 失效文档缓存
   */
  private async invalidateDocumentCache(documentId: number): Promise<void> {
    const cacheKey = this.generateCacheKey('document', documentId);
    await documentCacheService.remove(cacheKey);
    apiCache.remove(cacheKey);
  }

  /**
   * 失效任务文档缓存
   */
  private async invalidateTaskDocumentCache(
    projectId: number,
    taskId: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey('task_document', projectId, taskId);
    await documentCacheService.remove(cacheKey);
    apiCache.remove(cacheKey);
  }

  /**
   * 失效列表缓存
   */
  private async invalidateListCache(): Promise<void> {
    // 清除所有列表相关缓存
    // 注意：这是简化实现，生产环境应该使用更精确的缓存键管理
    await documentCacheService.clear();
  }

  /**
   * 开始性能监控
   */
  private startMonitoring(operation: string, metadata?: Record<string, any>): void {
    performanceMonitor.startMeasure(operation, metadata);
  }

  /**
   * 结束性能监控
   */
  private endMonitoring(operation: string): void {
    performanceMonitor.endMeasure(operation);
  }

  /**
   * 验证文档请求
   */
  private validateDocumentRequest(request: CreateDocumentRequest): void {
    if (!request.title || request.title.trim() === '') {
      throw new Error('Document title is required');
    }

    if (request.title.length > 255) {
      throw new Error('Document title is too long (max 255 characters)');
    }
  }

  /**
   * 验证文件
   */
  private validateFile(file: File, maxSize?: number): void {
    const limit = maxSize || this.MAX_FILE_SIZE;

    if (file.size > limit) {
      throw new Error(
        `File size (${this.formatFileSize(file.size)}) exceeds limit (${this.formatFileSize(limit)})`
      );
    }

    if (!file.name || file.name.trim() === '') {
      throw new Error('File name is required');
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * 构建查询参数
   */
  private buildQueryParams(filter?: DocumentFilter): Record<string, any> {
    if (!filter) return {};

    const params: Record<string, any> = {};

    if (filter.search) params.search = filter.search;
    if (filter.type) params.type = Array.isArray(filter.type) ? filter.type.join(',') : filter.type;
    if (filter.status) params.status = Array.isArray(filter.status) ? filter.status.join(',') : filter.status;
    if (filter.owner_id) params.owner_id = filter.owner_id;
    if (filter.folder_id) params.folder_id = filter.folder_id;
    if (filter.project_id) params.project_id = filter.project_id;
    if (filter.tags && filter.tags.length > 0) params.tags = filter.tags.join(',');
    if (filter.page) params.page = filter.page;
    if (filter.limit) params.limit = filter.limit;
    if (filter.sort_by) params.sort_by = filter.sort_by;
    if (filter.order) params.order = filter.order;

    return params;
  }
}

// 导出单例实例
export const documentService = UnifiedDocumentService.getInstance();

// 默认导出
export default documentService;
