import axios, { AxiosResponse, AxiosError } from 'axios';
import { MCPPermissionManager, requiresPermission } from './permission-manager.js';
import { 
  UnifiedUserContextManager, 
  getGlobalContextManager,
  UnifiedUserContext 
} from './unified-user-context.js';
import { ApiResponse } from './types.js';

export abstract class BaseClient {
  protected apiBase: string;
  protected authToken?: string;
  protected permissionManager: MCPPermissionManager;
  protected contextManager: UnifiedUserContextManager;

  constructor(apiBase: string = 'http://localhost:8080/api/v1') {
    this.apiBase = apiBase;
    
    // 获取全局统一上下文管理器
    this.contextManager = getGlobalContextManager(apiBase);
    
    // 从环境变量读取令牌（不再硬编码）。优先 TASK_API_TOKEN，兼容 API_TOKEN。
    const token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
    if (token && token.trim().length > 0) {
      this.authToken = token.trim();
      // 如果有令牌，尝试创建用户上下文
      this.initializeContextFromToken(this.authToken);
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
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
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
        this.authToken = context.token;
        this.permissionManager.setAuth(context.token, context.userId);
        
        return {
          success: true,
          data: { 
            context: {
              userId: context.userId,
              username: context.username,
              userRole: context.userRole,
              userType: context.userType,
              isSuperAdmin: context.isSuperAdmin
            }
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
}