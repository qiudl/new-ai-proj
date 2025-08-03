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
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now > item.expires) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; expired: number; total: number } {
    const now = Date.now();
    let expired = 0;
    
    this.cache.forEach((item) => {
      if (now > item.expires) {
        expired++;
      }
    });

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

// 缓存键命名规范
export const CACHE_KEYS = {
  // 仪表板相关
  DASHBOARD_STATS: (userId: number) => `dashboard:stats:${userId}`,
  DASHBOARD_WEEKLY: (userId: number, startDate: string, endDate: string, projectId?: number) => 
    `dashboard:weekly:${userId}:${startDate}:${endDate}${projectId ? `:${projectId}` : ''}`,
  DASHBOARD_PROJECT_PROGRESS: (userId: number) => `dashboard:project_progress:${userId}`,
  DASHBOARD_USER_WORKLOAD: (userId: number) => `dashboard:user_workload:${userId}`,
  DASHBOARD_RECENT_ACTIVITIES: (userId: number, limit: number) => `dashboard:activities:${userId}:${limit}`,
  
  // 任务相关
  TASKS_BY_PROJECT: (projectId: number, page: number, pageSize: number) => 
    `tasks:project:${projectId}:${page}:${pageSize}`,
  TASKS_BY_STATUS: (userId: number) => `tasks:status:${userId}`,
  TASKS_OVERDUE: (userId: number) => `tasks:overdue:${userId}`,
  TASKS_HIGH_PRIORITY: (userId: number) => `tasks:high_priority:${userId}`,
  TASKS_TODAY: (userId: number) => `tasks:today:${userId}`,
  TASKS_THIS_WEEK: (userId: number) => `tasks:this_week:${userId}`,
  
  // 项目相关  
  PROJECTS_ALL: (userId: number, page: number, pageSize: number) => 
    `projects:all:${userId}:${page}:${pageSize}`,
  PROJECT_DETAILS: (projectId: number) => `project:details:${projectId}`,
  PROJECT_STATS: (projectId: number) => `project:stats:${projectId}`,
  
  // 计时系统相关
  TIMER_TASKS: (userId: number, filters?: any) => 
    `timer:tasks:${userId}:${JSON.stringify(filters || {})}`,
  TIMER_ANALYTICS: (userId: number, timeRange: string) => 
    `timer:analytics:${userId}:${timeRange}`,
  TIMER_HISTORY: (userId: number, page: number, limit: number) => 
    `timer:history:${userId}:${page}:${limit}`,
  
  // 周报相关
  WEEKLY_REPORT: (userId: number, startDate: string, endDate: string) => 
    `weekly:report:${userId}:${startDate}:${endDate}`,
  WEEKLY_STATS_OVERVIEW: (userId: number, startDate: string, endDate: string) => 
    `weekly:stats:${userId}:${startDate}:${endDate}`,
  EFFICIENCY_TREND: (userId: number, startDate: string, endDate: string) => 
    `weekly:efficiency:${userId}:${startDate}:${endDate}`,
} as const;

// 标准化TTL配置
export const CACHE_TTL = {
  // 实时数据 - 短缓存
  REAL_TIME: 10 * 1000,        // 10秒 - 实时仪表板数据
  LIVE_UPDATES: 30 * 1000,     // 30秒 - 任务状态更新
  
  // 频繁更新数据 - 中等缓存
  FREQUENT: 2 * 60 * 1000,     // 2分钟 - 项目统计、用户工作负载
  REGULAR: 5 * 60 * 1000,      // 5分钟 - 任务列表、项目列表
  
  // 稳定数据 - 长缓存
  STABLE: 15 * 60 * 1000,      // 15分钟 - 周报数据、历史统计
  SEMI_STATIC: 30 * 60 * 1000, // 30分钟 - 项目详情、用户信息
  STATIC: 60 * 60 * 1000,      // 1小时 - 配置数据、权限信息
} as const;

// 专门用于计时系统的缓存管理器
class TimerCacheManager extends CacheManager {
  // 使用标准化的TTL配置
  private readonly TIMER_TASKS_TTL = CACHE_TTL.LIVE_UPDATES;
  private readonly DASHBOARD_TTL = CACHE_TTL.REAL_TIME;
  private readonly ANALYTICS_TTL = CACHE_TTL.FREQUENT;
  private readonly HISTORY_TTL = CACHE_TTL.REGULAR;

  // 缓存个人计时任务列表
  cacheTimerTasks(userId: number, tasks: unknown, filters?: any): void {
    const key = CACHE_KEYS.TIMER_TASKS(userId, filters);
    this.set(key, tasks, this.TIMER_TASKS_TTL);
  }

  getTimerTasks(userId: number, filters?: any): any | null {
    const key = CACHE_KEYS.TIMER_TASKS(userId, filters);
    return this.get(key);
  }

  // 缓存仪表板数据
  cacheDashboard(userId: number, dashboard: unknown): void {
    const key = CACHE_KEYS.DASHBOARD_STATS(userId);
    this.set(key, dashboard, this.DASHBOARD_TTL);
  }

  getDashboard(userId: number): any | null {
    const key = CACHE_KEYS.DASHBOARD_STATS(userId);
    return this.get(key);
  }

  // 缓存周报仪表板数据
  cacheWeeklyDashboard(userId: number, startDate: string, endDate: string, projectId: number | undefined, data: Record<string, unknown>): void {
    const key = CACHE_KEYS.DASHBOARD_WEEKLY(userId, startDate, endDate, projectId);
    this.set(key, data, CACHE_TTL.STABLE);
  }

  getWeeklyDashboard(userId: number, startDate: string, endDate: string, projectId?: number): any | null {
    const key = CACHE_KEYS.DASHBOARD_WEEKLY(userId, startDate, endDate, projectId);
    return this.get(key);
  }

  // 缓存项目进度数据
  cacheProjectProgress(userId: number, data: Record<string, unknown>): void {
    const key = CACHE_KEYS.DASHBOARD_PROJECT_PROGRESS(userId);
    this.set(key, data, CACHE_TTL.FREQUENT);
  }

  getProjectProgress(userId: number): any | null {
    const key = CACHE_KEYS.DASHBOARD_PROJECT_PROGRESS(userId);
    return this.get(key);
  }

  // 缓存用户工作负载
  cacheUserWorkload(userId: number, data: Record<string, unknown>): void {
    const key = CACHE_KEYS.DASHBOARD_USER_WORKLOAD(userId);
    this.set(key, data, CACHE_TTL.FREQUENT);
  }

  getUserWorkload(userId: number): any | null {
    const key = CACHE_KEYS.DASHBOARD_USER_WORKLOAD(userId);
    return this.get(key);
  }

  // 缓存最近活动
  cacheRecentActivities(userId: number, limit: number, data: Record<string, unknown>): void {
    const key = CACHE_KEYS.DASHBOARD_RECENT_ACTIVITIES(userId, limit);
    this.set(key, data, CACHE_TTL.REGULAR);
  }

  getRecentActivities(userId: number, limit: number): any | null {
    const key = CACHE_KEYS.DASHBOARD_RECENT_ACTIVITIES(userId, limit);
    return this.get(key);
  }

  // 缓存分析数据
  cacheAnalytics(userId: number, timeRange: string, analytics: unknown): void {
    const key = CACHE_KEYS.TIMER_ANALYTICS(userId, timeRange);
    this.set(key, analytics, this.ANALYTICS_TTL);
  }

  getAnalytics(userId: number, timeRange: string): any | null {
    const key = CACHE_KEYS.TIMER_ANALYTICS(userId, timeRange);
    return this.get(key);
  }

  // 缓存历史记录
  cacheHistory(userId: number, page: number, limit: number, history: unknown): void {
    const key = CACHE_KEYS.TIMER_HISTORY(userId, page, limit);
    this.set(key, history, this.HISTORY_TTL);
  }

  getHistory(userId: number, page: number, limit: number): any | null {
    const key = CACHE_KEYS.TIMER_HISTORY(userId, page, limit);
    return this.get(key);
  }

  // 缓存任务相关数据
  cacheTasksByProject(projectId: number, page: number, pageSize: number, data: Record<string, unknown>): void {
    const key = CACHE_KEYS.TASKS_BY_PROJECT(projectId, page, pageSize);
    this.set(key, data, CACHE_TTL.REGULAR);
  }

  getTasksByProject(projectId: number, page: number, pageSize: number): any | null {
    const key = CACHE_KEYS.TASKS_BY_PROJECT(projectId, page, pageSize);
    return this.get(key);
  }

  cacheTasksByStatus(userId: number, data: Record<string, unknown>): void {
    const key = CACHE_KEYS.TASKS_BY_STATUS(userId);
    this.set(key, data, CACHE_TTL.LIVE_UPDATES);
  }

  getTasksByStatus(userId: number): any | null {
    const key = CACHE_KEYS.TASKS_BY_STATUS(userId);
    return this.get(key);
  }

  // 清除用户相关的所有缓存
  clearUserCache(userId: number): void {
    const userKeys = Array.from(this.cache.keys()).filter(key => 
      key.includes(`:${userId}:`) || key.includes(`:${userId}`) || key.endsWith(`:${userId}`)
    );
    
    userKeys.forEach(key => this.delete(key));
  }

  // 当数据发生变化时清除相关缓存
  invalidateTasksCache(userId: number): void {
    const patterns = [
      `timer:tasks:${userId}:`,
      `dashboard:stats:${userId}`,
      `dashboard:weekly:${userId}:`,
      `tasks:status:${userId}`,
      `tasks:overdue:${userId}`,
      `tasks:high_priority:${userId}`,
      `tasks:today:${userId}`,
      `tasks:this_week:${userId}`
    ];
    
    const taskKeys = Array.from(this.cache.keys()).filter(key => 
      patterns.some(pattern => key.startsWith(pattern))
    );
    
    taskKeys.forEach(key => this.delete(key));
  }

  // 清除项目相关缓存
  invalidateProjectCache(projectId: number): void {
    const patterns = [
      `tasks:project:${projectId}:`,
      `project:details:${projectId}`,
      `project:stats:${projectId}`
    ];
    
    const projectKeys = Array.from(this.cache.keys()).filter(key => 
      patterns.some(pattern => key.startsWith(pattern))
    );
    
    projectKeys.forEach(key => this.delete(key));
  }

  // 清除仪表板相关缓存
  invalidateDashboardCache(userId: number): void {
    const patterns = [
      `dashboard:stats:${userId}`,
      `dashboard:weekly:${userId}:`,
      `dashboard:project_progress:${userId}`,
      `dashboard:user_workload:${userId}`,
      `dashboard:activities:${userId}:`
    ];
    
    const dashboardKeys = Array.from(this.cache.keys()).filter(key => 
      patterns.some(pattern => key.startsWith(pattern))
    );
    
    dashboardKeys.forEach(key => this.delete(key));
  }

  // 清除周报相关缓存
  invalidateWeeklyReportCache(userId: number): void {
    const patterns = [
      `weekly:report:${userId}:`,
      `weekly:stats:${userId}:`,
      `weekly:efficiency:${userId}:`
    ];
    
    const weeklyKeys = Array.from(this.cache.keys()).filter(key => 
      patterns.some(pattern => key.startsWith(pattern))
    );
    
    weeklyKeys.forEach(key => this.delete(key));
  }
}

// 防抖函数
export function debounce<T extends (...args: unknown[]) => any>(
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
export function throttle<T extends (...args: unknown[]) => any>(
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
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as unknown)) {
      const memory = (window.performance as unknown).memory;
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