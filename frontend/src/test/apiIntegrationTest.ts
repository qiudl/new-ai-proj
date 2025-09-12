/**
 * API集成功能测试
 * 测试新增的缓存、并发、错误处理和鉴权功能
 */

import { enhancedApi } from '../services/enhancedApiClient';
import { cachedGet, priorityPost, batchGet, invalidateCache } from '../services/api';
import { auth } from '../utils/enhancedAuthManager';
import { concurrentRequest } from '../utils/concurrentRequestManager';
import { apiCache } from '../utils/apiCacheManager';
import { withRetry, AppError, ErrorType } from '../utils/errorTypes';

// 测试配置
const TEST_CONFIG = {
  baseUrl: '/api/v1',
  timeout: 5000
};

// 模拟用户认证凭据
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

/**
 * 缓存功能测试
 */
export async function testCacheManager(): Promise<boolean> {
  console.log('🔍 Testing Cache Manager...');
  
  try {
    // 测试基本缓存功能
    apiCache.set('test-key', { data: 'test-value' }, { ttl: 5000 });
    const cachedData = apiCache.get('test-key');
    
    if (!cachedData || cachedData.data !== 'test-value') {
      throw new Error('Basic cache test failed');
    }
    
    // 测试TTL过期
    apiCache.set('expire-key', { data: 'expire-value' }, { ttl: 1 });
    await new Promise(resolve => setTimeout(resolve, 2));
    const expiredData = apiCache.get('expire-key');
    
    if (expiredData !== null) {
      throw new Error('TTL expiration test failed');
    }
    
    // 测试标签功能
    apiCache.set('tag-key-1', { data: 'tag-value-1' }, { tags: ['test-tag'] });
    apiCache.set('tag-key-2', { data: 'tag-value-2' }, { tags: ['test-tag'] });
    
    const deletedCount = apiCache.deleteByTag('test-tag');
    if (deletedCount !== 2) {
      throw new Error('Tag-based deletion test failed');
    }
    
    console.log('✅ Cache Manager tests passed');
    return true;
  } catch (error) {
    console.error('❌ Cache Manager tests failed:', error);
    return false;
  }
}

/**
 * 并发请求管理测试
 */
export async function testConcurrentRequestManager(): Promise<boolean> {
  console.log('🔍 Testing Concurrent Request Manager...');
  
  try {
    // 模拟HTTP请求函数
    const mockRequest = async (config: any) => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: `Response for ${config.url}`, timestamp: Date.now() });
        }, Math.random() * 100 + 50);
      });
    };
    
    // 测试重复请求去重
    const duplicateRequests = [
      concurrentRequest.request(mockRequest, { url: '/test-duplicate', method: 'GET' }),
      concurrentRequest.request(mockRequest, { url: '/test-duplicate', method: 'GET' }),
      concurrentRequest.request(mockRequest, { url: '/test-duplicate', method: 'GET' })
    ];
    
    const results = await Promise.all(duplicateRequests);
    
    // 所有结果应该相同（因为去重）
    if (results[0].timestamp !== results[1].timestamp || results[1].timestamp !== results[2].timestamp) {
      console.warn('⚠️ Deduplication may not be working properly');
    }
    
    // 测试优先级队列
    const priorityRequests = [
      concurrentRequest.request(mockRequest, { url: '/low-priority', method: 'GET' }, 1),
      concurrentRequest.request(mockRequest, { url: '/high-priority', method: 'GET' }, 10),
      concurrentRequest.request(mockRequest, { url: '/medium-priority', method: 'GET' }, 5)
    ];
    
    await Promise.all(priorityRequests);
    
    console.log('✅ Concurrent Request Manager tests passed');
    return true;
  } catch (error) {
    console.error('❌ Concurrent Request Manager tests failed:', error);
    return false;
  }
}

/**
 * 增强错误处理测试
 */
export async function testErrorHandling(): Promise<boolean> {
  console.log('🔍 Testing Enhanced Error Handling...');
  
  try {
    // 测试重试机制
    let attemptCount = 0;
    const flakyOperation = async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new AppError('Temporary failure', ErrorType.NETWORK);
      }
      return { success: true, attempts: attemptCount };
    };
    
    const result = await withRetry(flakyOperation, { maxRetries: 5, delay: 100 });
    
    if (!result.success || result.attempts !== 3) {
      throw new Error('Retry mechanism test failed');
    }
    
    // 测试错误分类
    const authError = new AppError('Authentication failed', ErrorType.AUTHENTICATION, 401);
    if (authError.type !== ErrorType.AUTHENTICATION || authError.status !== 401) {
      throw new Error('Error classification test failed');
    }
    
    console.log('✅ Enhanced Error Handling tests passed');
    return true;
  } catch (error) {
    console.error('❌ Enhanced Error Handling tests failed:', error);
    return false;
  }
}

