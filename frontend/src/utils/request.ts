import { APIResponse, RequestOptions, HTTPMethod } from '../types/api';

// 基础配置
// 在生产环境下使用相对路径，开发环境使用完整URL
const BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api/v1'  // 生产环境通过nginx代理
  : (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || '/api/v1');
const DEFAULT_TIMEOUT = 10000;

// 请求拦截器
const requestInterceptor = (url: string, options: RequestOptions): RequestOptions => {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...options,
    headers,
  };
};

// 检查是否为分析API（需要静默处理500错误）
const isAnalysisApi = (url: string): boolean => {
  return url.includes('/analysis/');
};

// 响应拦截器
const responseInterceptor = async (response: Response, requestUrl: string): Promise<APIResponse> => {
  if (!response.ok) {
    if (response.status === 401) {
      // 未授权，清除token并跳转到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // 忽略JSON解析错误，使用默认错误消息
    }
    
    // 对于分析API的500错误，提供友好的错误消息且不在控制台显示错误
    if (response.status === 500 && isAnalysisApi(requestUrl)) {
      console.debug(`Analysis API temporarily unavailable: ${requestUrl} (Node.js environment needed)`);
      return {
        success: false,
        message: '分析服务暂不可用：后端需要Node.js环境来执行分析脚本',
        code: response.status.toString(),
      };
    }
    
    return {
      success: false,
      message: errorMessage,
      code: response.status.toString(),
    };
  }

  try {
    const data = await response.json();
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

// 基础请求函数
const baseRequest = async (
  url: string,
  options: RequestOptions = {}
): Promise<APIResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  try {
    const finalOptions = requestInterceptor(url, {
      ...options,
      signal: controller.signal,
    });

    const response = await fetch(`${BASE_URL}${url}`, {
      method: finalOptions.method || 'GET',
      headers: finalOptions.headers,
      body: finalOptions.body ? JSON.stringify(finalOptions.body) : undefined,
      signal: finalOptions.signal,
    });

    clearTimeout(timeoutId);
    return await responseInterceptor(response, url);
  } catch (error) {
    clearTimeout(timeoutId);
    
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

// HTTP 方法封装
const request = {
  get: <T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> =>
    baseRequest(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<APIResponse<T>> =>
    baseRequest(url, { ...options, method: 'POST', body: data }),

  put: <T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<APIResponse<T>> =>
    baseRequest(url, { ...options, method: 'PUT', body: data }),

  patch: <T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<APIResponse<T>> =>
    baseRequest(url, { ...options, method: 'PATCH', body: data }),

  delete: <T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> =>
    baseRequest(url, { ...options, method: 'DELETE' }),
};

export { request };
export default request;