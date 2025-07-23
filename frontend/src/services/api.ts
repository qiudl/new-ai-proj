import axios from 'axios';
import { NetworkErrorHandler, AppError, ErrorType, withRetry } from '../utils/errorHandling';

// API Base Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

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
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      const networkError = new AppError(
        '网络连接失败，请检查网络连接', 
        ErrorType.NETWORK
      );
      return Promise.reject(networkError);
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
        appError = new AppError(
          '认证失败，请重新登录',
          ErrorType.AUTHENTICATION,
          401
        );
        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 1000);
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
    const response = await fetch(`/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    return await apiCall();
  } catch (error) {
    NetworkErrorHandler.handleError(error, errorMessage);
    return fallbackValue;
  }
};

export default api;