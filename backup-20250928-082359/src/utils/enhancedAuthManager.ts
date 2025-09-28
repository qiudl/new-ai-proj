/**
 * 增强的认证管理器
 * 整合Token管理、自动刷新、权限检查等功能
 */

import TokenManager from './tokenManager';
import TokenRefreshManager from './tokenRefreshManager';
import { AppError, ErrorType } from './errorTypes';

export interface AuthEvent {
  type: 'login' | 'logout' | 'token_refresh' | 'permission_change' | 'session_expired';
  timestamp: number;
  data?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: any;
  permissions: string[];
  roles: string[];
  tokenExpiry?: Date;
  lastActivity?: Date;
  sessionTimeout: number; // in minutes
}

export interface AuthConfig {
  sessionTimeoutMinutes?: number;
  autoRefreshThreshold?: number; // minutes before expiry to auto-refresh
  maxInactivityMinutes?: number; // auto-logout after inactivity
  enableActivityTracking?: boolean;
  permissionCacheMinutes?: number;
}

export class EnhancedAuthManager {
  private static instance: EnhancedAuthManager;
  private authState: AuthState;
  private config: Required<AuthConfig>;
  private eventListeners = new Map<string, Array<(event: AuthEvent) => void>>();
  private refreshPromise: Promise<boolean> | null = null;
  private activityTimer?: NodeJS.Timeout;
  private refreshTimer?: NodeJS.Timeout;
  private permissionCache: Map<string, { permissions: string[], timestamp: number }> = new Map();

  private constructor(config: AuthConfig = {}) {
    this.config = {
      sessionTimeoutMinutes: config.sessionTimeoutMinutes || 480, // 8 hours
      autoRefreshThreshold: config.autoRefreshThreshold || 15, // 15 minutes
      maxInactivityMinutes: config.maxInactivityMinutes || 60, // 1 hour
      enableActivityTracking: config.enableActivityTracking ?? true,
      permissionCacheMinutes: config.permissionCacheMinutes || 30
    };

    this.authState = {
      isAuthenticated: false,
      user: null,
      permissions: [],
      roles: [],
      sessionTimeout: this.config.sessionTimeoutMinutes
    };

    this.initialize();
  }

  static getInstance(config?: AuthConfig): EnhancedAuthManager {
    if (!EnhancedAuthManager.instance) {
      EnhancedAuthManager.instance = new EnhancedAuthManager(config);
    }
    return EnhancedAuthManager.instance;
  }

