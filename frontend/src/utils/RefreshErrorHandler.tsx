import { message, notification } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';

// 错误类型枚举
export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  AUTH_ERROR = 'auth_error',
  PERMISSION_ERROR = 'permission_error',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',      // 用户可忽略的错误
  MEDIUM = 'medium', // 需要用户关注的错误
  HIGH = 'high',    // 严重错误，影响功能
  CRITICAL = 'critical' // 致命错误，系统不可用
}

// 刷新错误接口
export interface RefreshError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  timestamp: Date;
  context?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
  canRetry?: boolean;
}

// 错误处理配置
export interface ErrorHandlingConfig {
  enableNotifications: boolean;
  notificationDuration: number;
  enableConsoleLogging: boolean;
  enableDebugMode: boolean;
  autoRetryOn: ErrorType[];
  maxRetries: number;
  retryInterval: number;
}

// 默认错误处理配置
export const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  enableNotifications: true,
  notificationDuration: 5000,
  enableConsoleLogging: true,
  enableDebugMode: false,
  autoRetryOn: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR],
  maxRetries: 3,
  retryInterval: 5000
};

// 错误分析器 - 将原始错误转换为刷新错误
export class RefreshErrorAnalyzer {
  static analyze(error: Error | any, context?: Record<string, any>): RefreshError {
    let errorType = ErrorType.UNKNOWN_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let message = '刷新失败';
    let canRetry = true;

    // 网络相关错误
    if (this.isNetworkError(error)) {
      errorType = ErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.MEDIUM;
      message = '网络连接失败，请检查网络状态';
      canRetry = true;
    }
    // 超时错误
    else if (this.isTimeoutError(error)) {
      errorType = ErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
      message = '请求超时，请稍后重试';
      canRetry = true;
    }
    // 认证错误
    else if (this.isAuthError(error)) {
      errorType = ErrorType.AUTH_ERROR;
      severity = ErrorSeverity.HIGH;
      message = '身份验证失败，请重新登录';
      canRetry = false;
    }
    // 权限错误
    else if (this.isPermissionError(error)) {
      errorType = ErrorType.PERMISSION_ERROR;
      severity = ErrorSeverity.HIGH;
      message = '权限不足，无法访问此资源';
      canRetry = false;
    }
    // 服务器错误
    else if (this.isServerError(error)) {
      errorType = ErrorType.SERVER_ERROR;
      severity = ErrorSeverity.HIGH;
      message = '服务器内部错误，请稍后重试';
      canRetry = true;
    }
    // 客户端错误
    else if (this.isClientError(error)) {
      errorType = ErrorType.CLIENT_ERROR;
      severity = ErrorSeverity.MEDIUM;
      message = '请求参数错误';
      canRetry = false;
    }

    return {
      type: errorType,
      severity,
      message,
      originalError: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date(),
      context,
      canRetry
    };
  }

  private static isNetworkError(error: any): boolean {
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.includes('Network Error') ||
      error?.message?.includes('fetch') ||
      !navigator.onLine
    );
  }

  private static isTimeoutError(error: any): boolean {
    return (
      error?.code === 'TIMEOUT' ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('TIMEOUT')
    );
  }

  private static isAuthError(error: any): boolean {
    return (
      error?.status === 401 ||
      error?.response?.status === 401
    );
  }

  private static isPermissionError(error: any): boolean {
    return (
      error?.status === 403 ||
      error?.response?.status === 403
    );
  }

  private static isServerError(error: any): boolean {
    const status = error?.status || error?.response?.status;
    return status >= 500 && status < 600;
  }

  private static isClientError(error: any): boolean {
    const status = error?.status || error?.response?.status;
    return status >= 400 && status < 500 && status !== 401 && status !== 403;
  }
}

// 错误处理器类
export class RefreshErrorHandler {
  private config: ErrorHandlingConfig;
  private errorHistory: RefreshError[] = [];
  private maxHistorySize = 50;

