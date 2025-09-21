/**
 * 版本历史系统性能优化器
 * Version History System Performance Optimizer
 * 
 * 提供版本历史功能的性能优化解决方案，包括：
 * - 差异计算优化
 * - 内存管理优化
 * - 缓存策略优化
 * - 并发处理优化
 * - 数据库查询优化
 */

import { EventEmitter } from 'events';

// 性能监控指标
export interface PerformanceMetrics {
  diffCalculationTime: number;
  memoryUsage: number;
  cacheHitRatio: number;
  concurrentOperations: number;
  databaseQueryTime: number;
  totalProcessingTime: number;
}

// 性能配置选项
export interface PerformanceConfig {
  // 差异计算优化配置
  diffOptimization: {
    enableEarlyTermination: boolean;
    chunkSize: number;
    maxLinesForDetailedDiff: number;
    useBinaryDiff: boolean;
  };
  
  // 内存管理配置
  memoryManagement: {
    maxMemoryUsage: number; // MB
    garbageCollectionThreshold: number;
    enableStreaming: boolean;
    chunkProcessingSize: number;
  };
  
  // 缓存配置
  caching: {
    enableDiffCache: boolean;
    enableResultCache: boolean;
    maxCacheSize: number;
    cacheTTL: number; // 秒
    cacheCompressionEnabled: boolean;
  };
  
  // 并发处理配置
  concurrency: {
    maxConcurrentOperations: number;
    enableWorkerThreads: boolean;
    workerPoolSize: number;
    queueMaxSize: number;
  };
  
  // 数据库优化配置
  database: {
    enableQueryOptimization: boolean;
    batchSize: number;
    enableConnectionPooling: boolean;
    maxConnections: number;
  };
}

// 默认性能配置
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  diffOptimization: {
    enableEarlyTermination: true,
    chunkSize: 1000,
    maxLinesForDetailedDiff: 10000,
    useBinaryDiff: false
  },
  memoryManagement: {
    maxMemoryUsage: 512, // 512MB
    garbageCollectionThreshold: 0.8,
    enableStreaming: true,
    chunkProcessingSize: 1000
  },
  caching: {
    enableDiffCache: true,
    enableResultCache: true,
    maxCacheSize: 100, // 100个条目
    cacheTTL: 3600, // 1小时
    cacheCompressionEnabled: true
  },
  concurrency: {
    maxConcurrentOperations: 4,
    enableWorkerThreads: true,
    workerPoolSize: 2,
    queueMaxSize: 100
  },
  database: {
    enableQueryOptimization: true,
    batchSize: 50,
    enableConnectionPooling: true,
    maxConnections: 10
  }
};

// 性能监控器
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics = {
    diffCalculationTime: 0,
    memoryUsage: 0,
    cacheHitRatio: 0,
    concurrentOperations: 0,
    databaseQueryTime: 0,
    totalProcessingTime: 0
  };
  
  private startTimes: Map<string, number> = new Map();
  
  startTiming(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }
  
  endTiming(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      throw new Error(`No start time found for operation: ${operation}`);
    }
    
    const duration = Date.now() - startTime;
    this.startTimes.delete(operation);
    
    // 更新相应的指标
    switch (operation) {
      case 'diffCalculation':
        this.metrics.diffCalculationTime = duration;
        break;
      case 'databaseQuery':
        this.metrics.databaseQueryTime = duration;
        break;
      case 'totalProcessing':
        this.metrics.totalProcessingTime = duration;
        break;
    }
    
    this.emit('timing', { operation, duration });
    return duration;
  }
  
  updateMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = Math.round(usage.heapUsed / 1024 / 1024); // MB
    this.emit('memoryUpdate', this.metrics.memoryUsage);
  }
  
  updateCacheHitRatio(hits: number, total: number): void {
    this.metrics.cacheHitRatio = total > 0 ? hits / total : 0;
    this.emit('cacheHitRatioUpdate', this.metrics.cacheHitRatio);
  }
  
  incrementConcurrentOperations(): void {
    this.metrics.concurrentOperations++;
    this.emit('concurrencyUpdate', this.metrics.concurrentOperations);
  }
  
  decrementConcurrentOperations(): void {
    this.metrics.concurrentOperations = Math.max(0, this.metrics.concurrentOperations - 1);
    this.emit('concurrencyUpdate', this.metrics.concurrentOperations);
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  reset(): void {
    this.metrics = {
      diffCalculationTime: 0,
      memoryUsage: 0,
      cacheHitRatio: 0,
      concurrentOperations: 0,
      databaseQueryTime: 0,
      totalProcessingTime: 0
    };
    this.startTimes.clear();
  }
}

