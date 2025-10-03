import axios, { AxiosResponse, AxiosError } from 'axios';
import { MCPPermissionManager, requiresPermission } from './permission-manager.js';
import {
  UnifiedUserContextManager,
  getGlobalContextManager,
  UnifiedUserContext
} from './unified-user-context.js';
import { ApiResponse } from './types.js';
import {
  TokenStorageManager,
  getGlobalTokenStorage,
  PersistedTokenData
} from './token-storage.js';
import {
  TokenRefreshMonitor,
  getGlobalTokenMonitor,
  TokenRefreshEventType,
  TokenHealthCheck
} from './token-monitor.js';

// Token状态管理接口
interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshing: boolean;
}

export abstract class BaseClient {
  protected apiBase: string;
  protected authToken?: string;
  protected permissionManager: MCPPermissionManager;
  protected contextManager: UnifiedUserContextManager;

  // Token自动刷新相关状态
  protected tokenState?: TokenState;
  protected refreshPromise?: Promise<void>;
  protected readonly REFRESH_BUFFER_MS = 60 * 1000; // 提前60秒刷新

  // Token持久化存储管理器
  protected tokenStorage: TokenStorageManager;

  // Token刷新监控器
  protected tokenMonitor: TokenRefreshMonitor;

  constructor(apiBase: string = 'http://localhost:8080/api/v1') {
    this.apiBase = apiBase;

    // 获取全局统一上下文管理器
    this.contextManager = getGlobalContextManager(apiBase);

    // 初始化Token持久化存储
    this.tokenStorage = getGlobalTokenStorage({
      enableEncryption: process.env.MCP_TOKEN_ENCRYPTION !== 'false' // 默认启用加密
    });

    // 初始化Token刷新监控器
    this.tokenMonitor = getGlobalTokenMonitor({
      enableLogging: process.env.MCP_TOKEN_MONITOR_LOGGING !== 'false', // 默认启用
      enableMetrics: process.env.MCP_TOKEN_MONITOR_METRICS !== 'false'  // 默认启用
    });

    // 尝试从持久化存储加载Token（异步，不阻塞构造函数）
    this.loadPersistedToken().catch(error => {
      console.error('[BASE_CLIENT] 加载持久化Token失败:', error);
    });

    // 从环境变量读取令牌（不再硬编码）。优先 TASK_API_TOKEN，兼容 API_TOKEN。
    const token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
    if (token && token.trim().length > 0) {
      // 环境变量的Token作为后备选项
      if (!this.authToken) {
        this.authToken = token.trim();
        // 如果有令牌，尝试创建用户上下文
        this.initializeContextFromToken(this.authToken);
      }
    }

    // 保持原有的权限管理器以向后兼容
    this.permissionManager = new MCPPermissionManager(
      apiBase,
      this.authToken,
      {
        enablePermissionCheck: process.env.MCP_ENABLE_PERMISSIONS !== 'false', // 默认启用
        cacheTTL: parseInt(process.env.MCP_CACHE_TIMEOUT || '300') // 默认5分钟
      }
    );
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  public async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    params?: Record<string, any>,
    _retry: boolean = false
  ): Promise<ApiResponse<T>> {
    try {
      // 请求前确保Token有效（自动刷新）
      await this.ensureValidToken();

      // Debug safe-log: do not print token value
      console.error(`[HTTP] ${method} ${url} auth=${this.authToken ? 'present' : 'none'}`);
      const config = {
        method,
        url: `${this.apiBase}${url}`,
        headers: this.getHeaders(),
        data,
        params,
        // proxy: false
      };

      const response: AxiosResponse = await axios(config);

      // Debug: Log response structure for work notes
      if (url.includes('list-work-notes')) {
        console.error('[DEBUG] makeRequest response for list-work-notes:', JSON.stringify({
          status: response.status,
          dataKeys: response.data ? Object.keys(response.data) : 'no data',
          hasData: !!response.data?.data,
          dataDataKeys: response.data?.data ? Object.keys(response.data.data) : 'no data.data',
          notesCount: response.data?.data?.notes?.length || 0,
          total: response.data?.data?.total || 'no total'
        }, null, 2));
      }

      // 处理成功响应
      if (response.data && typeof response.data === 'object') {
        return response.data as ApiResponse<T>;
      }

      return {
        success: true,
        data: response.data,
        message: 'Request successful'
      };

    } catch (error: any) {
      // 如果是401错误且未重试过，尝试刷新Token后重试
      if (error.response?.status === 401 && !_retry && this.tokenState?.refreshToken) {
        console.error('[HTTP] 收到401错误，尝试刷新Token后重试...');

        try {
          await this.refreshAccessToken();

          // 重试请求（标记为已重试）
          console.error('[HTTP] Token刷新成功，重试请求...');
          return await this.makeRequest(method, url, data, params, true);

        } catch (refreshError: any) {
          console.error('[HTTP] Token刷新失败，无法重试请求:', refreshError.message);
          // 继续返回原始错误
        }
      }

      return this.handleError(error);
    }
  }