  constructor(config: ErrorHandlingConfig = DEFAULT_ERROR_CONFIG) {
    this.config = config;
  }

  // 更新配置
  updateConfig(config: Partial<ErrorHandlingConfig>) {
    this.config = { ...this.config, ...config };
  }

  // 处理错误
  handleError(error: RefreshError): void {
    // 添加到历史记录
    this.addToHistory(error);

    // 控制台日志
    if (this.config.enableConsoleLogging) {
      this.logToConsole(error);
    }

    // 显示通知
    if (this.config.enableNotifications) {
      this.showNotification(error);
    }

    // 调试模式下的详细信息
    if (this.config.enableDebugMode) {
      this.debugError(error);
    }
  }

  // 检查错误是否应该自动重试
  shouldAutoRetry(error: RefreshError): boolean {
    return (
      error.canRetry &&
      this.config.autoRetryOn.includes(error.type) &&
      (error.retryCount || 0) < this.config.maxRetries
    );
  }

  // 获取错误历史
  getErrorHistory(): RefreshError[] {
    return [...this.errorHistory];
  }

  // 清除错误历史
  clearHistory(): void {
    this.errorHistory = [];
  }

  // 获取错误统计
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: RefreshError[];
  } {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errorHistory.slice(-10)
    };

    // 初始化计数
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // 统计错误
    this.errorHistory.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
    });

    return stats;
  }

  private addToHistory(error: RefreshError): void {
    this.errorHistory.push(error);
    
    // 保持历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private logToConsole(error: RefreshError): void {
    const level = this.getSeverityLogLevel(error.severity);
    const contextStr = error.context ? JSON.stringify(error.context, null, 2) : '';
    
    console[level](
      `[RefreshError] ${error.type}:`,
      error.message,
      '\nOriginal Error:', error.originalError,
      contextStr && '\nContext:', contextStr,
      '\nTimestamp:', error.timestamp
    );
  }

  private getSeverityLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'warn';
    }
  }

  private showNotification(error: RefreshError): void {
    const { type, severity, message, canRetry, retryCount, maxRetries } = error;

    // 根据严重程度选择通知类型
    if (severity === ErrorSeverity.CRITICAL) {
      // 严重错误使用notification
      notification.error({
        message: '严重错误',
        description: message,
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        duration: 0, // 不自动关闭
        key: `refresh-error-${type}`,
        btn: canRetry ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <ReloadOutlined 
              onClick={() => this.retryLastOperation(error)} 
              style={{ cursor: 'pointer', color: '#1890ff' }}
            />
            <CloseOutlined 
              onClick={() => notification.close(`refresh-error-${type}`)}
              style={{ cursor: 'pointer' }}
            />
          </div>
        ) : undefined
      });
    } else if (severity === ErrorSeverity.HIGH) {
      // 高严重程度错误
      notification.warning({
        message: '刷新失败',
        description: message,
        duration: this.config.notificationDuration / 1000,
        key: `refresh-error-${type}`
      });
    } else if (severity === ErrorSeverity.MEDIUM) {
      // 中等严重程度使用message
      message.warning(message, this.config.notificationDuration / 1000);
    } else {
      // 低严重程度使用简单message
      message.info(message, this.config.notificationDuration / 1000);
    }
  }

  private debugError(error: RefreshError): void {
    console.group(`🔍 Debug: RefreshError ${error.type}`);
    console.log('📊 Error Details:', {
      type: error.type,
      severity: error.severity,
      message: error.message,
      canRetry: error.canRetry,
      retryCount: error.retryCount,
      timestamp: error.timestamp
    });
    console.log('🚨 Original Error:', error.originalError);
    console.log('📋 Context:', error.context);
    console.log('📈 Error Stats:', this.getErrorStats());
    console.groupEnd();
  }

  private retryLastOperation(error: RefreshError): void {
    // 这个方法需要与使用方协调实现重试逻辑
    console.log('Retry requested for error:', error);
  }
}

// 全局错误处理器实例
export const globalRefreshErrorHandler = new RefreshErrorHandler();
