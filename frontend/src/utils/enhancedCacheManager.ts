/**
 * 增强版缓存管理器
 * 集成缓存键构建器、依赖管理和内存管理的统一缓存解决方案
 */

import { CacheKeyBuilder, CacheKeyParams } from './cacheKeyBuilder';
import { CacheDependencyManager, InvalidationEvent, cacheDependencyManager } from './cacheDependencyManager';
import { globalCache } from '../hooks/useCache';

export interface CacheSetOptions {
  /** 过期时间(毫秒) */
  ttl?: number;
  /** 是否注册依赖关系 */
  registerDependencies?: boolean;
  /** 缓存标签，用于批量操作 */
  tags?: string[];
  /** 优先级 */
  priority?: 'low' | 'normal' | 'high';
}

export interface CacheStats {
  /** 总缓存项数 */
  totalItems: number;
  /** 总条目数（同 totalItems，为了兼容性） */
  totalEntries: number;
  /** 内存使用量(MB) */
  memoryUsageMB: number;
  /** 命中率 */
  hitRate: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 设置操作次数 */
  sets: number;
  /** 删除操作次数 */
  deletes: number;
  /** 依赖关系统计 */
  dependencyStats: {
    totalDependencies: number;
    averageDependentsPerKey: number;
  };
  /** 最近失效事件 */
  recentInvalidations: InvalidationEvent[];
}

export class EnhancedCacheManager {
  private dependencyManager: CacheDependencyManager;
  private hitCount = 0;
  private missCount = 0;
  private setCount = 0;
  private deleteCount = 0;
  private recentInvalidations: InvalidationEvent[] = [];
  private taggedKeys = new Map<string, Set<string>>();

  constructor(dependencyManager: CacheDependencyManager = cacheDependencyManager) {
    this.dependencyManager = dependencyManager;
    this.setupInvalidationListener();
  }

  /**
   * 设置失效事件监听器
   */
  private setupInvalidationListener(): void {
    this.dependencyManager.onInvalidation((event) => {
      // 记录失效事件
      this.recentInvalidations.push(event);
      if (this.recentInvalidations.length > 20) {
        this.recentInvalidations.shift();
      }

      // 执行实际的缓存清理
      event.invalidatedKeys.forEach(key => {
        globalCache.delete(key);
        this.cleanupTaggedKey(key);
      });

      console.log(`Cache invalidation: ${event.invalidatedKeys.length} keys invalidated due to ${event.reason}`);
    });
  }

  // ===== 任务相关缓存操作 =====

  /**
   * 设置任务数据缓存
   */
  async setTask(projectId: number, taskId: number, data: any, options: CacheSetOptions = {}): Promise<void> {
    const key = CacheKeyBuilder.task(projectId, taskId);
    
    if (options.registerDependencies) {
      this.dependencyManager.registerTaskDependencies(projectId, taskId);
    }
    
    await this.set(key, data, options);
  }

  /**
   * 获取任务数据缓存
   */
  async getTask(projectId: number, taskId: number): Promise<any | null> {
    const key = CacheKeyBuilder.task(projectId, taskId);
    return this.get(key);
  }

  /**
   * 设置任务子列表缓存
   */
  async setTaskChildren(projectId: number, taskId: number, data: any, params?: CacheKeyParams, options: CacheSetOptions = {}): Promise<void> {
    const key = CacheKeyBuilder.taskChildren(projectId, taskId, params);
    
    if (options.registerDependencies) {
      this.dependencyManager.registerTaskDependencies(projectId, taskId);
    }
    
    await this.set(key, data, options);
  }

  /**
   * 获取任务子列表缓存
   */
  async getTaskChildren(projectId: number, taskId: number, params?: CacheKeyParams): Promise<any | null> {
    const key = CacheKeyBuilder.taskChildren(projectId, taskId, params);
    return this.get(key);
  }

  /**
   * 设置任务统计缓存
   */
  async setTaskStats(projectId: number, taskId: number, data: any, options: CacheSetOptions = {}): Promise<void> {
    const key = CacheKeyBuilder.taskStats(projectId, taskId);
    await this.set(key, data, options);
  }

  /**
   * 获取任务统计缓存
   */
  async getTaskStats(projectId: number, taskId: number): Promise<any | null> {
    const key = CacheKeyBuilder.taskStats(projectId, taskId);
    return this.get(key);
  }

