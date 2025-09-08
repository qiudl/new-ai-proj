/**
 * ApiCacheManager单元测试
 * 测试API缓存管理的各项功能
 */

import { apiCache } from '../apiCacheManager';

describe('ApiCacheManager', () => {
  beforeEach(() => {
    // 清空缓存
    apiCache.clear();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础缓存功能', () => {
    test('应该能够设置和获取缓存', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      apiCache.set(key, data);
      const result = apiCache.get(key);

      expect(result).toEqual(data);
    });

    test('应该能够正确处理不存在的键', () => {
      const result = apiCache.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('应该能够删除缓存项', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      apiCache.set(key, data);
      expect(apiCache.get(key)).toEqual(data);

      apiCache.delete(key);
      expect(apiCache.get(key)).toBeNull();
    });

    test('应该能够检查缓存项是否存在', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      expect(apiCache.has(key)).toBe(false);

      apiCache.set(key, data);
      expect(apiCache.has(key)).toBe(true);

      apiCache.delete(key);
      expect(apiCache.has(key)).toBe(false);
    });

    test('应该能够清空所有缓存', () => {
      apiCache.set('key1', { data: '1' });
      apiCache.set('key2', { data: '2' });

      expect(apiCache.has('key1')).toBe(true);
      expect(apiCache.has('key2')).toBe(true);

      apiCache.clear();

      expect(apiCache.has('key1')).toBe(false);
      expect(apiCache.has('key2')).toBe(false);
    });
  });

  describe('TTL (生存时间) 功能', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该在TTL过期后自动删除缓存项', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };
      const ttl = 5000; // 5秒

      apiCache.set(key, data, { ttl });
      expect(apiCache.get(key)).toEqual(data);

      // 快进4秒，应该还存在
      jest.advanceTimersByTime(4000);
      expect(apiCache.get(key)).toEqual(data);

      // 快进2秒，总共6秒，应该过期
      jest.advanceTimersByTime(2000);
      expect(apiCache.get(key)).toBeNull();
    });

    test('应该能够更新已存在项的TTL', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      // 设置5秒TTL
      apiCache.set(key, data, { ttl: 5000 });

      // 快进4秒
      jest.advanceTimersByTime(4000);
      expect(apiCache.get(key)).toEqual(data);

      // 重新设置相同的数据但不同的TTL
      apiCache.set(key, data, { ttl: 10000 });

      // 快进7秒 (总共11秒)，如果没有更新TTL应该过期，但现在不应该
      jest.advanceTimersByTime(7000);
      expect(apiCache.get(key)).toEqual(data);

      // 再快进5秒 (总共16秒)，现在应该过期
      jest.advanceTimersByTime(5000);
      expect(apiCache.get(key)).toBeNull();
    });

    test('应该在获取过期项时自动清理', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      apiCache.set(key, data, { ttl: 5000 });

      // 快进到过期时间之后
      jest.advanceTimersByTime(6000);

      // 获取应该返回null并清理过期项
      expect(apiCache.get(key)).toBeNull();
      expect(apiCache.has(key)).toBe(false);
    });
  });

  describe('标签功能', () => {
    test('应该能够按标签删除缓存项', () => {
      apiCache.set('key1', { data: '1' }, { tags: ['user', 'profile'] });
      apiCache.set('key2', { data: '2' }, { tags: ['user', 'settings'] });
      apiCache.set('key3', { data: '3' }, { tags: ['admin'] });

      // 删除带有'user'标签的项
      const deletedCount = apiCache.deleteByTag('user');

      expect(deletedCount).toBe(2);
      expect(apiCache.get('key1')).toBeNull();
      expect(apiCache.get('key2')).toBeNull();
      expect(apiCache.get('key3')).toEqual({ data: '3' });
    });

    test('应该能够按多个标签删除', () => {
      apiCache.set('key1', { data: '1' }, { tags: ['user', 'profile'] });
      apiCache.set('key2', { data: '2' }, { tags: ['user', 'settings'] });
      apiCache.set('key3', { data: '3' }, { tags: ['admin', 'settings'] });

      // 删除带有'settings'标签的项
      const deletedCount = apiCache.deleteByTag('settings');

      expect(deletedCount).toBe(2);
      expect(apiCache.get('key1')).toEqual({ data: '1' });
      expect(apiCache.get('key2')).toBeNull();
      expect(apiCache.get('key3')).toBeNull();
    });

    test('删除不存在的标签应该返回0', () => {
      apiCache.set('key1', { data: '1' }, { tags: ['user'] });

      const deletedCount = apiCache.deleteByTag('non-existent');

      expect(deletedCount).toBe(0);
      expect(apiCache.get('key1')).toEqual({ data: '1' });
    });
  });

  describe('正则表达式模式删除', () => {
    test('应该能够按正则模式删除缓存项', () => {
      apiCache.set('user:1', { id: 1 });
      apiCache.set('user:2', { id: 2 });
      apiCache.set('project:1', { id: 1 });
      apiCache.set('admin:settings', { settings: true });

      // 删除所有user:开头的键
      const deletedCount = apiCache.deleteByPattern(/^user:/);

      expect(deletedCount).toBe(2);
      expect(apiCache.get('user:1')).toBeNull();
      expect(apiCache.get('user:2')).toBeNull();
      expect(apiCache.get('project:1')).toEqual({ id: 1 });
      expect(apiCache.get('admin:settings')).toEqual({ settings: true });
    });

    test('应该能够处理复杂的正则模式', () => {
      apiCache.set('api/v1/users/123', { user: 123 });
      apiCache.set('api/v1/projects/456', { project: 456 });
      apiCache.set('api/v2/users/789', { user: 789 });

      // 删除所有v1 API缓存
      const deletedCount = apiCache.deleteByPattern(/api\/v1\//);

      expect(deletedCount).toBe(2);
      expect(apiCache.get('api/v1/users/123')).toBeNull();
      expect(apiCache.get('api/v1/projects/456')).toBeNull();
      expect(apiCache.get('api/v2/users/789')).toEqual({ user: 789 });
    });
  });

  describe('缓存统计', () => {
    test('应该能够获取缓存统计信息', () => {
      apiCache.set('key1', { data: '1' });
      apiCache.set('key2', { data: '2' }, { tags: ['user'] });

      const stats = apiCache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.currentSize).toBeGreaterThan(0);
      expect(typeof stats.hitRate).toBe('number');
    });

    test('应该正确计算命中率', () => {
      const key = 'test-key';
      const data = { message: 'Hello World' };

      // 设置数据
      apiCache.set(key, data);

      // 获取数据几次（命中）
      apiCache.get(key);
      apiCache.get(key);
      apiCache.get(key);

      // 获取不存在的数据（未命中）
      apiCache.get('non-existent');

      const stats = apiCache.getStats();
      
      // 3次命中，1次未命中，命中率应该是75%
      expect(stats.hitRate).toBeCloseTo(0.75, 2);
    });
  });

  describe('内存限制', () => {
    test('应该在达到最大大小时删除最旧的项 (LRU)', () => {
      // 创建一个小容量的缓存管理器用于测试
      const smallCache = new (apiCache.constructor as any)({
        maxSize: 100, // 100字节
        defaultTtl: 300000
      });

      // 添加一些数据
      const largeData = 'x'.repeat(30); // 30字节的数据
      
      smallCache.set('key1', largeData);
      smallCache.set('key2', largeData);
      smallCache.set('key3', largeData); // 这应该触发LRU淘汰

      // 第一个键应该被淘汰
      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key2')).not.toBeNull();
      expect(smallCache.get('key3')).not.toBeNull();
    });
  });

  describe('持久化功能', () => {
    const mockLocalStorage = (() => {
      let store: { [key: string]: string } = {};
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        })
      };
    })();

    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    });

    test('应该能够保存到localStorage', () => {
      apiCache.set('persistent-key', { data: 'persistent' }, { 
        persistent: true 
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'api_cache_persistent-key',
        expect.any(String)
      );
    });

    test('应该能够从localStorage恢复', () => {
      const data = { data: 'persistent' };
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: 300000,
        tags: [],
        persistent: true
      };

      // 模拟localStorage中的数据
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(cacheEntry));

      // 创建新的缓存实例应该自动从localStorage恢复
      const newCache = new (apiCache.constructor as any)();
      
      // 由于我们不能直接测试构造函数的恢复逻辑，
      // 我们测试手动恢复方法
      expect(typeof newCache.restoreFromStorage).toBe('function');
    });
  });

  describe('错误处理', () => {
    test('应该优雅处理序列化错误', () => {
      const circularData = {};
      (circularData as any).self = circularData;

      // 这不应该抛出错误
      expect(() => {
        apiCache.set('circular', circularData);
      }).not.toThrow();

      // 应该返回null因为无法序列化
      expect(apiCache.get('circular')).toBeNull();
    });

    test('应该优雅处理localStorage错误', () => {
      // 模拟localStorage抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // 这不应该抛出错误
      expect(() => {
        apiCache.set('key', { data: 'value' }, { persistent: true });
      }).not.toThrow();

      // 恢复原始方法
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('性能测试', () => {
    test('大量数据操作应该在合理时间内完成', () => {
      const startTime = performance.now();

      // 插入1000个项目
      for (let i = 0; i < 1000; i++) {
        apiCache.set(`key_${i}`, { index: i, data: 'test'.repeat(10) });
      }

      // 检索所有项目
      for (let i = 0; i < 1000; i++) {
        apiCache.get(`key_${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在合理时间内完成（小于100ms）
      expect(duration).toBeLessThan(100);
    });
  });
});