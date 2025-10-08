import { message, Modal } from 'antd';
import { ErrorType, AppError, ErrorHandlerConfig } from './types';
import { ErrorIdentifier } from './identifier';

/**
 * 错误处理器 - 统一处理各种错误
 *
 * 功能：
 * - 识别错误类型
 * - 记录错误日志
 * - 显示用户提示
 * - 上报错误到监控平台
 * - 处理特殊错误（如401跳转登录）
 */
export class ErrorHandler {
  /**
   * 统一错误处理入口
   */
  static handle(error: any, config: ErrorHandlerConfig = {}): AppError {
    // 1. 识别错误
    const appError = ErrorIdentifier.identify(error);

    // 2. 记录日志（默认开启）
    if (config.logError !== false) {
      this.logError(appError);
    }

    // 3. 显示消息（默认开启）
    if (config.showMessage !== false) {
      this.showErrorMessage(appError, config.customMessage);
    }

    // 4. 上报错误（默认关闭，生产环境可开启）
    if (config.reportError === true) {
      this.reportError(appError);
    }

    // 5. 处理特殊错误
    this.handleSpecialErrors(appError, config);

    // 6. 执行自定义回调
    if (config.onError) {
      config.onError(appError);
    }

    return appError;
  }

  /**
   * 记录错误日志
   */
  private static logError(error: AppError): void {
    const timestamp = new Date(error.timestamp).toLocaleString('zh-CN');
    const prefix = `[${error.type}] [${error.code}] [${timestamp}]`;

    // 根据错误类型选择日志级别
    switch (error.type) {
      case ErrorType.NETWORK:
        console.warn(prefix, error.message, {
          detail: error.detail,
          retryable: error.retryable,
          originalError: error.originalError,
        });
        break;

      case ErrorType.PERMISSION:
        console.error(prefix, error.message, {
          detail: error.detail,
          suggestion: error.suggestion,
          originalError: error.originalError,
        });
        break;

      case ErrorType.BUSINESS:
        console.info(prefix, error.message, {
          detail: error.detail,
          suggestion: error.suggestion,
          retryable: error.retryable,
        });
        break;

      case ErrorType.SYSTEM:
        console.error(prefix, error.message, {
          detail: error.detail,
          suggestion: error.suggestion,
          retryable: error.retryable,
          originalError: error.originalError,
        });
        break;

      case ErrorType.CLIENT:
        console.warn(prefix, error.message, {
          detail: error.detail,
          suggestion: error.suggestion,
        });
        break;

      case ErrorType.UNKNOWN:
      default:
        console.error(prefix, error.message, {
          detail: error.detail,
          originalError: error.originalError,
        });
        break;
    }
  }

  /**
   * 显示错误消息
   */
  private static showErrorMessage(error: AppError, customMessage?: string): void {
    // 使用自定义消息或错误消息
    const displayMessage = customMessage || error.message;

    // 根据错误类型和是否可重试选择显示方式
    switch (error.type) {
      case ErrorType.NETWORK:
        if (error.retryable) {
          message.warning({
            content: displayMessage,
            duration: 4,
          });
        } else {
          message.error({
            content: displayMessage,
            duration: 3,
          });
        }
        break;

      case ErrorType.PERMISSION:
        // 权限错误使用模态框，更醒目
        message.error({
          content: displayMessage,
          duration: 5,
        });
        break;

      case ErrorType.BUSINESS:
        // 业务错误提供详细信息和建议
        if (error.suggestion) {
          message.warning({
            content: `${displayMessage}（${error.suggestion}）`,
            duration: 4,
          });
        } else {
          message.warning({
            content: displayMessage,
            duration: 3,
          });
        }
        break;

      case ErrorType.SYSTEM:
        message.error({
          content: displayMessage,
          duration: 5,
        });
        break;

      case ErrorType.CLIENT:
        message.warning({
          content: displayMessage,
          duration: 3,
        });
        break;

      case ErrorType.UNKNOWN:
      default:
        message.error({
          content: displayMessage,
          duration: 4,
        });
        break;
    }
  }

