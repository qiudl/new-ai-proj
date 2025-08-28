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
    const token = localStorage.getItem('token');
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
        // 改进的401错误处理 - 防止重复跳转 + 自动重新获取token
        appError = new AppError(
          '登录已过期，请重新登录',
          ErrorType.AUTHENTICATION,
          401
        );
        
        console.log('🔄 收到401错误，尝试自动重新获取token...');
        
        // 防止重复处理401错误导致的多次跳转
        if (!isRedirecting) {
          isRedirecting = true;
          
          // 尝试开发环境自动重新获取token
          if (window.location.port === '3001') {
            try {
              console.log('🚀 开发环境下尝试自动重新登录...');
              const response = await fetch('/api/v1/auth/dev-quick-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin' })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.access_token) {
                  localStorage.setItem('token', data.data.access_token);
                  localStorage.setItem('currentUser', JSON.stringify(data.data.user));
                  console.log('✅ 自动重新登录成功，token已更新');
                  isRedirecting = false;
                  // 重新发起原来的请求
                  return;
                }
              }
            } catch (autoReloginError) {
              console.error('自动重新登录失败:', autoReloginError);
            }
          }
          
          // 清除认证数据
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          console.warn('JWT Token已过期或无效，已清除本地token');
          
          // 记录是否在登录页（用于后续跳转控制）
          const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
          
          // 使用React Router导航，避免强制页面跳转
          if (navigateFunction && typeof navigateFunction === 'function' && !isOnLoginPage) {
            const nav = navigateFunction; // 确保类型安全
            setTimeout(() => {
              nav('/login');
              // 重置跳转标志，允许后续重新认证
              setTimeout(() => {
                isRedirecting = false;
              }, 2000);
            }, 500);
          } else if (!isOnLoginPage) {
            // 备用方案：延迟执行页面跳转
            setTimeout(() => {
              if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
              // 重置跳转标志
              setTimeout(() => {
                isRedirecting = false;
              }, 2000);
            }, 1000);
          } else {
            // 如果已经在登录页，直接重置标志
            setTimeout(() => {
              isRedirecting = false;
            }, 1000);
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
  if (!token) {
    console.log('🔍 Token检查：未找到token');
    return false;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000; // 当前时间（秒）
    const isExpired = currentTime > payload.exp;
    
    console.log('🔍 Token检查:', {
      currentTime: new Date(currentTime * 1000).toISOString(),
      expireTime: new Date(payload.exp * 1000).toISOString(),
      isExpired,
      remainingSeconds: payload.exp - currentTime
    });
    
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
