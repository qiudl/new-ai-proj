/**
 * 统一缓存键构建器
 * 为不同数据实体提供标准化的缓存键命名规范
 */

export interface CacheKeyParams {
  projectId?: number;
  taskId?: number;
  userId?: number;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
}

/**
 * 缓存键构建器类
 * 实现层次化的缓存键命名: domain:entity:id:params
 */
export class CacheKeyBuilder {
  private static hashParams(params: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) return '';
    
    // 按键排序确保一致性
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    
    // 使用简单哈希减少键长度
    return btoa(paramString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  }

  // ===== 任务相关缓存键 =====
  
  /**
   * 单个任务数据
   */
  static task(projectId: number, taskId: number): string {
    return `task:${projectId}:${taskId}`;
  }

  /**
   * 任务的子任务列表
   */
  static taskChildren(projectId: number, taskId: number, params?: { page?: number; limit?: number }): string {
    const base = `task_children:${projectId}:${taskId}`;
    return params ? `${base}:${this.hashParams(params)}` : base;
  }

  /**
   * 任务完成情况统计
   */
  static taskStats(projectId: number, taskId: number): string {
    return `task_stats:${projectId}:${taskId}`;
  }

  /**
   * 任务层级结构
   */
  static taskHierarchy(projectId: number, rootId: number, depth: number, params?: Record<string, any>): string {
    const base = `task_hierarchy:${projectId}:${rootId}:${depth}`;
    return params ? `${base}:${this.hashParams(params)}` : base;
  }

  /**
   * 任务文档列表
   */
  static taskDocuments(projectId: number, taskId: number): string {
    return `task_documents:${projectId}:${taskId}`;
  }

  // ===== 列表类缓存键 =====

  /**
   * 任务列表
   */
  static taskList(projectId: number, filters?: Record<string, any>): string {
    const base = `task_list:${projectId}`;
    return filters ? `${base}:${this.hashParams(filters)}` : base;
  }

  /**
   * 项目列表
   */
  static projectList(userId?: number, filters?: Record<string, any>): string {
    const base = userId ? `project_list:user:${userId}` : 'project_list:global';
    return filters ? `${base}:${this.hashParams(filters)}` : base;
  }

  // ===== 用户相关缓存键 =====

  /**
   * 用户的任务列表
   */
  static userTasks(userId: number, projectId: number, filters?: Record<string, any>): string {
    const base = `user_tasks:${userId}:${projectId}`;
    return filters ? `${base}:${this.hashParams(filters)}` : base;
  }

  /**
   * 用户信息
   */
  static userInfo(userId: number): string {
    return `user:${userId}`;
  }

  // ===== 计时器相关缓存键 =====

  /**
   * 用户当前计时器
   */
  static currentTimer(userId: number): string {
    return `timer_current:${userId}`;
  }

  /**
   * 用户活跃计时器列表
   */
  static activeTimers(userId: number): string {
    return `timer_active:${userId}`;
  }

  // ===== 工具方法 =====

  /**
   * 从缓存键中提取信息
   */
  static parseKey(key: string): { domain: string; entity: string; ids: string[]; hash?: string } {
    const parts = key.split(':');
    return {
      domain: parts[0] || '',
      entity: parts[1] || '',
      ids: parts.slice(2, -1),
      hash: parts[parts.length - 1]
    };
  }

  /**
   * 检查键是否匹配模式
   */
  static matchesPattern(key: string, pattern: string): boolean {
    // 支持通配符匹配
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  /**
   * 生成模式匹配的正则表达式
   */
  static createPattern(domain: string, entity?: string, id?: string | number): string {
    let pattern = domain;
    if (entity) pattern += `:${entity}`;
    if (id !== undefined) pattern += `:${id}`;
    pattern += ':*';
    return pattern;
  }

  /**
   * 构建依赖模式
   */
  static buildDependencyPattern(domain: string, entityId?: number, projectId?: number): string[] {
    const patterns: string[] = [];
    
    if (domain === 'task' && entityId && projectId) {
      // 任务相关的所有缓存
      patterns.push(
        this.task(projectId, entityId),
        this.taskChildren(projectId, entityId),
        this.taskStats(projectId, entityId),
        `task_hierarchy:${projectId}:*`,
        `task_list:${projectId}:*`
      );
    }
    
    return patterns;
  }
}

// 导出常用的缓存键构建方法
export const CacheKeys = {
  // 任务相关
  task: CacheKeyBuilder.task,
  taskChildren: CacheKeyBuilder.taskChildren,
  taskStats: CacheKeyBuilder.taskStats,
  taskHierarchy: CacheKeyBuilder.taskHierarchy,
  taskDocuments: CacheKeyBuilder.taskDocuments,
  
  // 列表相关
  taskList: CacheKeyBuilder.taskList,
  projectList: CacheKeyBuilder.projectList,
  
  // 用户相关
  userTasks: CacheKeyBuilder.userTasks,
  userInfo: CacheKeyBuilder.userInfo,
  
  // 计时器相关
  currentTimer: CacheKeyBuilder.currentTimer,
  activeTimers: CacheKeyBuilder.activeTimers,
  
  // 工具方法
  parseKey: CacheKeyBuilder.parseKey,
  matchesPattern: CacheKeyBuilder.matchesPattern,
  createPattern: CacheKeyBuilder.createPattern,
  buildDependencyPattern: CacheKeyBuilder.buildDependencyPattern
};

export default CacheKeyBuilder;