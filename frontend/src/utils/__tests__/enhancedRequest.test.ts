/**
 * EnhancedRequest单元测试
 * 测试增强的HTTP请求功能、拦截器、错误处理等
 */

import { enhancedRequest, createModuleRequest } from '../enhancedRequest';
import { APIResponse } from '../../types/api';

// Mock environment detection
jest.mock('../environmentDetection', () => ({
  getEnvironmentConfig: jest.fn(() => ({
    apiBaseURL: 'http://localhost:3000/api/v1'
  }))
}));

describe('EnhancedRequest', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockResponse: Partial<Response>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();

    // Mock console methods
    consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock environment
    process.env.NODE_ENV = 'test';
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000/api/v1';

    // Default mock response
    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'success' }
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.NODE_ENV;
    delete process.env.REACT_APP_API_BASE_URL;
  });

  describe('基础HTTP方法', () => {
    test('应该能够执行GET请求', async () => {
      const mockData = { id: 1, name: 'test' };
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        data: mockData
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          signal: expect.any(AbortSignal)
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, data: mockData });
    });

    test('应该能够执行POST请求', async () => {
      const postData = { name: 'new item' };
      const responseData = { id: 1, ...postData };
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        data: responseData
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.post('/items', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.success).toBe(true);
    });

    test('应该能够执行PUT请求', async () => {
      const putData = { id: 1, name: 'updated item' };
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        data: putData
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.put('/items/1', putData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData)
        })
      );
      expect(result.success).toBe(true);
    });

    test('应该能够执行PATCH请求', async () => {
      const patchData = { name: 'patched item' };
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        data: patchData
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.patch('/items/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData)
        })
      );
      expect(result.success).toBe(true);
    });

    test('应该能够执行DELETE请求', async () => {
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        message: 'deleted'
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.delete('/items/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/items/1',
        expect.objectContaining({
          method: 'DELETE',
          body: undefined
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('请求拦截器', () => {
    test('应该自动添加Authorization头部', async () => {
      const mockToken = 'test-token-123';
      (localStorage.getItem as jest.Mock).mockReturnValue(mockToken);
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
    });

    test('应该在开发环境添加调试头部', async () => {
      process.env.NODE_ENV = 'development';
      const mockToken = 'test-token-123';
      (localStorage.getItem as jest.Mock).mockReturnValue(mockToken);
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/test', { debugModule: 'TestModule' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Debug-Module': 'TestModule',
            'X-Debug-Timestamp': expect.any(String)
          })
        })
      );
    });

    test('应该合并自定义头部', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/test', {
        headers: {
          'Custom-Header': 'custom-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Custom-Header': 'custom-value'
          })
        })
      );
    });

    test('应该记录调试信息', async () => {
      process.env.NODE_ENV = 'development';
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/test', { debugModule: 'TestModule' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] Making API request to /test')
      );
    });
  });

  describe('响应拦截器', () => {
    test('应该正确处理成功响应', async () => {
      const mockData = { id: 1, name: 'test' };
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
        message: 'Operation successful'
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.get('/test');

      expect(result).toEqual({
        success: true,
        data: {
          success: true,
          data: mockData,
          message: 'Operation successful'
        },
        message: 'Operation successful'
      });
    });

    test('应该处理401错误并清除token', async () => {
      mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({
          message: 'Token expired'
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      // Mock window.location
      const mockLocationAssign = jest.fn();
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/dashboard',
          href: '',
        },
        writable: true
      });

      const result = await enhancedRequest.get('/test', { debugModule: 'TestModule' });

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 [TestModule] JWT认证失败 - 状态码401')
      );
      expect(result.success).toBe(false);
      expect(result.message).toBe('Token expired');
    });

    test('应该处理网络错误', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await enhancedRequest.get('/test');

      expect(result).toEqual({
        success: false,
        message: 'Network error',
        code: 'NETWORK_ERROR'
      });
    });

    test('应该处理超时错误', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse as Response), 15000);
        })
      );

      const requestPromise = enhancedRequest.get('/test', { timeout: 5000 });
      
      jest.advanceTimersByTime(6000);
      
      const result = await requestPromise;

      expect(result).toEqual({
        success: false,
        message: '请求超时',
        code: 'TIMEOUT'
      });

      jest.useRealTimers();
    });

    test('应该处理JSON解析错误', async () => {
      mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.get('/test');

      expect(result).toEqual({
        success: false,
        message: '响应数据格式错误',
        code: 'PARSE_ERROR'
      });
    });

    test('应该处理其他HTTP错误状态', async () => {
      mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('No JSON'))
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.get('/test');

      expect(result).toEqual({
        success: false,
        message: 'HTTP 500: Internal Server Error',
        code: '500'
      });
    });
  });

  describe('模块请求创建器', () => {
    test('应该为特定模块创建请求实例', async () => {
      process.env.NODE_ENV = 'development';
      const moduleRequest = createModuleRequest('UserModule');
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await moduleRequest.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Debug-Module': 'UserModule'
          })
        })
      );
    });

    test('模块请求应该支持所有HTTP方法', async () => {
      const moduleRequest = createModuleRequest('TaskModule');
      mockFetch.mockResolvedValue(mockResponse as Response);

      await moduleRequest.get('/tasks');
      await moduleRequest.post('/tasks', { title: 'New Task' });
      await moduleRequest.put('/tasks/1', { title: 'Updated Task' });
      await moduleRequest.patch('/tasks/1', { status: 'completed' });
      await moduleRequest.delete('/tasks/1');

      expect(mockFetch).toHaveBeenCalledTimes(5);
      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.any(String), 
        expect.objectContaining({ method: 'GET' }));
      expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String), 
        expect.objectContaining({ method: 'POST' }));
      expect(mockFetch).toHaveBeenNthCalledWith(3, expect.any(String), 
        expect.objectContaining({ method: 'PUT' }));
      expect(mockFetch).toHaveBeenNthCalledWith(4, expect.any(String), 
        expect.objectContaining({ method: 'PATCH' }));
      expect(mockFetch).toHaveBeenNthCalledWith(5, expect.any(String), 
        expect.objectContaining({ method: 'DELETE' }));
    });
  });

  describe('自定义选项', () => {
    test('应该支持跳过JWT调试', async () => {
      process.env.NODE_ENV = 'development';
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/test', { 
        debugModule: 'TestModule',
        skipJWTDebug: true 
      });

      // 应该不记录JWT调试信息
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] Making API request')
      );
    });

    test('应该支持自定义超时', async () => {
      jest.useFakeTimers();
      
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve(mockResponse as Response), 3000);
        })
      );

      const requestPromise = enhancedRequest.get('/test', { timeout: 2000 });
      
      jest.advanceTimersByTime(2500);
      
      const result = await requestPromise;

      expect(result.code).toBe('TIMEOUT');

      jest.useRealTimers();
    });

    test('应该使用环境配置的基础URL', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/test',
        expect.any(Object)
      );
    });
  });

  describe('错误记录', () => {
    test('应该在开发环境记录请求错误', async () => {
      process.env.NODE_ENV = 'development';
      const networkError = new Error('Connection failed');
      mockFetch.mockRejectedValueOnce(networkError);

      await enhancedRequest.get('/test', { debugModule: 'TestModule' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ [TestModule] 请求失败:'),
        networkError
      );
    });

    test('应该记录401认证失败', async () => {
      process.env.NODE_ENV = 'development';
      mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ message: 'Invalid token' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await enhancedRequest.get('/test', { debugModule: 'AuthModule' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 [AuthModule] JWT认证失败 - 状态码401')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AuthModule_AUTH_FAILED] Token cleared due to 401 error')
      );
    });
  });

  describe('TypeScript类型支持', () => {
    test('应该支持泛型返回类型', async () => {
      interface User {
        id: number;
        name: string;
      }

      const mockUser: User = { id: 1, name: 'John' };
      mockResponse.json = jest.fn().mockResolvedValue({
        success: true,
        data: mockUser
      });
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await enhancedRequest.get<User>('/users/1');

      expect(result.success).toBe(true);
      // TypeScript应该能正确推断类型
      if (result.success && result.data) {
        expect(result.data).toEqual({
          success: true,
          data: mockUser
        });
      }
    });
  });
});