  /**
   * 上报错误到监控平台
   */
  private static reportError(error: AppError): void {
    // TODO: 集成 Sentry 或其他监控平台
    // 示例代码：
    /*
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(error.originalError || new Error(error.message), {
        level: this.getSentryLevel(error.type),
        tags: {
          errorType: error.type,
          errorCode: error.code,
          retryable: error.retryable,
        },
        extra: {
          detail: error.detail,
          suggestion: error.suggestion,
          timestamp: error.timestamp,
        },
      });
    }
    */

    // 开发环境仅记录日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[ErrorReport]', {
        type: error.type,
        code: error.code,
        message: error.message,
        detail: error.detail,
        timestamp: error.timestamp,
      });
    }
  }

  /**
   * 处理特殊错误
   */
  private static handleSpecialErrors(error: AppError, config: ErrorHandlerConfig): void {
    // 401 未授权 - 跳转到登录页
    if (error.code === 'UNAUTHORIZED') {
      Modal.confirm({
        title: '登录已过期',
        content: error.message || '您的登录状态已过期，请重新登录',
        okText: '去登录',
        cancelText: '取消',
        onOk: () => {
          // 清除本地token
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');

          // 跳转到登录页
          window.location.href = '/login';
        },
      });
      return;
    }

    // 网络错误且可重试 - 询问是否重试
    if (error.type === ErrorType.NETWORK && error.retryable && config.onRetry) {
      const content = error.suggestion
        ? `${error.message}\n\n${error.suggestion}`
        : error.message;

      Modal.confirm({
        title: '网络错误',
        content,
        okText: '重试',
        cancelText: '取消',
        onOk: config.onRetry,
      });
      return;
    }

    // 系统错误且可重试 - 提供重试选项
    if (error.type === ErrorType.SYSTEM && error.retryable && config.onRetry) {
      const content = error.suggestion
        ? `${error.message}\n\n${error.suggestion}`
        : error.message;

      Modal.confirm({
        title: '服务器错误',
        content,
        okText: '重试',
        cancelText: '取消',
        onOk: config.onRetry,
      });
      return;
    }

    // 业务错误 - 特殊业务逻辑处理
    if (error.type === ErrorType.BUSINESS) {
      // 可以根据 error.code 执行特定的业务逻辑
      switch (error.code) {
        case 'BIZ_FOLDER_NOT_EMPTY':
          // 文件夹不为空 - 可以提示用户是否强制删除
          break;
        case 'BIZ_CIRCULAR_REFERENCE':
          // 循环引用 - 提示用户调整文件夹结构
          break;
        // 其他业务错误...
      }
    }
  }

  /**
   * 获取 Sentry 错误级别
   */
  private static getSentryLevel(errorType: ErrorType): 'fatal' | 'error' | 'warning' | 'info' {
    switch (errorType) {
      case ErrorType.SYSTEM:
      case ErrorType.PERMISSION:
        return 'error';
      case ErrorType.NETWORK:
      case ErrorType.CLIENT:
        return 'warning';
      case ErrorType.BUSINESS:
        return 'info';
      case ErrorType.UNKNOWN:
      default:
        return 'fatal';
    }
  }

  /**
   * 简化的错误处理方法 - 仅显示消息
   */
  static showError(error: any, customMessage?: string): void {
    this.handle(error, {
      customMessage,
      logError: true,
      showMessage: true,
      reportError: false,
    });
  }

  /**
   * 静默错误处理 - 仅记录日志，不显示消息
   */
  static silent(error: any): AppError {
    return this.handle(error, {
      logError: true,
      showMessage: false,
      reportError: false,
    });
  }

  /**
   * 完整错误处理 - 记录、显示、上报
   */
  static full(error: any, config: Omit<ErrorHandlerConfig, 'logError' | 'showMessage' | 'reportError'> = {}): AppError {
    return this.handle(error, {
      ...config,
      logError: true,
      showMessage: true,
      reportError: true,
    });
  }
}
