# TaskDetailPage 数据层接口设计

## 🎯 设计目标

1. **统一接口规范**: 所有数据操作通过统一的Service层
2. **智能缓存管理**: 多层缓存策略，减少API调用
3. **错误处理规范**: 统一的错误处理和恢复机制
4. **性能优化**: 请求合并、预加载、并行加载
5. **类型安全**: 完整的TypeScript类型定义

## 📦 Service层架构

### TaskDetailService 统一接口

```typescript
// services/TaskDetailService.ts

export class TaskDetailService {
  private static cache = new CacheManager();
  private static requestQueue = new RequestQueue();
  
  // ========== 核心数据获取 ==========
  
  /**
   * 获取任务详情（包含所有相关数据）
   */
  static async getTaskDetail(
    projectId: number, 
    taskId: number,
    options?: TaskDetailOptions
  ): Promise<TaskDetailResponse> {
    const cacheKey = `task-detail:${projectId}:${taskId}`;
    
    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached && !options?.forceRefresh) {
      return cached;
    }
    
    // 并行加载所有数据
    const [task, relations, documents, timeline, statistics] = await Promise.all([
      this.getTask(projectId, taskId),
      this.getTaskRelations(taskId),
      this.getTaskDocuments(taskId, { page: 1, pageSize: 10 }),
      this.getTaskTimeline(taskId, { page: 1, pageSize: 20 }),
      this.getTaskStatistics(taskId)
    ]);
    
    const result: TaskDetailResponse = {
      task,
      relations,
      documents,
      timeline,
      statistics,
      timestamp: Date.now()
    };
    
    // 缓存结果
    await this.cache.set(cacheKey, result, {
      ttl: 5 * 60 * 1000, // 5分钟
      tags: [`project:${projectId}`, `task:${taskId}`]
    });
    
    return result;
  }
  
  /**
   * 获取任务基本信息
   */
  static async getTask(
    projectId: number,
    taskId: number
  ): Promise<Task> {
    return this.requestQueue.add(
      `task:${projectId}:${taskId}`,
      () => api.get(`/projects/${projectId}/tasks/${taskId}`)
    );
  }
  
  /**
   * 获取任务关系数据
   */
  static async getTaskRelations(
    taskId: number
  ): Promise<TaskRelations> {
    const [parent, subtasks, siblings] = await Promise.all([
      this.getParentTask(taskId),
      this.getSubtasks(taskId),
      this.getSiblingTasks(taskId)
    ]);
    
    return {
      parent,
      subtasks,
      siblings,
      graph: this.buildRelationGraph({ parent, subtasks, siblings })
    };
  }
  
  /**
   * 获取任务文档
   */
  static async getTaskDocuments(
    taskId: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Document>> {
    const response = await api.get(`/tasks/${taskId}/documents`, {
      params: pagination
    });
    
    return {
      data: response.data.documents,
      total: response.data.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      hasMore: response.data.hasMore
    };
  }
  
  /**
   * 获取任务时间线
   */
  static async getTaskTimeline(
    taskId: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<TimelineEvent>> {
    const response = await api.get(`/tasks/${taskId}/timeline`, {
      params: pagination
    });
    
    return {
      data: response.data.events,
      total: response.data.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      hasMore: response.data.hasMore
    };
  }
  
  /**
   * 获取任务统计数据
   */
  static async getTaskStatistics(
    taskId: number
  ): Promise<TaskStatistics> {
    const response = await api.get(`/tasks/${taskId}/statistics`);
    
    return {
      completion: response.data.completion,
      efficiency: response.data.efficiency,
      timeTracking: response.data.timeTracking,
      quality: response.data.quality
    };
  }
  
  // ========== 数据操作 ==========
  
  /**
   * 更新任务
   */
  static async updateTask(
    projectId: number,
    taskId: number,
    updates: Partial<Task>
  ): Promise<Task> {
    // 乐观更新缓存
    const cacheKey = `task:${projectId}:${taskId}`;
    const current = await this.cache.get(cacheKey);
    if (current) {
      await this.cache.set(cacheKey, { ...current, ...updates }, {
        ttl: 10 * 1000 // 临时缓存10秒
      });
    }
    
    try {
      const response = await api.patch(
        `/projects/${projectId}/tasks/${taskId}`,
        updates
      );
      
      // 更新成功，刷新缓存
      await this.cache.set(cacheKey, response.data, {
        ttl: 5 * 60 * 1000
      });
      
      // 失效相关缓存
      await this.cache.invalidate([
        `task-detail:${projectId}:${taskId}`,
        `task-list:${projectId}:*`
      ]);
      
      return response.data;
    } catch (error) {
      // 回滚缓存
      if (current) {
        await this.cache.set(cacheKey, current);
      }
      throw error;
    }
  }
  
  /**
   * 删除任务
   */
  static async deleteTask(
    projectId: number,
    taskId: number,
    options?: DeleteOptions
  ): Promise<void> {
    await api.delete(`/projects/${projectId}/tasks/${taskId}`, {
      params: options
    });
    
    // 清理所有相关缓存
    await this.cache.invalidate([
      `task:${projectId}:${taskId}`,
      `task-detail:${projectId}:${taskId}`,
      `task-list:${projectId}:*`,
      `task-relations:${taskId}:*`
    ]);
  }
  
  /**
   * 归档任务
   */
  static async archiveTask(
    projectId: number,
    taskId: number
  ): Promise<Task> {
    const response = await api.post(
      `/projects/${projectId}/tasks/${taskId}/archive`
    );
    
    // 更新缓存
    await this.cache.invalidate([
      `task:${projectId}:${taskId}`,
      `task-detail:${projectId}:${taskId}`
    ]);
    
    return response.data;
  }
  
  // ========== 批量操作 ==========
  
  /**
   * 批量更新任务
   */
  static async batchUpdate(
    operations: BatchOperation[]
  ): Promise<BatchOperationResult> {
    const response = await api.post('/tasks/batch', {
      operations
    });
    
    // 失效所有涉及的缓存
    const cacheKeys = operations.flatMap(op => [
      `task:${op.projectId}:${op.taskId}`,
      `task-detail:${op.projectId}:${op.taskId}`
    ]);
    await this.cache.invalidate(cacheKeys);
    
    return response.data;
  }
  
  // ========== 预加载策略 ==========
  
  /**
   * 预加载相关任务数据
   */
  static async preloadRelatedTasks(
    taskId: number,
    relations: TaskRelations
  ): Promise<void> {
    const taskIds = [
      relations.parent?.id,
      ...relations.subtasks.map(t => t.id),
      ...relations.siblings.map(t => t.id)
    ].filter(Boolean);
    
    // 批量预加载
    await Promise.all(
      taskIds.map(id => 
        this.cache.warmup(`task:*:${id}`, () => 
          this.getTask(1, id!) // projectId需要从context获取
        )
      )
    );
  }
}
```

