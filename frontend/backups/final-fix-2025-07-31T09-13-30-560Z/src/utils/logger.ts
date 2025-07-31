/**
 * 统一日志管理工具
 * 在生产环境中自动禁用日志输出，保持控制台干净
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private shouldLog(level: LogLevel): boolean {
    // 在生产环境中，只允许 error 级别的日志
    if (!this.isDevelopment) {
      return level === 'error';
    }
    return true;
  }

  log(...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...args);
    }
  }

  /**
   * 开发环境专用日志，生产环境完全不输出
   */
  dev(...args: any[]): void {
    if (this.isDevelopment) {
      console.log('[DEV]', ...args);
    }
  }

  /**
   * API 调用日志，可以统一管理
   */
  api(method: string, url: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[API] ${method.toUpperCase()} ${url}`, data || '');
    }
  }

  /**
   * 用户操作日志
   */
  userAction(action: string, details?: any): void {
    if (this.isDevelopment) {
      console.log(`[USER] ${action}`, details || '');
    }
  }

  /**
   * 任务操作日志
   */
  taskAction(action: string, details?: any): void {
    if (this.isDevelopment) {
      console.log(`[TASK] ${action}`, details || '');
    }
  }

  /**
   * 性能日志
   */
  performance(label: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[PERF] ${label}`, data || '');
    }
  }

  /**
   * API错误日志
   */
  apiError(method: string, url: string, error: any): void {
    if (this.isDevelopment) {
      console.error(`[API ERROR] ${method.toUpperCase()} ${url}`, error);
    } else {
      // 生产环境只记录关键错误信息
      console.error(`API Error: ${method.toUpperCase()} ${url}`, error?.message || error);
    }
  }
}

// 导出单例实例
export const logger = new Logger();

// 也可以导出类，允许创建多个实例
export { Logger };

// 提供兼容的全局替换方案
export const devConsole = {
  log: (...args: any[]) => logger.dev(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
  debug: (...args: any[]) => logger.debug(...args)};

// 导出便捷函数，兼容现有代码
export const logUserAction = (action: string, details?: any) => logger.userAction(action, details);
export const logTaskAction = (action: string, details?: any) => logger.taskAction(action, details);
export const logPerformance = (label: string, data?: any) => logger.performance(label, data);
export const logApiError = (method: string, url: string, error: any) => logger.apiError(method, url, error);