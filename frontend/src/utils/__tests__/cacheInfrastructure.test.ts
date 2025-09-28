/**
 * 缓存基础架构测试套件
 * 测试缓存键构建器、依赖管理器、增强缓存管理器和事件系统
 */

import { CacheKeyBuilder } from '../cacheKeyBuilder';
import { CacheDependencyManager } from '../cacheDependencyManager';
import { EnhancedCacheManager } from '../enhancedCacheManager';
import { CacheEventSystem } from '../cacheEventSystem';

describe('Cache Infrastructure Tests', () => {
  describe('CacheKeyBuilder', () => {
    test('should build task cache keys correctly', () => {
      const taskKey = CacheKeyBuilder.task(1, 100);
      expect(taskKey).toBe('task:1:100');
    });

    test('should build task children keys with params', () => {
      const childrenKey = CacheKeyBuilder.taskChildren(1, 100, { page: 1, limit: 20 });
      expect(childrenKey).toMatch(/^task_children:1:100:[a-zA-Z0-9]+$/);
    });

    test('should build user timer keys', () => {
      const timerKey = CacheKeyBuilder.currentTimer(1);
      expect(timerKey).toBe('timer_current:1');
    });

    test('should create dependency patterns', () => {
      const patterns = CacheKeyBuilder.buildDependencyPattern('task', 100, 1);
      expect(patterns).toContain('task:1:100');
      expect(patterns).toContain('task_children:1:100');
    });

    test('should parse cache keys correctly', () => {
      const parsed = CacheKeyBuilder.parseKey('task:1:100');
      expect(parsed.domain).toBe('task');
      expect(parsed.entity).toBe('1');
      expect(parsed.ids).toEqual(['100']);
    });
  });

  describe('CacheDependencyManager', () => {
    let manager: CacheDependencyManager;

    beforeEach(() => {
      manager = new CacheDependencyManager();
    });

    test('should register task dependencies correctly', () => {
      manager.registerTaskDependencies(1, 100);
      
      const taskKey = CacheKeyBuilder.task(1, 100);
      const dependencies = manager.getDependencies(taskKey);
      
      expect(dependencies.length).toBeGreaterThan(0);
      expect(dependencies).toContain(CacheKeyBuilder.taskStats(1, 100));
    });

    test('should calculate invalidation chain', () => {
      manager.registerTaskDependencies(1, 100);
      
      const taskKey = CacheKeyBuilder.task(1, 100);
      const chain = manager.calculateInvalidationChain(taskKey);
      
      expect(chain).toContain(taskKey);
      expect(chain.length).toBeGreaterThan(1);
    });

    test('should handle smart invalidation', () => {
      const keys = manager.getSmartInvalidationKeys('create', 'task', 100, 1);
      
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).toContain(CacheKeyBuilder.taskList(1));
    });

    test('should track reverse dependencies', () => {
      manager.registerTaskDependencies(1, 100);
      
      const taskStatsKey = CacheKeyBuilder.taskStats(1, 100);
      const dependents = manager.getDependents(taskStatsKey);
      
      expect(dependents.length).toBeGreaterThan(0);
    });
  });

  describe('EnhancedCacheManager', () => {
    let cacheManager: EnhancedCacheManager;
    let dependencyManager: CacheDependencyManager;

    beforeEach(() => {
      dependencyManager = new CacheDependencyManager();
      cacheManager = new EnhancedCacheManager(dependencyManager);
    });

    test('should set and get task data', async () => {
      const taskData = { id: 100, title: 'Test Task' };
      
      await cacheManager.setTask(1, 100, taskData, { registerDependencies: true });
      const retrieved = await cacheManager.getTask(1, 100);
      
      expect(retrieved).toEqual(taskData);
    });

    test('should set and get task children', async () => {
      const childrenData = [{ id: 101, parent_id: 100 }];
      
      await cacheManager.setTaskChildren(1, 100, childrenData, { page: 1 });
      const retrieved = await cacheManager.getTaskChildren(1, 100, { page: 1 });
      
      expect(retrieved).toEqual(childrenData);
    });

    test('should invalidate task cache correctly', async () => {
      const taskData = { id: 100, title: 'Test Task' };
      await cacheManager.setTask(1, 100, taskData, { registerDependencies: true });
      
      const event = await cacheManager.invalidateTask(1, 100);
      
      expect(event.triggerKey).toBe(CacheKeyBuilder.task(1, 100));
      expect(event.invalidatedKeys.length).toBeGreaterThan(0);
    });

    test('should handle tagged cache invalidation', async () => {
      await cacheManager.set('test:key:1', { data: 'test1' }, { tags: ['project:1', 'user:100'] });
      await cacheManager.set('test:key:2', { data: 'test2' }, { tags: ['project:1'] });
      
      const invalidatedKeys = await cacheManager.invalidateByTags(['project:1']);
      
      expect(invalidatedKeys).toContain('test:key:1');
      expect(invalidatedKeys).toContain('test:key:2');
    });

    test('should provide cache statistics', () => {
      const stats = cacheManager.getStats();
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('memoryUsageMB');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('dependencyStats');
    });
  });

  describe('CacheEventSystem', () => {
    let eventSystem: CacheEventSystem;

    beforeEach(() => {
      eventSystem = new CacheEventSystem();
    });

    test('should emit and handle cache events', (done) => {
      const testKey = 'test:key';
      
      const unsubscribe = eventSystem.on('get', (event) => {
        expect(event.key).toBe(testKey);
        expect(event.type).toBe('get');
        unsubscribe();
        done();
      });
      
      eventSystem.emitGet(testKey, true, 10);
    });

    test('should track performance metrics', () => {
      eventSystem.emitGet('key1', true, 5);
      eventSystem.emitGet('key2', false, 15);
      eventSystem.emitGet('key1', true, 8);
      
      const metrics = eventSystem.getPerformanceMetrics();
      
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(66.66666666666666);
      expect(metrics.avgResponseTime).toBe((5 + 15 + 8) / 3);
    });

    test('should detect hot keys', () => {
      // 模拟多次访问同一键
      for (let i = 0; i < 10; i++) {
        eventSystem.emitGet('hot:key', true, 5);
      }
      for (let i = 0; i < 5; i++) {
        eventSystem.emitGet('warm:key', true, 5);
      }
      
      const metrics = eventSystem.getPerformanceMetrics();
      
      expect(metrics.hotKeys[0].key).toBe('hot:key');
      expect(metrics.hotKeys[0].accessCount).toBe(10);
    });

    test('should detect anomalies', () => {
      // 模拟高未命中率
      for (let i = 0; i < 10; i++) {
        eventSystem.emitGet(`key${i}`, false, 5);
      }
      
      const anomalies = eventSystem.detectAnomalies();
      
      expect(anomalies.highMissRate).toBe(true);
    });

    test('should handle real-time statistics', () => {
      eventSystem.emitGet('recent:key', true, 5);
      eventSystem.emitSet('recent:key', 100, 300000);
      
      const realtimeStats = eventSystem.getRealTimeStats(60000);
      
      expect(realtimeStats.recentOperations).toBeGreaterThan(0);
      expect(realtimeStats.activeKeys.has('recent:key')).toBe(true);
    });

    test('should limit event history size', () => {
      eventSystem.setMaxHistorySize(5);
      
      // 添加10个事件
      for (let i = 0; i < 10; i++) {
        eventSystem.emitGet(`key${i}`, true, 5);
      }
      
      const history = eventSystem.getEventHistory();
      expect(history.length).toBe(5);
    });
  });

  describe('Integration Tests', () => {
    let cacheManager: EnhancedCacheManager;
    let eventSystem: CacheEventSystem;
    let dependencyManager: CacheDependencyManager;

    beforeEach(() => {
      dependencyManager = new CacheDependencyManager();
      cacheManager = new EnhancedCacheManager(dependencyManager);
      eventSystem = new CacheEventSystem();
    });

    test('should handle complete task workflow', async () => {
      // 设置事件监听
      const events: any[] = [];
      const unsubscribe = eventSystem.onAll((event) => {
        events.push(event);
      });

      try {
        // 模拟完整的任务缓存工作流
        const taskData = { id: 100, title: 'Integration Test Task' };
        const childrenData = [{ id: 101, parent_id: 100 }];

        // 设置任务数据
        await cacheManager.setTask(1, 100, taskData, { 
          registerDependencies: true,
          tags: ['project:1', 'user:1']
        });

        // 设置子任务数据
        await cacheManager.setTaskChildren(1, 100, childrenData);

        // 获取数据（应该命中缓存）
        const retrievedTask = await cacheManager.getTask(1, 100);
        const retrievedChildren = await cacheManager.getTaskChildren(1, 100);

        // 验证数据正确性
        expect(retrievedTask).toEqual(taskData);
        expect(retrievedChildren).toEqual(childrenData);

        // 失效缓存
        await cacheManager.invalidateTask(1, 100, 'update');

        // 验证缓存已失效
        const afterInvalidation = await cacheManager.getTask(1, 100);
        expect(afterInvalidation).toBeNull();

      } finally {
        unsubscribe();
      }
    });

    test('should handle cascade invalidation correctly', async () => {
      // 注册依赖关系
      dependencyManager.registerTaskDependencies(1, 100);
      
      // 设置相关缓存
      await cacheManager.setTask(1, 100, { id: 100 });
      await cacheManager.setTaskStats(1, 100, { completed: 0 });
      await cacheManager.setTaskChildren(1, 100, []);

      // 触发级联失效
      const event = await cacheManager.invalidateTask(1, 100, 'update');

      // 验证多个相关缓存都被失效
      expect(event.invalidatedKeys.length).toBeGreaterThan(1);
      
      const taskAfter = await cacheManager.getTask(1, 100);
      const statsAfter = await cacheManager.getTaskStats(1, 100);
      
      expect(taskAfter).toBeNull();
      expect(statsAfter).toBeNull();
    });
  });
});

// 测试工具函数
export const CacheTestUtils = {
  /**
   * 创建测试用的缓存管理器
   */
  createTestCacheManager(): EnhancedCacheManager {
    const dependencyManager = new CacheDependencyManager();
    return new EnhancedCacheManager(dependencyManager);
  },

  /**
   * 模拟缓存负载
   */
  async simulateCacheLoad(cacheManager: EnhancedCacheManager, itemCount: number): Promise<void> {
    for (let i = 0; i < itemCount; i++) {
      await cacheManager.setTask(1, i, { id: i, title: `Task ${i}` });
    }
  },

  /**
   * 验证缓存一致性
   */
  async verifyCacheConsistency(cacheManager: EnhancedCacheManager, projectId: number, taskId: number): Promise<boolean> {
    const task = await cacheManager.getTask(projectId, taskId);
    const stats = await cacheManager.getTaskStats(projectId, taskId);
    
    // 如果任务存在，统计信息也应该存在
    if (task && !stats) {
      return false;
    }
    
    return true;
  }
};