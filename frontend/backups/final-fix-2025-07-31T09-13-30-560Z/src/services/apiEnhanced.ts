import axios from 'axios';
import { NetworkErrorHandler, AppError, ErrorType, withRetry } from '../utils/errorHandling';

// API Base Configuration  
const API_BASE_URL = '/api/v1';

// 全局导航函数
let navigateFunction: ((path: string) => void) | null = null;

// 提供设置导航函数的方法
export const setNavigateFunction = (navigate: (path: string) => void) => {
  navigateFunction = navigate;
  console.log('✅ 全局导航函数已设置');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'}});

// Request interceptor - 增强版本
api.interceptors.request.use(
  (config) => {
    // 检查Token有效性
    const token = localStorage.getItem('token');
    if (token) {
      // 验证Token格式和有效期
      if (checkTokenValidity()) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔐 Token已添加到请求头');
      } else {
        console.warn('⚠️ Token无效，清除本地存储');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        // 不添加Authorization头，让服务器返回401
      }
    } else {
      console.log('ℹ️ 无Token，发送未认证请求');
    }
    return config;
  },
  (error) => {
    console.error('❌ 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling - 增强版本
api.interceptors.response.use(
  (response) => {
    console.log('✅ API响应成功:', response.config.url);
    return response.data;
  },
  (error) => {
    const requestUrl = error.config?.url || '未知URL';
    console.error('❌ API响应错误:', { url: requestUrl, error });
    
    // Handle network errors
    if (!error.response) {
      console.error('🌐 网络错误，无响应对象');
      
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
    console.error(`🔢 HTTP错误状态: ${status}`, { url: requestUrl, data });
    
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
        console.warn('🔐 认证失败，处理401错误');
        appError = new AppError(
          '登录已过期，请重新登录',
          ErrorType.AUTHENTICATION,
          401
        );
        
        // 清除认证数据
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        console.log('🧹 已清除本地认证数据');
        
        // 如果已经在登录页面，静默处理
        if (window.location.pathname === '/login') {
          console.log('ℹ️ 已在登录页面，跳过重定向');
          break;
        }
        
        // 使用React Router导航到登录页
        if (navigateFunction && typeof navigateFunction === 'function') {
          console.log('🔄 使用React Router重定向到登录页');
          setTimeout(() => {
            navigateFunction?.('/login');
          }, 100);
        } else {
          // 备用方案：直接跳转
          console.log('🔄 使用window.location重定向到登录页');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
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
    const response = await fetch(`/api/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`}});
    
    if (response.ok) {
      const user = await response.json();
      return user.username || user.email || 'Unknown User';
    }
    return 'Unknown User';
  } catch (error) {
    return 'Unknown User';
  }
};
// 检查token有效性 - 增强版本
export const checkTokenValidity = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('🔍 Token检查: 无Token');
    return false;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('⚠️ Token格式无效: 不是标准JWT格式');
      localStorage.removeItem('token');
      return false;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Date.now() / 1000;
    
    // 检查必要字段
    if (!payload.exp) {
      console.warn('⚠️ Token缺少过期时间字段');
      localStorage.removeItem('token');
      return false;
    }
    
    const timeUntilExpiry = payload.exp - currentTime;
    
    if (timeUntilExpiry <= 0) {
      console.warn('⏰ Token已过期');
      localStorage.removeItem('token');
      return false;
    }
    
    // 如果Token在5分钟内过期，发出警告
    if (timeUntilExpiry < 300) {
      console.warn(`⏳ Token将在 ${Math.floor(timeUntilExpiry / 60)} 分钟后过期`);
    }
    
    console.log(`✅ Token有效，剩余时间: ${Math.floor(timeUntilExpiry / 3600)}小时${Math.floor((timeUntilExpiry % 3600) / 60)}分钟`);
    return true;
  } catch (error) {
    console.error('❌ Token解析失败:', error);
    localStorage.removeItem('token');
    return false;
  }
};

// 主动刷新Token（如果支持）
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const timeUntilExpiry = payload.exp - currentTime;
    
    // 如果Token在10分钟内过期，尝试刷新
    if (timeUntilExpiry < 600 && timeUntilExpiry > 0) {
      console.log('🔄 尝试刷新Token...');
      // 这里可以调用refresh token API
      // const newToken = await api.post('/auth/refresh');
      // localStorage.setItem('token', newToken.data.token);
      // return true;
    }
    
    return timeUntilExpiry > 0;
  } catch (error) {
    console.error('❌ Token刷新检查失败:', error);
    return false;
  }
};

// Enhanced API wrapper with retry mechanism
export const apiWithRetry = {
  get: <T>(url: string, config?: any) => withRetry(() => api.get<T>(url, config)),
  post: <T>(url: string, data?: any, config?: any) => withRetry(() => api.post<T>(url, data, config)),
  put: <T>(url: string, data?: any, config?: any) => withRetry(() => api.put<T>(url, data, config)),
  delete: <T>(url: string, config?: any) => withRetry(() => api.delete<T>(url, config)),
  patch: <T>(url: string, data?: any, config?: any) => withRetry(() => api.patch<T>(url, data, config))};

// Safe API calls that handle errors gracefully - 增强版本
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallbackValue: T,
  errorMessage = '操作失败'
): Promise<T> => {
  try {
    // 在执行API调用前检查token有效性
    if (!checkTokenValidity()) {
      console.warn('🔐 Token无效，跳过API调用，返回默认值');
      return fallbackValue;
    }
    
    console.log('📡 执行安全API调用...');
    const result = await apiCall();
    console.log('✅ API调用成功');
    return result;
  } catch (error) {
    console.error('💥 安全API调用失败:', error);
    
    // 改进错误处理，区分不同类型的错误
    if (error instanceof AppError) {
      if (error.type === ErrorType.AUTHENTICATION) {
        console.warn('🔐 认证错误:', error.message);
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

// 创建带有Token检查的API调用包装器
export const createSecureApiCall = <T>(
  apiCallFactory: () => Promise<T>,
  fallbackValue: T,
  options: {
    errorMessage?: string;
    skipTokenCheck?: boolean;
  } = {}
) => {
  const { errorMessage = '操作失败', skipTokenCheck = false } = options;
  
  return async (): Promise<T> => {
    if (!skipTokenCheck && !checkTokenValidity()) {
      console.warn('🔐 Token验证失败，返回默认值');
      return fallbackValue;
    }
    
    try {
      return await apiCallFactory();
    } catch (error) {
      console.error('💥 安全API调用失败:', error);
      NetworkErrorHandler.handleError(error, errorMessage);
      return fallbackValue;
    }
  };
};

export default api;