  /**
   * 设置任务列表缓存
   */
  async setTaskList(projectId: number, data: any, filters?: Record<string, any>, options: CacheSetOptions = {}): Promise<void> {
    const key = CacheKeyBuilder.taskList(projectId, filters);
    await this.set(key, data, options);
  }

  /**
   * 获取任务列表缓存
   */
  async getTaskList(projectId: number, filters?: Record<string, any>): Promise<any | null> {
    const key = CacheKeyBuilder.taskList(projectId, filters);
    return this.get(key);
  }

  // ===== 用户相关缓存操作 =====

  /**
   * 设置用户计时器缓存
   */
  async setCurrentTimer(userId: number, data: any, options: CacheSetOptions = {}): Promise<void> {
    const key = CacheKeyBuilder.currentTimer(userId);
    
    if (options.registerDependencies) {
      // 注册计时器依赖关系，这里假设用户在项目1中
      this.dependencyManager.registerUserDependencies(userId, 1);
    }
    
    await this.set(key, data, options);
  }

  /**
   * 获取用户计时器缓存
   */
  async getCurrentTimer(userId: number): Promise<any | null> {
    const key = CacheKeyBuilder.currentTimer(userId);
    return this.get(key);
  }

  // ===== 核心缓存操作 =====

  /**
   * 设置缓存
   */
  async set(key: string, data: any, options: CacheSetOptions = {}): Promise<void> {
    const { ttl = 5 * 60 * 1000, tags = [], priority = 'normal' } = options;
    
    // 设置缓存
    globalCache.set(key, data, ttl);
    
    // 更新计数器
    this.setCount++;
    
    // 处理标签
    if (tags.length > 0) {
      this.addTaggedKey(key, tags);
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    const data = globalCache.get<T>(key);
    
    // 更新命中统计
    if (data !== null) {
      this.hitCount++;
    } else {
      this.missCount++;
    }
    
    return data;
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    return globalCache.has(key);
  }

  /**
   * 删除单个缓存
   */
  async delete(key: string): Promise<void> {
    globalCache.delete(key);
    this.cleanupTaggedKey(key);
    
    // 更新计数器
    this.deleteCount++;
  }

  // ===== 智能失效操作 =====

  /**
   * 智能失效任务相关缓存
   */
  async invalidateTask(projectId: number, taskId: number, changeType: 'create' | 'update' | 'delete' = 'update'): Promise<InvalidationEvent> {
    const triggerKey = CacheKeyBuilder.task(projectId, taskId);
    
    // 如果是智能失效，使用预定义的失效模式
    if (changeType !== 'update') {
      const smartKeys = this.dependencyManager.getSmartInvalidationKeys(changeType, 'task', taskId, projectId);
      const events = this.dependencyManager.batchInvalidate(smartKeys, 'explicit');
      return events[0] || this.dependencyManager.invalidate(triggerKey);
    }
    
    return this.dependencyManager.invalidate(triggerKey);
  }

  /**
   * 失效任务子列表
   */
  async invalidateTaskChildren(projectId: number, taskId: number): Promise<InvalidationEvent> {
    const triggerKey = CacheKeyBuilder.taskChildren(projectId, taskId);
    return this.dependencyManager.invalidate(triggerKey);
  }

  /**
   * 失效用户相关缓存
   */
  async invalidateUserData(userId: number, changeType: 'timer' | 'task' = 'task'): Promise<InvalidationEvent[]> {
    const keys = [
      CacheKeyBuilder.currentTimer(userId),
      CacheKeyBuilder.activeTimers(userId)
    ];
    
    return this.dependencyManager.batchInvalidate(keys, 'explicit');
  }

  /**
   * 按模式失效缓存
   */
  async invalidateByPattern(pattern: string): Promise<string[]> {
    // 这里需要实现模式匹配的键查找
    // 由于globalCache没有提供keys()方法，这里返回空数组
    // 在实际应用中，可能需要维护一个键的索引
    console.warn('Pattern invalidation not fully implemented, requires key indexing');
    return [];
  }

  /**
   * 按标签失效缓存
   */
  async invalidateByTags(tags: string[]): Promise<string[]> {
    const keysToInvalidate = new Set<string>();
    
    tags.forEach(tag => {
      const taggedKeys = this.taggedKeys.get(tag);
      if (taggedKeys) {
        taggedKeys.forEach(key => keysToInvalidate.add(key));
      }
    });
    
    const keys = Array.from(keysToInvalidate);
    if (keys.length > 0) {
      this.dependencyManager.batchInvalidate(keys, 'explicit');
    }
    
    return keys;
  }

  // ===== 标签管理 =====

  /**
   * 添加标签映射
   */
  private addTaggedKey(key: string, tags: string[]): void {
    tags.forEach(tag => {
      if (!this.taggedKeys.has(tag)) {
        this.taggedKeys.set(tag, new Set());
      }
      this.taggedKeys.get(tag)!.add(key);
    });
  }

  /**
   * 清理标签映射
   */
  private cleanupTaggedKey(key: string): void {
    this.taggedKeys.forEach((keys, tag) => {
      keys.delete(key);
      if (keys.size === 0) {
        this.taggedKeys.delete(tag);
      }
    });
  }

  // ===== 统计和监控 =====

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const baseStats = globalCache.getStats();
    const dependencyStats = this.dependencyManager.getStats();
    
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    return {
      totalItems: baseStats.size,
      totalEntries: baseStats.size, // 兼容性属性
      memoryUsageMB: baseStats.memoryUsageMB,
      hitRate,
      hits: this.hitCount,
      misses: this.missCount,
      sets: this.setCount,
      deletes: this.deleteCount,
      dependencyStats,
      recentInvalidations: [...this.recentInvalidations]
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.setCount = 0;
    this.deleteCount = 0;
    this.recentInvalidations = [];
  }

  /**
   * 清理过期数据
   */
  async cleanup(): Promise<void> {
    // 清理过期的依赖关系
    this.dependencyManager.cleanup();
    
    // 清理标签映射中的无效键
    const keysToCleanup: string[] = [];
    this.taggedKeys.forEach((keys, tag) => {
      keys.forEach(key => {
        if (!globalCache.has(key)) {
          keysToCleanup.push(key);
        }
      });
    });
    
    keysToCleanup.forEach(key => this.cleanupTaggedKey(key));
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    globalCache.clear();
    this.dependencyManager.clear();
    this.taggedKeys.clear();
    this.resetStats();
  }

  // ===== 公共方法访问依赖管理器功能 =====

  /**
   * 注册任务依赖关系
   */
  registerTaskDependencies(projectId: number, taskId: number): void {
    this.dependencyManager.registerTaskDependencies(projectId, taskId);
  }

  /**
   * 注册用户依赖关系
   */
  registerUserDependencies(userId: number, projectId: number): void {
    this.dependencyManager.registerUserDependencies(userId, projectId);
  }

  /**
   * 注册依赖关系（通用方法）
   */
  registerDependency(dependency: { key: string; dependsOn: string[]; tags?: string[] }): void {
    // ✅ FIXED - Transform to CacheDependency with required fields (TS2345)
    this.dependencyManager.registerDependency({
      primaryKey: dependency.key,
      dependentKeys: dependency.dependsOn,
      type: 'related', // Default type for generic dependencies
      createdAt: Date.now()
    });
  }

  /**
   * 获取依赖管理器实例（只读）
   * 返回一个接口，仅包含必要的公共方法
   */
  getDependencyManager() {
    return {
      registerTaskDependencies: (projectId: number, taskId: number) =>
        this.dependencyManager.registerTaskDependencies(projectId, taskId),
      registerUserDependencies: (userId: number, projectId: number) =>
        this.dependencyManager.registerUserDependencies(userId, projectId),
      registerDependency: (dependency: { key: string; dependsOn: string[]; tags?: string[] }) => {
        // ✅ FIXED - Transform to CacheDependency with required fields (TS2345)
        this.dependencyManager.registerDependency({
          primaryKey: dependency.key,
          dependentKeys: dependency.dependsOn,
          type: 'related',
          createdAt: Date.now()
        });
      },
      getStats: () => this.dependencyManager.getStats()
    };
  }
}

// 单例实例
export const enhancedCacheManager = new EnhancedCacheManager();

export default EnhancedCacheManager;
