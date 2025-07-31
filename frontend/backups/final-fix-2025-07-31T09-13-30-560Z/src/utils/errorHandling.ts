import { message } from 'antd';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION', 
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// 自定义错误类
export class AppError extends Error {
  public type: ErrorType;
  public statusCode?: number;
  public details?: any;

  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN, statusCode?: number, details?: any) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
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
        case 500:
          throw new AppError('服务器内部错误', ErrorType.SERVER, 500);
        case 502:
          throw new AppError('网络连接错误', ErrorType.NETWORK, 502);
        case 503:
          throw new AppError('服务暂时不可用', ErrorType.SERVER, 503);
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

  static handleError(error: unknown, fallbackMessage = '发生未知错误'): void {
    console.error('Error:', error);

    if (error instanceof AppError) {
      switch (error.type) {
        case ErrorType.AUTHENTICATION:
          message.error(error.message);
          // 重定向到登录页面
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          break;
        case ErrorType.NETWORK:
          message.error('网络连接失败，请检查网络连接');
          break;
        case ErrorType.VALIDATION:
          message.warning(error.message);
          break;
        default:
          message.error(error.message);
      }
    } else if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // 请求被取消，不显示错误
        return;
      }
      message.error(error.message || fallbackMessage);
    } else {
      message.error(fallbackMessage);
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
  static safeGet<T>(obj: any, path: string, defaultValue: T): T {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current == null || typeof current !== 'object') {
          return defaultValue;
        }
        current = current[key];
      }
      
      return current !== undefined ? current : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // 确保数组格式
  static ensureArray<T>(value: any): T[] {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
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