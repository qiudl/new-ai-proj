/**
 * Token刷新管理器
 * 解决并发token刷新的竞争条件问题
 * 实现单例模式，确保全局只有一个刷新流程
 */

import TokenManager from './tokenManager';

export interface TokenRefreshOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export interface TokenRefreshResult {
  success: boolean;
  newToken?: string;
  error?: string;
  needsManualAuth?: boolean;
}

export class TokenRefreshManager {
  private static instance: TokenRefreshManager;
  private refreshPromise: Promise<TokenRefreshResult> | null = null;
  private isRefreshing = false;
  private refreshAttempts = 0;
  private readonly maxAttempts = 3;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * 刷新token - 防止并发调用
   */
  async refreshToken(options: TokenRefreshOptions = {}): Promise<TokenRefreshResult> {
    // 如果已经在刷新中，返回同一个promise
    if (this.refreshPromise) {
      console.log('🔄 Token刷新已在进行中，等待结果...');
      return this.refreshPromise;
    }

    // 检查是否超过最大尝试次数
    if (this.refreshAttempts >= this.maxAttempts) {
      console.error('🚫 Token刷新超过最大尝试次数，需要手动认证');
      return {
        success: false,
        error: 'Max refresh attempts exceeded',
        needsManualAuth: true
      };
    }

    this.refreshAttempts++;
    this.isRefreshing = true;
    
    console.log(`🔄 开始Token刷新 (尝试 ${this.refreshAttempts}/${this.maxAttempts})`);

    // 创建刷新promise
    this.refreshPromise = this.performTokenRefresh(options);

    try {
      const result = await this.refreshPromise;
      
      if (result.success) {
        // 刷新成功，重置计数器
        this.refreshAttempts = 0;
        console.log('✅ Token刷新成功');
      } else {
        console.error('❌ Token刷新失败:', result.error);
      }

      return result;
    } finally {
      // 清理状态
      this.refreshPromise = null;
      this.isRefreshing = false;
    }
  }

  /**
   * 实际执行token刷新的逻辑
   */
  private async performTokenRefresh(options: TokenRefreshOptions): Promise<TokenRefreshResult> {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      timeoutMs = 10000
    } = options;

    // 暂时禁用开发环境自动登录，因为后端不支持该端点
    // if (this.isDevelopmentEnvironment()) {
    //   console.log('🚀 检测到开发环境，尝试自动重新登录...');
    //   const devResult = await this.tryDevelopmentAutoLogin(timeoutMs);
    //   if (devResult.success) {
    //     return devResult;
    //   }
    //   console.warn('⚠️ 开发环境自动登录失败，尝试其他方式');
    // }

    // 暂时禁用token刷新，因为后端不支持该端点
    // const refreshResult = await this.tryRefreshTokenRequest(timeoutMs);
    // if (refreshResult.success) {
    //   return refreshResult;
    // }

    // 由于后端不支持token刷新，直接返回需要手动认证
    console.warn('⚠️ 后端不支持token刷新，需要手动重新登录');
    return {
      success: false,
      error: 'Token刷新功能暂时不可用，需要重新登录',
      needsManualAuth: true
    };
  }

  /**
   * 尝试开发环境自动登录
   */
  private async tryDevelopmentAutoLogin(timeoutMs: number): Promise<TokenRefreshResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/v1/auth/dev-quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.access_token) {
          const newToken = data.data.access_token;
          TokenManager.setToken(newToken);
          
          // 更新用户信息
          if (data.data.user) {
            localStorage.setItem('currentUser', JSON.stringify(data.data.user));
          }

          return {
            success: true,
            newToken
          };
        }
      }

      return {
        success: false,
        error: `Dev auto-login failed: HTTP ${response.status}`
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Dev auto-login timeout'
        };
      }
      return {
        success: false,
        error: `Dev auto-login error: ${error.message}`
      };
    }
  }

  /**
   * 尝试使用刷新token请求新token
   */
  private async tryRefreshTokenRequest(timeoutMs: number): Promise<TokenRefreshResult> {
    try {
      const currentToken = TokenManager.getToken();
      if (!currentToken) {
        return {
          success: false,
          error: 'No current token available for refresh'
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.token) {
          const newToken = data.data.token;
          TokenManager.setToken(newToken);
          return {
            success: true,
            newToken
          };
        }
      }

      return {
        success: false,
        error: `Token refresh failed: HTTP ${response.status}`
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Token refresh timeout'
        };
      }
      return {
        success: false,
        error: `Token refresh error: ${error.message}`
      };
    }
  }

  /**
   * 检查是否为开发环境
   */
  private isDevelopmentEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.port === '3001' ||
      window.location.port === '3000'
    );
  }

  /**
   * 检查是否正在刷新
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * 获取刷新尝试次数
   */
  getRefreshAttempts(): number {
    return this.refreshAttempts;
  }

  /**
   * 重置刷新状态（用于手动认证成功后）
   */
  resetRefreshState(): void {
    this.refreshAttempts = 0;
    this.isRefreshing = false;
    this.refreshPromise = null;
    console.log('🔄 Token刷新状态已重置');
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): any {
    return {
      isRefreshing: this.isRefreshing,
      refreshAttempts: this.refreshAttempts,
      maxAttempts: this.maxAttempts,
      hasRefreshPromise: this.refreshPromise !== null,
      isDevelopmentEnvironment: this.isDevelopmentEnvironment()
    };
  }
}

// 便捷的静态方法
export const refreshTokenSafely = async (options?: TokenRefreshOptions): Promise<TokenRefreshResult> => {
  const manager = TokenRefreshManager.getInstance();
  return manager.refreshToken(options);
};

export default TokenRefreshManager;