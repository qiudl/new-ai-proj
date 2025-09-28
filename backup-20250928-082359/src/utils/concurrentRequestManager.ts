/**
 * 并发请求管理器
 * 防止重复请求、管理请求队列、实现请求去重和批处理
 */

export interface RequestConfig {
  url: string;
  method: string;
  params?: any;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface PendingRequest {
  key: string;
  promise: Promise<any>;
  timestamp: number;
  abortController: AbortController;
  config: RequestConfig;
}

export interface QueuedRequest {
  key: string;
  config: RequestConfig;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  priority: number;
  timestamp: number;
}

export interface ConcurrencyOptions {
  maxConcurrent?: number; // Max concurrent requests, default: 6
  deduplicationTtl?: number; // Deduplication TTL in ms, default: 1000
  queueTimeout?: number; // Queue timeout in ms, default: 30000
  enableBatching?: boolean; // Enable request batching, default: false
  batchDelay?: number; // Batch delay in ms, default: 50
}

export class ConcurrentRequestManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestQueue: QueuedRequest[] = [];
  private batchQueue = new Map<string, QueuedRequest[]>();
  
  private readonly maxConcurrent: number;
  private readonly deduplicationTtl: number;
  private readonly queueTimeout: number;
  private readonly enableBatching: boolean;
  private readonly batchDelay: number;
  
  private currentConcurrentCount = 0;
  private processQueueTimer?: NodeJS.Timeout;
  private batchTimer?: NodeJS.Timeout;
  
  constructor(options: ConcurrencyOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 6;
    this.deduplicationTtl = options.deduplicationTtl || 1000;
    this.queueTimeout = options.queueTimeout || 30000;
    this.enableBatching = options.enableBatching || false;
    this.batchDelay = options.batchDelay || 50;
    
    this.startQueueProcessor();
    
    if (this.enableBatching) {
      this.startBatchProcessor();
    }
  }

  /**
   * 执行HTTP请求，支持去重和队列管理
   */
  async request<T>(
    requestFn: (config: RequestConfig) => Promise<T>,
    config: RequestConfig,
    priority = 5
  ): Promise<T> {
    const requestKey = this.generateRequestKey(config);
    
    // Check for duplicate pending requests
    const existing = this.pendingRequests.get(requestKey);
    if (existing && this.isRequestValid(existing)) {
      console.log(`📋 Deduplicating request: ${requestKey}`);
      return existing.promise as Promise<T>;
    }
    
    // If at max concurrent limit, queue the request
    if (this.currentConcurrentCount >= this.maxConcurrent) {
      return this.queueRequest(requestFn, config, priority);
    }
    
    return this.executeRequest(requestFn, config, requestKey);
  }

  /**
   * 批量请求处理
   */
  async batchRequest<T>(
    requestFn: (configs: RequestConfig[]) => Promise<T[]>,
    configs: RequestConfig[],
    batchKey?: string
  ): Promise<T[]> {
    if (!this.enableBatching) {
      // If batching is disabled, execute requests individually
      return Promise.all(configs.map(config => 
        this.request((cfg) => requestFn([cfg]).then(results => results[0]), config)
      ));
    }
    
    const key = batchKey || 'default';
    
    return new Promise((resolve, reject) => {
      const queuedRequests = configs.map(config => ({
        key: this.generateRequestKey(config),
        config,
        resolve: (value: any) => resolve(value),
        reject,
        priority: 5,
        timestamp: Date.now()
      }));
      
      if (!this.batchQueue.has(key)) {
        this.batchQueue.set(key, []);
      }
      
      this.batchQueue.get(key)!.push(...queuedRequests);
      
      // Process batch after delay
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      
      this.batchTimer = setTimeout(() => {
        this.processBatch(requestFn, key);
      }, this.batchDelay);
    });
  }

  /**
   * 取消指定的请求
   */
  cancelRequest(url: string, method = 'GET'): boolean {
    const key = this.generateRequestKey({ url, method });
    const pending = this.pendingRequests.get(key);
    
    if (pending) {
      pending.abortController.abort();
      this.pendingRequests.delete(key);
      this.currentConcurrentCount--;
      this.processQueue(); // Process next queued request
      return true;
    }
    
    // Also remove from queue if exists
    const queueIndex = this.requestQueue.findIndex(q => q.key === key);
    if (queueIndex >= 0) {
      const queuedRequest = this.requestQueue.splice(queueIndex, 1)[0];
      queuedRequest.reject(new Error('Request cancelled'));
      return true;
    }
    
    return false;
  }

  /**
   * 取消所有请求
   */
  cancelAllRequests(): void {
    // Cancel pending requests
    for (const [key, request] of this.pendingRequests.entries()) {
      request.abortController.abort();
    }
    this.pendingRequests.clear();
    this.currentConcurrentCount = 0;
    
    // Cancel queued requests
    for (const queuedRequest of this.requestQueue) {
      queuedRequest.reject(new Error('All requests cancelled'));
    }
    this.requestQueue.length = 0;
    
    // Cancel batched requests
    for (const [key, requests] of this.batchQueue.entries()) {
      for (const request of requests) {
        request.reject(new Error('All requests cancelled'));
      }
    }
    this.batchQueue.clear();
  }

  /**
   * 获取管理器状态
   */
  getStatus() {
    return {
      currentConcurrent: this.currentConcurrentCount,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.requestQueue.length,
      pendingRequests: Array.from(this.pendingRequests.keys()),
      batchQueues: Object.fromEntries(
        Array.from(this.batchQueue.entries()).map(([key, requests]) => [
          key,
          requests.length
        ])
      )
    };
  }

