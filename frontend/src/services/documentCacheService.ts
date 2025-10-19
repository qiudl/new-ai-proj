/**
 * 文档缓存服务 - 超快性能优化
 *
 * 多层缓存架构：
 * L1: 内存缓存 (Map) - 最快，< 1ms
 * L2: IndexedDB - 持久化，5-10ms
 * L3: API请求 - 后端Redis缓存，10-50ms
 */

import { DocumentItem } from '../components/UnifiedTaskDocumentArea';

// 缓存条目接口
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  version: number;
}

// 缓存配置
interface CacheConfig {
  // 内存缓存容量（最大条目数）
  maxMemoryEntries: number;
  // 缓存过期时间（毫秒）
  ttl: number;
  // IndexedDB 数据库名称
  dbName: string;
  // IndexedDB 版本
  dbVersion: number;
  // 是否启用预加载
  enablePreload: boolean;
}

// 默认配置
const DEFAULT_CONFIG: CacheConfig = {
  maxMemoryEntries: 100,
  ttl: 5 * 60 * 1000, // 5分钟
  dbName: 'TaskDocumentCache',
  dbVersion: 1,
  enablePreload: true
};

/**
 * 文档缓存服务类
 */
export class DocumentCacheService {
  private config: CacheConfig;

  // L1: 内存缓存 (Map)
  private memoryCache: Map<string, CacheEntry<DocumentItem[]>> = new Map();

  // IndexedDB 实例
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  // 预加载队列
  private preloadQueue: Set<string> = new Set();

  // LRU追踪（最近使用）
  private accessOrder: string[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initIndexedDB();
  }

