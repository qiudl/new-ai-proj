// 缓存工具类，用于提升Timer System 2.0的性能

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expires: number;
}

class CacheManager {
  protected cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 过期时间（毫秒），默认5分钟
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    };
    this.cache.set(key, item);
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据或null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; expired: number; total: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expires) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired,
      total: this.cache.size
    };
  }

  /**
   * 带缓存的异步函数包装器
   * @param key 缓存键
   * @param asyncFn 异步函数
   * @param ttl 缓存时间
   * @returns 包装后的函数
   */
  async withCache<T>(
    key: string,
    asyncFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 执行异步函数
    const result = await asyncFn();
    
    // 存储到缓存
    this.set(key, result, ttl);
    
    return result;
  }
}

// 专门用于计时系统的缓存管理器
class TimerCacheManager extends CacheManager {
  private readonly TIMER_TASKS_TTL = 30 * 1000; // 30秒
  private readonly DASHBOARD_TTL = 10 * 1000; // 10秒
  private readonly ANALYTICS_TTL = 2 * 60 * 1000; // 2分钟
  private readonly HISTORY_TTL = 60 * 1000; // 1分钟

  // 缓存个人计时任务列表
  cacheTimerTasks(userId: number, tasks: any, filters?: any): void {
    const key = `timer_tasks_${userId}_${JSON.stringify(filters || {})}`;
    this.set(key, tasks, this.TIMER_TASKS_TTL);
  }

  getTimerTasks(userId: number, filters?: any): any | null {
    const key = `timer_tasks_${userId}_${JSON.stringify(filters || {})}`;
    return this.get(key);
  }

  // 缓存仪表板数据
  cacheDashboard(userId: number, dashboard: any): void {
    const key = `dashboard_${userId}`;
    this.set(key, dashboard, this.DASHBOARD_TTL);
  }

  getDashboard(userId: number): any | null {
    const key = `dashboard_${userId}`;
    return this.get(key);
  }

  // 缓存分析数据
  cacheAnalytics(userId: number, timeRange: string, analytics: any): void {
    const key = `analytics_${userId}_${timeRange}`;
    this.set(key, analytics, this.ANALYTICS_TTL);
  }

  getAnalytics(userId: number, timeRange: string): any | null {
    const key = `analytics_${userId}_${timeRange}`;
    return this.get(key);
  }

  // 缓存历史记录
  cacheHistory(userId: number, page: number, limit: number, history: any): void {
    const key = `history_${userId}_${page}_${limit}`;
    this.set(key, history, this.HISTORY_TTL);
  }

  getHistory(userId: number, page: number, limit: number): any | null {
    const key = `history_${userId}_${page}_${limit}`;
    return this.get(key);
  }

  // 清除用户相关的所有缓存
  clearUserCache(userId: number): void {
    const userKeys = Array.from(this.cache.keys()).filter(key => 
      key.includes(`_${userId}_`) || key.includes(`_${userId}`)
    );
    
    userKeys.forEach(key => this.delete(key));
  }

  // 当数据发生变化时清除相关缓存
  invalidateTasksCache(userId: number): void {
    const taskKeys = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(`timer_tasks_${userId}_`) || 
      key.startsWith(`dashboard_${userId}`)
    );
    
    taskKeys.forEach(key => this.delete(key));
  }
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

// 批量操作队列
class BatchQueue<T> {
  private queue: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly delay: number;
  private readonly processor: (items: T[]) => void;

  constructor(processor: (items: T[]) => void, delay: number = 100) {
    this.processor = processor;
    this.delay = delay;
  }

  add(item: T): void {
    this.queue.push(item);
    
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    this.timer = setTimeout(() => {
      if (this.queue.length > 0) {
        const items = [...this.queue];
        this.queue = [];
        this.processor(items);
      }
    }, this.delay);
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.queue.length > 0) {
      const items = [...this.queue];
      this.queue = [];
      this.processor(items);
    }
  }
}

// 创建全局实例
export const timerCache = new TimerCacheManager();
export const generalCache = new CacheManager();

// 定期清理过期缓存
setInterval(() => {
  timerCache.cleanup();
  generalCache.cleanup();
}, 60 * 1000); // 每分钟清理一次

// 内存监控
export const memoryMonitor = {
  getCacheStats: () => ({
    timer: timerCache.getStats(),
    general: generalCache.getStats()
  }),
  
  getMemoryUsage: () => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }
};

export { CacheManager, TimerCacheManager, BatchQueue };