// 优化的差异计算器
export class OptimizedDiffCalculator {
  private config: PerformanceConfig['diffOptimization'];
  private monitor: PerformanceMonitor;
  
  constructor(config: PerformanceConfig['diffOptimization'], monitor: PerformanceMonitor) {
    this.config = config;
    this.monitor = monitor;
  }
  
  async calculateDiff(oldContent: string, newContent: string): Promise<any[]> {
    this.monitor.startTiming('diffCalculation');
    
    try {
      // 早期终止优化：如果内容相同，直接返回
      if (this.config.enableEarlyTermination && oldContent === newContent) {
        return [{ type: 'unchanged', content: oldContent }];
      }
      
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      // 大文档优化：超过阈值时使用简化算法
      if (oldLines.length > this.config.maxLinesForDetailedDiff || 
          newLines.length > this.config.maxLinesForDetailedDiff) {
        return this.calculateSimplifiedDiff(oldLines, newLines);
      }
      
      // 分块处理优化
      if (this.config.chunkSize > 0 && 
          (oldLines.length > this.config.chunkSize || newLines.length > this.config.chunkSize)) {
        return this.calculateChunkedDiff(oldLines, newLines);
      }
      
      // 标准差异计算
      return this.calculateStandardDiff(oldLines, newLines);
      
    } finally {
      this.monitor.endTiming('diffCalculation');
    }
  }
  
  private calculateSimplifiedDiff(oldLines: string[], newLines: string[]): any[] {
    // 简化的diff算法，适用于大文档
    const diffs = [];
    
    // 计算基本统计信息
    const maxLength = Math.max(oldLines.length, newLines.length);
    const minLength = Math.min(oldLines.length, newLines.length);
    
    for (let i = 0; i < minLength; i++) {
      if (oldLines[i] === newLines[i]) {
        diffs.push({ type: 'unchanged', content: oldLines[i], lineNumber: i + 1 });
      } else {
        diffs.push({ type: 'modified', oldContent: oldLines[i], newContent: newLines[i], lineNumber: i + 1 });
      }
    }
    
    // 处理额外的行
    if (oldLines.length > newLines.length) {
      for (let i = minLength; i < oldLines.length; i++) {
        diffs.push({ type: 'deleted', content: oldLines[i], lineNumber: i + 1 });
      }
    } else if (newLines.length > oldLines.length) {
      for (let i = minLength; i < newLines.length; i++) {
        diffs.push({ type: 'added', content: newLines[i], lineNumber: i + 1 });
      }
    }
    
    return diffs;
  }
  
  private calculateChunkedDiff(oldLines: string[], newLines: string[]): any[] {
    // 分块差异计算，减少内存压力
    const diffs = [];
    const chunkSize = this.config.chunkSize;
    
    const maxChunks = Math.ceil(Math.max(oldLines.length, newLines.length) / chunkSize);
    
    for (let i = 0; i < maxChunks; i++) {
      const startIdx = i * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, Math.max(oldLines.length, newLines.length));
      
      const oldChunk = oldLines.slice(startIdx, Math.min(endIdx, oldLines.length));
      const newChunk = newLines.slice(startIdx, Math.min(endIdx, newLines.length));
      
      const chunkDiffs = this.calculateStandardDiff(oldChunk, newChunk);
      
      // 调整行号偏移
      chunkDiffs.forEach(diff => {
        if (diff.lineNumber) {
          diff.lineNumber += startIdx;
        }
      });
      
      diffs.push(...chunkDiffs);
    }
    