  protected handleError(error: any): ApiResponse {
    if (error.response) {
      // HTTP错误响应
      const status = error.response.status;
      const data = error.response.data;

      let errorMessage = 'Unknown error';
      if (data?.message) {
        errorMessage = data.message;
      } else if (data?.error) {
        errorMessage = typeof data.error === 'string' ? data.error : data.error.message || 'API Error';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // 根据HTTP状态码提供友好的错误信息
      switch (status) {
        case 400:
          return { success: false, error: `请求参数错误: ${errorMessage}` };
        case 401:
          // 检查是否是Token过期错误
          if (errorMessage.toLowerCase().includes('token') &&
              (errorMessage.toLowerCase().includes('expired') ||
               errorMessage.toLowerCase().includes('过期') ||
               errorMessage.toLowerCase().includes('invalid'))) {
            return { success: false, error: `Token已过期，请刷新Token后重试。提示：可使用 dev_quick_login 工具自动刷新` };
          }
          return { success: false, error: `认证失败，请检查API令牌: ${errorMessage}` };
        case 403:
          return { success: false, error: `权限不足: ${errorMessage}` };
        case 404:
          return { success: false, error: `资源不存在: ${errorMessage}` };
        case 422:
          return { success: false, error: `数据验证失败: ${errorMessage}` };
        case 500:
          return { success: false, error: `服务器内部错误: ${errorMessage}` };
        default:
          return { success: false, error: `HTTP ${status}: ${errorMessage}` };
      }
    } else if (error.request) {
      // 网络错误 - 检查是否是ECONNREFUSED等连接问题
      const errorMsg = error.message || '';
      if (errorMsg.includes('ECONNREFUSED')) {
        return {
          success: false,
          error: '无法连接到后端服务，请检查服务器是否正常运行'
        };
      } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout')) {
        return {
          success: false,
          error: '请求超时，请检查网络连接或服务器状态'
        };
      } else {
        return {
          success: false,
          error: `网络请求失败: ${errorMsg || '请检查服务器是否正常运行'}`
        };
      }
    } else {
      // 其他错误
      return {
        success: false,
        error: `请求失败: ${error.message || '未知错误'}`
      };
    }
  }

  // 权限检查装饰器辅助方法
  protected async checkPermission(operation: string, resourceType?: string): Promise<boolean> {
    try {
      const res = await this.permissionManager.checkPermission(operation, undefined, resourceType);
      return !!res?.has_permission;
    } catch (error) {
      console.warn(`Permission check failed for ${operation}:`, error);
      // 如果权限检查失败，默认允许操作（向下兼容）
      return true;
    }
  }

  // 获取权限管理器实例
  public getPermissionManager(): MCPPermissionManager {
    return this.permissionManager;
  }

