import axios from 'axios';
import { NetworkErrorHandler, AppError, ErrorType, withRetry } from '../utils/errorTypes';
import { getEnvironmentConfig } from '../utils/environmentDetection';
import TokenManager from '../utils/tokenManager';
import TokenRefreshManager from '../utils/tokenRefreshManager';

// API Base Configuration  
const envConfig = getEnvironmentConfig();
const { apiBaseURL } = envConfig;
// 优先使用环境变量配置，其次使用自动检测到的配置
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || apiBaseURL);

// 全局导航函数
let navigateFunction: ((path: string) => void) | null = null;

// 防止重复401跳转的标志
let isRedirecting = false;

// 提供设置导航函数的方法
export const setNavigateFunction = (navigate: (path: string) => void) => {
  navigateFunction = navigate;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 API请求添加Authorization header:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.log('⚠️ API请求未找到token，跳过Authorization header');
    }
    
    return config;
  },
  (error) => {
    console.error('🔥 Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    // 统一解包后端标准响应 { success, message, data, timestamp }
    const body = response.data;
    
    // 特殊处理：某些API直接返回数据而不是包装格式
    const url = response.config?.url || '';
    const method = response.config?.method?.toLowerCase() || '';
    const isUserListAPI = (url.includes('/admin/users') || url.includes('/admin/company-users')) && 
                          !url.includes('/stats') && 
                          !url.includes('/export') &&
                          method === 'get'; // 只有GET请求才是列表API
    
    if (isUserListAPI && body && typeof body === 'object' && 'success' in body && 'data' in body) {
      // 企业用户列表API：后端返回 {success: true, data: {data: [], total, page}}
      // 需要返回 {data: [], total, page} 格式给前端使用
      console.log('API interceptor - User List API detected, body.data:', body.data);
      return body.data;
    }
    
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
  async (error) => {
    
    // Handle network errors
    if (!error.response) {
      // 检查是否是CORS或连接问题
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const networkError = new AppError(
          '请求超时，请检查网络连接或稍后重试', 
          ErrorType.NETWORK
        );
        return Promise.reject(networkError);
      } else if (error.message.includes('Network Error')) {
        const networkError = new AppError(
          '网络连接失败，请检查网络连接', 
          ErrorType.NETWORK
        );
        return Promise.reject(networkError);
      } else {
        const networkError = new AppError(
          '网络请求失败，请检查服务器连接', 
          ErrorType.NETWORK
        );
        return Promise.reject(networkError);
      }
    }

    // Handle HTTP status errors
    const { status, data } = error.response;
    let appError: AppError;

    switch (status) {
      case 400:
        appError = new AppError(
          data?.message || '请求参数错误',
          ErrorType.VALIDATION,
          400,
          data
        );
        break;
      case 401:
        // 改进的401错误处理 - 使用TokenRefreshManager
        appError = new AppError(
          '登录已过期，正在尝试自动刷新...',
          ErrorType.AUTHENTICATION,
          401
        );
        
        console.log('🔄 收到401错误，尝试自动刷新token...');
        
        // 防止重复处理401错误导致的多次跳转
        if (!isRedirecting) {
          isRedirecting = true;
          
          try {
            const tokenRefreshManager = TokenRefreshManager.getInstance();
            const refreshResult = await tokenRefreshManager.refreshToken();
            
            if (refreshResult.success) {
              console.log('✅ Token自动刷新成功，重新发起原始请求');
              isRedirecting = false;
              
              // 重新发起原始请求
              const originalConfig = error.config;
              if (originalConfig) {
                originalConfig.headers.Authorization = `Bearer ${refreshResult.newToken}`;
                return api.request(originalConfig);
              }
            } else if (refreshResult.needsManualAuth) {
              // 需要手动认证
              console.warn('🚫 需要手动重新认证');
              TokenManager.clearAuthData();
              localStorage.removeItem('currentUser');
              
              // 跳转到登录页
              const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
              if (navigateFunction && !isOnLoginPage) {
                setTimeout(() => {
                  navigateFunction('/login');
                  setTimeout(() => { isRedirecting = false; }, 2000);
                }, 500);
              } else if (!isOnLoginPage) {
                setTimeout(() => {
                  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                    window.location.href = '/login';
                  }
                  setTimeout(() => { isRedirecting = false; }, 2000);
                }, 1000);
              } else {
                setTimeout(() => { isRedirecting = false; }, 1000);
              }
            } else {
              // 刷新失败，但可能可以重试
              console.error('❌ Token刷新失败:', refreshResult.error);
              isRedirecting = false;
            }
          } catch (refreshError) {
            console.error('Token刷新过程中发生错误:', refreshError);
            TokenManager.clearAuthData();
            localStorage.removeItem('currentUser');
            isRedirecting = false;
          }
        }
        break;
      case 403:
        appError = new AppError(
          '权限不足',
          ErrorType.AUTHORIZATION,
          403
        );
        break;
      case 404:
        appError = new AppError(
          '请求的资源不存在',
          ErrorType.NOT_FOUND,
          404
        );
        // Don't log 404 errors to console to avoid noise
        console.debug('Resource not found (404):', error.config?.url);
        break;
      case 500:
      case 502:
      case 503:
        appError = new AppError(
          '服务器错误，请稍后重试',
          ErrorType.SERVER,
          status
        );
        break;
      default:
        appError = new AppError(
          data?.message || `请求失败 (${status})`,
          ErrorType.UNKNOWN,
          status,
          data
        );
    }

    return Promise.reject(appError);
  }
);

// Helper function to get user name by ID
export const getUserName = async (userId: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${TokenManager.getToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const user = await response.json();
      return user.username || user.email || 'Unknown User';
    }
    return 'Unknown User';
  } catch (error) {
    return 'Unknown User';
  }
};

// 检查token有效性 - 使用TokenManager统一处理
export const checkTokenValidity = (): boolean => {
  return TokenManager.isTokenValid();
};

// Enhanced API wrapper with retry mechanism
export const apiWithRetry = {
  get: <T>(url: string, config?: any) => withRetry(() => api.get<T>(url, config)),
  post: <T>(url: string, data?: any, config?: any) => withRetry(() => api.post<T>(url, data, config)),
  put: <T>(url: string, data?: any, config?: any) => withRetry(() => api.put<T>(url, data, config)),
  delete: <T>(url: string, config?: any) => withRetry(() => api.delete<T>(url, config)),
  patch: <T>(url: string, data?: any, config?: any) => withRetry(() => api.patch<T>(url, data, config)),
};

// Safe API calls that handle errors gracefully
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallbackValue: T,
  errorMessage = '操作失败'
): Promise<T> => {
  try {
    // 在执行API调用前检查token有效性
    if (!checkTokenValidity()) {
      console.warn('Token无效，跳过API调用');
      return fallbackValue;
    }
    
    return await apiCall();
  } catch (error) {
    // 改进错误处理，区分不同类型的错误
    if (error instanceof AppError) {
      if (error.type === ErrorType.AUTHENTICATION) {
        console.warn('认证错误:', error.message);
        // 认证错误不显示通用错误消息，因为已经处理了跳转
      } else {
        NetworkErrorHandler.handleError(error, errorMessage);
      }
    } else {
      NetworkErrorHandler.handleError(error, errorMessage);
    }
    return fallbackValue;
  }
};

export default api;