## 🔄 缓存管理策略

### CacheManager 实现

```typescript
// utils/CacheManager.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  hits: number;
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export class CacheManager {
  private memory = new Map<string, CacheEntry<any>>();
  private session = new SessionStorageAdapter();
  private indexed = new IndexedDBAdapter();
  
  // 多层缓存策略
  async get<T>(key: string): Promise<T | null> {
    // L1: 内存缓存
    const memoryCache = this.memory.get(key);
    if (memoryCache && this.isValid(memoryCache)) {
      memoryCache.hits++;
      return memoryCache.data;
    }
    
    // L2: SessionStorage缓存
    const sessionCache = await this.session.get<T>(key);
    if (sessionCache && this.isValid(sessionCache)) {
      // 提升到内存缓存
      this.memory.set(key, sessionCache);
      return sessionCache.data;
    }
    
    // L3: IndexedDB缓存
    const indexedCache = await this.indexed.get<T>(key);
    if (indexedCache && this.isValid(indexedCache)) {
      // 提升到更高层缓存
      this.memory.set(key, indexedCache);
      await this.session.set(key, indexedCache);
      return indexedCache.data;
    }
    
    return null;
  }
  
  async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || 5 * 60 * 1000, // 默认5分钟
      tags: options.tags || [],
      hits: 0
    };
    
    // 根据优先级决定缓存层级
    const priority = options.priority || 'normal';
    
    // 内存缓存
    this.memory.set(key, entry);
    
    // SessionStorage缓存
    if (priority !== 'low') {
      await this.session.set(key, entry);
    }
    
    // IndexedDB持久化
    if (priority === 'high') {
      await this.indexed.set(key, entry);
    }
    
    // 自动清理过期缓存
    this.scheduleCleanup();
  }
  
  async invalidate(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const regex = this.patternToRegex(pattern);
      
      // 清理所有层级的缓存
      for (const key of this.memory.keys()) {
        if (regex.test(key)) {
          this.memory.delete(key);
        }
      }
      
      await this.session.invalidate(regex);
      await this.indexed.invalidate(regex);
    }
  }
  
  async warmup<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<void> {
    // 后台预热缓存
    setTimeout(async () => {
      try {
        const data = await fetcher();
        await this.set(key, data);
      } catch (error) {
        console.error('Cache warmup failed:', error);
      }
    }, 0);
  }
  
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() < entry.timestamp + entry.ttl;
  }
  
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
  
  private scheduleCleanup(): void {
    // 定期清理过期缓存
    setTimeout(() => {
      for (const [key, entry] of this.memory.entries()) {
        if (!this.isValid(entry)) {
          this.memory.delete(key);
        }
      }
    }, 60 * 1000); // 每分钟清理一次
  }
}
```