  /**
   * 初始化 IndexedDB
   */
  private async initIndexedDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        console.error('❌ [CACHE] IndexedDB初始化失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ [CACHE] IndexedDB初始化成功');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains('documents')) {
          const objectStore = db.createObjectStore('documents', { keyPath: 'key' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('taskId', 'taskId', { unique: false });
          console.log('📦 [CACHE] 创建IndexedDB对象存储');
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * 生成缓存键
   */
  private generateKey(projectId: number, taskId: number, includeDescendants: boolean = false): string {
    return `docs:${projectId}:${taskId}:${includeDescendants ? 'tree' : 'single'}`;
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  /**
   * L1: 从内存缓存获取
   */
  private getFromMemory(key: string): DocumentItem[] | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      console.log(`⏰ [CACHE-L1] 缓存已过期: ${key}`);
      this.memoryCache.delete(key);
      return null;
    }

    // 更新LRU
    this.updateAccessOrder(key);

    console.log(`💨 [CACHE-L1] 内存缓存命中: ${key} (${entry.data.length} docs)`);
    return entry.data;
  }

  /**
   * L1: 保存到内存缓存
   */
  private setToMemory(key: string, data: DocumentItem[]): void {
    // 检查内存容量，实施LRU淘汰
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<DocumentItem[]> = {
      data,
      timestamp: Date.now(),
      version: 1
    };

    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);

    console.log(`💾 [CACHE-L1] 保存到内存缓存: ${key} (${data.length} docs)`);
  }

  /**
   * L2: 从 IndexedDB 获取
   */
  private async getFromIndexedDB(key: string): Promise<DocumentItem[] | null> {
    try {
      const db = await this.initIndexedDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['documents'], 'readonly');
        const objectStore = transaction.objectStore('documents');
        const request = objectStore.get(key);

        request.onsuccess = () => {
          const result = request.result;

          if (!result) {
            console.log(`🔍 [CACHE-L2] IndexedDB未命中: ${key}`);
            resolve(null);
            return;
          }

          // 检查是否过期
          if (this.isExpired(result)) {
            console.log(`⏰ [CACHE-L2] IndexedDB缓存已过期: ${key}`);
            this.deleteFromIndexedDB(key);
            resolve(null);
            return;
          }

          console.log(`📀 [CACHE-L2] IndexedDB命中: ${key} (${result.data.length} docs)`);

          // 回填到L1缓存
          this.setToMemory(key, result.data);

          resolve(result.data);
        };

        request.onerror = () => {
          console.error('❌ [CACHE-L2] IndexedDB读取失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [CACHE-L2] IndexedDB操作失败:', error);
      return null;
    }
  }

  /**
   * L2: 保存到 IndexedDB
   */
  private async setToIndexedDB(key: string, data: DocumentItem[], taskId: number): Promise<void> {
    try {
      const db = await this.initIndexedDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['documents'], 'readwrite');
        const objectStore = transaction.objectStore('documents');

        const entry = {
          key,
          data,
          timestamp: Date.now(),
          taskId,
          version: 1
        };

        const request = objectStore.put(entry);

        request.onsuccess = () => {
          console.log(`💿 [CACHE-L2] 保存到IndexedDB: ${key} (${data.length} docs)`);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ [CACHE-L2] IndexedDB写入失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [CACHE-L2] IndexedDB操作失败:', error);
    }
  }

  /**
   * 从 IndexedDB 删除
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    try {
      const db = await this.initIndexedDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['documents'], 'readwrite');
        const objectStore = transaction.objectStore('documents');
        const request = objectStore.delete(key);

        request.onsuccess = () => {
          console.log(`🗑️ [CACHE-L2] 从IndexedDB删除: ${key}`);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ [CACHE-L2] IndexedDB删除失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ [CACHE-L2] IndexedDB操作失败:', error);
    }
  }

  /**
   * 获取文档（多层缓存）
   */
  async get(projectId: number, taskId: number, includeDescendants: boolean = false): Promise<DocumentItem[] | null> {
    const key = this.generateKey(projectId, taskId, includeDescendants);
    const startTime = performance.now();

    // L1: 尝试从内存缓存获取
    const memoryResult = this.getFromMemory(key);
    if (memoryResult) {
      const duration = performance.now() - startTime;
      console.log(`⚡ [CACHE] L1命中，耗时: ${duration.toFixed(2)}ms`);
      return memoryResult;
    }

    // L2: 尝试从 IndexedDB 获取
    const indexedDBResult = await this.getFromIndexedDB(key);
    if (indexedDBResult) {
      const duration = performance.now() - startTime;
      console.log(`⚡ [CACHE] L2命中，耗时: ${duration.toFixed(2)}ms`);
      return indexedDBResult;
    }

    const duration = performance.now() - startTime;
    console.log(`❌ [CACHE] 未命中，耗时: ${duration.toFixed(2)}ms`);
    return null;
  }

  /**
   * 保存文档（多层缓存）
   */
  async set(projectId: number, taskId: number, data: DocumentItem[], includeDescendants: boolean = false): Promise<void> {
    const key = this.generateKey(projectId, taskId, includeDescendants);
    const startTime = performance.now();

    // L1: 保存到内存
    this.setToMemory(key, data);

    // L2: 异步保存到 IndexedDB（不阻塞）
    this.setToIndexedDB(key, data, taskId).catch(error => {
      console.error('❌ [CACHE] IndexedDB保存失败:', error);
    });

    const duration = performance.now() - startTime;
    console.log(`⚡ [CACHE] 保存完成，耗时: ${duration.toFixed(2)}ms`);
  }

  /**
   * 清除缓存
   */
  async clear(projectId?: number, taskId?: number): Promise<void> {
    if (projectId && taskId) {
      // 清除特定任务的缓存
      const key = this.generateKey(projectId, taskId);
      this.memoryCache.delete(key);
      await this.deleteFromIndexedDB(key);
      console.log(`🗑️ [CACHE] 清除缓存: ${key}`);
    } else {
      // 清除所有缓存
      this.memoryCache.clear();
      this.accessOrder = [];

      try {
        const db = await this.initIndexedDB();
        const transaction = db.transaction(['documents'], 'readwrite');
        const objectStore = transaction.objectStore('documents');
        objectStore.clear();
        console.log('🗑️ [CACHE] 清除所有缓存');
      } catch (error) {
        console.error('❌ [CACHE] 清除IndexedDB失败:', error);
      }
    }
  }

  /**
   * 预加载文档
   */
  async preload(projectId: number, taskId: number, fetcher: () => Promise<DocumentItem[]>): Promise<void> {
    if (!this.config.enablePreload) {
      return;
    }

    const key = this.generateKey(projectId, taskId);

    // 避免重复预加载
    if (this.preloadQueue.has(key)) {
      console.log(`⏭️ [CACHE-PRELOAD] 跳过重复预加载: ${key}`);
      return;
    }

    this.preloadQueue.add(key);
    console.log(`🔮 [CACHE-PRELOAD] 开始预加载: ${key}`);

    try {
      // 检查是否已有缓存
      const cached = await this.get(projectId, taskId);
      if (cached) {
        console.log(`✅ [CACHE-PRELOAD] 已有缓存，跳过: ${key}`);
        return;
      }

      // 执行预加载
      const data = await fetcher();
      await this.set(projectId, taskId, data);
      console.log(`✅ [CACHE-PRELOAD] 预加载完成: ${key} (${data.length} docs)`);
    } catch (error) {
      console.error(`❌ [CACHE-PRELOAD] 预加载失败: ${key}`, error);
    } finally {
      this.preloadQueue.delete(key);
    }
  }

  /**
   * 预取文档数据（便捷方法，自动调用API）
   * @param projectId 项目ID
   * @param taskId 任务ID
   * @param includeDescendants 是否包含子任务文档
   */
  async prefetch(projectId: number, taskId: number, includeDescendants: boolean = false): Promise<void> {
    if (!this.config.enablePreload) {
      return;
    }

    const key = this.generateKey(projectId, taskId, includeDescendants);

    // 避免重复预取
    if (this.preloadQueue.has(key)) {
      console.log(`⏭️ [CACHE-PREFETCH] 跳过重复预取: ${key}`);
      return;
    }

    this.preloadQueue.add(key);
    console.log(`🚀 [CACHE-PREFETCH] 开始预取: ${key}`);

    try {
      // 检查是否已有缓存
      const cached = await this.get(projectId, taskId, includeDescendants);
      if (cached) {
        console.log(`✅ [CACHE-PREFETCH] 已有缓存，跳过API调用: ${key}`);
        this.preloadQueue.delete(key);
        return;
      }

      // 动态导入API模块（避免循环依赖）
      const api = (await import('./api')).default;

      console.log(`📡 [CACHE-PREFETCH] 调用API: /projects/${projectId}/tasks/${taskId}/documents/all`);

      // 调用合并API获取文档数据
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/documents/all`, {
        params: {
          include_content: false, // 预取时不需要内容，减少数据量
          include_descendants: includeDescendants
        }
      });

      console.log(`📦 [CACHE-PREFETCH] API响应:`, response);

      // 检查response.data是否存在
      if (!response || !response.data) {
        console.error(`❌ [CACHE-PREFETCH] API响应无效:`, response);
        this.preloadQueue.delete(key);
        return;
      }

      const result = response.data;
      console.log(`📊 [CACHE-PREFETCH] 解析数据:`, {
        hasDocuments: !!result.documents,
        hasWorkNotes: !!result.work_notes,
        hasUploadedFiles: !!result.uploaded_files,
        documentsLength: result.documents?.length || 0,
        workNotesLength: result.work_notes?.length || 0,
        uploadedFilesLength: result.uploaded_files?.length || 0
      });

      // 合并所有文档源：documents + work_notes + uploaded_files
      const allDocuments = [
        ...(result.documents || []),
        ...(result.work_notes || []),
        ...(result.uploaded_files || [])
      ];

      console.log(`📄 [CACHE-PREFETCH] 合并后总文档数: ${allDocuments.length}`);

      // 转换为DocumentItem格式
      const docs: DocumentItem[] = allDocuments.map((doc: any) => {
        const isUploaded = doc.source_type === 'uploaded_file';
        const isWorkNote = doc.source_type === 'work_note';

        return {
          id: doc.id,
          title: doc.title,
          content: doc.content || '',
          description: doc.description || '',
          type: doc.type,
          mime_type: doc.mime_type,
          file_size: doc.file_size,
          version: doc.version || 1,
          status: doc.status || 'published',
          visibility: doc.visibility || 'team',
          is_template: doc.is_template || false,
          project_id: doc.project_id || projectId,
          task_id: doc.task_id || taskId,
          owner_id: doc.owner_id || 0,
          created_by: doc.created_by || 0,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          tags: doc.tags || (isUploaded ? ['uploaded'] : isWorkNote ? ['work_note'] : []),
          selected: false,
          sourceTaskId: taskId,
          file_path: doc.file_path,
          can_edit: doc.can_edit !== false,
          can_delete: doc.can_delete !== false,
          can_share: doc.can_share !== false,
          source_type: doc.source_type
        };
      });

      // 保存到缓存
      await this.set(projectId, taskId, docs, includeDescendants);
      console.log(`✅ [CACHE-PREFETCH] 预取完成: ${key} (${docs.length} docs)`);
    } catch (error) {
      // 详细的错误日志
      if (error instanceof Error) {
        console.error(`❌ [CACHE-PREFETCH] 预取失败: ${key}`, {
          message: error.message,
          stack: error.stack,
          error: error
        });
      } else {
        console.error(`❌ [CACHE-PREFETCH] 预取失败: ${key}`, error);
      }
    } finally {
      this.preloadQueue.delete(key);
    }
  }

  /**
   * 更新LRU访问顺序
   */
  private updateAccessOrder(key: string): void {
    // 移除旧位置
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // 添加到末尾（最近使用）
    this.accessOrder.push(key);
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    // 淘汰最久未使用的缓存
    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      this.memoryCache.delete(keyToEvict);
      console.log(`🗑️ [CACHE-LRU] 淘汰缓存: ${keyToEvict}`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      maxMemoryEntries: this.config.maxMemoryEntries,
      accessOrder: this.accessOrder.length,
      preloadQueue: this.preloadQueue.size,
      config: this.config
    };
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpired(): Promise<void> {
    const startTime = performance.now();
    let cleanedCount = 0;

    // 清理内存缓存
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // 清理 IndexedDB
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['documents'], 'readwrite');
      const objectStore = transaction.objectStore('documents');
      const index = objectStore.index('timestamp');

      const expireTime = Date.now() - this.config.ttl;
      const range = IDBKeyRange.upperBound(expireTime);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cleanedCount++;
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('❌ [CACHE-CLEANUP] IndexedDB清理失败:', error);
    }

    const duration = performance.now() - startTime;
    console.log(`🧹 [CACHE-CLEANUP] 清理完成: ${cleanedCount} 条过期缓存，耗时: ${duration.toFixed(2)}ms`);
  }
}

// 单例实例
export const documentCacheService = new DocumentCacheService();

// 自动清理过期缓存（每5分钟）
setInterval(() => {
  documentCacheService.cleanupExpired();
}, 5 * 60 * 1000);
