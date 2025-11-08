/**
 * ConcurrentRequestManager单元测试
 * 测试并发请求管理、去重和队列功能
 */

import { concurrentRequest, ConcurrentRequestManager } from '../concurrentRequestManager';

describe('ConcurrentRequestManager', () => {
  let mockRequestFn: jest.MockedFunction<any>;
  let manager: ConcurrentRequestManager;

  beforeEach(() => {
    mockRequestFn = jest.fn();
    manager = new ConcurrentRequestManager({
      maxConcurrent: 2,
      deduplicationTtl: 1000,
      queueTimeout: 5000
    });
  });

  afterEach(() => {
    manager.cancelAllRequests();
    jest.clearAllMocks();
  });

  describe('基础请求功能', () => {
    test('应该能够执行简单请求', async () => {
      const mockData = { id: 1, name: 'test' };
      mockRequestFn.mockResolvedValueOnce(mockData);

      const result = await manager.request(
        mockRequestFn,
        { url: '/api/test', method: 'GET' }
      );

      expect(result).toEqual(mockData);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    test('应该正确传递请求配置', async () => {
      const config = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'John' },
        headers: { 'Content-Type': 'application/json' }
      };

      mockRequestFn.mockResolvedValueOnce({ success: true });

      await manager.request(mockRequestFn, config);

      expect(mockRequestFn).toHaveBeenCalledWith(
        expect.objectContaining({
          ...config,
          signal: expect.any(AbortSignal)
        })
      );
    });
  });

  describe('请求去重功能', () => {
    test('应该去重相同的并发请求', async () => {
      const mockData = { id: 1, name: 'test' };
      mockRequestFn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockData), 100))
      );

      const config = { url: '/api/test', method: 'GET' };

      // 同时发起3个相同请求
      const promises = [
        manager.request(mockRequestFn, config),
        manager.request(mockRequestFn, config),
        manager.request(mockRequestFn, config)
      ];

      const results = await Promise.all(promises);

      // 所有结果应该相同
      expect(results).toEqual([mockData, mockData, mockData]);
      
      // 但实际只应该调用一次
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    test('应该区分不同的请求', async () => {
      mockRequestFn
        .mockResolvedValueOnce({ data: 'user1' })
        .mockResolvedValueOnce({ data: 'user2' });

      const config1 = { url: '/api/users/1', method: 'GET' };
      const config2 = { url: '/api/users/2', method: 'GET' };

      const [result1, result2] = await Promise.all([
        manager.request(mockRequestFn, config1),
        manager.request(mockRequestFn, config2)
      ]);

      expect(result1).toEqual({ data: 'user1' });
      expect(result2).toEqual({ data: 'user2' });
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    test('应该区分不同HTTP方法的请求', async () => {
      mockRequestFn
        .mockResolvedValueOnce({ data: 'get' })
        .mockResolvedValueOnce({ data: 'post' });

      const getConfig = { url: '/api/data', method: 'GET' };
      const postConfig = { url: '/api/data', method: 'POST' };

      const [getResult, postResult] = await Promise.all([
        manager.request(mockRequestFn, getConfig),
        manager.request(mockRequestFn, postConfig)
      ]);

      expect(getResult).toEqual({ data: 'get' });
      expect(postResult).toEqual({ data: 'post' });
      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('并发限制和队列', () => {
    test('应该限制并发请求数量', async () => {
      let concurrentCount = 0;
      let maxConcurrentReached = 0;

      mockRequestFn.mockImplementation(() => {
        concurrentCount++;
        maxConcurrentReached = Math.max(maxConcurrentReached, concurrentCount);
        
        return new Promise(resolve => {
          setTimeout(() => {
            concurrentCount--;
            resolve({ data: 'success' });
          }, 50);
        });
      });

      // 启动5个请求，但并发限制是2
      const requests = Array.from({ length: 5 }, (_, i) =>
        manager.request(mockRequestFn, { url: `/api/test/${i}`, method: 'GET' })
      );

      await Promise.all(requests);

      // 最大并发数不应超过设置的限制
      expect(maxConcurrentReached).toBeLessThanOrEqual(2);
      expect(mockRequestFn).toHaveBeenCalledTimes(5);
    });

    test('应该按优先级处理队列中的请求', async () => {
      const executionOrder: number[] = [];

      mockRequestFn.mockImplementation((config: any) => {
        const priority = config.priority || 5;
        executionOrder.push(priority);
        return Promise.resolve({ priority });
      });

      // 先启动2个请求占满并发槽位
      const longRunningPromises = [
        manager.request(() => new Promise(resolve => setTimeout(resolve, 200)), 
          { url: '/slow1', method: 'GET' }),
        manager.request(() => new Promise(resolve => setTimeout(resolve, 200)), 
          { url: '/slow2', method: 'GET' })
      ];

      // 稍等一下确保并发槽位被占满
      await new Promise(resolve => setTimeout(resolve, 10));

      // 添加不同优先级的请求到队列
      const queuedPromises = [
        manager.request(mockRequestFn, { url: '/low', method: 'GET' }, 1),
        manager.request(mockRequestFn, { url: '/high', method: 'GET' }, 10),
        manager.request(mockRequestFn, { url: '/medium', method: 'GET' }, 5)
      ];

      await Promise.all([...longRunningPromises, ...queuedPromises]);

      // 验证执行顺序：高优先级应该先执行
      expect(executionOrder).toEqual([10, 5, 1]);
    });
  });

  describe('请求取消', () => {
    test('应该能够取消特定请求', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      };

      // Mock AbortController
      global.AbortController = jest.fn(() => mockAbortController) as any;

      const longRunningRequest = new Promise((resolve, reject) => {
        setTimeout(() => {
          if (mockAbortController.signal.aborted) {
            reject(new Error('Aborted'));
          } else {
            resolve({ data: 'success' });
          }
        }, 1000);
      });

      mockRequestFn.mockReturnValueOnce(longRunningRequest);

      const requestPromise = manager.request(
        mockRequestFn,
        { url: '/api/slow', method: 'GET' }
      );

      // 等待一小段时间然后取消
      setTimeout(() => {
        manager.cancelRequest('/api/slow', 'GET');
      }, 50);

      await expect(requestPromise).rejects.toThrow();
      expect(abortSpy).toHaveBeenCalled();
    });

    test('应该能够取消所有请求', () => {
      // 启动一些请求
      manager.request(mockRequestFn, { url: '/api/test1', method: 'GET' });
      manager.request(mockRequestFn, { url: '/api/test2', method: 'GET' });

      const statusBefore = manager.getStatus();
      expect(statusBefore.currentConcurrent).toBeGreaterThan(0);

      manager.cancelAllRequests();

      const statusAfter = manager.getStatus();
      expect(statusAfter.currentConcurrent).toBe(0);
      expect(statusAfter.queueLength).toBe(0);
    });
  });

  describe('批量请求', () => {
    test('应该能够处理批量请求', async () => {
      const configs = [
        { url: '/api/user/1', method: 'GET' },
        { url: '/api/user/2', method: 'GET' },
        { url: '/api/user/3', method: 'GET' }
      ];

      const mockBatchFn = jest.fn().mockResolvedValue([
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' }
      ]);

      const results = await manager.batchRequest(mockBatchFn, configs);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: 1, name: 'User 1' });
      expect(mockBatchFn).toHaveBeenCalledWith(configs);
    });

    test('批量请求失败时应该拒绝所有Promise', async () => {
      const configs = [
        { url: '/api/user/1', method: 'GET' },
        { url: '/api/user/2', method: 'GET' }
      ];

      const mockBatchFn = jest.fn().mockRejectedValue(new Error('Batch failed'));

      await expect(manager.batchRequest(mockBatchFn, configs))
        .rejects.toThrow('Batch failed');
    });
  });

  describe('状态监控', () => {
    test('应该提供准确的状态信息', () => {
      const status = manager.getStatus();

      expect(status).toHaveProperty('currentConcurrent');
      expect(status).toHaveProperty('maxConcurrent');
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('pendingRequests');

      expect(typeof status.currentConcurrent).toBe('number');
      expect(typeof status.maxConcurrent).toBe('number');
      expect(typeof status.queueLength).toBe('number');
      expect(Array.isArray(status.pendingRequests)).toBe(true);
    });

    test('状态应该反映实际的请求情况', async () => {
      // 启动一个长时间运行的请求
      const longRunningPromise = manager.request(
        () => new Promise(resolve => setTimeout(() => resolve({ data: 'done' }), 100)),
        { url: '/api/slow', method: 'GET' }
      );

      // 检查状态
      const statusDuringRequest = manager.getStatus();
      expect(statusDuringRequest.currentConcurrent).toBe(1);

      await longRunningPromise;

      // 请求完成后状态应该更新
      const statusAfterRequest = manager.getStatus();
      expect(statusAfterRequest.currentConcurrent).toBe(0);
    });
  });

  describe('错误处理', () => {
    test('应该正确传播请求错误', async () => {
      const error = new Error('Request failed');
      mockRequestFn.mockRejectedValueOnce(error);

      await expect(manager.request(
        mockRequestFn,
        { url: '/api/test', method: 'GET' }
      )).rejects.toThrow('Request failed');
    });

    test('一个请求失败不应该影响其他请求', async () => {
      mockRequestFn
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce({ data: 'second success' });

      const [firstResult, secondResult] = await Promise.allSettled([
        manager.request(mockRequestFn, { url: '/api/fail', method: 'GET' }),
        manager.request(mockRequestFn, { url: '/api/success', method: 'GET' })
      ]);

      expect(firstResult.status).toBe('rejected');
      expect(secondResult.status).toBe('fulfilled');
      if (secondResult.status === 'fulfilled') {
        expect(secondResult.value).toEqual({ data: 'second success' });
      }
    });
  });

  describe('超时处理', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该清理过期的挂起请求', () => {
      manager = new ConcurrentRequestManager({
        maxConcurrent: 2,
        deduplicationTtl: 1000
      });

      // 启动一个请求
      manager.request(
        () => new Promise(() => {}), // 永远不解决的Promise
        { url: '/api/test', method: 'GET' }
      );

      const statusBefore = manager.getStatus();
      expect(statusBefore.currentConcurrent).toBe(1);

      // 快进超过去重TTL时间
      jest.advanceTimersByTime(2000);

      // 手动触发清理
      manager.cleanup();

      const statusAfter = manager.getStatus();
      expect(statusAfter.currentConcurrent).toBe(0);
    });

    test('应该清理超时的队列请求', () => {
      manager = new ConcurrentRequestManager({
        maxConcurrent: 1,
        queueTimeout: 1000
      });

      // 占满并发槽位
      manager.request(
        () => new Promise(() => {}),
        { url: '/api/slow', method: 'GET' }
      );

      // 添加到队列
      manager.request(
        mockRequestFn,
        { url: '/api/queued', method: 'GET' }
      );

      let status = manager.getStatus();
      expect(status.queueLength).toBe(1);

      // 快进超过队列超时时间
      jest.advanceTimersByTime(2000);

      // 手动触发清理
      manager.cleanup();

      status = manager.getStatus();
      expect(status.queueLength).toBe(0);
    });
  });

  describe('默认实例测试', () => {
    test('默认导出的concurrentRequest应该能工作', async () => {
      const mockData = { test: 'data' };
      const mockFn = jest.fn().mockResolvedValue(mockData);

      const result = await concurrentRequest.request(
        mockFn,
        { url: '/api/test', method: 'GET' }
      );

      expect(result).toEqual(mockData);
      expect(mockFn).toHaveBeenCalled();
    });

    test('应该能够获取默认实例的状态', () => {
      const status = concurrentRequest.getStatus();

      expect(status).toHaveProperty('currentConcurrent');
      expect(status).toHaveProperty('maxConcurrent');
      expect(typeof status.currentConcurrent).toBe('number');
    });
  });

  describe('性能测试', () => {
    test('大量请求应该高效处理', async () => {
      const startTime = performance.now();
      const requestCount = 100;

      mockRequestFn.mockImplementation((config: any) => 
        Promise.resolve({ url: config.url })
      );

      // 创建大量请求
      const requests = Array.from({ length: requestCount }, (_, i) =>
        manager.request(mockRequestFn, { url: `/api/test/${i}`, method: 'GET' })
      );

      await Promise.all(requests);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在合理时间内完成（小于500ms）
      expect(duration).toBeLessThan(500);
      expect(mockRequestFn).toHaveBeenCalledTimes(requestCount);
    });
  });
});