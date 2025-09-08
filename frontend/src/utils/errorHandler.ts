import { notification, message } from 'antd';
import { ArgsProps } from 'antd/es/notification';

// 错误类型枚举
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// 错误级别枚举
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

// 统一错误对象接口
export interface AppError {
  type: ErrorType;
  level: ErrorLevel;
  code?: string;
  message: string;
  details?: string;
  field?: string;
  timestamp?: Date;
  context?: Record<string, any>;
}

// API错误响应接口
export interface ApiErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  field?: string;
  validation_errors?: Record<string, string[]>;
}

// 用户友好的错误消息映射
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // 网络错误
  'ERR_NETWORK': '网络连接失败，请检查网络连接后重试',
  'ERR_TIMEOUT': '请求超时，请稍后重试',
  'ERR_CONNECTION_REFUSED': '服务暂时不可用，请稍后重试',
  
  // 认证和权限错误
  'UNAUTHORIZED': '登录已过期，请重新登录',
  'FORBIDDEN': '权限不足，无法执行此操作',
  'INVALID_TOKEN': '登录凭证无效，请重新登录',
  
  // 验证错误
  'VALIDATION_ERROR': '输入数据格式不正确',
  'REQUIRED_FIELD': '必填字段不能为空',
  'INVALID_FORMAT': '数据格式不正确',
  'DUPLICATE_VALUE': '该值已存在，请使用其他值',
  
  // 业务错误
  'TASK_NOT_FOUND': '任务不存在或已被删除',
  'PROJECT_NOT_FOUND': '项目不存在或已被删除',
  'USER_NOT_FOUND': '用户不存在',
  'DEPARTMENT_NOT_FOUND': '部门不存在',
  
  // 服务器错误
  'INTERNAL_SERVER_ERROR': '服务器内部错误，请稍后重试',
  'SERVICE_UNAVAILABLE': '服务暂时不可用，请稍后重试',
  'DATABASE_ERROR': '数据库操作失败，请稍后重试',
  
  // 文件操作错误
  'FILE_TOO_LARGE': '文件大小超过限制',
  'INVALID_FILE_TYPE': '不支持的文件类型',
  'UPLOAD_FAILED': '文件上传失败，请重试',
};

// HTTP状态码错误映射
const HTTP_STATUS_MESSAGE_MAP: Record<number, string> = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '权限不足，无法执行此操作',
  404: '请求的资源不存在',
  408: '请求超时，请重试',
  409: '数据冲突，请刷新后重试',
  422: '输入数据验证失败',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误，请稍后重试',
  502: '服务网关错误，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '服务响应超时，请稍后重试',
};

/**
 * 统一错误处理类
 */
export class ErrorHandler {
  // 解析API错误响应
  static parseApiError(error: any): AppError {
    const timestamp = new Date();
    
    // 网络错误
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return {
        type: ErrorType.NETWORK,
        level: ErrorLevel.ERROR,
        code: error.code || 'NETWORK_ERROR',
        message: ERROR_MESSAGE_MAP['ERR_NETWORK'] || '网络连接失败',
        timestamp,
        context: { originalError: error },
      };
    }
    
    // HTTP状态码错误
    const status = error.response?.status;
    const data = error.response?.data as ApiErrorResponse;
    
    let errorType = ErrorType.UNKNOWN;
    let errorLevel = ErrorLevel.ERROR;
    
    // 根据状态码确定错误类型
    switch (status) {
      case 400:
      case 422:
        errorType = ErrorType.VALIDATION;
        errorLevel = ErrorLevel.WARNING;
        break;
      case 401:
      case 403:
        errorType = ErrorType.PERMISSION;
        break;
      case 404:
        errorType = ErrorType.NOT_FOUND;
        break;
      case 408:
      case 504:
        errorType = ErrorType.TIMEOUT;
        break;
      case 500:
      case 502:
      case 503:
        errorType = ErrorType.SERVER;
        break;
    }
    
    // 获取错误消息
    let message = data?.message || HTTP_STATUS_MESSAGE_MAP[status] || '未知错误';
    
    // 优先使用映射的用户友好消息
    if (data?.code && ERROR_MESSAGE_MAP[data.code]) {
      message = ERROR_MESSAGE_MAP[data.code];
    }
    
