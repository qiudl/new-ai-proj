/**
 * API 性能优化工具
 * 提供请求去重、批量处理、缓存、预加载等功能
 */

interface RequestCache<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface PendingRequest {
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

interface BatchRequest {
  id: string;
  params: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class APIPerformanceOptimizer {
  private requestCache = new Map<string, RequestCache>();
  private pendingRequests = new Map<string, PendingRequest>();
  private batchQueue = new Map<string, BatchRequest[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分钟
  private readonly BATCH_DELAY = 50; // 50ms批量延迟
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * 带去重功能的请求
   * 如果相同的请求正在进行中，则共享结果
   */
  async dedupedRequest<T>(
    key: string, 
    requestFn: () => Promise<T>,
    cacheTtl: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    // 检查缓存
    const cached = this.getFromCache<T>(key);
    if (cached) {
      return cached;
    }

    // 检查是否有正在进行的相同请求
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }

    // 创建新的请求
    let resolve: (value: T) => void;
    let reject: (reason: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pendingRequests.set(key, { promise, resolve: resolve!, reject: reject! });

    try {
      const result = await requestFn();
      
      // 缓存结果
      this.setCache(key, result, cacheTtl);
      
      // 解决所有等待的 promise
      resolve!(result);
      
      return result;
    } catch (error) {
      reject!(error);
      throw error;
    } finally {
      // 清理 pending 请求
      this.pendingRequests.delete(key);
    }
  }

  /**
   * 批量请求处理
   * 将多个相似的请求合并为一个批量请求
   */
  async batchRequest<T>(
    batchKey: string,
    requestId: string,
    params: any,
    batchHandler: (requests: Array<{id: string, params: any}>) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // 添加到批量队列
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }
      
      this.batchQueue.get(batchKey)!.push({
        id: requestId,
        params,
        resolve,
        reject
      });

      // 设置或重置批量处理计时器
      if (this.batchTimers.has(batchKey)) {
        clearTimeout(this.batchTimers.get(batchKey)!);
      }

      const timer = setTimeout(() => {
        this.processBatch(batchKey, batchHandler);
      }, this.BATCH_DELAY);

      this.batchTimers.set(batchKey, timer);
    });
  }

  /**
   * 预加载数据
   * 在用户可能需要之前预先加载数据
   */
  async preloadData<T>(
    key: string,
    requestFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    // 如果已经缓存，则跳过
    if (this.hasCache(key)) {
      return;
    }

    // 根据优先级决定延迟
    const delay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 500;

    setTimeout(async () => {
      try {
        const result = await requestFn();
        this.setCache(key, result);
        console.log(`预加载完成: ${key}`);
      } catch (error) {
        console.warn(`预加载失败: ${key}`, error);
      }
    }, delay);
  }