  // 确保Token有效（自动刷新）
  protected async ensureValidToken(): Promise<void> {
    if (!this.tokenState) {
      // 没有Token状态，跳过检查
      return;
    }

    const now = new Date();
    const timeUntilExpiry = this.tokenState.expiresAt.getTime() - now.getTime();

    // 如果Token即将过期（在缓冲时间内）或已过期
    if (timeUntilExpiry <= this.REFRESH_BUFFER_MS) {
      console.error('[TOKEN] Token即将过期，准备刷新...', {
        expiresAt: this.tokenState.expiresAt.toISOString(),
        timeUntilExpiry: Math.floor(timeUntilExpiry / 1000) + 's'
      });

      // 使用单例模式避免并发刷新
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshAccessToken()
          .finally(() => {
            this.refreshPromise = undefined;
          });
      }

      try {
        await this.refreshPromise;
      } catch (error: any) {
        console.error('[TOKEN] Token刷新失败:', error.message);
        // 不抛出错误，让请求继续尝试（可能会收到401）
      }
    }
  }

  // 刷新访问令牌
  protected async refreshAccessToken(): Promise<void> {
    if (!this.tokenState?.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (this.tokenState.refreshing) {
      console.error('[TOKEN] Token刷新已在进行中，跳过');
      return;
    }

    this.tokenState.refreshing = true;
    const startTime = Date.now();

    // 记录刷新开始事件
    this.tokenMonitor.recordEvent(
      TokenRefreshEventType.REFRESH_STARTED,
      true,
      {
        expiresAt: this.tokenState.expiresAt.toISOString(),
        timeUntilExpiry: Math.floor((this.tokenState.expiresAt.getTime() - Date.now()) / 1000)
      }
    );

    try {
      console.error('[TOKEN] 开始刷新访问令牌...');

      const response = await axios.post(
        `${this.apiBase}/auth/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.tokenState.refreshToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 检查响应格式
      if (!response.data || !response.data.data) {
        throw new Error('Invalid refresh response format');
      }

      const { access_token, refresh_token, expires_in } = response.data.data;

      if (!access_token || !refresh_token || !expires_in) {
        throw new Error('Missing required fields in refresh response');
      }

      // 更新Token状态
      this.updateTokenState(access_token, refresh_token, expires_in);

      const duration = Date.now() - startTime;

      console.error('[TOKEN] 访问令牌刷新成功', {
        expiresIn: expires_in + 's',
        expiresAt: this.tokenState?.expiresAt.toISOString(),
        duration: duration + 'ms'
      });

      // 记录刷新成功事件
      this.tokenMonitor.recordEvent(
        TokenRefreshEventType.REFRESH_SUCCESS,
        true,
        {
          expiresAt: this.tokenState?.expiresAt.toISOString(),
          httpStatus: response.status
        },
        undefined,
        undefined,
        duration
      );

    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error('[TOKEN] 刷新访问令牌失败:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        duration: duration + 'ms'
      });

      // 记录刷新失败事件
      const eventType = error.response?.status === 401
        ? TokenRefreshEventType.REFRESH_EXPIRED
        : TokenRefreshEventType.REFRESH_FAILED;

      this.tokenMonitor.recordEvent(
        eventType,
        false,
        {
          httpStatus: error.response?.status
        },
        error.message,
        error.response?.status?.toString(),
        duration
      );

      // 如果是401错误，可能Refresh Token也过期了
      if (error.response?.status === 401) {
        console.error('[TOKEN] Refresh Token可能已过期，需要重新登录');
        this.tokenState = undefined;
      }

      throw error;
    } finally {
      if (this.tokenState) {
        this.tokenState.refreshing = false;
      }
    }
  }

  // 更新Token状态
  protected updateTokenState(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): void {
    this.authToken = accessToken;
    this.tokenState = {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      refreshing: false
    };

    // 通知权限管理器更新Token
    this.permissionManager.setAuth(accessToken);

    console.error('[TOKEN] Token状态已更新', {
      expiresAt: this.tokenState.expiresAt.toISOString()
    });

    // 持久化保存Token
    this.persistToken();
  }

  // 加载持久化的Token
  protected async loadPersistedToken(): Promise<void> {
    try {
      const persistedData = await this.tokenStorage.loadToken();

      if (!persistedData) {
        console.error('[TOKEN] 没有找到持久化的Token');
        return;
      }

      // 检查Token是否过期
      if (this.tokenStorage.isTokenExpired(persistedData, this.REFRESH_BUFFER_MS)) {
        console.error('[TOKEN] 持久化的Token已过期，尝试刷新...');

        // 记录Token过期事件
        this.tokenMonitor.recordEvent(
          TokenRefreshEventType.TOKEN_EXPIRED,
          false,
          {
            expiresAt: persistedData.expiresAt,
            timeUntilExpiry: Math.floor(
              (new Date(persistedData.expiresAt).getTime() - Date.now()) / 1000
            )
          }
        );

        // 设置临时Token状态以便刷新
        this.tokenState = {
          accessToken: persistedData.accessToken,
          refreshToken: persistedData.refreshToken,
          expiresAt: new Date(persistedData.expiresAt),
          refreshing: false
        };
        this.authToken = persistedData.accessToken;

        // 尝试刷新Token
        try {
          await this.refreshAccessToken();
          console.error('[TOKEN] Token刷新成功');
        } catch (error: any) {
          console.error('[TOKEN] Token刷新失败，清除持久化存储:', error.message);
          await this.tokenStorage.clearToken();
          this.tokenState = undefined;
          this.authToken = undefined;
        }

        return;
      }

      // Token有效，直接使用
      this.tokenState = {
        accessToken: persistedData.accessToken,
        refreshToken: persistedData.refreshToken,
        expiresAt: new Date(persistedData.expiresAt),
        refreshing: false
      };
      this.authToken = persistedData.accessToken;

      const timeUntilExpiry = Math.floor(
        (new Date(persistedData.expiresAt).getTime() - Date.now()) / 1000
      );

      console.error('[TOKEN] 已加载持久化的Token', {
        expiresAt: persistedData.expiresAt,
        timeUntilExpiry: timeUntilExpiry + 's'
      });

      // 记录Token加载成功事件
      this.tokenMonitor.recordEvent(
        TokenRefreshEventType.TOKEN_LOADED,
        true,
        {
          expiresAt: persistedData.expiresAt,
          timeUntilExpiry
        }
      );

      // 初始化用户上下文
      await this.initializeContextFromToken(this.authToken);

    } catch (error: any) {
      console.error('[TOKEN] 加载持久化Token失败:', error.message);
    }
  }

  // 持久化保存Token
  protected async persistToken(): Promise<void> {
    if (!this.tokenState) {
      return;
    }

    try {
      const persistedData: PersistedTokenData = {
        accessToken: this.tokenState.accessToken,
        refreshToken: this.tokenState.refreshToken,
        expiresAt: this.tokenState.expiresAt.toISOString(),
        lastUpdate: new Date().toISOString()
      };

      await this.tokenStorage.saveToken(persistedData);

      // 记录Token持久化事件
      this.tokenMonitor.recordEvent(
        TokenRefreshEventType.TOKEN_PERSISTED,
        true,
        {
          expiresAt: persistedData.expiresAt
        }
      );
    } catch (error: any) {
      console.error('[TOKEN] 持久化保存Token失败:', error.message);

      // 记录持久化失败事件
      this.tokenMonitor.recordEvent(
        TokenRefreshEventType.TOKEN_PERSISTED,
        false,
        undefined,
        error.message
      );
    }
  }

  // 清除持久化的Token
  protected async clearPersistedToken(): Promise<void> {
    try {
      await this.tokenStorage.clearToken();
      console.error('[TOKEN] 持久化Token已清除');

      // 记录Token清除事件
      this.tokenMonitor.recordEvent(
        TokenRefreshEventType.TOKEN_CLEARED,
        true
      );
    } catch (error: any) {
      console.error('[TOKEN] 清除持久化Token失败:', error.message);

      // 记录清除失败事件
      this.tokenMonitor.recordEvent(
        TokenRefreshEventType.TOKEN_CLEARED,
        false,
        undefined,
        error.message
      );
    }
  }

  // 设置认证令牌
  public setAuthToken(token: string): void {
    this.authToken = token;
    this.permissionManager.setAuth(token);
    // 更新统一上下文
    this.initializeContextFromToken(token);
  }

  // 获取API基础URL
  public getApiBase(): string {
    return this.apiBase;
  }

  // 初始化用户上下文从令牌
  private async initializeContextFromToken(token: string): Promise<void> {
    try {
      const context = await this.contextManager.createContextFromToken(token);
      if (context) {
        console.error('[BASE_CLIENT] 用户上下文初始化成功:', context.username);
      }
    } catch (error: any) {
      console.error('[BASE_CLIENT] 用户上下文初始化失败:', error.message);
    }
  }

  // 通过开发环境快速登录设置上下文
  public async devQuickLogin(username: string = 'admin'): Promise<ApiResponse> {
    try {
      const context = await this.contextManager.createContextFromDevLogin(username);
      if (context && context.token) {
        // 检查响应中是否包含refresh_token和expires_in
        const rawContext = context as any;

        if (rawContext.refreshToken && rawContext.expiresIn) {
          // 初始化Token状态（支持自动刷新）
          this.updateTokenState(
            context.token,
            rawContext.refreshToken,
            rawContext.expiresIn
          );

          console.error('[BASE_CLIENT] 开发登录成功，Token自动刷新已启用');
        } else {
          // 兼容模式：只设置访问Token
          this.authToken = context.token;
          this.permissionManager.setAuth(context.token, context.userId);

          console.error('[BASE_CLIENT] 开发登录成功（兼容模式，无自动刷新）');
        }

        return {
          success: true,
          data: {
            context: {
              userId: context.userId,
              username: context.username,
              userRole: context.userRole,
              userType: context.userType,
              isSuperAdmin: context.isSuperAdmin
            },
            tokenState: this.tokenState ? {
              expiresAt: this.tokenState.expiresAt.toISOString(),
              hasRefreshToken: !!this.tokenState.refreshToken
            } : null
          },
          message: `用户 ${username} 登录成功`,
          token: context.token
        };
      } else {
        throw new Error('登录失败：无法创建用户上下文');
      }
    } catch (error: any) {
      console.error('[BASE_CLIENT] 开发登录失败:', error);
      return {
        success: false,
        error: `登录失败: ${error.message}`
      };
    }
  }

  // 获取当前用户上下文
  public getCurrentUserContext(): UnifiedUserContext | null {
    return this.contextManager.getCurrentContext();
  }

  // 获取上下文状态
  public getContextStatus(): any {
    return this.contextManager.getContextStatus();
  }

  // 统一权限检查方法
  public async checkUnifiedPermission(
    permissionCode: string,
    resourceId?: number,
    resourceType?: string
  ): Promise<boolean> {
    try {
      const result = await this.contextManager.checkPermission(
        permissionCode,
        resourceId,
        resourceType
      );
      return result.hasPermission;
    } catch (error: any) {
      console.warn('[BASE_CLIENT] 统一权限检查失败:', error);
      return false;
    }
  }

  // 设置API基础URL
  public setApiBase(apiBase: string): void {
    this.apiBase = apiBase;
    this.permissionManager.setApiBase(apiBase);
  }

  // ==================== Token监控API ====================

  /**
   * 获取Token刷新统计信息
   */
  public getTokenRefreshStats() {
    return this.tokenMonitor.getStats();
  }

  /**
   * 获取最近的Token刷新事件
   */
  public getRecentTokenEvents(limit: number = 10) {
    return this.tokenMonitor.getRecentEvents(limit);
  }

  /**
   * 执行Token健康检查
   */
  public checkTokenHealth(): TokenHealthCheck {
    return this.tokenMonitor.healthCheck();
  }

  /**
   * 重置Token监控统计
   */
  public resetTokenMonitorStats(): void {
    this.tokenMonitor.resetStats();
  }

  /**
   * 获取Token监控日志文件路径
   */
  public getTokenMonitorLogPath(): string {
    return this.tokenMonitor.getLogFilePath();
  }
}