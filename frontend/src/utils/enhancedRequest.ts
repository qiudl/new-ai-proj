/**
 * 增强的请求工具 - 简化版本，不依赖jwtDebugger
 */

// import { jwtDebugger } from './jwtDebugger'; // 文件不存在，已移除
import { APIResponse, RequestOptions } from '../types/api';

// 基础配置
import { getEnvironmentConfig } from './environmentDetection';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || getEnvironmentConfig().apiBaseURL;
const DEFAULT_TIMEOUT = 10000;

interface EnhancedRequestOptions extends RequestOptions {
  debugModule?: string; // 调试模块名称
  skipJWTDebug?: boolean; // 跳过JWT调试
}

// 请求拦截器（增强版）
const enhancedRequestInterceptor = (
  url: string, 
  options: EnhancedRequestOptions
): RequestOptions => {
  const token = localStorage.getItem('token');
  
  // 记录JWT调试信息
  // JWT调试功能已简化（jwtDebugger不可用）
  if (!options.skipJWTDebug && options.debugModule) {
    console.debug(`[${options.debugModule}] Making API request to ${url}`);
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    
    // 在开发环境下添加调试信息到请求头
    if (process.env.NODE_ENV === 'development' && options.debugModule) {
      headers['X-Debug-Module'] = options.debugModule;
      headers['X-Debug-Timestamp'] = new Date().toISOString();
    }
  }

  return {
    ...options,
    headers,
  };
};

// 响应拦截器（增强版）
const enhancedResponseInterceptor = async (
  response: Response,
  debugModule?: string
): Promise<APIResponse> => {
  // 记录响应状态
  if (debugModule && process.env.NODE_ENV === 'development') {
    }

  if (!response.ok) {
    if (response.status === 401) {
      // 未授权，记录JWT问题并清除token
      if (debugModule) {
        console.error(`🔒 [${debugModule}] JWT认证失败 - 状态码401`);
        console.debug(`[${debugModule}_AUTH_FAILED] Token cleared due to 401 error`);
      }
      
      localStorage.removeItem('token');
      
      // 延迟跳转，避免在某些组件生命周期中直接跳转
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 100);
    }
    
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // 忽略JSON解析错误，使用默认错误消息
    }
    
    return {
      success: false,
      message: errorMessage,
      code: response.status.toString(),
    };
  }

  try {
    const data = await response.json();
    
    // 在开发环境下记录成功响应
    if (debugModule && process.env.NODE_ENV === 'development') {
      }
    
    return {
      success: true,
      data,
      message: data.message,
    };
  } catch (error) {
    return {
      success: false,
      message: '响应数据格式错误',
      code: 'PARSE_ERROR',
    };
  }
};

// 增强的基础请求函数
const enhancedBaseRequest = async (
  url: string,
  options: EnhancedRequestOptions = {}
): Promise<APIResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  try {
    const finalOptions = enhancedRequestInterceptor(url, {
      ...options,
      signal: controller.signal,
    });

    // 在开发环境下记录请求开始
    if (options.debugModule && process.env.NODE_ENV === 'development') {
      }

    const response = await fetch(`${BASE_URL}${url}`, {
      method: finalOptions.method || 'GET',
      headers: finalOptions.headers,
      body: finalOptions.body ? JSON.stringify(finalOptions.body) : undefined,
      signal: finalOptions.signal,
    });

    clearTimeout(timeoutId);
    return await enhancedResponseInterceptor(response, options.debugModule);
  } catch (error) {
    clearTimeout(timeoutId);
    
    // 记录错误
    if (options.debugModule && process.env.NODE_ENV === 'development') {
      console.error(`❌ [${options.debugModule}] 请求失败:`, error);
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: '请求超时',
          code: 'TIMEOUT',
        };
      }
      
      return {
        success: false,
        message: error.message,
        code: 'NETWORK_ERROR',
      };
    }
    
    return {
      success: false,
      message: '未知网络错误',
      code: 'UNKNOWN_ERROR',
    };
  }
};

// HTTP 方法封装（增强版）
const enhancedRequest = {
  get: <T = any>(
    url: string, 
    options?: Omit<EnhancedRequestOptions, 'method' | 'body'>
  ): Promise<APIResponse<T>> =>
    enhancedBaseRequest(url, { ...options, method: 'GET' }),

  post: <T = any>(
    url: string, 
    data?: any, 
    options?: Omit<EnhancedRequestOptions, 'method'>
  ): Promise<APIResponse<T>> =>
    enhancedBaseRequest(url, { ...options, method: 'POST', body: data }),

  put: <T = any>(
    url: string, 
    data?: any, 
    options?: Omit<EnhancedRequestOptions, 'method'>
  ): Promise<APIResponse<T>> =>
    enhancedBaseRequest(url, { ...options, method: 'PUT', body: data }),

  patch: <T = any>(
    url: string, 
    data?: any, 
    options?: Omit<EnhancedRequestOptions, 'method'>
  ): Promise<APIResponse<T>> =>
    enhancedBaseRequest(url, { ...options, method: 'PATCH', body: data }),

  delete: <T = any>(
    url: string, 
    options?: Omit<EnhancedRequestOptions, 'method' | 'body'>
  ): Promise<APIResponse<T>> =>
    enhancedBaseRequest(url, { ...options, method: 'DELETE' }),
};

// 便捷函数：为特定模块创建请求实例
export const createModuleRequest = (moduleName: string) => ({
  get: <T = any>(url: string, options?: Omit<EnhancedRequestOptions, 'method' | 'body' | 'debugModule'>) =>
    enhancedRequest.get<T>(url, { ...options, debugModule: moduleName }),
    
  post: <T = any>(url: string, data?: any, options?: Omit<EnhancedRequestOptions, 'method' | 'debugModule'>) =>
    enhancedRequest.post<T>(url, data, { ...options, debugModule: moduleName }),
    
  put: <T = any>(url: string, data?: any, options?: Omit<EnhancedRequestOptions, 'method' | 'debugModule'>) =>
    enhancedRequest.put<T>(url, data, { ...options, debugModule: moduleName }),
    
  patch: <T = any>(url: string, data?: any, options?: Omit<EnhancedRequestOptions, 'method' | 'debugModule'>) =>
    enhancedRequest.patch<T>(url, data, { ...options, debugModule: moduleName }),
    
  delete: <T = any>(url: string, options?: Omit<EnhancedRequestOptions, 'method' | 'body' | 'debugModule'>) =>
    enhancedRequest.delete<T>(url, { ...options, debugModule: moduleName }),
});

export { enhancedRequest };
export default enhancedRequest;