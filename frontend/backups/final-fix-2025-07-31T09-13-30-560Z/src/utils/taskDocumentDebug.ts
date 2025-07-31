// API响应拦截器增强 - 用于调试任务文档保存问题
import api from '../services/api';

// 添加请求拦截器日志
api.interceptors.request.use(
  (config) => {
    // 记录任务文档相关的请求
    if (config.url?.includes('/document')) {
      console.log('📤 任务文档API请求:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        headers: config.headers
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器日志
api.interceptors.response.use(
  (response) => {
    // 记录任务文档相关的响应
    if (response.config.url?.includes('/document')) {
      console.log('📥 任务文档API响应:', {
        status: response.status,
        data: response.data,
        url: response.config.url
      });
    }
    return response;
  },
  (error) => {
    // 详细记录任务文档相关的错误
    if (error.config?.url?.includes('/document')) {
      console.error('❌ 任务文档API错误:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

export default api;
