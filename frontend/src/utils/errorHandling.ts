import React from 'react';
import { message, notification } from 'antd';
import { performanceMonitor } from './performanceOptimization';

// Enhanced error types for better classification
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION', 
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  FILE_UPLOAD = 'FILE_UPLOAD',
  PERFORMANCE = 'PERFORMANCE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

// Enhanced custom error class with performance tracking
export class AppError extends Error {
  public type: ErrorType;
  public statusCode?: number;
  public details?: any;
  public timestamp: number;
  public componentName?: string;
  public retryCount?: number;

  constructor(
    message: string, 
    type: ErrorType = ErrorType.UNKNOWN, 
    statusCode?: number, 
    details?: any,
    componentName?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = Date.now();
    this.componentName = componentName;
    
    // Track error performance impact
    performanceMonitor.startMeasure('error_creation', {
      errorType: type,
      component: componentName,
      statusCode
    });
    performanceMonitor.endMeasure('error_creation');
  }
}

// 网络错误处理
export class NetworkErrorHandler {
  static handleResponse(response: Response): void {
    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new AppError('请求参数错误', ErrorType.VALIDATION, 400);
        case 401:
          throw new AppError('认证失败，请重新登录', ErrorType.AUTHENTICATION, 401);
        case 403:
          throw new AppError('权限不足', ErrorType.AUTHORIZATION, 403);
        case 404:
          throw new AppError('请求的资源不存在', ErrorType.NOT_FOUND, 404);
        case 413:
          throw new AppError('文件过大或请求体过大', ErrorType.FILE_UPLOAD, 413);
        case 429:
          throw new AppError('请求过于频繁，请稍后重试', ErrorType.RATE_LIMIT, 429);
        case 500:
          throw new AppError('服务器内部错误', ErrorType.SERVER, 500);
        case 502:
          throw new AppError('网络连接错误', ErrorType.NETWORK, 502);
        case 503:
          throw new AppError('服务暂时不可用', ErrorType.SERVER, 503);
        case 504:
          throw new AppError('请求超时', ErrorType.TIMEOUT, 504);
        default:
          throw new AppError(`请求失败 (${response.status})`, ErrorType.UNKNOWN, response.status);
      }
    }
  }

  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    errorMessage = '操作失败'
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, errorMessage);
      return null;
    }
  }

  static handleError(
    error: unknown, 
    fallbackMessage = '发生未知错误',
    context?: { componentName?: string; showDetailed?: boolean }
  ): void {
    console.group('🚨 Enhanced Error Handler');
    console.error('Error:', error);
    console.error('Context:', context);
    console.groupEnd();

    if (error instanceof AppError) {
      switch (error.type) {
        case ErrorType.AUTHENTICATION:
          notification.error({
            message: '身份验证失败',
            description: error.message,
            duration: 6,
            placement: 'topRight',
            key: 'auth-error'
          });
          // 重定向到登录页面
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          break;
          
        case ErrorType.FILE_UPLOAD:
          notification.error({
            message: '文件上传失败',
            description: `${error.message}${error.details?.fileName ? ` (文件: ${error.details.fileName})` : ''}`,
            duration: 8,
            placement: 'topRight'
          });
          break;
          
        case ErrorType.RATE_LIMIT:
          notification.warning({
            message: '请求过于频繁',
            description: error.message + ' 请稍后再试',
            duration: 6,
            placement: 'topRight',
            key: 'rate-limit-error'
          });
          break;
          
        case ErrorType.TIMEOUT:
          notification.warning({
            message: '请求超时',
            description: error.message + ' 请检查网络连接',
            duration: 6,
            placement: 'topRight'
          });
          break;
          
        case ErrorType.NETWORK:
          notification.warning({
            message: '网络连接问题',
            description: error.message,
            duration: 6,
            placement: 'topRight',
            key: 'network-error'
          });
          break;
          
        case ErrorType.VALIDATION:
          message.warning({
            content: error.message,
            duration: 4,
            key: 'validation-error'
          });
          break;
          
        case ErrorType.SERVER:
          notification.error({
            message: '服务器错误',
            description: context?.showDetailed 
              ? `${error.message} (状态码: ${error.statusCode})`
              : error.message,
            duration: 8,
            placement: 'topRight'
          });
          break;
          
        default:
          message.error({
            content: error.message,
            duration: 5
          });
      }
    } else if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // 请求被取消，不显示错误
        return;
      }
      message.error({
        content: error.message || fallbackMessage,
        duration: 5
      });
    } else {
      message.error({
        content: fallbackMessage,
        duration: 5
      });
    }
  }
}

// 重试机制
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

// 数据验证工具
export class ValidationHelper {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidTaskTitle(title: string): boolean {
    return title.trim().length >= 2 && title.trim().length <= 200;
  }

  static isValidProjectName(name: string): boolean {
    return name.trim().length >= 2 && name.trim().length <= 100;
  }

  static validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new AppError(`${fieldName}不能为空`, ErrorType.VALIDATION);
    }
  }

  static validateLength(value: string, fieldName: string, min: number, max: number): void {
    const length = value.trim().length;
    if (length < min || length > max) {
      throw new AppError(
        `${fieldName}长度必须在${min}-${max}字符之间`,
        ErrorType.VALIDATION
      );
    }
  }
}

// 边界情况处理
export class BoundaryHelper {
  // 安全的数组访问
  static safeArrayAccess<T>(array: T[], index: number, defaultValue: T): T {
    return array && array[index] !== undefined ? array[index] : defaultValue;
  }