## 🔀 请求队列管理

### RequestQueue 实现

```typescript
// utils/RequestQueue.ts

interface QueuedRequest<T> {
  id: string;
  promise: Promise<T>;
  timestamp: number;
  priority: number;
}

export class RequestQueue {
  private queue = new Map<string, QueuedRequest<any>>();
  private executing = new Map<string, Promise<any>>();
  private maxConcurrent = 5;
  
  /**
   * 添加请求到队列（防重复）
   */
  async add<T>(
    id: string,
    fetcher: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    // 如果相同请求正在执行，返回现有Promise
    const existing = this.executing.get(id);
    if (existing) {
      return existing;
    }
    
    // 创建新请求
    const promise = this.execute(id, fetcher);
    this.executing.set(id, promise);
    
    // 清理执行记录
    promise.finally(() => {
      this.executing.delete(id);
    });
    
    return promise;
  }
  
  /**
   * 批量请求合并
   */
  async batch<T>(
    requests: Array<{ id: string; fetcher: () => Promise<T> }>
  ): Promise<T[]> {
    // 合并相同的请求
    const uniqueRequests = new Map<string, () => Promise<T>>();
    const resultMap = new Map<string, T>();
    
    for (const req of requests) {
      if (!uniqueRequests.has(req.id)) {
        uniqueRequests.set(req.id, req.fetcher);
      }
    }
    
    // 并行执行（控制并发数）
    const chunks = this.chunk(Array.from(uniqueRequests.entries()), this.maxConcurrent);
    
    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async ([id, fetcher]) => {
          const result = await this.add(id, fetcher);
          resultMap.set(id, result);
          return result;
        })
      );
    }
    
    // 按原始顺序返回结果
    return requests.map(req => resultMap.get(req.id)!);
  }
  
  private async execute<T>(
    id: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    try {
      return await fetcher();
    } catch (error) {
      // 记录错误
      console.error(`Request ${id} failed:`, error);
      throw error;
    }
  }
  
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## ⚠️ 错误处理规范

### ErrorHandler 实现

```typescript
// utils/ErrorHandler.ts

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT'
}

export interface ServiceError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
  retry?: boolean;
  retryAfter?: number;
}

