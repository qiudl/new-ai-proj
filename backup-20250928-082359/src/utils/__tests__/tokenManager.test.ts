/**
 * TokenManager单元测试
 * 验证Token管理的各种功能和边界情况
 */

import { TokenManager } from '../tokenManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn(),
    length: 0
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to avoid noise in tests
console.error = jest.fn();
console.log = jest.fn();
console.warn = jest.fn();

describe('TokenManager', () => {
  const createMockJWT = (payload: any): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadEncoded = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    return `${header}.${payloadEncoded}.${signature}`;
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Token存储和检索', () => {
    test('应该正确存储和检索token', () => {
      const token = 'test-token-123';
      TokenManager.setToken(token);
      expect(TokenManager.getToken()).toBe(token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', token);
    });

    test('没有token时应该返回null', () => {
      expect(TokenManager.getToken()).toBeNull();
    });

    test('应该正确移除token', () => {
      const token = 'test-token-123';
      TokenManager.setToken(token);
      TokenManager.removeToken();
      expect(TokenManager.getToken()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });

    test('设置token时应该存储用户信息', () => {
      const payload = {
        user_id: 123,
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = createMockJWT(payload);
      TokenManager.setToken(token);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('currentUser', 
        JSON.stringify({
          id: 123,
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          permissions: ['read']
        })
      );
    });
  });

  describe('Token验证', () => {
    test('应该正确识别过期的token', () => {
      const expiredPayload = {
        user_id: 123,
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1小时前过期
      };
      const expiredToken = createMockJWT(expiredPayload);

      expect(TokenManager.isTokenExpired(expiredToken)).toBe(true);
    });

    test('应该正确识别有效的token', () => {
      const validPayload = {
        user_id: 123,
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
      };
      const validToken = createMockJWT(validPayload);

      expect(TokenManager.isTokenExpired(validToken)).toBe(false);
    });

    test('应该验证token格式', () => {
      const validToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(TokenManager.validateTokenFormat(validToken)).toBe(true);
      
      expect(TokenManager.validateTokenFormat('invalid')).toBe(false);
      expect(TokenManager.validateTokenFormat('')).toBe(false);
      expect(TokenManager.validateTokenFormat('invalid.token')).toBe(false);
    });

    test('应该检查token有效性', () => {
      const validToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      TokenManager.setToken(validToken);
      expect(TokenManager.isTokenValid()).toBe(true);

      const expiredToken = createMockJWT({
        exp: Math.floor(Date.now() / 1000) - 3600
      });
      TokenManager.setToken(expiredToken);
      expect(TokenManager.isTokenValid()).toBe(false);
    });
  });

  describe('Token解析', () => {
    test('应该正确解析token载荷', () => {
      const payload = {
        user_id: 123,
        username: 'testuser',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };
      const token = createMockJWT(payload);

      const parsedPayload = TokenManager.getTokenPayload(token);
      expect(parsedPayload).toMatchObject(payload);
    });

    test('应该处理无效的token格式', () => {
      expect(TokenManager.getTokenPayload('invalid')).toBeNull();
      expect(TokenManager.getTokenPayload('')).toBeNull();
      expect(TokenManager.getTokenPayload('invalid.token')).toBeNull();
    });

    test('应该处理Base64解码错误', () => {
      const invalidToken = 'header.invalidbase64.signature';
      expect(TokenManager.getTokenPayload(invalidToken)).toBeNull();
    });
  });

  describe('用户信息获取', () => {
    test('应该获取当前用户ID', () => {
      const token = createMockJWT({ user_id: 123, exp: Math.floor(Date.now() / 1000) + 3600 });
      TokenManager.setToken(token);
      expect(TokenManager.getCurrentUserId()).toBe(123);
    });

    test('应该支持不同的用户ID字段', () => {
      // 测试 userId
      const token1 = createMockJWT({ userId: 456, exp: Math.floor(Date.now() / 1000) + 3600 });
      TokenManager.setToken(token1);
      expect(TokenManager.getCurrentUserId()).toBe(456);

      // 测试 sub
      const token2 = createMockJWT({ sub: 789, exp: Math.floor(Date.now() / 1000) + 3600 });
      TokenManager.setToken(token2);
      expect(TokenManager.getCurrentUserId()).toBe(789);
    });

    test('应该获取当前用户信息', () => {
      const token = createMockJWT({
        user_id: 123,
        username: 'testuser',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      TokenManager.setToken(token);

      const user = TokenManager.getCurrentUser();
      expect(user).toEqual({
        id: 123,
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    test('应该支持name字段作为username', () => {
      const token = createMockJWT({
        user_id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      TokenManager.setToken(token);

      const user = TokenManager.getCurrentUser();
      expect(user?.username).toBe('John Doe');
    });
  });

  describe('Token时间管理', () => {
    test('应该获取token剩余时间', () => {
      const token = createMockJWT({
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      TokenManager.setToken(token);

      const remainingTime = TokenManager.getTokenRemainingTime();
      expect(remainingTime).toBeCloseTo(3600, -1); // 允许小误差
    });

    test('应该检测即将过期的token', () => {
      const token = createMockJWT({
        exp: Math.floor(Date.now() / 1000) + 200 // 200秒后过期
      });
      TokenManager.setToken(token);

      expect(TokenManager.isTokenExpiringSoon()).toBe(true);
      expect(TokenManager.isTokenExpiringSoon(100)).toBe(false); // 100秒阈值
    });

    test('应该获取token创建和过期时间', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createMockJWT({
        iat: now - 100,
        exp: now + 3600
      });
      TokenManager.setToken(token);

      const issuedAt = TokenManager.getTokenIssuedAt();
      const expireAt = TokenManager.getTokenExpireAt();
      
      expect(issuedAt).toEqual(new Date((now - 100) * 1000));
      expect(expireAt).toEqual(new Date((now + 3600) * 1000));
    });
  });

  describe('数据清理', () => {
    test('应该清除所有认证数据', () => {
      // 模拟一些认证相关数据
      localStorageMock.setItem('token', 'test-token');
      localStorageMock.setItem('currentUser', '{"id": 123}');
      localStorageMock.setItem('refreshToken', 'refresh-token');
      localStorageMock.setItem('userPreferences', '{"theme": "dark"}');

      TokenManager.clearAuthData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentUser');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userPreferences');
    });
  });

  describe('调试信息', () => {
    test('应该提供token调试信息', () => {
      const token = createMockJWT({
        user_id: 123,
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      });
      TokenManager.setToken(token);

      const debugInfo = TokenManager.getTokenDebugInfo();
      expect(debugInfo).toMatchObject({
        hasToken: true,
        isValid: true,
        isExpired: false,
        payload: expect.objectContaining({
          user_id: 123,
          username: 'testuser'
        })
      });
    });

    test('应该处理无token情况', () => {
      const debugInfo = TokenManager.getTokenDebugInfo();
      expect(debugInfo).toEqual({ error: 'No token found' });
    });
  });

  describe('错误处理', () => {
    test('应该处理localStorage访问错误', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(TokenManager.getToken()).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    test('应该处理localStorage写入错误', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => TokenManager.setToken('test-token')).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    test('应该处理无效的token载荷', () => {
      const invalidPayloadToken = 'header.invalidjson.signature';
      expect(TokenManager.getTokenPayload(invalidPayloadToken)).toBeNull();
    });
  });
});