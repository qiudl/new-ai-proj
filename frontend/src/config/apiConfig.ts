/**
 * API Configuration Manager
 * 统一管理API配置，解决路径重复和配置冲突问题
 * 
 * 功能：
 * - 统一的API端点管理
 * - 防止路径重复配置
 * - 类型安全的端点定义
 * - 环境相关的配置管理
 */

import { urlBuilder } from '../utils/URLBuilder';

// API端点定义
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    DEV_QUICK_LOGIN: '/auth/dev/quick-login',
    REFRESH: '/auth/refresh',
  },
  
  // 项目管理
  PROJECTS: {
    LIST: '/projects',
    DETAIL: (id: number) => `/projects/${id}`,
    CREATE: '/projects',
    UPDATE: (id: number) => `/projects/${id}`,
    DELETE: (id: number) => `/projects/${id}`,
  },
  
  // 任务管理
  TASKS: {
    LIST: (projectId: number) => `/projects/${projectId}/tasks`,
    DETAIL: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}`,
    CREATE: (projectId: number) => `/projects/${projectId}/tasks`,
    UPDATE: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}`,
    DELETE: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}`,
    START: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}/start`,
    COMPLETE: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}/complete`,
    PAUSE: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}/pause`,
  },
  
  // 文档管理
  DOCUMENTS: {
    LIST: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}/documents`,
    DETAIL: (projectId: number, taskId: number, docId: number) => `/projects/${projectId}/tasks/${taskId}/documents/${docId}`,
    CREATE: (projectId: number, taskId: number) => `/projects/${projectId}/tasks/${taskId}/documents`,
    UPDATE: (projectId: number, taskId: number, docId: number) => `/projects/${projectId}/tasks/${taskId}/documents/${docId}`,
    DELETE: (projectId: number, taskId: number, docId: number) => `/projects/${projectId}/tasks/${taskId}/documents/${docId}`,
    VERSIONS: (projectId: number, taskId: number, docId: number) => `/projects/${projectId}/tasks/${taskId}/documents/${docId}/versions`,
  },
  
  // 计时器管理
  TIMER: {
    CURRENT: '/user/timer/current',
    START: '/user/timer/start',
    STOP: '/user/timer/stop',
    PAUSE: '/user/timer/pause',
    RESUME: '/user/timer/resume',
    SSE: '/timer/sse-token', // SSE端点
  },
  
  // 用户管理
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
    TIMER: '/user/timer/current',
  },
  
  // Daily Focus 相关
  DAILY_FOCUS: {
    TASKS: '/daily-focus/tasks',
    STATS: '/daily-focus/stats',
    ADD_TASK: '/daily-focus/tasks',
    REMOVE_TASK: (id: number) => `/daily-focus/tasks/${id}`,
    COMPLETE_TASK: (id: number) => `/daily-focus/tasks/${id}/complete`,
  },
} as const;

// 请求配置类型
export interface RequestConfig {
  endpoint: string;
  params?: Record<string, string | number>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

// API配置管理器类
class APIConfig {
  private static instance: APIConfig;
  private authToken: string | null = null;
  
  private constructor() {
    this.initAuthToken();
  }
  
  public static getInstance(): APIConfig {
    if (!APIConfig.instance) {
      APIConfig.instance = new APIConfig();
    }
    return APIConfig.instance;
  }
  
  /**
   * 初始化认证token
   */
  private initAuthToken(): void {
    this.authToken = localStorage.getItem('access_token') 
                  || localStorage.getItem('authToken')
                  || localStorage.getItem('token')
                  || localStorage.getItem('auth_token');
  }
  
  /**
   * 更新认证token
   */
  public updateAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('access_token', token);
  }
  
  /**
   * 获取认证token
   */
  public getAuthToken(): string | null {
    if (!this.authToken) {
      this.initAuthToken();
    }
    return this.authToken;
  }
  
  /**
   * 构建完整的API URL
   */
  public buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const urlResult = urlBuilder.buildApiUrl(endpoint, params);
    
    if (!urlResult.isValid) {
      throw new Error(`Failed to build API URL: ${urlResult.error}`);
    }
    
    if (urlResult.warnings && urlResult.warnings.length > 0) {
      console.warn('API Config: URL construction warnings:', urlResult.warnings);
    }
    
    return urlResult.url;
  }
  
  /**
   * 构建SSE URL
   */
  public buildSSEUrl(endpoint: string): string {
    const token = this.getAuthToken();
    const urlResult = urlBuilder.buildSSEUrl(endpoint, token || undefined);
    
    if (!urlResult.isValid) {
      throw new Error(`Failed to build SSE URL: ${urlResult.error}`);
    }
    
    return urlResult.url;
  }
  
  /**
   * 获取默认请求headers
   */
  public getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
  
  /**
   * 构建完整的请求配置
   */
  public buildRequestConfig(config: RequestConfig): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  } {
    const url = this.buildUrl(config.endpoint, config.params);
    const headers = { ...this.getDefaultHeaders(), ...config.headers };
    
    const requestConfig: any = {
      url,
      method: config.method || 'GET',
      headers,
    };
    
    if (config.body && config.method !== 'GET') {
      requestConfig.body = typeof config.body === 'string' 
        ? config.body 
        : JSON.stringify(config.body);
    }
    
    return requestConfig;
  }
  
  /**
   * 参数验证工具
   */
  public validateParams(endpoint: string, requiredParams: string[], params?: Record<string, any>): void {
    if (!params && requiredParams.length > 0) {
      throw new Error(`Missing required parameters for ${endpoint}: ${requiredParams.join(', ')}`);
    }
    
    if (params) {
      const missingParams = requiredParams.filter(param => 
        params[param] === undefined || params[param] === null
      );
      
      if (missingParams.length > 0) {
        throw new Error(`Missing required parameters for ${endpoint}: ${missingParams.join(', ')}`);
      }
    }
  }
  
  /**
   * 获取环境信息
   */
  public getEnvironmentInfo(): {
    nodeEnv: string;
    isDevelopment: boolean;
    apiBaseUrl: string;
    authToken: boolean;
  } {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      isDevelopment: process.env.NODE_ENV === 'development',
      apiBaseUrl: urlBuilder.getValidatedBaseUrl() || 'unknown',
      authToken: !!this.getAuthToken(),
    };
  }
}

// 导出单例实例
export const apiConfig = APIConfig.getInstance();

// 便捷方法
export const buildApiUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  return apiConfig.buildUrl(endpoint, params);
};

export const buildSSEUrl = (endpoint: string): string => {
  return apiConfig.buildSSEUrl(endpoint);
};

export const getDefaultHeaders = (): Record<string, string> => {
  return apiConfig.getDefaultHeaders();
};

export default APIConfig;