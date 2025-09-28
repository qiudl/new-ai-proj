/**
 * EnhancedAuthManager单元测试
 * 测试增强认证管理器的各项功能
 */

import { EnhancedAuthManager, auth } from '../enhancedAuthManager';
import TokenManager from '../tokenManager';
import { createMockJWT, createMockUser } from '../../tests/factories';

// Mock dependencies
jest.mock('../tokenManager');
jest.mock('../tokenRefreshManager');

const mockTokenManager = TokenManager as jest.Mocked<typeof TokenManager>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('EnhancedAuthManager', () => {
  let authManager: EnhancedAuthManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Create fresh instance
    authManager = EnhancedAuthManager.getInstance();
    
    // Mock TokenManager methods
    mockTokenManager.getToken.mockReturnValue(null);
    mockTokenManager.isTokenValid.mockReturnValue(false);
    mockTokenManager.getTokenPayload.mockReturnValue(null);
    mockTokenManager.setToken.mockImplementation(() => {});
    mockTokenManager.clearAuthData.mockImplementation(() => {});
  });

  afterEach(() => {
    authManager.destroy();
  });

  describe('单例模式', () => {
    test('应该返回相同的实例', () => {
      const instance1 = EnhancedAuthManager.getInstance();
      const instance2 = EnhancedAuthManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('应该能够使用配置参数', () => {
      const config = {
        sessionTimeoutMinutes: 120,
        autoRefreshThreshold: 30
      };

      const instance = EnhancedAuthManager.getInstance(config);
      const state = instance.getAuthState();

      expect(state.sessionTimeout).toBe(120);
    });
  });

  describe('登录功能', () => {
    test('应该能够成功登录', async () => {
      const mockUser = createMockUser();
      const mockToken = createMockJWT({ user_id: mockUser.id });
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            access_token: mockToken,
            user: mockUser
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);
      mockTokenManager.getTokenPayload.mockReturnValue({
        user_id: mockUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const result = await authManager.login({
        username: 'testuser',
        password: 'password'
      });

      expect(result).toBe(true);
      expect(mockTokenManager.setToken).toHaveBeenCalledWith(mockToken);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'currentUser', 
        JSON.stringify(mockUser)
      );
    });

    test('应该在开发环境使用快速登录', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            access_token: 'dev-token',
            user: createMockUser()
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await authManager.login({ username: 'testuser' });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/dev-quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    test('应该能够跳过开发快速登录', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            access_token: 'token',
            user: createMockUser()
          }
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await authManager.login({ username: 'testuser', password: 'pass' }, true);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'pass' })
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('登录失败应该返回false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      } as any);

      const result = await authManager.login({
        username: 'wrong',
        password: 'credentials'
      });

      expect(result).toBe(false);
      expect(mockTokenManager.setToken).not.toHaveBeenCalled();
    });
  });

  describe('登出功能', () => {
    test('应该能够正确登出', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      
      const mockResponse = {
        ok: true
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await authManager.logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        }
      });

      expect(mockTokenManager.clearAuthData).toHaveBeenCalled();
    });

    test('即使API调用失败也应该清除本地数据', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await authManager.logout();

      expect(mockTokenManager.clearAuthData).toHaveBeenCalled();
    });

    test('没有token时也应该能够登出', async () => {
      mockTokenManager.getToken.mockReturnValue(null);

      await authManager.logout();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockTokenManager.clearAuthData).toHaveBeenCalled();
    });
  });

  describe('权限管理', () => {
    beforeEach(() => {
      // 设置认证状态
      authManager['authState'].isAuthenticated = true;
      authManager['authState'].permissions = ['read', 'write', 'admin'];
      authManager['authState'].roles = ['user', 'manager'];
    });

    test('应该能够检查单个权限', () => {
      expect(authManager.hasPermission('read')).toBe(true);
      expect(authManager.hasPermission('delete')).toBe(false);
    });

    test('应该能够检查任一权限', () => {
      expect(authManager.hasAnyPermission(['read', 'delete'])).toBe(true);
      expect(authManager.hasAnyPermission(['delete', 'modify'])).toBe(false);
    });

    test('应该能够检查所有权限', () => {
      expect(authManager.hasAllPermissions(['read', 'write'])).toBe(true);
      expect(authManager.hasAllPermissions(['read', 'delete'])).toBe(false);
    });

    test('应该能够检查角色', () => {
      expect(authManager.hasRole('user')).toBe(true);
      expect(authManager.hasRole('admin')).toBe(false);
    });
  });

  describe('用户权限获取', () => {
    test('应该能够从API获取权限', async () => {
      const mockUser = createMockUser();
      authManager['authState'].user = mockUser;
      
      const mockPermissions = ['read', 'write', 'admin'];
      mockTokenManager.getToken.mockReturnValue('valid-token');
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          permissions: mockPermissions
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const permissions = await authManager.getUserPermissions();

      expect(permissions).toEqual(mockPermissions);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/permissions/users/${mockUser.id}`,
        {
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    test('应该使用缓存的权限', async () => {
      const mockUser = createMockUser();
      const mockPermissions = ['read', 'write'];

      // 设置缓存
      authManager['permissionCache'].set(`user_${mockUser.id}`, {
        permissions: mockPermissions,
        timestamp: Date.now()
      });

      const permissions = await authManager.getUserPermissions(mockUser.id, true);

      expect(permissions).toEqual(mockPermissions);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('过期的缓存应该被忽略', async () => {
      const mockUser = createMockUser();
      const oldPermissions = ['read'];
      const newPermissions = ['read', 'write', 'admin'];

      // 设置过期缓存
      authManager['permissionCache'].set(`user_${mockUser.id}`, {
        permissions: oldPermissions,
        timestamp: Date.now() - 35 * 60 * 1000 // 35分钟前
      });

      mockTokenManager.getToken.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          permissions: newPermissions
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const permissions = await authManager.getUserPermissions(mockUser.id, true);

      expect(permissions).toEqual(newPermissions);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Token刷新', () => {
    test('应该在Token即将过期时自动刷新', async () => {
      mockTokenManager.getToken.mockReturnValue('expiring-token');
      mockTokenManager.getTokenRemainingTime.mockReturnValue(10 * 60); // 10分钟

      // Mock TokenRefreshManager
      const mockRefreshResult = {
        success: true,
        newToken: 'new-token'
      };

      const TokenRefreshManager = require('../tokenRefreshManager').default;
      TokenRefreshManager.getInstance.mockReturnValue({
        refreshToken: jest.fn().mockResolvedValue(mockRefreshResult)
      });

      const result = await authManager.checkAndRefreshToken();

      expect(result).toBe(true);
    });

    test('Token充足时不应该刷新', async () => {
      mockTokenManager.getToken.mockReturnValue('valid-token');
      authManager['getTokenRemainingMinutes'] = jest.fn().mockReturnValue(30); // 30分钟

      const result = await authManager.checkAndRefreshToken();

      expect(result).toBe(true);
    });

    test('没有Token时应该返回false', async () => {
      mockTokenManager.getToken.mockReturnValue(null);

      const result = await authManager.checkAndRefreshToken();

      expect(result).toBe(false);
    });
  });

  describe('事件系统', () => {
    test('应该能够添加和触发事件监听器', () => {
      const loginHandler = jest.fn();
      const logoutHandler = jest.fn();

      authManager.addEventListener('login', loginHandler);
      authManager.addEventListener('logout', logoutHandler);

      // 手动触发事件
      authManager['emitEvent']({ type: 'login', timestamp: Date.now(), data: { user: 'test' } });
      authManager['emitEvent']({ type: 'logout', timestamp: Date.now() });

      expect(loginHandler).toHaveBeenCalledWith({
        type: 'login',
        timestamp: expect.any(Number),
        data: { user: 'test' }
      });
      expect(logoutHandler).toHaveBeenCalledWith({
        type: 'logout',
        timestamp: expect.any(Number)
      });
    });

    test('应该能够移除事件监听器', () => {
      const handler = jest.fn();

      authManager.addEventListener('login', handler);
      authManager.removeEventListener('login', handler);

      authManager['emitEvent']({ type: 'login', timestamp: Date.now() });

      expect(handler).not.toHaveBeenCalled();
    });

    test('事件监听器错误不应该影响其他监听器', () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();

      authManager.addEventListener('login', errorHandler);
      authManager.addEventListener('login', normalHandler);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      authManager['emitEvent']({ type: 'login', timestamp: Date.now() });

      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('认证状态管理', () => {
    test('应该能够获取认证状态', () => {
      const state = authManager.getAuthState();

      expect(state).toHaveProperty('isAuthenticated');
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('permissions');
      expect(state).toHaveProperty('roles');
      expect(state).toHaveProperty('sessionTimeout');
    });

    test('应该能够获取当前用户', () => {
      const mockUser = createMockUser();
      authManager['authState'].user = mockUser;

      const currentUser = authManager.getCurrentUser();

      expect(currentUser).toEqual(mockUser);
    });

    test('应该正确检查认证状态', () => {
      mockTokenManager.isTokenValid.mockReturnValue(true);
      authManager['authState'].isAuthenticated = true;

      expect(authManager.isAuthenticated()).toBe(true);

      mockTokenManager.isTokenValid.mockReturnValue(false);
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe('权限缓存管理', () => {
    test('应该能够清空权限缓存', () => {
      authManager['permissionCache'].set('test', {
        permissions: ['read'],
        timestamp: Date.now()
      });

      expect(authManager['permissionCache'].size).toBe(1);

      authManager.clearPermissionCache();

      expect(authManager['permissionCache'].size).toBe(0);
    });

    test('应该能够刷新权限', async () => {
      const mockUser = createMockUser();
      authManager['authState'].user = mockUser;
      
      const mockPermissions = ['read', 'write'];
      mockTokenManager.getToken.mockReturnValue('valid-token');
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ permissions: mockPermissions })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const eventSpy = jest.spyOn(authManager as any, 'emitEvent');

      await authManager.refreshPermissions();

      expect(eventSpy).toHaveBeenCalledWith({
        type: 'permission_change',
        timestamp: expect.any(Number),
        data: { permissions: mockPermissions }
      });
    });
  });

  describe('统计信息', () => {
    test('应该提供认证统计信息', () => {
      const stats = authManager.getAuthStats();

      expect(stats).toHaveProperty('isAuthenticated');
      expect(stats).toHaveProperty('tokenExpiry');
      expect(stats).toHaveProperty('lastActivity');
      expect(stats).toHaveProperty('permissionCacheSize');
      expect(stats).toHaveProperty('sessionTimeoutMinutes');
      expect(stats).toHaveProperty('tokenRemainingMinutes');

      expect(typeof stats.permissionCacheSize).toBe('number');
      expect(typeof stats.sessionTimeoutMinutes).toBe('number');
    });
  });

  describe('便捷导出API', () => {
    test('auth对象应该包含所有便捷方法', () => {
      expect(typeof auth.login).toBe('function');
      expect(typeof auth.logout).toBe('function');
      expect(typeof auth.isAuthenticated).toBe('function');
      expect(typeof auth.getCurrentUser).toBe('function');
      expect(typeof auth.hasPermission).toBe('function');
      expect(typeof auth.refreshPermissions).toBe('function');
      expect(typeof auth.getStats).toBe('function');
    });

    test('便捷方法应该正确调用实例方法', async () => {
      const spy = jest.spyOn(authManager, 'login');
      
      await auth.login({ username: 'test' });

      expect(spy).toHaveBeenCalledWith({ username: 'test' });
    });
  });

  describe('生命周期管理', () => {
    test('应该能够销毁管理器', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      authManager.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(authManager['eventListeners'].size).toBe(0);
      expect(authManager['permissionCache'].size).toBe(0);
    });
  });

  describe('多标签同步', () => {
    test('应该监听localStorage变化', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      // 创建新实例来触发初始化
      new EnhancedAuthManager();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    test('应该响应storage事件', () => {
      const loadAuthStateSpy = jest.spyOn(authManager as any, 'loadAuthState');

      // 模拟storage事件
      const storageEvent = new StorageEvent('storage', {
        key: 'token',
        newValue: 'new-token'
      });

      authManager['handleStorageChange'](storageEvent);

      expect(loadAuthStateSpy).toHaveBeenCalled();
    });
  });

  describe('活动追踪', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该追踪用户活动', () => {
      authManager['authState'].isAuthenticated = true;

      const initialActivity = authManager['authState'].lastActivity;

      authManager['trackActivity']();

      expect(authManager['authState'].lastActivity).toBeInstanceOf(Date);
      expect(authManager['authState'].lastActivity).not.toEqual(initialActivity);
    });

    test('应该在长时间不活动后触发会话过期', () => {
      authManager['authState'].isAuthenticated = true;
      authManager['authState'].lastActivity = new Date(Date.now() - 70 * 60 * 1000); // 70分钟前

      const handleSessionExpiredSpy = jest.spyOn(authManager as any, 'handleSessionExpired');

      // 触发活动检查定时器
      jest.advanceTimersByTime(30000); // 30秒

      expect(handleSessionExpiredSpy).toHaveBeenCalled();
    });
  });
});