    return diffs;
  }
  
  private calculateStandardDiff(oldLines: string[], newLines: string[]): any[] {
    // 标准的Myers差异算法实现
    // 这里使用简化版本，实际应用中可以使用更复杂的算法
    const diffs = [];
    
    let i = 0, j = 0;
    while (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        diffs.push({ type: 'unchanged', content: oldLines[i], lineNumber: i + 1 });
        i++;
        j++;
      } else {
        // 查找下一个匹配点
        let nextMatchOld = -1, nextMatchNew = -1;
        
        for (let k = i + 1; k < oldLines.length && nextMatchOld === -1; k++) {
          if (oldLines[k] === newLines[j]) {
            nextMatchOld = k;
          }
        }
        
        for (let k = j + 1; k < newLines.length && nextMatchNew === -1; k++) {
          if (newLines[k] === oldLines[i]) {
            nextMatchNew = k;
          }
        }
        
        if (nextMatchOld !== -1 && (nextMatchNew === -1 || nextMatchOld - i <= nextMatchNew - j)) {
          // 删除操作
          for (let k = i; k < nextMatchOld; k++) {
            diffs.push({ type: 'deleted', content: oldLines[k], lineNumber: k + 1 });
          }
          i = nextMatchOld;
        } else if (nextMatchNew !== -1) {
          // 添加操作
          for (let k = j; k < nextMatchNew; k++) {
            diffs.push({ type: 'added', content: newLines[k], lineNumber: k + 1 });
          }
          j = nextMatchNew;
        } else {
          // 修改操作
          diffs.push({ 
            type: 'modified', 
            oldContent: oldLines[i], 
            newContent: newLines[j], 
            lineNumber: i + 1 
          });
          i++;
          j++;
        }
      }
    }
    
    // 处理剩余的行
    while (i < oldLines.length) {
      diffs.push({ type: 'deleted', content: oldLines[i], lineNumber: i + 1 });
      i++;
    }
    
    while (j < newLines.length) {
      diffs.push({ type: 'added', content: newLines[j], lineNumber: j + 1 });
      j++;
    }
    
    return diffs;
  }
}

// 内存管理器
export class MemoryManager {
  private config: PerformanceConfig['memoryManagement'];
  private monitor: PerformanceMonitor;
  
  constructor(config: PerformanceConfig['memoryManagement'], monitor: PerformanceMonitor) {
    this.config = config;
    this.monitor = monitor;
    this.startMemoryMonitoring();
  }
  
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.monitor.updateMemoryUsage();
      this.checkMemoryUsage();
    }, 5000); // 每5秒检查一次
  }
  
  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > this.config.maxMemoryUsage * this.config.garbageCollectionThreshold) {
      this.forceGarbageCollection();
    }
  }
  
  private forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection executed');
    }
  }
  
  async processLargeContent(content: string, processor: (chunk: string) => Promise<any>): Promise<any[]> {
    if (!this.config.enableStreaming) {
      return [await processor(content)];
    }
    
    const lines = content.split('\n');
    const results = [];
    
    for (let i = 0; i < lines.length; i += this.config.chunkProcessingSize) {
      const chunk = lines.slice(i, i + this.config.chunkProcessingSize).join('\n');
      const result = await processor(chunk);
      results.push(result);
      
      // 检查内存使用情况
      if (i % (this.config.chunkProcessingSize * 10) === 0) {
        this.monitor.updateMemoryUsage();
        await this.yieldToEventLoop(); // 让出控制权
      }
    }
    
    return results;
  }
  
  private async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }
}

// 高级缓存管理器
export class AdvancedCacheManager {
  private config: PerformanceConfig['caching'];
  private monitor: PerformanceMonitor;
  private diffCache: Map<string, { data: any, timestamp: number, accessCount: number }> = new Map();
  private resultCache: Map<string, { data: any, timestamp: number, accessCount: number }> = new Map();
  private cacheHits = 0;
  private cacheRequests = 0;
  
