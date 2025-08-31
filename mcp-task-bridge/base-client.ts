import axios, { AxiosResponse, AxiosError } from 'axios';
import { MCPPermissionManager, requiresPermission } from './permission-manager.js';
import { ApiResponse } from './types.js';

export abstract class BaseClient {
  protected apiBase: string;
  protected authToken?: string;
  protected permissionManager: MCPPermissionManager;

  constructor(apiBase: string = 'http://localhost:8080/api/v1') {
    this.apiBase = apiBase;
    // 从环境变量读取令牌（不再硬编码）。优先 TASK_API_TOKEN，兼容 API_TOKEN。
    const token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
    if (token && token.trim().length > 0) {
      this.authToken = token.trim();
    }

    // 初始化权限管理器
    this.permissionManager = new MCPPermissionManager(
      apiBase, 
      this.authToken,
      {
        enablePermissionCheck: process.env.MCP_ENABLE_PERMISSIONS !== 'false', // 默认启用
        enableLogging: process.env.MCP_DEBUG === 'true', // 默认关闭
        cacheTimeout: parseInt(process.env.MCP_CACHE_TIMEOUT || '300') // 默认5分钟
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

  protected async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    try {
      const config = {
        method,
        url: `${this.apiBase}${url}`,
        headers: this.getHeaders(),
        data,
        params,
        proxy: false
      };

      const response: AxiosResponse = await axios(config);

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
          return { success: false, error: '认证失败，请检查API令牌' };
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
      // 网络错误
      return {
        success: false,
        error: '网络连接失败，请检查服务器是否正常运行'
      };
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
      return await this.permissionManager.hasPermission(operation, resourceType);
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
    this.permissionManager.setAuthToken(token);
  }

  // 获取API基础URL
  public getApiBase(): string {
    return this.apiBase;
  }

  // 设置API基础URL
  public setApiBase(apiBase: string): void {
    this.apiBase = apiBase;
    this.permissionManager.setApiBase(apiBase);
  }
}