  // 安全的对象属性访问
  static safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current == null || typeof current !== 'object') {
          return defaultValue;
        }
        current = current[key];
      }
      
      return current !== undefined ? (current as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // 确保数组格式
  static ensureArray<T>(value: any): T[] {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value as T];
  }

  // 数字边界检查
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  // 安全的JSON解析
  static safeJsonParse<T>(json: string, defaultValue: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }
}

// Enhanced progress feedback system
export class ProgressFeedback {
  private static activeNotifications = new Map<string, string>();

  static showProgress(
    key: string,
    title: string, 
    progress: number, 
    details?: {
      total?: number;
      current?: number;
      eta?: number;
      throughput?: string;
      description?: string;
    }
  ): void {
    const { total, current, eta, throughput, description } = details || {};
    
    let desc = description || `进度: ${Math.round(progress)}%`;
    
    if (current && total) {
      desc += ` (${current}/${total})`;
    }
    
    if (eta && eta > 0) {
      desc += ` - 预计剩余: ${Math.round(eta)}秒`;
    }
    
    if (throughput) {
      desc += ` - 速度: ${throughput}`;
    }

    notification.info({
      message: title,
      description: desc,
      duration: 0, // Persistent until manually closed
      key,
      placement: 'bottomRight'
    });
    
    this.activeNotifications.set(key, title);
  }

  static updateProgress(
    key: string,
    progress: number,
    details?: { current?: number; total?: number; eta?: number }
  ): void {
    if (this.activeNotifications.has(key)) {
      const title = this.activeNotifications.get(key)!;
      this.showProgress(key, title, progress, details);
    }
  }

  static completeProgress(key: string, successMessage?: string): void {
    notification.destroy(key);
    this.activeNotifications.delete(key);
    
    if (successMessage) {
      message.success({
        content: successMessage,
        duration: 3
      });
    }
  }

  static clearProgress(key: string): void {
    notification.destroy(key);
    this.activeNotifications.delete(key);
  }

  static clearAllProgress(): void {
    this.activeNotifications.forEach((_, key) => {
      notification.destroy(key);
    });
    this.activeNotifications.clear();
  }
}

// Enhanced success feedback
export class SuccessFeedback {
  static show(
    message: string,
    options?: {
      duration?: number;
      showStats?: boolean;
      context?: Record<string, any>;
      type?: 'message' | 'notification';
    }
  ): void {
    const { duration = 3, showStats, context, type = 'message' } = options || {};

    if (type === 'notification' || (showStats && context)) {
      const statsText = showStats && context ? this.formatStats(context) : '';
      notification.success({
        message: '操作成功',
        description: `${message}${statsText ? `\n${statsText}` : ''}`,
        duration,
        placement: 'topRight'
      });
    } else {
      message.success({
        content: message,
        duration
      });
    }
  }

  private static formatStats(context: Record<string, any>): string {
    const stats = [];
    
    if (context.fileSize) {
      stats.push(`大小: ${Math.round(context.fileSize / 1024)}KB`);
    }
    
    if (context.duration) {
      stats.push(`耗时: ${Math.round(context.duration)}ms`);
    }
    
    if (context.itemCount) {
      stats.push(`项目数: ${context.itemCount}`);
    }
    
    if (context.uploadSpeed) {
      stats.push(`上传速度: ${context.uploadSpeed}`);
    }

    return stats.length > 0 ? `(${stats.join(', ')})` : '';
  }
}

// Global error boundary component integration helper
export const withErrorBoundary = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; reset?: () => void }>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        NetworkErrorHandler.handleError(error.error, 'Component error', {
          componentName: Component.displayName || Component.name
        });
        setHasError(true);
        setError(error.error);
      };

      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);

    const reset = React.useCallback(() => {
      setHasError(false);
      setError(null);
    }, []);

    if (hasError) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent error={error || undefined} reset={reset} />;
      }
      
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          border: '1px solid #ff4d4f',
          borderRadius: '6px',
          backgroundColor: '#fff2f0',
          color: '#ff4d4f'
        }}>
          <h3>组件加载失败</h3>
          <p>请刷新页面或联系管理员</p>
          <button 
            onClick={reset}
            style={{
              marginTop: '10px',
              padding: '6px 16px',
              backgroundColor: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return <Component {...props} ref={ref} />;
  });
};

// Enhanced async operation wrapper with context
export const safeAsyncOperation = async <T>(
  operation: () => Promise<T>,
  context?: {
    componentName?: string;
    operationName?: string;
    showProgress?: boolean;
    retryOptions?: {
      maxRetries?: number;
      delay?: number;
    };
  }
): Promise<T | null> => {
  try {
    performanceMonitor.startMeasure(
      context?.operationName || 'async_operation',
      { component: context?.componentName }
    );

    if (context?.retryOptions) {
      const result = await withRetry(
        operation,
        context.retryOptions.maxRetries,
        context.retryOptions.delay
      );
      performanceMonitor.endMeasure(context?.operationName || 'async_operation');
      return result;
    } else {
      const result = await operation();
      performanceMonitor.endMeasure(context?.operationName || 'async_operation');
      return result;
    }
  } catch (error) {
    performanceMonitor.endMeasure(context?.operationName || 'async_operation');
    NetworkErrorHandler.handleError(error, '操作失败', {
      componentName: context?.componentName,
      showDetailed: true
    });
    return null;
  }
};

// Export enhanced utilities
export { ProgressFeedback, SuccessFeedback };