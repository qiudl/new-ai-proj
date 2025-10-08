import { ErrorType, AppError, BusinessErrorCode } from './types';

/**
 * 错误识别器 - 将各种错误转换为AppError
 */
export class ErrorIdentifier {
  /**
   * 识别并转换错误
   */
  static identify(error: any): AppError {
    // HTTP错误
    if (error.response) {
      return this.identifyHttpError(error);
    }

    // 网络错误
    if (error.request) {
      return this.createNetworkError(error);
    }

    // 业务错误（已标准化的错误对象）
    if (error.code && typeof error.code === 'string') {
      if (error.code.startsWith('BIZ_')) {
        return this.createBusinessError(error);
      }
    }

    // 默认未知错误
    return this.createUnknownError(error);
  }

  /**
   * 识别HTTP错误
   */
  private static identifyHttpError(error: any): AppError {
    const status = error.response?.status;
    const data = error.response?.data;

    switch (status) {
      case 400:
        return {
          type: ErrorType.CLIENT,
          code: 'BAD_REQUEST',
          message: data?.message || '请求参数错误',
          detail: data?.detail || JSON.stringify(data?.errors),
          suggestion: '请检查输入的内容是否正确',
          retryable: false,
          timestamp: Date.now(),
          originalError: error,
        };

      case 401:
        return {
          type: ErrorType.PERMISSION,
          code: 'UNAUTHORIZED',
          message: '登录已过期，请重新登录',
          suggestion: '点击确定跳转到登录页',
          retryable: false,
          timestamp: Date.now(),
          originalError: error,
        };

      case 403:
        return {
          type: ErrorType.PERMISSION,
          code: 'FORBIDDEN',
          message: data?.message || '权限不足，无法执行此操作',
          suggestion: '请联系管理员申请权限',
          retryable: false,
          timestamp: Date.now(),
          originalError: error,
        };

      case 404:
        return {
          type: ErrorType.CLIENT,
          code: 'NOT_FOUND',
          message: data?.message || '资源不存在',
          suggestion: '该文件夹可能已被删除，请刷新页面',
          retryable: false,
          timestamp: Date.now(),
          originalError: error,
        };

      case 409:
        return {
          type: ErrorType.BUSINESS,
          code: data?.code || 'CONFLICT',
          message: data?.message || '操作冲突',
          detail: data?.detail,
          suggestion: data?.suggestion || '请刷新后重试',
          retryable: true,
          timestamp: Date.now(),
          originalError: error,
        };

      case 422:
        return {
          type: ErrorType.BUSINESS,
          code: 'VALIDATION_FAILED',
          message: data?.message || '数据验证失败',
          detail: Array.isArray(data?.errors) ? data.errors.join(', ') : data?.detail,
          suggestion: '请检查输入的内容',
          retryable: false,
          timestamp: Date.now(),
          originalError: error,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ErrorType.SYSTEM,
          code: 'SERVER_ERROR',
          message: '服务器错误，请稍后重试',
          detail: `HTTP ${status}`,
          suggestion: '如果问题持续存在，请联系技术支持',
          retryable: true,
          timestamp: Date.now(),
          originalError: error,
        };

      default:
        return {
          type: ErrorType.UNKNOWN,
          code: `HTTP_${status}`,
          message: data?.message || '操作失败',
          retryable: status >= 500,
          timestamp: Date.now(),
          originalError: error,
        };
    }
  }

  /**
   * 创建网络错误
   */
  private static createNetworkError(error: any): AppError {
    // 判断是否是超时错误
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    if (isTimeout) {
      return {
        type: ErrorType.NETWORK,
        code: 'NETWORK_TIMEOUT',
        message: '网络请求超时，请检查网络连接',
        detail: error.message,
        suggestion: '请检查网络连接后重试',
        retryable: true,
        timestamp: Date.now(),
        originalError: error,
      };
    }

    // 判断是否是网络离线
    const isOffline = !navigator.onLine;

    if (isOffline) {
      return {
        type: ErrorType.NETWORK,
        code: 'NETWORK_OFFLINE',
        message: '网络连接已断开',
        suggestion: '请检查网络连接',
        retryable: true,
        timestamp: Date.now(),
        originalError: error,
      };
    }

    // 普通网络错误
    return {
      type: ErrorType.NETWORK,
      code: 'NETWORK_ERROR',
      message: '网络连接失败，请检查网络设置',
      detail: error.message,
      suggestion: '请检查网络连接后重试',
      retryable: true,
      timestamp: Date.now(),
      originalError: error,
    };
  }

  /**
   * 创建业务错误
   */
  private static createBusinessError(error: any): AppError {
    return {
      type: ErrorType.BUSINESS,
      code: error.code,
      message: error.message || '业务操作失败',
      detail: error.detail,
      suggestion: error.suggestion,
      retryable: error.retryable !== false,
      timestamp: Date.now(),
      originalError: error,
    };
  }

  /**
   * 创建未知错误
   */
  private static createUnknownError(error: any): AppError {
    return {
      type: ErrorType.UNKNOWN,
      code: 'UNKNOWN_ERROR',
      message: error.message || '未知错误',
      detail: error.stack,
      retryable: false,
      timestamp: Date.now(),
      originalError: error,
    };
  }
}
