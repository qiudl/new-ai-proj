/**
 * TokenManager单元测试
 * 验证Token管理的各种功能和边界情况
 */

import TokenManager from '../tokenManager';

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
console.warn = jest.fn();describe('TokenManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Token Storage and Retrieval', () => {
    test('should store and retrieve token correctly', () => {
      const token = 'test-token-123';
      TokenManager.setToken(token);
      expect(TokenManager.getToken()).toBe(token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', token);
    });

    test('should return null when no token exists', () => {
      expect(TokenManager.getToken()).toBeNull();
    });

    test('should remove token correctly', () => {
      const token = 'test-token-123';
      TokenManager.setToken(token);
      TokenManager.removeToken();
      expect(TokenManager.getToken()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Token Validation', () => {
    const createMockJWT = (payload: any): string => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payloadEncoded = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      return `${header}.${payloadEncoded}.${signature}`;
    };

    test('should correctly identify expired tokens', () => {
      const expiredPayload = {
        user_id: 123,
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      const expiredToken = createMockJWT(expiredPayload);

      expect(TokenManager.isTokenExpired(expiredToken)).toBe(true);
    });
  });
});