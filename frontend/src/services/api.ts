import axios from 'axios';
import { NetworkErrorHandler, AppError, ErrorType, withRetry } from '../utils/errorTypes';
import { getEnvironmentConfig } from '../utils/environmentDetection';

// API Base Configuration  
const envConfig = getEnvironmentConfig();
const { apiBaseURL } = envConfig;
// 优先使用环境变量配置，其次使用自动检测到的配置
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || apiBaseURL);

// 全局导航函数
let navigateFunction: ((path: string) => void) | null = null;

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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (error) => {
    
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
        // 改进的401错误处理
        appError = new AppError(
          '登录已过期，请重新登录',
          ErrorType.AUTHENTICATION,
          401
        );
        
        // 清除认证数据
        localStorage.removeItem('token');
        console.warn('JWT Token已过期或无效，已清除本地token');
        
        // 在登录页禁止弹窗提示，避免打扰
        const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
        if (!isOnLoginPage && typeof window !== 'undefined' && typeof window.alert === 'function') {
          setTimeout(() => {
            alert('登录已过期，即将跳转到登录页面');
          }, 100);
        }
        
        // 使用React Router导航，避免强制页面跳转
        if (navigateFunction && typeof navigateFunction === 'function') {
          const nav = navigateFunction; // 确保类型安全
          setTimeout(() => {
            if (!isOnLoginPage) {
              nav('/login');
            }
          }, 1000);
        } else {
          // 备用方案：延迟执行页面跳转
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }, 1500);
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

// 检查token有效性
export const checkTokenValidity = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = Date.now() > payload.exp * 1000;
    
    if (isExpired) {
      console.warn('Token已过期，将清除本地存储');
      localStorage.removeItem('token');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token格式无效:', error);
    localStorage.removeItem('token');
    return false;
  }
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