  constructor(config: PerformanceConfig['caching'], monitor: PerformanceMonitor) {
    this.config = config;
    this.monitor = monitor;
    this.startCacheCleanup();
  }
  
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanExpiredEntries();
      this.enforceMaxCacheSize();
      this.monitor.updateCacheHitRatio(this.cacheHits, this.cacheRequests);
    }, 60000); // 每分钟清理一次
  }
  
  private generateCacheKey(oldContent: string, newContent: string, operation: string): string {
    // 使用内容的哈希作为键，避免存储大量重复内容
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(oldContent + newContent + operation);
    return hash.digest('hex');
  }
  
  cacheDiff(oldContent: string, newContent: string, diffResult: any[]): void {
    if (!this.config.enableDiffCache) return;
    
    const key = this.generateCacheKey(oldContent, newContent, 'diff');
    const data = this.config.cacheCompressionEnabled ? 
      this.compressData(diffResult) : diffResult;
    
    this.diffCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
  }
  
  getCachedDiff(oldContent: string, newContent: string): any[] | null {
    if (!this.config.enableDiffCache) return null;
    
    this.cacheRequests++;
    const key = this.generateCacheKey(oldContent, newContent, 'diff');
    const cached = this.diffCache.get(key);
    
    if (cached && this.isValidCacheEntry(cached)) {
      this.cacheHits++;
      cached.accessCount++;
      const data = this.config.cacheCompressionEnabled ? 
        this.decompressData(cached.data) : cached.data;
      return data;
    }
    
    return null;
  }
  
  cacheResult(operation: string, params: any, result: any): void {
    if (!this.config.enableResultCache) return;
    
    const key = this.generateCacheKey(JSON.stringify(params), operation, 'result');
    const data = this.config.cacheCompressionEnabled ? 
      this.compressData(result) : result;
    
    this.resultCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
  }
  
  getCachedResult(operation: string, params: any): any | null {
    if (!this.config.enableResultCache) return null;
    
    this.cacheRequests++;
    const key = this.generateCacheKey(JSON.stringify(params), operation, 'result');
    const cached = this.resultCache.get(key);
    
    if (cached && this.isValidCacheEntry(cached)) {
      this.cacheHits++;
      cached.accessCount++;
      const data = this.config.cacheCompressionEnabled ? 
        this.decompressData(cached.data) : cached.data;
      return data;
    }
    
    return null;
  }
  
  private isValidCacheEntry(entry: { timestamp: number }): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.config.cacheTTL * 1000;
  }
  
  private compressData(data: any): string {
    const zlib = require('zlib');
    const jsonString = JSON.stringify(data);
    return zlib.gzipSync(jsonString).toString('base64');
  }
  
  private decompressData(compressedData: string): any {
    const zlib = require('zlib');
    const buffer = Buffer.from(compressedData, 'base64');
    const decompressed = zlib.gunzipSync(buffer).toString();
    return JSON.parse(decompressed);
  }
  
  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expireTime = this.config.cacheTTL * 1000;
    
    for (const [key, entry] of this.diffCache.entries()) {
      if (now - entry.timestamp > expireTime) {
        this.diffCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.resultCache.entries()) {
      if (now - entry.timestamp > expireTime) {
        this.resultCache.delete(key);
      }
    }
  }
  
  private enforceMaxCacheSize(): void {
    // 使用LRU策略清理缓存
    if (this.diffCache.size > this.config.maxCacheSize) {
      const sortedEntries = Array.from(this.diffCache.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount);
      
      const toDelete = sortedEntries.slice(0, sortedEntries.length - this.config.maxCacheSize);
      toDelete.forEach(([key]) => this.diffCache.delete(key));
    }
    
    if (this.resultCache.size > this.config.maxCacheSize) {
      const sortedEntries = Array.from(this.resultCache.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount);
      
      const toDelete = sortedEntries.slice(0, sortedEntries.length - this.config.maxCacheSize);
      toDelete.forEach(([key]) => this.resultCache.delete(key));
    }
  }
  
  clearCache(): void {
    this.diffCache.clear();
    this.resultCache.clear();
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }
  
  getCacheStats() {
    return {
      diffCacheSize: this.diffCache.size,
      resultCacheSize: this.resultCache.size,
      hitRatio: this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0,
      hits: this.cacheHits,
      requests: this.cacheRequests
    };
  }
}

// 并发操作管理器
export class ConcurrencyManager {
  private config: PerformanceConfig['concurrency'];
  private monitor: PerformanceMonitor;
  private operationQueue: Array<() => Promise<any>> = [];
  private activeOperations = 0;
  
  constructor(config: PerformanceConfig['concurrency'], monitor: PerformanceMonitor) {
    this.config = config;
    this.monitor = monitor;
  }
  
  async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.operationQueue.length >= this.config.queueMaxSize) {
        reject(new Error('Operation queue is full'));
        return;
      }
      
      const wrappedOperation = async () => {
        try {
          this.monitor.incrementConcurrentOperations();
          this.activeOperations++;
          
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.monitor.decrementConcurrentOperations();
          this.activeOperations--;
          this.processQueue();
        }
      };
      
      if (this.activeOperations < this.config.maxConcurrentOperations) {
        wrappedOperation();
      } else {
        this.operationQueue.push(wrappedOperation);
      }
    });
  }
  
  private processQueue(): void {
    while (this.operationQueue.length > 0 && this.activeOperations < this.config.maxConcurrentOperations) {
      const operation = this.operationQueue.shift();
      if (operation) {
        operation();
      }
    }
  }
  
  async executeInParallel<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const chunks: Array<Array<() => Promise<T>>> = [];
    const chunkSize = Math.min(this.config.maxConcurrentOperations, operations.length);
    
    for (let i = 0; i < operations.length; i += chunkSize) {
      chunks.push(operations.slice(i, i + chunkSize));
    }
    
    const results: T[] = [];
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(op => this.executeOperation(op))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  getQueueStatus() {
    return {
      queueLength: this.operationQueue.length,
      activeOperations: this.activeOperations,
      maxConcurrent: this.config.maxConcurrentOperations
    };
  }
}

