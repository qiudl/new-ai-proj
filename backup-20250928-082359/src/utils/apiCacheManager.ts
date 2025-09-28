/**
 * API缓存管理器
 * 提供智能缓存策略、过期管理、内存优化等功能
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
  tags?: string[]; // For grouped cache invalidation
  size?: number; // Estimated memory size in bytes
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number; // Default: 5 minutes
  maxSize?: number; // Max cache size in MB, default: 50MB
  maxEntries?: number; // Max number of entries, default: 1000
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
  persistent?: boolean; // Whether to persist to localStorage
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // In bytes
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export class ApiCacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hitCount: 0,
    missCount: 0,
  };
  
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ENTRIES = 1000;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  
  private cleanupTimer?: NodeJS.Timeout;
  private currentSize = 0;
  
  constructor() {
    this.startCleanupTimer();
    this.loadPersistentCache();
    
    // Setup beforeunload to save persistent cache
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.savePersistentCache();
      });
    }
  }

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.missCount++;
      return null;
    }
    
    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hitCount++;
    return entry.data;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = this.DEFAULT_TTL,
      tags = [],
      priority = 'normal',
      persistent = false
    } = options;
    
    const timestamp = Date.now();
    const estimatedSize = this.estimateSize(data);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp,
      ttl,
      key,
      tags,
      size: estimatedSize,
      accessCount: 1,
      lastAccessed: timestamp
    };
    
    // Check if we need to make space
    if (this.shouldEvict(estimatedSize)) {
      this.evictEntries(estimatedSize);
    }
    
    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentSize -= oldEntry.size || 0;
    }
    
    this.cache.set(key, entry);
    this.currentSize += estimatedSize;
    
    // Handle persistent cache
    if (persistent) {
      this.setPersistent(key, entry);
    }
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size || 0;
      this.cache.delete(key);
      this.deletePersistent(key);
      return true;
    }
    return false;
  }

  /**
   * 批量删除带特定标签的缓存
   */
  deleteByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * 批量删除匹配模式的缓存
   */
  deleteByPattern(pattern: RegExp): number {
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.clearPersistentCache();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: totalRequests > 0 ? this.stats.hitCount / totalRequests : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : undefined,
    };
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存项详情（用于调试）
   */
  getEntryInfo(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  /**
   * 预热缓存 - 批量设置多个缓存项
   */
  warmup<T>(entries: Array<{ key: string; data: T; options?: CacheOptions }>): void {
    entries.forEach(({ key, data, options }) => {
      this.set(key, data, options);
    });
  }

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      // Fallback estimation
      const type = typeof data;
      switch (type) {
        case 'string':
          return data.length * 2; // UTF-16
        case 'number':
          return 8;
        case 'boolean':
          return 4;
        case 'object':
          return data ? 1024 : 4; // Rough estimate
        default:
          return 256; // Default estimate
      }
    }
  }

  /**
   * 检查是否需要驱逐条目
   */
  private shouldEvict(newSize: number): boolean {
    return (
      this.cache.size >= this.MAX_ENTRIES ||
      this.currentSize + newSize > this.MAX_SIZE
    );
  }

  /**
   * 驱逐缓存条目以腾出空间
   * 使用 LRU + 优先级策略
   */
  private evictEntries(requiredSize: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by priority (expired first, then by access pattern)
    entries.sort(([, a], [, b]) => {
      const aExpired = this.isExpired(a);
      const bExpired = this.isExpired(b);
      
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      
      // Both expired or both valid, sort by last accessed time (LRU)
      return a.lastAccessed - b.lastAccessed;
    });
    
    let freedSize = 0;
    let evictedCount = 0;
    
    for (const [key, entry] of entries) {
      if (freedSize >= requiredSize && this.cache.size < this.MAX_ENTRIES) {
        break;
      }
      
      this.delete(key);
      freedSize += entry.size || 0;
      evictedCount++;
    }
    
    console.log(`🧹 API Cache: Evicted ${evictedCount} entries, freed ${freedSize} bytes`);
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 API Cache: Cleaned ${cleanedCount} expired entries`);
    }
  }

  /**
   * 加载持久化缓存
   */
  private loadPersistentCache(): void {
    try {
      const persistentKeys = localStorage.getItem('apiCache:persistent');
      if (!persistentKeys) return;
      
      const keys = JSON.parse(persistentKeys) as string[];
      
      for (const key of keys) {
        const entryData = localStorage.getItem(`apiCache:${key}`);
        if (entryData) {
          const entry = JSON.parse(entryData) as CacheEntry;
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
            this.currentSize += entry.size || 0;
          } else {
            localStorage.removeItem(`apiCache:${key}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  /**
   * 保存持久化缓存
   */
  private savePersistentCache(): void {
    try {
      const persistentKeys: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags?.includes('persistent')) {
          localStorage.setItem(`apiCache:${key}`, JSON.stringify(entry));
          persistentKeys.push(key);
        }
      }
      
      localStorage.setItem('apiCache:persistent', JSON.stringify(persistentKeys));
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  /**
   * 设置持久化缓存项
   */
  private setPersistent(key: string, entry: CacheEntry): void {
    try {
      localStorage.setItem(`apiCache:${key}`, JSON.stringify(entry));
      
      const persistentKeys = localStorage.getItem('apiCache:persistent');
      const keys = persistentKeys ? JSON.parse(persistentKeys) as string[] : [];
      
      if (!keys.includes(key)) {
        keys.push(key);
        localStorage.setItem('apiCache:persistent', JSON.stringify(keys));
      }
    } catch (error) {
      console.warn('Failed to set persistent cache:', error);
    }
  }

  /**
   * 删除持久化缓存项
   */
  private deletePersistent(key: string): void {
    try {
      localStorage.removeItem(`apiCache:${key}`);
      
      const persistentKeys = localStorage.getItem('apiCache:persistent');
      if (persistentKeys) {
        const keys = JSON.parse(persistentKeys) as string[];
        const updatedKeys = keys.filter(k => k !== key);
        localStorage.setItem('apiCache:persistent', JSON.stringify(updatedKeys));
      }
    } catch (error) {
      console.warn('Failed to delete persistent cache:', error);
    }
  }

  /**
   * 清空持久化缓存
   */
  private clearPersistentCache(): void {
    try {
      const persistentKeys = localStorage.getItem('apiCache:persistent');
      if (persistentKeys) {
        const keys = JSON.parse(persistentKeys) as string[];
        keys.forEach(key => localStorage.removeItem(`apiCache:${key}`));
        localStorage.removeItem('apiCache:persistent');
      }
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.savePersistentCache();
    this.clear();
  }
}

// 单例实例
const apiCacheManager = new ApiCacheManager();

// 导出便捷方法
export const apiCache = {
  get: <T>(key: string) => apiCacheManager.get<T>(key),
  set: <T>(key: string, data: T, options?: CacheOptions) => apiCacheManager.set(key, data, options),
  delete: (key: string) => apiCacheManager.delete(key),
  deleteByTag: (tag: string) => apiCacheManager.deleteByTag(tag),
  deleteByPattern: (pattern: RegExp) => apiCacheManager.deleteByPattern(pattern),
  has: (key: string) => apiCacheManager.has(key),
  clear: () => apiCacheManager.clear(),
  getStats: () => apiCacheManager.getStats(),
  keys: () => apiCacheManager.keys(),
  warmup: <T>(entries: Array<{ key: string; data: T; options?: CacheOptions }>) => apiCacheManager.warmup(entries),
};

export default apiCacheManager;