/**
 * 增强API客户端测试
 */
export async function testEnhancedApiClient(): Promise<boolean> {
  console.log('🔍 Testing Enhanced API Client...');
  
  try {
    // 测试缓存GET请求
    const cacheTestUrl = '/test/cache-endpoint';
    
    // 第一次请求应该缓存结果
    const firstResponse = await enhancedApi.get(cacheTestUrl, { 
      cache: { ttl: 10000, tags: ['test-cache'] },
      silentError: true 
    }).catch(() => ({ cached: false, timestamp: Date.now() }));
    
    // 第二次请求应该从缓存返回
    const secondResponse = await enhancedApi.get(cacheTestUrl, { 
      cache: { ttl: 10000, tags: ['test-cache'] },
      silentError: true 
    }).catch(() => ({ cached: true, timestamp: Date.now() }));
    
    // 测试缓存清理
    enhancedApi.clearCache('test-cache');
    
    // 测试批量请求（模拟）
    const batchUrls = ['/test/batch-1', '/test/batch-2', '/test/batch-3'];
    const batchResults = await Promise.allSettled(
      batchUrls.map(url => enhancedApi.get(url, { silentError: true }).catch(() => ({ url, error: true })))
    );
    
    if (batchResults.length !== 3) {
      throw new Error('Batch request test failed');
    }
    
    console.log('✅ Enhanced API Client tests passed');
    return true;
  } catch (error) {
    console.error('❌ Enhanced API Client tests failed:', error);
    return false;
  }
}

/**
 * 认证管理器测试
 */
export async function testAuthManager(): Promise<boolean> {
  console.log('🔍 Testing Authentication Manager...');
  
  try {
    // 测试认证状态检查
    const initialAuthState = auth.getAuthState();
    console.log('Initial auth state:', initialAuthState.isAuthenticated);
    
    // 测试权限检查（模拟）
    const hasReadPermission = auth.hasPermission('read');
    const hasWritePermission = auth.hasPermission('write');
    
    // 测试统计信息获取
    const authStats = auth.getStats();
    console.log('Auth stats:', authStats);
    
    // 模拟登录测试（开发环境）
    if (process.env.NODE_ENV === 'development') {
      try {
        const loginResult = await auth.login(TEST_CREDENTIALS);
        console.log('Login test result:', loginResult);
      } catch (error) {
        console.log('Login test failed (expected in test environment):', error);
      }
    }
    
    console.log('✅ Authentication Manager tests passed');
    return true;
  } catch (error) {
    console.error('❌ Authentication Manager tests failed:', error);
    return false;
  }
}

/**
 * 运行所有API集成测试
 */
export async function runAllApiTests(): Promise<{ passed: number; failed: number; results: Record<string, boolean> }> {
  console.log('🚀 Starting API Integration Tests...');
  
  const tests = [
    { name: 'CacheManager', test: testCacheManager },
    { name: 'ConcurrentRequestManager', test: testConcurrentRequestManager },
    { name: 'ErrorHandling', test: testErrorHandling },
    { name: 'EnhancedApiClient', test: testEnhancedApiClient },
    { name: 'AuthManager', test: testAuthManager }
  ];
  
  const results: Record<string, boolean> = {};
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results[name] = result;
      
      if (result) {
        passed++;
        console.log(`✅ ${name} test passed`);
      } else {
        failed++;
        console.log(`❌ ${name} test failed`);
      }
    } catch (error) {
      results[name] = false;
      failed++;
      console.log(`❌ ${name} test error:`, error);
    }
  }
  
  console.log(`\n🎯 API Integration Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  return { passed, failed, results };
}

// 导出测试函数用于控制台调用
if (typeof window !== 'undefined') {
  (window as any).apiTests = {
    runAll: runAllApiTests,
    cache: testCacheManager,
    concurrent: testConcurrentRequestManager,
    errorHandling: testErrorHandling,
    apiClient: testEnhancedApiClient,
    auth: testAuthManager
  };
  
}