// 数据库查询优化器
export class DatabaseQueryOptimizer {
  private config: PerformanceConfig['database'];
  private monitor: PerformanceMonitor;
  private queryCache: Map<string, { data: any, timestamp: number }> = new Map();
  
  constructor(config: PerformanceConfig['database'], monitor: PerformanceMonitor) {
    this.config = config;
    this.monitor = monitor;
  }
  
  async optimizedQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.config.enableQueryOptimization) {
      return this.executeQuery(query, params);
    }
    
    // 生成查询缓存键
    const cacheKey = this.generateQueryKey(query, params);
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5分钟缓存
      return cached.data;
    }
    
    this.monitor.startTiming('databaseQuery');
    
    try {
      const result = await this.executeQuery(query, params);
      
      // 缓存结果
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } finally {
      this.monitor.endTiming('databaseQuery');
    }
  }
  
  private async executeQuery(query: string, params: any[]): Promise<any> {
    // 模拟数据库查询
    // 实际实现中应该连接到真实数据库
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ query, params, result: 'mocked_result' });
      }, Math.random() * 100); // 模拟查询延迟
    });
  }
  
  private generateQueryKey(query: string, params: any[]): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(query + JSON.stringify(params));
    return hash.digest('hex');
  }
  
  async batchQuery(queries: Array<{ query: string, params: any[] }>): Promise<any[]> {
    if (!this.config.enableQueryOptimization) {
      return Promise.all(queries.map(q => this.executeQuery(q.query, q.params)));
    }
    
    const batches: Array<Array<{ query: string, params: any[] }>> = [];
    
    for (let i = 0; i < queries.length; i += this.config.batchSize) {
      batches.push(queries.slice(i, i + this.config.batchSize));
    }
    
    const results: any[] = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(q => this.optimizedQuery(q.query, q.params))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
  
  clearQueryCache(): void {
    this.queryCache.clear();
  }
}

// 主性能优化器
export class VersionHistoryPerformanceOptimizer {
  private config: PerformanceConfig;
  private monitor: PerformanceMonitor;
  private diffCalculator: OptimizedDiffCalculator;
  private memoryManager: MemoryManager;
  private cacheManager: AdvancedCacheManager;
  private concurrencyManager: ConcurrencyManager;
  private dbOptimizer: DatabaseQueryOptimizer;
  
  constructor(config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG) {
    this.config = config;
    this.monitor = new PerformanceMonitor();
    
    this.diffCalculator = new OptimizedDiffCalculator(config.diffOptimization, this.monitor);
    this.memoryManager = new MemoryManager(config.memoryManagement, this.monitor);
    this.cacheManager = new AdvancedCacheManager(config.caching, this.monitor);
    this.concurrencyManager = new ConcurrencyManager(config.concurrency, this.monitor);
    this.dbOptimizer = new DatabaseQueryOptimizer(config.database, this.monitor);
    
    this.setupPerformanceMonitoring();
  }
  
  private setupPerformanceMonitoring(): void {
    this.monitor.on('timing', (data) => {
      console.log(`Operation ${data.operation} completed in ${data.duration}ms`);
    });
    
    this.monitor.on('memoryUpdate', (usage) => {
      if (usage > this.config.memoryManagement.maxMemoryUsage * 0.9) {
        console.warn(`High memory usage detected: ${usage}MB`);
      }
    });
  }
  
  // 优化的版本对比
  async optimizedVersionCompare(oldContent: string, newContent: string): Promise<any> {
    this.monitor.startTiming('totalProcessing');
    
    try {
      // 检查缓存
      const cached = this.cacheManager.getCachedDiff(oldContent, newContent);
      if (cached) {
        return cached;
      }
      
      // 执行优化的差异计算
      const operation = () => this.diffCalculator.calculateDiff(oldContent, newContent);
      const diffs = await this.concurrencyManager.executeOperation(operation);
      
      // 缓存结果
      this.cacheManager.cacheDiff(oldContent, newContent, diffs);
      
      return diffs;
    } finally {
      this.monitor.endTiming('totalProcessing');
    }
  }
  