  /**
   * 并行请求优化
   * 智能地管理并发请求数量
   */
  async parallelRequests<T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      const promise = request().then(result => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 请求重试机制
   */
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    backoffMultiplier: number = 1.5
  ): Promise<T> {
    let lastError: any;
    let delay = 1000; // 初始延迟1秒

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // 指数退避
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= backoffMultiplier;
        }
      }
    }

    throw lastError;
  }

  /**
   * 缓存管理
   */
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    // 清理过期缓存
    this.cleanExpiredCache();
    
    // 限制缓存大小
    if (this.requestCache.size >= this.MAX_CACHE_SIZE) {
      // 删除最老的缓存项
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }

    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    
    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > cached.expiry) {
      this.requestCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private hasCache(key: string): boolean {
    return this.getFromCache(key) !== null;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.requestCache.entries()) {
      if (now > cache.expiry) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * 处理批量请求
   */
  private async processBatch<T>(
    batchKey: string,
    batchHandler: (requests: Array<{id: string, params: any}>) => Promise<Record<string, T>>
  ): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // 清理队列和计时器
    this.batchQueue.delete(batchKey);
    this.batchTimers.delete(batchKey);

    try {
      // 准备批量请求参数
      const requestParams = batch.map(item => ({
        id: item.id,
        params: item.params
      }));

      // 执行批量请求
      const results = await batchHandler(requestParams);

      // 分发结果
      batch.forEach(item => {
        const result = results[item.id];
        if (result !== undefined) {
          item.resolve(result);
        } else {
          item.reject(new Error(`No result found for request ${item.id}`));
        }
      });

    } catch (error) {
      // 如果批量请求失败，拒绝所有请求
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }

  /**
   * 清理所有缓存和等待中的请求
   */
  cleanup(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
    this.batchQueue.clear();
    
    // 清理所有计时器
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    pendingRequests: number;
  } {
    return {
      size: this.requestCache.size,
      hitRate: 0, // 需要实现命中率统计
      pendingRequests: this.pendingRequests.size
    };
  }
}

// 全局单例
export const apiOptimizer = new APIPerformanceOptimizer();

/**
 * 任务相关的API优化工具
 */
export class TaskAPIOptimizer {
  constructor(private optimizer: APIPerformanceOptimizer) {}

  /**
   * 优化的任务详情获取
   */
  async getTaskDetails(projectId: number, taskId: number, options?: {
    includeRelations?: boolean;
    includeTimeline?: boolean;
    includeDocuments?: boolean;
  }): Promise<any> {
    const cacheKey = `task:${projectId}:${taskId}:${JSON.stringify(options || {})}`;
    
    return this.optimizer.dedupedRequest(
      cacheKey,
      async () => {
        // 并行加载基础数据
        const requests: Array<() => Promise<any>> = [];
        
        // 基础任务信息
        requests.push(async () => {
          const { TaskService } = await import('../services/taskService');
          return TaskService.getTask(projectId, taskId);
        });

        if (options?.includeRelations) {
          // 子任务
          requests.push(async () => {
            const { TaskService } = await import('../services/taskService');
            return TaskService.getTaskChildren(projectId, taskId);
          });
        }

        if (options?.includeTimeline) {
          // 时间线
          requests.push(async () => {
            const { TaskService } = await import('../services/taskService');
            return TaskService.getTaskTimeline(projectId, taskId, { page: 1, page_size: 20 });
          });
        }

        if (options?.includeDocuments) {
          // 文档
          requests.push(async () => {
            const { documentService } = await import('../services/unifiedDocumentService');
            return documentService.getTaskDocuments(projectId, taskId);
          });
        }

        const results = await this.optimizer.parallelRequests(requests, 3);
        
        return {
          task: results[0],
          children: options?.includeRelations ? results[1] : null,
          timeline: options?.includeTimeline ? results[options?.includeRelations ? 2 : 1] : null,
          documents: options?.includeDocuments ? results[results.length - 1] : null
        };
      },
      3 * 60 * 1000 // 3分钟缓存
    );
  }

  /**
   * 批量获取任务信息
   */
  async batchGetTasks(projectId: number, taskIds: number[]): Promise<Record<number, any>> {
    const results: Record<number, any> = {};
    
    for (const taskId of taskIds) {
      results[taskId] = await this.optimizer.batchRequest(
        `batch-tasks:${projectId}`,
        taskId.toString(),
        { projectId, taskId },
        async (requests) => {
          const { TaskService } = await import('../services/taskService');
          const batchResults: Record<string, any> = {};
          
          // 并行获取所有任务
          const taskPromises = requests.map(async (req) => {
            try {
              const task = await TaskService.getTask(req.params.projectId, req.params.taskId);
              return { id: req.id, task };
            } catch (error) {
              console.error(`Failed to load task ${req.id}:`, error);
              return { id: req.id, task: null };
            }
          });

          const taskResults = await Promise.all(taskPromises);
          
          taskResults.forEach(({ id, task }) => {
            batchResults[id] = task;
          });

          return batchResults;
        }
      );
    }

    return results;
  }

  /**
   * 预加载相关数据
   */
  async preloadTaskRelatedData(projectId: number, taskId: number): Promise<void> {
    // 预加载子任务
    this.optimizer.preloadData(
      `task-children:${projectId}:${taskId}`,
      async () => {
        const { TaskService } = await import('../services/taskService');
        return TaskService.getTaskChildren(projectId, taskId);
      },
      'medium'
    );

    // 预加载文档
    this.optimizer.preloadData(
      `task-documents:${projectId}:${taskId}`,
      async () => {
        const { documentService } = await import('../services/unifiedDocumentService');
        return documentService.getTaskDocuments(projectId, taskId);
      },
      'low'
    );

    // 预加载时间线
    this.optimizer.preloadData(
      `task-timeline:${projectId}:${taskId}`,
      async () => {
        const { TaskService } = await import('../services/taskService');
        return TaskService.getTaskTimeline(projectId, taskId, { page: 1, page_size: 10 });
      },
      'low'
    );
  }
}

// 导出任务API优化器实例
export const taskAPIOptimizer = new TaskAPIOptimizer(apiOptimizer);