    return {
      type: errorType,
      level: errorLevel,
      code: data?.code || `HTTP_${status}`,
      message,
      details: data?.details,
      field: data?.field,
      timestamp,
      context: {
        status,
        originalData: data,
        validationErrors: data?.validation_errors,
      },
    };
  }
  
  // 显示错误通知
  static showError(error: AppError | string, options: Partial<ArgsProps> = {}) {
    const appError = typeof error === 'string' 
      ? { type: ErrorType.UNKNOWN, level: ErrorLevel.ERROR, message: error }
      : error;
    
    const defaultOptions: ArgsProps = {
      message: '操作失败',
      description: appError.message,
      placement: 'topRight',
      duration: 4.5,
      ...options,
    };
    
    switch (appError.level) {
      case ErrorLevel.ERROR:
        notification.error(defaultOptions);
        break;
      case ErrorLevel.WARNING:
        notification.warning({
          ...defaultOptions,
          message: '输入验证警告',
        });
        break;
      case ErrorLevel.INFO:
        notification.info({
          ...defaultOptions,
          message: '提示信息',
        });
        break;
      case ErrorLevel.SUCCESS:
        notification.success({
          ...defaultOptions,
          message: '操作成功',
        });
        break;
    }
  }
  
  // 显示简单消息
  static showMessage(content: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    message[type](content);
  }
  
  // 显示验证错误
  static showValidationErrors(errors: Record<string, string[]> | Record<string, string>) {
    const errorMessages: string[] = [];
    
    Object.entries(errors).forEach(([field, fieldErrors]) => {
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach(error => errorMessages.push(`${field}: ${error}`));
      } else {
        errorMessages.push(`${field}: ${fieldErrors}`);
      }
    });
    
    notification.warning({
      message: '表单验证错误',
      description: errorMessages.join('\n'),
      placement: 'topRight',
      duration: 6,
    });
  }
  
  // 处理异步操作错误
  static async handleAsyncError<T>(
    operation: () => Promise<T>,
    options: {
      showError?: boolean;
      customMessage?: string;
      onError?: (error: AppError) => void;
    } = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const appError = this.parseApiError(error);
      
      // 自定义错误处理
      if (options.onError) {
        options.onError(appError);
      }
      
      // 显示错误（默认显示）
      if (options.showError !== false) {
        const message = options.customMessage || appError.message;
        this.showError({ ...appError, message });
      }
      
      // 特殊处理：认证错误时跳转到登录页
      if (appError.type === ErrorType.PERMISSION && appError.code === 'UNAUTHORIZED') {
        // 可以在这里添加跳转逻辑
        console.log('需要重新登录');
      }
      
      return null;
    }
  }
  
  // 全局错误处理器（用于未捕获的错误）
  static setupGlobalErrorHandler() {
    // 未捕获的Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      const appError = this.parseApiError(event.reason);
      this.showError(appError);
      
      // 防止错误显示在控制台
      event.preventDefault();
    });
    
    // 未捕获的JavaScript错误
    window.addEventListener('error', (event) => {
      console.error('Unhandled error:', event.error);
      
      const appError: AppError = {
        type: ErrorType.UNKNOWN,
        level: ErrorLevel.ERROR,
        message: '应用程序发生未知错误',
        details: event.error?.message,
        timestamp: new Date(),
      };
      
      this.showError(appError);
    });
  }
}

// 快捷方法
export const showError = ErrorHandler.showError;
export const showMessage = ErrorHandler.showMessage;
export const showValidationErrors = ErrorHandler.showValidationErrors;
export const handleAsyncError = ErrorHandler.handleAsyncError.bind(ErrorHandler);
export const parseApiError = ErrorHandler.parseApiError;

// React Hook：用于组件中的错误处理
import { useCallback } from 'react';

export const useErrorHandler = () => {
  const handleError = useCallback((error: any, customMessage?: string) => {
    const appError = ErrorHandler.parseApiError(error);
    if (customMessage) {
      appError.message = customMessage;
    }
    ErrorHandler.showError(appError);
    return appError;
  }, []);
  
  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      showError?: boolean;
      customMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: AppError) => void;
    }
  ): Promise<T | null> => {
    try {
      const result = await operation();
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (error) {
      const appError = ErrorHandler.parseApiError(error);
      
      if (options?.onError) {
        options.onError(appError);
      }
      
      if (options?.showError !== false) {
        const message = options?.customMessage || appError.message;
        ErrorHandler.showError({ ...appError, message });
      }
      
      return null;
    }
  }, []);
  
  return {
    handleError,
    handleAsyncOperation,
    showError: ErrorHandler.showError,
    showMessage: ErrorHandler.showMessage,
    showValidationErrors: ErrorHandler.showValidationErrors,
  };
};

// 表单错误处理Hook
export const useFormErrorHandler = () => {
  const { handleError } = useErrorHandler();
  
  const handleFormSubmitError = useCallback((error: any, form?: any) => {
    const appError = ErrorHandler.parseApiError(error);
    
    // 如果是验证错误且有详细的字段错误，设置表单字段错误
    if (appError.type === ErrorType.VALIDATION && appError.context?.validationErrors && form) {
      const fieldErrors: any = {};
      Object.entries(appError.context.validationErrors).forEach(([field, errors]) => {
        fieldErrors[field] = {
          errors: Array.isArray(errors) ? errors : [errors],
        };
      });
      form.setFields(Object.keys(fieldErrors).map(field => ({
        name: field,
        errors: fieldErrors[field].errors,
      })));
    } else {
      // 显示通用错误
      ErrorHandler.showError(appError);
    }
    
    return appError;
  }, [handleError]);
  
  return {
    handleFormSubmitError,
    handleError,
  };
};

export default ErrorHandler;