  // 批量版本对比
  async batchVersionCompare(comparisons: Array<{ oldContent: string, newContent: string }>): Promise<any[]> {
    const operations = comparisons.map(({ oldContent, newContent }) => 
      () => this.optimizedVersionCompare(oldContent, newContent)
    );
    
    return this.concurrencyManager.executeInParallel(operations);
  }
  
  // 大文档处理
  async processLargeDocument(content: string, processor: (chunk: string) => Promise<any>): Promise<any[]> {
    return this.memoryManager.processLargeContent(content, processor);
  }
  
  // 性能报告
  getPerformanceReport(): any {
    const metrics = this.monitor.getMetrics();
    const cacheStats = this.cacheManager.getCacheStats();
    const queueStatus = this.concurrencyManager.getQueueStatus();
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      cache: cacheStats,
      concurrency: queueStatus,
      recommendations: this.generateRecommendations(metrics, cacheStats)
    };
  }
  
  private generateRecommendations(metrics: PerformanceMetrics, cacheStats: any): string[] {
    const recommendations = [];
    
    if (metrics.diffCalculationTime > 5000) {
      recommendations.push('Consider enabling binary diff for large documents');
    }
    
    if (metrics.memoryUsage > this.config.memoryManagement.maxMemoryUsage * 0.8) {
      recommendations.push('Consider reducing chunk processing size or enabling streaming');
    }
    
    if (cacheStats.hitRatio < 0.3) {
      recommendations.push('Cache hit ratio is low, consider increasing cache size or TTL');
    }
    
    if (metrics.concurrentOperations > this.config.concurrency.maxConcurrentOperations * 0.8) {
      recommendations.push('Consider increasing concurrent operation limit');
    }
    
    if (metrics.databaseQueryTime > 1000) {
      recommendations.push('Database queries are slow, consider optimizing indexes');
    }
    
    return recommendations;
  }
  
  // 性能测试工具
  async runPerformanceTest(): Promise<any> {
    const testSizes = [100, 500, 1000, 5000];
    const results = [];
    
    for (const size of testSizes) {
      const testContent = Array.from({ length: size }, (_, i) => `Line ${i + 1}`).join('\n');
      const modifiedContent = Array.from({ length: size }, (_, i) => 
        `Line ${i + 1}${i % 10 === 0 ? ' Modified' : ''}`
      ).join('\n');
      
      const startTime = Date.now();
      await this.optimizedVersionCompare(testContent, modifiedContent);
      const endTime = Date.now();
      
      results.push({
        lines: size,
        duration: endTime - startTime,
        memoryUsage: this.monitor.getMetrics().memoryUsage
      });
    }
    
    return results;
  }
  
  // 重置所有缓存和统计
  reset(): void {
    this.monitor.reset();
    this.cacheManager.clearCache();
    this.dbOptimizer.clearQueryCache();
  }
  
  // 更新配置
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // 在实际实现中，这里应该重新初始化相关组件
  }
}

// 导出工具函数
export const PerformanceUtils = {
  // 内容哈希计算
  calculateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  },
  
  // 文档大小估算
  estimateDocumentComplexity(content: string): 'small' | 'medium' | 'large' | 'xlarge' {
    const lines = content.split('\n').length;
    
    if (lines < 100) return 'small';
    if (lines < 1000) return 'medium';
    if (lines < 10000) return 'large';
    return 'xlarge';
  },
  
  // 格式化性能指标
  formatMetrics(metrics: PerformanceMetrics): string {
    return `
Performance Metrics:
- Diff Calculation: ${metrics.diffCalculationTime}ms
- Memory Usage: ${metrics.memoryUsage}MB
- Cache Hit Ratio: ${(metrics.cacheHitRatio * 100).toFixed(2)}%
- Concurrent Operations: ${metrics.concurrentOperations}
- Database Query Time: ${metrics.databaseQueryTime}ms
- Total Processing Time: ${metrics.totalProcessingTime}ms
    `.trim();
  },
  
  // 性能建议生成器
  generatePerformanceTips(metrics: PerformanceMetrics): string[] {
    const tips = [];
    
    if (metrics.diffCalculationTime > 1000) {
      tips.push('启用差异计算的早期终止优化');
      tips.push('考虑使用分块处理大型文档');
    }
    
    if (metrics.memoryUsage > 256) {
      tips.push('启用流式处理模式');
      tips.push('增加垃圾回收频率');
    }
    
    if (metrics.cacheHitRatio < 0.5) {
      tips.push('增加缓存大小或延长TTL');
      tips.push('启用缓存压缩');
    }
    
    return tips;
  }
};

export default VersionHistoryPerformanceOptimizer;