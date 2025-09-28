import { TaskTimelineEvent } from '../types/timeline';

/**
 * 时间线性能优化工具类
 */
export class TimelinePerformanceUtils {
  
  /**
   * 事件缓存管理
   */
  private static eventCache = new Map<string, any>();
  private static cacheTimestamps = new Map<string, number>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 清理过期缓存
   */
  private static cleanExpiredCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.CACHE_DURATION) {
        this.eventCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * 设置缓存
   */
  static setCache(key: string, value: any) {
    this.cleanExpiredCache();
    this.eventCache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * 获取缓存
   */
  static getCache(key: string): any | null {
    this.cleanExpiredCache();
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.CACHE_DURATION) {
      return this.eventCache.get(key) || null;
    }
    return null;
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let isThrottled = false;
    return (...args: Parameters<T>) => {
      if (!isThrottled) {
        func(...args);
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, delay);
      }
    };
  }

  /**
   * 事件分批处理
   */
  static batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => R[],
    batchSize = 100
  ): R[] {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = processor(batch);
      results.push(...batchResults);
      
      // 在大批量处理时让出主线程
      if (i > 0 && i % (batchSize * 10) === 0) {
        // 使用 setTimeout 让出控制权
        return new Promise<R[]>((resolve) => {
          setTimeout(() => {
            resolve(results);
          }, 0);
        }) as any;
      }
    }
    
    return results;
  }

  /**
   * 异步分批处理
   */
  static async batchProcessAsync<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize = 100,
    delay = 0
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // 添加延迟以避免阻塞UI
      if (delay > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * 事件数据预处理和索引
   */
  static preprocessEvents(events: TaskTimelineEvent[]): {
    events: TaskTimelineEvent[];
    indices: {
      byId: Map<number, TaskTimelineEvent>;
      byType: Map<string, TaskTimelineEvent[]>;
      byUser: Map<string, TaskTimelineEvent[]>;
      byCategory: Map<string, TaskTimelineEvent[]>;
      byDate: Map<string, TaskTimelineEvent[]>;
    };
  } {
    const cacheKey = `preprocess_${events.length}_${this.hashEvents(events)}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const byId = new Map<number, TaskTimelineEvent>();
    const byType = new Map<string, TaskTimelineEvent[]>();
    const byUser = new Map<string, TaskTimelineEvent[]>();
    const byCategory = new Map<string, TaskTimelineEvent[]>();
    const byDate = new Map<string, TaskTimelineEvent[]>();

    // 排序事件（按时间倒序）
    const sortedEvents = [...events].sort((a, b) => 
      new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    );

    sortedEvents.forEach(event => {
      // ID索引
      byId.set(event.id, event);

      // 类型索引
      if (!byType.has(event.event_type)) {
        byType.set(event.event_type, []);
      }
      byType.get(event.event_type)!.push(event);

      // 用户索引
      if (event.username) {
        if (!byUser.has(event.username)) {
          byUser.set(event.username, []);
        }
        byUser.get(event.username)!.push(event);
      }

      // 分类索引
      if (event.category) {
        if (!byCategory.has(event.category)) {
          byCategory.set(event.category, []);
        }
        byCategory.get(event.category)!.push(event);
      }

      // 日期索引
      const dateKey = new Date(event.event_date).toDateString();
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(event);
    });

    const result = {
      events: sortedEvents,
      indices: { byId, byType, byUser, byCategory, byDate }
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * 计算事件哈希 (用于缓存键)
   */
  private static hashEvents(events: TaskTimelineEvent[]): string {
    if (events.length === 0) return '0';
    
    // 简单哈希算法：使用长度、第一个和最后一个事件的ID
    const first = events[0];
    const last = events[events.length - 1];
    return `${events.length}_${first?.id || 0}_${last?.id || 0}`;
  }

  /**
   * 虚拟滚动配置计算
   */
  static calculateVirtualScrollConfig(
    totalItems: number,
    containerHeight: number,
    itemHeight: number
  ) {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const bufferSize = Math.min(10, Math.ceil(visibleItems / 2));
    const overscan = Math.min(5, Math.ceil(visibleItems / 4));
    
    return {
      visibleItems,
      bufferSize,
      overscan,
      totalHeight: totalItems * itemHeight,
      scrollThreshold: itemHeight * 2
    };
  }

  /**
   * 内存使用情况监控
   */
  static getMemoryUsage(): {
    cacheSize: number;
    cacheEntries: number;
    estimatedMemoryMB: number;
  } {
    const cacheEntries = this.eventCache.size;
    let totalSize = 0;
    
    // 粗略估算缓存大小
    this.eventCache.forEach((value, key) => {
      totalSize += key.length * 2; // 字符串键
      totalSize += this.estimateObjectSize(value);
    });

    return {
      cacheSize: totalSize,
      cacheEntries,
      estimatedMemoryMB: totalSize / (1024 * 1024)
    };
  }

  /**
   * 估算对象大小 (字节)
   */
  private static estimateObjectSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    
    if (typeof obj === 'string') return obj.length * 2;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    if (obj instanceof Date) return 24;
    
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.estimateObjectSize(item), 32);
    }
    
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce((sum, [key, value]) => {
        return sum + key.length * 2 + this.estimateObjectSize(value);
      }, 32);
    }
    
    return 32; // 默认估算
  }

  /**
   * 性能监控装饰器
   */
  static performanceMonitor(name: string) {
    return function<T extends (...args: any[]) => any>(
      target: any,
      propertyKey: string,
      descriptor: TypedPropertyDescriptor<T>
    ) {
      const originalMethod = descriptor.value;
      
      if (originalMethod) {
        descriptor.value = function(...args: any[]) {
          const start = performance.now();
          const result = originalMethod.apply(this, args);
          const end = performance.now();
          
          console.log(`[性能监控] ${name}.${propertyKey}: ${(end - start).toFixed(2)}ms`);
          
          if (result instanceof Promise) {
            return result.finally(() => {
              const asyncEnd = performance.now();
              console.log(`[性能监控] ${name}.${propertyKey} (异步完成): ${(asyncEnd - start).toFixed(2)}ms`);
            });
          }
          
          return result;
        } as T;
      }
    };
  }

  /**
   * 清理所有缓存
   */
  static clearAllCache() {
    this.eventCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * 获取性能统计
   */
  static getPerformanceStats() {
    const memoryUsage = this.getMemoryUsage();
    
    return {
      cache: {
        entries: memoryUsage.cacheEntries,
        size: `${memoryUsage.estimatedMemoryMB.toFixed(2)}MB`,
        hitRate: this.calculateCacheHitRate()
      },
      memory: memoryUsage,
      gc: {
        canRunGC: typeof window !== 'undefined' && 'gc' in window,
        recommendation: memoryUsage.estimatedMemoryMB > 10 ? '建议清理缓存' : '内存使用正常'
      }
    };
  }

  /**
   * 计算缓存命中率 (简化版)
   */
  private static cacheHits = 0;
  private static cacheMisses = 0;

  private static calculateCacheHitRate(): string {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return '0%';
    return `${((this.cacheHits / total) * 100).toFixed(1)}%`;
  }

  /**
   * 记录缓存命中
   */
  static recordCacheHit() {
    this.cacheHits++;
  }

  /**
   * 记录缓存未命中
   */
  static recordCacheMiss() {
    this.cacheMisses++;
  }

  /**
   * 重置统计
   */
  static resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}