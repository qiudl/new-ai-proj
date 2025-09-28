/**
 * 缓存依赖关系管理器
 * 管理缓存键之间的依赖关系，实现级联失效
 */

import { CacheKeyBuilder } from './cacheKeyBuilder';

export interface CacheDependency {
  /** 主要缓存键 */
  primaryKey: string;
  /** 依赖的缓存键列表 */
  dependentKeys: string[];
  /** 依赖类型 */
  type: 'cascade' | 'related' | 'child';
  /** 创建时间 */
  createdAt: number;
  /** 权重 (用于优先级排序) */
  weight?: number;
}

export interface InvalidationEvent {
  /** 触发失效的原始键 */
  triggerKey: string;
  /** 被失效的键列表 */
  invalidatedKeys: string[];
  /** 失效原因 */
  reason: 'explicit' | 'dependency' | 'expiration' | 'memory_pressure';
  /** 时间戳 */
  timestamp: number;
  /** 级联深度 */
  cascadeDepth: number;
}

export class CacheDependencyManager {
  private dependencies = new Map<string, CacheDependency>();
  private reverseDependencies = new Map<string, Set<string>>();
  private invalidationListeners: ((event: InvalidationEvent) => void)[] = [];

  /**
   * 注册缓存依赖关系
   */
  registerDependency(dependency: CacheDependency): void {
    const { primaryKey, dependentKeys } = dependency;
    
    // 存储主依赖
    this.dependencies.set(primaryKey, {
      ...dependency,
      createdAt: Date.now()
    });

    // 构建反向索引
    dependentKeys.forEach(depKey => {
      if (!this.reverseDependencies.has(depKey)) {
        this.reverseDependencies.set(depKey, new Set());
      }
      this.reverseDependencies.get(depKey)!.add(primaryKey);
    });
  }

  /**
   * 批量注册任务相关的依赖关系
   */
  registerTaskDependencies(projectId: number, taskId: number): void {
    const taskKey = CacheKeyBuilder.task(projectId, taskId);
    const taskChildrenKey = CacheKeyBuilder.taskChildren(projectId, taskId);
    const taskStatsKey = CacheKeyBuilder.taskStats(projectId, taskId);
    const taskDocumentsKey = CacheKeyBuilder.taskDocuments(projectId, taskId);
    const taskListKey = CacheKeyBuilder.taskList(projectId);

    // 任务数据变更会影响的缓存
    this.registerDependency({
      primaryKey: taskKey,
      dependentKeys: [taskStatsKey, taskListKey, taskDocumentsKey],
      type: 'cascade',
      weight: 10
    });

    // 子任务变更会影响父任务统计
    this.registerDependency({
      primaryKey: taskChildrenKey,
      dependentKeys: [taskKey, taskStatsKey, taskListKey],
      type: 'related',
      weight: 8
    });

    // 任务文档变更影响任务详情
    this.registerDependency({
      primaryKey: taskDocumentsKey,
      dependentKeys: [taskKey],
      type: 'child',
      weight: 5
    });
  }

  /**
   * 注册用户相关依赖
   */
  registerUserDependencies(userId: number, projectId: number): void {
    const userTasksKey = CacheKeyBuilder.userTasks(userId, projectId);
    const currentTimerKey = CacheKeyBuilder.currentTimer(userId);
    const activeTimersKey = CacheKeyBuilder.activeTimers(userId);
    const taskListKey = CacheKeyBuilder.taskList(projectId);

    // 用户任务列表依赖
    this.registerDependency({
      primaryKey: userTasksKey,
      dependentKeys: [taskListKey],
      type: 'related',
      weight: 6
    });

    // 计时器依赖
    this.registerDependency({
      primaryKey: currentTimerKey,
      dependentKeys: [activeTimersKey, userTasksKey],
      type: 'related',
      weight: 7
    });
  }

  /**
   * 获取缓存键的依赖列表
   */
  getDependencies(cacheKey: string): string[] {
    const dependency = this.dependencies.get(cacheKey);
    return dependency ? dependency.dependentKeys : [];
  }

