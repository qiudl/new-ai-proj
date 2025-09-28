/**
 * Enhanced logging utility for better error handling and debugging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  projectId?: string | number;
  taskId?: string | number;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {
    // Set log level based on environment
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(', ')}]` : '';
    return `[${timestamp}] [${level}]${contextStr} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMessage = this.formatMessage('ERROR', message, context);
      console.error(errorMessage);
      
      if (error) {
        // Log error details in development
        if (this.isDevelopment) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...error
          });
        } else {
          // In production, log sanitized error info
          console.error('Error:', error.message || error);
        }
      }
    }
  }

  // Specialized logging methods for common scenarios
  apiError(message: string, error: Error | unknown, context?: LogContext): void {
    const e = error as any;
    const apiContext = {
      ...context,
      type: 'api_error',
      status: e?.status || e?.response?.status,
      endpoint: e?.config?.url || context?.endpoint
    };
    
    this.error(message, error, apiContext);
  }

  taskAction(action: string, taskId: string | number, projectId: string | number, error?: any): void {
    const context: LogContext = {
      component: 'TaskManager',
      action,
      taskId,
      projectId
    };

    if (error) {
      this.error(`Task ${action} failed`, error, context);
    } else {
      this.info(`Task ${action} completed`, context);
    }
  }

  userAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      type: 'user_action'
    });
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    const perfContext = {
      ...context,
      type: 'performance',
      duration: `${duration}ms`
    };

    if (duration > 1000) {
      this.warn(`Slow operation: ${operation}`, perfContext);
    } else {
      this.debug(`Performance: ${operation}`, perfContext);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions
export const logApiError = (message: string, error: Error | unknown, context?: LogContext) => 
  logger.apiError(message, error, context);

export const logTaskAction = (action: string, taskId: string | number, projectId: string | number, error?: any) => 
  logger.taskAction(action, taskId, projectId, error);

export const logUserAction = (action: string, context?: LogContext) => 
  logger.userAction(action, context);

export const logPerformance = (operation: string, duration: number, context?: LogContext) => 
  logger.performance(operation, duration, context);

// Performance measurement decorator
export function measurePerformance<T extends (...args: unknown[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: unknown[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      logPerformance(operationName, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logPerformance(`${operationName} (failed)`, duration);
      throw error;
    }
  }) as T;
}

export default logger;