  /**
   * 清理过期的挂起请求
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.deduplicationTtl) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      const request = this.pendingRequests.get(key);
      if (request) {
        request.abortController.abort();
        this.pendingRequests.delete(key);
        this.currentConcurrentCount--;
      }
    }
    
    // Cleanup expired queued requests
    const validQueue = this.requestQueue.filter(req => {
      if (now - req.timestamp > this.queueTimeout) {
        req.reject(new Error('Request timeout in queue'));
        return false;
      }
      return true;
    });
    
    this.requestQueue.length = 0;
    this.requestQueue.push(...validQueue);
    
    if (expiredKeys.length > 0) {
      this.processQueue(); // Process next requests if slots opened up
    }
  }

  /**
   * 生成请求唯一标识
   */
  private generateRequestKey(config: RequestConfig): string {
    const { url, method = 'GET', params, data } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method.toUpperCase()}:${url}:${paramsStr}:${dataStr}`;
  }

  /**
   * 检查请求是否仍然有效
   */
  private isRequestValid(request: PendingRequest): boolean {
    const now = Date.now();
    return now - request.timestamp < this.deduplicationTtl;
  }

  /**
   * 执行请求
   */
  private async executeRequest<T>(
    requestFn: (config: RequestConfig) => Promise<T>,
    config: RequestConfig,
    requestKey: string
  ): Promise<T> {
    this.currentConcurrentCount++;
    
    const abortController = new AbortController();
    const configWithAbort = {
      ...config,
      signal: abortController.signal
    };
    
    const promise = requestFn(configWithAbort).finally(() => {
      this.pendingRequests.delete(requestKey);
      this.currentConcurrentCount--;
      this.processQueue(); // Process next queued request
    });
    
    const pendingRequest: PendingRequest = {
      key: requestKey,
      promise,
      timestamp: Date.now(),
      abortController,
      config
    };
    
    this.pendingRequests.set(requestKey, pendingRequest);
    
    return promise;
  }

  /**
   * 将请求加入队列
   */
  private queueRequest<T>(
    requestFn: (config: RequestConfig) => Promise<T>,
    config: RequestConfig,
    priority: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        key: this.generateRequestKey(config),
        config,
        resolve: (value) => {
          this.executeRequest(requestFn, config, queuedRequest.key)
            .then(resolve)
            .catch(reject);
        },
        reject,
        priority,
        timestamp: Date.now()
      };
      
      // Insert based on priority (higher priority first)
      const insertIndex = this.requestQueue.findIndex(q => q.priority < priority);
      if (insertIndex === -1) {
        this.requestQueue.push(queuedRequest);
      } else {
        this.requestQueue.splice(insertIndex, 0, queuedRequest);
      }
    });
  }

  /**
   * 处理队列中的请求
   */
  private processQueue(): void {
    while (
      this.currentConcurrentCount < this.maxConcurrent && 
      this.requestQueue.length > 0
    ) {
      const queuedRequest = this.requestQueue.shift();
      if (queuedRequest) {
        queuedRequest.resolve(null); // This will trigger the actual execution
      }
    }
  }

  /**
   * 启动队列处理器
   */
  private startQueueProcessor(): void {
    this.processQueueTimer = setInterval(() => {
      this.cleanup();
      this.processQueue();
    }, 1000); // Process every second
  }

  /**
   * 处理批量请求
   */
  private async processBatch<T>(
    requestFn: (configs: RequestConfig[]) => Promise<T[]>,
    batchKey: string
  ): Promise<void> {
    const requests = this.batchQueue.get(batchKey);
    if (!requests || requests.length === 0) return;
    
    this.batchQueue.delete(batchKey);
    
    try {
      const configs = requests.map(r => r.config);
      const results = await requestFn(configs);
      
      // Resolve individual requests with their results
      requests.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error('Batch request failed'));
        }
      });
    } catch (error) {
      // Reject all requests in the batch
      requests.forEach(request => request.reject(error));
    }
  }

  /**
   * 启动批处理器
   */
  private startBatchProcessor(): void {
    // Batch processor is triggered by batchRequest method
    // This method is kept for potential future enhancements
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.processQueueTimer) {
      clearInterval(this.processQueueTimer);
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.cancelAllRequests();
  }
}

// 创建默认实例
const defaultConcurrentRequestManager = new ConcurrentRequestManager();

// 导出便捷方法
export const concurrentRequest = {
  request: <T>(requestFn: (config: RequestConfig) => Promise<T>, config: RequestConfig, priority?: number) =>
    defaultConcurrentRequestManager.request(requestFn, config, priority),
  
  batchRequest: <T>(requestFn: (configs: RequestConfig[]) => Promise<T[]>, configs: RequestConfig[], batchKey?: string) =>
    defaultConcurrentRequestManager.batchRequest(requestFn, configs, batchKey),
  
  cancel: (url: string, method?: string) =>
    defaultConcurrentRequestManager.cancelRequest(url, method),
  
  cancelAll: () =>
    defaultConcurrentRequestManager.cancelAllRequests(),
  
  getStatus: () =>
    defaultConcurrentRequestManager.getStatus(),
  
  cleanup: () =>
    defaultConcurrentRequestManager.cleanup()
};

export default defaultConcurrentRequestManager;