  /**
   * 获取依赖于指定键的所有缓存键
   */
  getDependents(cacheKey: string): string[] {
    const dependents = this.reverseDependencies.get(cacheKey);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * 计算需要失效的所有缓存键（包括级联）
   */
  calculateInvalidationChain(triggerKey: string, maxDepth = 5): string[] {
    const invalidatedKeys = new Set<string>();
    const processed = new Set<string>();
    
    const processKey = (key: string, depth: number) => {
      if (depth > maxDepth || processed.has(key)) return;
      
      processed.add(key);
      invalidatedKeys.add(key);
      
      // 获取直接依赖
      const dependencies = this.getDependencies(key);
      dependencies.forEach(depKey => {
        processKey(depKey, depth + 1);
      });
      
      // 获取反向依赖（依赖于此键的其他键）
      const dependents = this.getDependents(key);
      dependents.forEach(depKey => {
        const dependency = this.dependencies.get(depKey);
        if (dependency && dependency.type === 'cascade') {
          processKey(depKey, depth + 1);
        }
      });
    };

    processKey(triggerKey, 0);
    return Array.from(invalidatedKeys);
  }

  /**
   * 智能失效策略 - 根据数据变更类型决定失效范围
   */
  getSmartInvalidationKeys(changeType: 'create' | 'update' | 'delete', entityType: string, entityId: number, projectId: number): string[] {
    const allKeys: string[] = [];

    switch (entityType) {
      case 'task':
        if (changeType === 'create' || changeType === 'delete') {
          // 任务创建/删除影响列表、统计、层级结构
          allKeys.push(
            CacheKeyBuilder.taskList(projectId),
            CacheKeyBuilder.createPattern('task_hierarchy', projectId.toString()),
            CacheKeyBuilder.createPattern('task_stats', projectId.toString())
          );
        } else {
          // 任务更新只影响自身和统计
          allKeys.push(
            CacheKeyBuilder.task(projectId, entityId),
            CacheKeyBuilder.taskStats(projectId, entityId)
          );
        }
        break;

      case 'subtask':
        // 子任务变更影响父任务和列表
        allKeys.push(
          CacheKeyBuilder.taskChildren(projectId, entityId),
          CacheKeyBuilder.task(projectId, entityId),
          CacheKeyBuilder.taskList(projectId)
        );
        break;

      case 'timer':
        // 计时器变更影响用户相关缓存
        allKeys.push(
          CacheKeyBuilder.currentTimer(entityId),
          CacheKeyBuilder.activeTimers(entityId),
          CacheKeyBuilder.userTasks(entityId, projectId)
        );
        break;
    }

    return allKeys;
  }

  /**
   * 执行缓存失效
   */
  invalidate(triggerKey: string, reason: InvalidationEvent['reason'] = 'explicit'): InvalidationEvent {
    const invalidatedKeys = this.calculateInvalidationChain(triggerKey);
    
    const event: InvalidationEvent = {
      triggerKey,
      invalidatedKeys,
      reason,
      timestamp: Date.now(),
      cascadeDepth: this.calculateCascadeDepth(triggerKey, invalidatedKeys)
    };

    // 通知监听器
    this.notifyInvalidation(event);
    
    return event;
  }

  /**
   * 批量失效
   */
  batchInvalidate(triggerKeys: string[], reason: InvalidationEvent['reason'] = 'explicit'): InvalidationEvent[] {
    const events: InvalidationEvent[] = [];
    const processed = new Set<string>();

    triggerKeys.forEach(key => {
      if (!processed.has(key)) {
        const event = this.invalidate(key, reason);
        events.push(event);
        // 标记已处理的键，避免重复处理
        event.invalidatedKeys.forEach(k => processed.add(k));
      }
    });

    return events;
  }

  /**
   * 计算级联深度
   */
  private calculateCascadeDepth(triggerKey: string, invalidatedKeys: string[]): number {
    // 简化计算：基于失效键的数量估算深度
    if (invalidatedKeys.length <= 1) return 0;
    if (invalidatedKeys.length <= 5) return 1;
    if (invalidatedKeys.length <= 15) return 2;
    return 3;
  }

  /**
   * 添加失效监听器
   */
  onInvalidation(listener: (event: InvalidationEvent) => void): () => void {
    this.invalidationListeners.push(listener);
    
    // 返回取消监听的函数
    return () => {
      const index = this.invalidationListeners.indexOf(listener);
      if (index > -1) {
        this.invalidationListeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知失效事件
   */
  private notifyInvalidation(event: InvalidationEvent): void {
    this.invalidationListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in invalidation listener:', error);
      }
    });
  }

  /**
   * 清理过期依赖关系
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.dependencies.forEach((dependency, key) => {
      if (now - dependency.createdAt > maxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.removeDependency(key);
    });
  }

  /**
   * 移除依赖关系
   */
  removeDependency(primaryKey: string): void {
    const dependency = this.dependencies.get(primaryKey);
    if (!dependency) return;

    // 清理反向索引
    dependency.dependentKeys.forEach(depKey => {
      const reverseDeps = this.reverseDependencies.get(depKey);
      if (reverseDeps) {
        reverseDeps.delete(primaryKey);
        if (reverseDeps.size === 0) {
          this.reverseDependencies.delete(depKey);
        }
      }
    });

    // 删除主依赖
    this.dependencies.delete(primaryKey);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalDependencies: this.dependencies.size,
      totalReverseDependencies: this.reverseDependencies.size,
      averageDependentsPerKey: this.dependencies.size > 0 
        ? Array.from(this.dependencies.values()).reduce((sum, dep) => sum + dep.dependentKeys.length, 0) / this.dependencies.size
        : 0
    };
  }

  /**
   * 重置所有依赖关系
   */
  clear(): void {
    this.dependencies.clear();
    this.reverseDependencies.clear();
    this.invalidationListeners.length = 0;
  }
}

// 单例实例
export const cacheDependencyManager = new CacheDependencyManager();

export default CacheDependencyManager;