/**
 * 增强的API客户端
 * 整合缓存、并发控制、智能重试和错误处理
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { apiCache, CacheOptions } from '../utils/apiCacheManager';
import { concurrentRequest, RequestConfig } from '../utils/concurrentRequestManager';
import { AppError, ErrorType, withRetry } from '../utils/errorTypes';
import TokenManager from '../utils/tokenManager';
import TokenRefreshManager from '../utils/tokenRefreshManager';

export interface EnhancedRequestOptions extends AxiosRequestConfig {
  // Cache options
  cache?: boolean | CacheOptions;
  cacheKey?: string;
  
  // Concurrency options
  priority?: number;
  deduplication?: boolean;
  
  // Retry options
  retry?: boolean | {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    retryCondition?: (error: any) => boolean;
  };
  
  // Error handling
  silentError?: boolean;
  errorMessage?: string;
  
  // Request metadata
  tags?: string[];
  timeout?: number;
}

export interface RequestInterceptor {
  onRequest?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>;
  onRequestError?: (error: any) => any;
}

export interface ResponseInterceptor {
  onResponse?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  onResponseError?: (error: AxiosError) => any;
}

export class EnhancedApiClient {
  private axiosInstance: axios.AxiosInstance;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  
  constructor(baseURL?: string, defaultOptions: Partial<EnhancedRequestOptions> = {}) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || process.env.REACT_APP_API_BASE_URL,
      timeout: defaultOptions.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...defaultOptions.headers
      }
    });
    
    this.setupDefaultInterceptors();
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, options: EnhancedRequestOptions = {}): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, options: EnhancedRequestOptions = {}): Promise<T> {
    return this.request<T>('POST', url, data, { ...options, cache: false }); // POST requests are not cached by default
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, options: EnhancedRequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', url, data, { ...options, cache: false });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, options: EnhancedRequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', url, undefined, { ...options, cache: false });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, options: EnhancedRequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', url, data, { ...options, cache: false });
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: EnhancedRequestOptions = {}
  ): Promise<T> {
    const {
      cache = false,
      cacheKey,
      priority = 5,
      deduplication = true,
      retry = true,
      silentError = false,
      errorMessage,
      tags = [],
      ...axiosConfig
    } = options;

    // Generate cache key
    const finalCacheKey = this.generateCacheKey(method, url, axiosConfig.params, data, cacheKey);

    // Check cache for GET requests
    if (method === 'GET' && cache) {
      const cachedData = apiCache.get<T>(finalCacheKey);
      if (cachedData !== null) {
        console.log(`📋 Cache hit: ${finalCacheKey}`);
        return cachedData;
      }
    }

    // Prepare request config
    const requestConfig: RequestConfig = {
      url,
      method,
      params: axiosConfig.params,
      data,
      headers: axiosConfig.headers,
      timeout: axiosConfig.timeout
    };

    // Execute request with concurrency control and retry
    const executeRequest = async (): Promise<T> => {
      if (deduplication) {
        return concurrentRequest.request(
          (config) => this.executeAxiosRequest<T>(config, axiosConfig),
          requestConfig,
          priority
        );
      } else {
        return this.executeAxiosRequest<T>(requestConfig, axiosConfig);
      }
    };

    let result: T;
    
    if (retry === true || (retry && typeof retry === 'object')) {
      const retryOptions = typeof retry === 'object' ? retry : {};
      result = await withRetry(executeRequest, retryOptions.maxRetries, retryOptions.delay);
    } else {
      result = await executeRequest();
    }

    // Cache successful GET requests
    if (method === 'GET' && cache && result !== null) {
      const cacheOptions: CacheOptions = typeof cache === 'object' ? cache : {
        ttl: 5 * 60 * 1000, // 5 minutes default
        tags: [...tags, 'api-response']
      };
      
      apiCache.set(finalCacheKey, result, cacheOptions);
      console.log(`💾 Cached response: ${finalCacheKey}`);
    }

    // Invalidate related cache entries for non-GET requests
    if (method !== 'GET' && tags.length > 0) {
      for (const tag of tags) {
        const invalidatedCount = apiCache.deleteByTag(tag);
        if (invalidatedCount > 0) {
          console.log(`🗑️ Invalidated ${invalidatedCount} cache entries with tag: ${tag}`);
        }
      }
    }

    return result;
  }

  /**
   * 执行Axios请求
   */
  private async executeAxiosRequest<T>(
    config: RequestConfig,
    axiosConfig: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.axiosInstance.request({
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params,
        ...axiosConfig
      });
      
      return this.processResponse<T>(response);
    } catch (error) {
      throw this.processError(error as AxiosError);
    }
  }

  /**
   * 处理响应数据
   */
  private processResponse<T>(response: AxiosResponse): T {
    // Apply custom response interceptors
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        response = interceptor.onResponse(response) as AxiosResponse;
      }
    }

    // Handle different response formats
    const body = response.data;
    const url = response.config?.url || '';
    const method = response.config?.method?.toLowerCase() || '';

    // Special handling for different API formats (similar to original api.ts)
    const isUserListAPI = (url.includes('/admin/users') || url.includes('/admin/company-users')) && 
                          !url.includes('/stats') && 
                          !url.includes('/export') &&
                          method === 'get';
    
    const isRecycleBinAPI = url.includes('/system/recycle/') && method === 'get';
    
    if (isUserListAPI && body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    
    if (isRecycleBinAPI && body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body;
    }
    
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    
    return body;
  }

  /**
   * 处理错误
   */
  private processError(error: AxiosError): AppError {
    // Apply custom error interceptors
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponseError) {
        const processedError = interceptor.onResponseError(error);
        if (processedError) {
          error = processedError;
        }
      }
    }

    if (!error.response) {
      // Network errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return new AppError('请求超时，请检查网络连接或稍后重试', ErrorType.NETWORK);
      } else if (error.message.includes('Network Error')) {
        return new AppError('网络连接失败，请检查网络连接', ErrorType.NETWORK);
      } else {
        return new AppError('网络请求失败，请检查服务器连接', ErrorType.NETWORK);
      }
    }

    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return new AppError(data?.message || '请求参数错误', ErrorType.VALIDATION, status, data);
      case 401:
        return new AppError('登录已过期', ErrorType.AUTHENTICATION, status);
      case 403:
        return new AppError('权限不足', ErrorType.AUTHORIZATION, status);
      case 404:
        return new AppError('请求的资源不存在', ErrorType.UNKNOWN, status);
      case 500:
      case 502:
      case 503:
        return new AppError('服务器错误，请稍后重试', ErrorType.SYSTEM, status);
      default:
        return new AppError(data?.message || `请求失败 (${status})`, ErrorType.UNKNOWN, status, data);
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    method: string,
    url: string,
    params?: any,
    data?: any,
    customKey?: string
  ): string {
    if (customKey) return customKey;
    
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramsStr}:${dataStr}`;
  }

  /**
   * 设置默认拦截器
   */
  private setupDefaultInterceptors(): void {
    // Request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = TokenManager.getToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Apply custom request interceptors
        for (const interceptor of this.requestInterceptors) {
          if (interceptor.onRequest) {
            config = interceptor.onRequest(config) as AxiosRequestConfig;
          }
        }
        
        return config;
      },
      (error) => {
        // Apply custom request error interceptors
        for (const interceptor of this.requestInterceptors) {
          if (interceptor.onRequestError) {
            error = interceptor.onRequestError(error);
          }
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const tokenRefreshManager = TokenRefreshManager.getInstance();
            const result = await tokenRefreshManager.refreshToken();
            
            if (result.success && result.newToken) {
              originalRequest.headers.Authorization = `Bearer ${result.newToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed in interceptor:', refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 清空缓存
   */
  clearCache(pattern?: RegExp | string): void {
    if (!pattern) {
      apiCache.clear();
    } else if (typeof pattern === 'string') {
      apiCache.deleteByTag(pattern);
    } else {
      apiCache.deleteByPattern(pattern);
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(requests: Array<{
    method: string;
    url: string;
    options?: EnhancedRequestOptions;
  }>): Promise<void> {
    const warmupPromises = requests.map(({ method, url, options = {} }) => {
      return this.request(method, url, undefined, { ...options, silentError: true })
        .catch(error => {
          console.warn(`Cache warmup failed for ${method} ${url}:`, error);
          return null;
        });
    });
    
    await Promise.allSettled(warmupPromises);
    console.log(`🔥 Cache warmed up with ${requests.length} requests`);
  }

  /**
   * 获取客户端状态
   */
  getStatus() {
    return {
      cache: apiCache.getStats(),
      concurrency: concurrentRequest.getStatus(),
      interceptors: {
        request: this.requestInterceptors.length,
        response: this.responseInterceptors.length
      }
    };
  }
}

// 创建默认实例
const enhancedApiClient = new EnhancedApiClient();

// 导出便捷方法
export const enhancedApi = {
  get: <T>(url: string, options?: EnhancedRequestOptions) => enhancedApiClient.get<T>(url, options),
  post: <T>(url: string, data?: any, options?: EnhancedRequestOptions) => enhancedApiClient.post<T>(url, data, options),
  put: <T>(url: string, data?: any, options?: EnhancedRequestOptions) => enhancedApiClient.put<T>(url, data, options),
  delete: <T>(url: string, options?: EnhancedRequestOptions) => enhancedApiClient.delete<T>(url, options),
  patch: <T>(url: string, data?: any, options?: EnhancedRequestOptions) => enhancedApiClient.patch<T>(url, data, options),
  
  // Utility methods
  clearCache: (pattern?: RegExp | string) => enhancedApiClient.clearCache(pattern),
  warmupCache: (requests: Array<{ method: string; url: string; options?: EnhancedRequestOptions }>) => 
    enhancedApiClient.warmupCache(requests),
  getStatus: () => enhancedApiClient.getStatus(),
  
  // Interceptors
  addRequestInterceptor: (interceptor: RequestInterceptor) => enhancedApiClient.addRequestInterceptor(interceptor),
  addResponseInterceptor: (interceptor: ResponseInterceptor) => enhancedApiClient.addResponseInterceptor(interceptor)
};

export default enhancedApiClient;