export class ErrorHandler {
  private static retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };
  
  /**
   * 统一错误处理
   */
  static async handle(
    error: any,
    context: string
  ): Promise<ServiceError> {
    console.error(`[${context}] Error:`, error);
    
    // 网络错误
    if (!error.response) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: '网络连接失败，请检查网络设置',
        timestamp: Date.now(),
        retry: true
      };
    }
    
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        return {
          code: ErrorCode.VALIDATION_ERROR,
          message: data.message || '请求参数错误',
          details: data.errors,
          timestamp: Date.now(),
          retry: false
        };
        
      case 401:
        return {
          code: ErrorCode.UNAUTHORIZED,
          message: '未授权访问，请重新登录',
          timestamp: Date.now(),
          retry: false
        };
        
      case 404:
        return {
          code: ErrorCode.NOT_FOUND,
          message: data.message || '资源不存在',
          timestamp: Date.now(),
          retry: false
        };
        
      case 429:
        return {
          code: ErrorCode.RATE_LIMIT,
          message: '请求过于频繁，请稍后再试',
          retryAfter: parseInt(error.response.headers['retry-after'] || '60'),
          timestamp: Date.now(),
          retry: true
        };
        
      case 500:
      case 502:
      case 503:
        return {
          code: ErrorCode.SERVER_ERROR,
          message: '服务器错误，请稍后再试',
          timestamp: Date.now(),
          retry: true
        };
        
      default:
        return {
          code: ErrorCode.SERVER_ERROR,
          message: data.message || '未知错误',
          timestamp: Date.now(),
          retry: false
        };
    }
  }
  
  /**
   * 重试机制
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    context: string,
    retries: number = this.retryConfig.maxRetries
  ): Promise<T> {
    let lastError: ServiceError;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = await this.handle(error, context);
        
        if (!lastError.retry || i === retries - 1) {
          throw lastError;
        }
        
        // 指数退避
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, i),
          this.retryConfig.maxDelay
        );
        
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 🎯 优化策略

### 1. 请求合并

```typescript
// 合并多个小请求为一个批量请求
const taskIds = [1, 2, 3, 4, 5];
const tasks = await TaskDetailService.batchGet(taskIds);
```

### 2. 预加载

```typescript
// 预加载可能需要的数据
TaskDetailService.preloadRelatedTasks(taskId, relations);
```

### 3. 增量更新

```typescript
// 只更新变化的字段
const delta = diff(oldTask, newTask);
await TaskDetailService.patchTask(taskId, delta);
```

### 4. 压缩传输

```typescript
// 启用gzip压缩
api.defaults.headers['Accept-Encoding'] = 'gzip, deflate';
```

### 5. 字段过滤

```typescript
// 只请求需要的字段
const task = await TaskDetailService.getTask(projectId, taskId, {
  fields: ['id', 'title', 'status', 'priority']
});
```

## 📝 类型定义

### 核心类型

```typescript
// types/data.ts

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: number;
  parentId?: number;
  dueDate?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDetailResponse {
  task: Task;
  relations: TaskRelations;
  documents: PaginatedResponse<Document>;
  timeline: PaginatedResponse<TimelineEvent>;
  statistics: TaskStatistics;
  timestamp: number;
}

export interface TaskRelations {
  parent: Task | null;
  subtasks: Task[];
  siblings: Task[];
  graph?: RelationGraph;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BatchOperation {
  type: 'update' | 'delete' | 'archive';
  projectId: number;
  taskId: number;
  data?: any;
}

export interface TaskDetailOptions {
  forceRefresh?: boolean;
  includeRelations?: boolean;
  includeDocuments?: boolean;
  includeTimeline?: boolean;
  includeStatistics?: boolean;
}
```

## ✅ 验收标准

### 功能要求
- [ ] 所有API调用通过Service层
- [ ] 实现三层缓存机制
- [ ] 支持请求合并和批量操作
- [ ] 统一的错误处理和重试机制

### 性能要求
- [ ] API调用减少40%
- [ ] 缓存命中率达到60%以上
- [ ] 平均响应时间减少30%

### 代码质量
- [ ] 100% TypeScript类型覆盖
- [ ] Service层单元测试覆盖率90%
- [ ] 完整的错误处理测试

---

*文档创建时间: 2025-09-28*
*架构师: Claude Code Assistant*