  /**
   * 初始化认证管理器
   */
  private initialize(): void {
    this.loadAuthState();
    this.startTokenMonitoring();
    
    if (this.config.enableActivityTracking) {
      this.startActivityTracking();
    }

    // Listen for storage changes (for multi-tab sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
      
      // Track user activity
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, this.trackActivity.bind(this), { passive: true });
      });
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: { username: string; password?: string }, skipDevLogin = false): Promise<boolean> {
    try {
      let response;
      
      if (!skipDevLogin && this.isDevelopmentMode()) {
        // Development quick login
        response = await fetch('/api/v1/auth/dev-quick-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: credentials.username })
        });
      } else {
        // Regular login
        response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          await this.setAuthData(data.data);
          this.emitEvent({ type: 'login', timestamp: Date.now(), data: data.data });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      // Call logout API if token is available
      const token = TokenManager.getToken();
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {}); // Ignore logout API errors
      }
    } finally {
      this.clearAuthData();
      this.emitEvent({ type: 'logout', timestamp: Date.now() });
    }
  }

  /**
   * 检查用户是否有指定权限
   */
  hasPermission(permission: string): boolean {
    return this.authState.permissions.includes(permission);
  }

  /**
   * 检查用户是否有任一权限
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * 检查用户是否有所有权限
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * 检查用户角色
   */
  hasRole(role: string): boolean {
    return this.authState.roles.includes(role);
  }

  /**
   * 获取用户权限（可能从缓存或API获取）
   */
  async getUserPermissions(userId?: number, useCache = true): Promise<string[]> {
    const targetUserId = userId || this.authState.user?.id;
    if (!targetUserId) return [];

    const cacheKey = `user_${targetUserId}`;
    
    // Check cache first
    if (useCache) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached) {
        const ageMinutes = (Date.now() - cached.timestamp) / (1000 * 60);
        if (ageMinutes < this.config.permissionCacheMinutes) {
          return cached.permissions;
        }
      }
    }

    try {
      const response = await fetch(`/api/v1/permissions/users/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${TokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const permissions = data.permissions || [];
        
        // Update cache
        this.permissionCache.set(cacheKey, {
          permissions,
          timestamp: Date.now()
        });

        // Update current auth state if it's the current user
        if (!userId || userId === this.authState.user?.id) {
          this.authState.permissions = permissions;
        }

        return permissions;
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
    }

    return [];
  }

  /**
   * 刷新用户权限
   */
  async refreshPermissions(): Promise<void> {
    if (this.authState.user?.id) {
      const permissions = await this.getUserPermissions(this.authState.user.id, false);
      this.emitEvent({ 
        type: 'permission_change', 
        timestamp: Date.now(), 
        data: { permissions } 
      });
    }
  }

  /**
   * 检查并刷新Token
   */
  async checkAndRefreshToken(): Promise<boolean> {
    if (!TokenManager.getToken()) {
      return false;
    }

    // Check if token is expiring soon
    const remainingMinutes = this.getTokenRemainingMinutes();
    if (remainingMinutes !== null && remainingMinutes <= this.config.autoRefreshThreshold) {
      return this.refreshToken();
    }

    return true;
  }

  /**
   * 刷新Token
   */
  async refreshToken(): Promise<boolean> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 实际执行Token刷新
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const tokenRefreshManager = TokenRefreshManager.getInstance();
      const result = await tokenRefreshManager.refreshToken();
      
      if (result.success && result.newToken) {
        const payload = TokenManager.getTokenPayload(result.newToken);
        if (payload) {
          this.authState.tokenExpiry = new Date(payload.exp * 1000);
          this.emitEvent({ 
            type: 'token_refresh', 
            timestamp: Date.now(), 
            data: { newToken: result.newToken } 
          });
        }
        return true;
      }
      
      if (result.needsManualAuth) {
        this.handleSessionExpired();
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * 获取认证状态
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): any {
    return this.authState.user;
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && TokenManager.isTokenValid();
  }

  /**
   * 获取Token剩余时间（分钟）
   */
  getTokenRemainingMinutes(): number | null {
    const remainingSeconds = TokenManager.getTokenRemainingTime();
    return remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : null;
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: (event: AuthEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: (event: AuthEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 清空权限缓存
   */
  clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  /**
   * 获取认证统计信息
   */
  getAuthStats(): any {
    return {
      isAuthenticated: this.authState.isAuthenticated,
      tokenExpiry: this.authState.tokenExpiry,
      lastActivity: this.authState.lastActivity,
      permissionCacheSize: this.permissionCache.size,
      sessionTimeoutMinutes: this.config.sessionTimeoutMinutes,
      tokenRemainingMinutes: this.getTokenRemainingMinutes()
    };
  }

  /**
   * 设置认证数据
   */
  private async setAuthData(data: any): Promise<void> {
    const { access_token, user } = data;
    
    if (access_token) {
      TokenManager.setToken(access_token);
      const payload = TokenManager.getTokenPayload(access_token);
      
      if (payload) {
        this.authState.tokenExpiry = new Date(payload.exp * 1000);
      }
    }

    if (user) {
      this.authState.user = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
    }

    this.authState.isAuthenticated = true;
    this.authState.lastActivity = new Date();

    // Load user permissions
    if (user?.id) {
      this.authState.permissions = await this.getUserPermissions(user.id);
    }
  }

  /**
   * 清除认证数据
   */
  private clearAuthData(): void {
    TokenManager.clearAuthData();
    this.authState.isAuthenticated = false;
    this.authState.user = null;
    this.authState.permissions = [];
    this.authState.roles = [];
    this.authState.tokenExpiry = undefined;
    this.authState.lastActivity = undefined;
    this.clearPermissionCache();
  }

  /**
   * 加载认证状态
   */
  private loadAuthState(): void {
    const token = TokenManager.getToken();
    if (token && TokenManager.isTokenValid()) {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          this.authState.isAuthenticated = true;
          this.authState.user = user;
          
          const payload = TokenManager.getTokenPayload(token);
          if (payload) {
            this.authState.tokenExpiry = new Date(payload.exp * 1000);
          }
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        this.clearAuthData();
      }
    } else {
      this.clearAuthData();
    }
  }

  /**
   * 启动Token监控
   */
  private startTokenMonitoring(): void {
    this.refreshTimer = setInterval(async () => {
      if (this.isAuthenticated()) {
        await this.checkAndRefreshToken();
      }
    }, 60000); // Check every minute
  }

  /**
   * 启动活动跟踪
   */
  private startActivityTracking(): void {
    this.activityTimer = setInterval(() => {
      if (this.authState.lastActivity) {
        const inactiveMinutes = (Date.now() - this.authState.lastActivity.getTime()) / (1000 * 60);
        
        if (inactiveMinutes > this.config.maxInactivityMinutes) {
          this.handleSessionExpired();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * 跟踪用户活动
   */
  private trackActivity(): void {
    if (this.authState.isAuthenticated) {
      this.authState.lastActivity = new Date();
    }
  }

  /**
   * 处理存储变化（多标签同步）
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'token' || event.key === 'currentUser') {
      this.loadAuthState();
    }
  }

  /**
   * 处理页面卸载
   */
  private handleBeforeUnload(): void {
    // Save any pending state if needed
  }

  /**
   * 处理会话过期
   */
  private handleSessionExpired(): void {
    this.clearAuthData();
    this.emitEvent({ type: 'session_expired', timestamp: Date.now() });
  }

  /**
   * 发射事件
   */
  private emitEvent(event: AuthEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Auth event listener error:', error);
        }
      });
    }
  }

  /**
   * 检查是否为开发模式
   */
  private isDevelopmentMode(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost'
    );
  }

  /**
   * 销毁认证管理器
   */
  destroy(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.eventListeners.clear();
    this.clearPermissionCache();
  }
}

// 创建全局实例
const enhancedAuthManager = EnhancedAuthManager.getInstance();

// 导出便捷方法
export const auth = {
  login: (credentials: { username: string; password?: string }) => enhancedAuthManager.login(credentials),
  logout: () => enhancedAuthManager.logout(),
  isAuthenticated: () => enhancedAuthManager.isAuthenticated(),
  getCurrentUser: () => enhancedAuthManager.getCurrentUser(),
  hasPermission: (permission: string) => enhancedAuthManager.hasPermission(permission),
  hasAnyPermission: (permissions: string[]) => enhancedAuthManager.hasAnyPermission(permissions),
  hasAllPermissions: (permissions: string[]) => enhancedAuthManager.hasAllPermissions(permissions),
  hasRole: (role: string) => enhancedAuthManager.hasRole(role),
  refreshPermissions: () => enhancedAuthManager.refreshPermissions(),
  refreshToken: () => enhancedAuthManager.refreshToken(),
  getAuthState: () => enhancedAuthManager.getAuthState(),
  getStats: () => enhancedAuthManager.getAuthStats(),
  addEventListener: (type: string, listener: (event: AuthEvent) => void) => 
    enhancedAuthManager.addEventListener(type, listener),
  removeEventListener: (type: string, listener: (event: AuthEvent) => void) => 
    enhancedAuthManager.removeEventListener(type, listener)
};

export default enhancedAuthManager;