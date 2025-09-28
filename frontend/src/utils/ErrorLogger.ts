/**
 * Enhanced Error Logger
 * 优化的错误日志系统，减少重复日志，提升开发体验
 * 
 * 功能：
 * - 错误去重和聚合
 * - 分级日志管理
 * - 性能监控
 * - 开发友好的错误展示
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  stackTrace?: string;
}

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  deduplicate: boolean;
  deduplicationWindow: number; // 毫秒
  maxEntries: number;
  categories: {
    [category: string]: {
      enabled: boolean;
      level: LogLevel;
      rateLimit?: number; // 每分钟最大日志数
    };
  };
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private config: LoggerConfig;
  private logs: Map<string, LogEntry> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private originalWarn: (...args: any[]) => void;
  private originalError: (...args: any[]) => void;
  private originalDebug: (...args: any[]) => void;
  private originalInfo: (...args: any[]) => void;
  
  private constructor() {
    // Store original console methods before any interception
    this.originalWarn = console.warn;
    this.originalError = console.error;
    this.originalDebug = console.debug;
    this.originalInfo = console.info;
    
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
      deduplicate: true,
      deduplicationWindow: 5000, // 5秒内重复的错误会被聚合
      maxEntries: 1000,
      categories: {
        'sse': {
          enabled: true,
          level: 'info',
          rateLimit: 10 // SSE错误每分钟最多10条
        },
        'api': {
          enabled: true,
          level: 'warn',
          rateLimit: 20
        },
        'ui': {
          enabled: true,
          level: 'warn',
          rateLimit: 15
        },
        'performance': {
          enabled: process.env.NODE_ENV === 'development',
          level: 'debug',
          rateLimit: 30
        },
        'antd': {
          enabled: false, // 默认关闭Antd警告
          level: 'debug',
          rateLimit: 5
        }
      }
    };
    
    this.setupConsoleInterception();
  }
  
  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }
  
  /**
   * 记录日志
   */
  public log(level: LogLevel, category: string, message: string, details?: any): void {
    if (!this.shouldLog(level, category)) {
      return;
    }
    
    // 检查速率限制
    if (!this.checkRateLimit(category)) {
      return;
    }
    
    // 生成日志ID用于去重
    const logId = this.generateLogId(level, category, message);
    const now = Date.now();
    
    const existingLog = this.logs.get(logId);
    
    if (existingLog && this.config.deduplicate) {
      // 更新现有日志
      if (now - existingLog.lastOccurrence < this.config.deduplicationWindow) {
        existingLog.count++;
        existingLog.lastOccurrence = now;
        existingLog.details = details; // 更新为最新的详情
        
        // 如果是第一次重复，显示聚合信息
        if (existingLog.count === 2) {
          this.outputToConsole(existingLog, true);
        }
        return;
      } else {
        // 超出去重窗口，移除旧记录
        this.logs.delete(logId);
      }
    }
    
    // 创建新的日志条目
    const logEntry: LogEntry = {
      id: logId,
      timestamp: now,
      level,
      category,
      message,
      details,
      count: 1,
      firstOccurrence: now,
      lastOccurrence: now,
      stackTrace: level === 'error' ? new Error().stack : undefined
    };
    
    this.logs.set(logId, logEntry);
    this.outputToConsole(logEntry);
    
    // 清理旧日志
    this.cleanupOldLogs();
  }
  
  /**
   * 便捷方法
   */
  public debug(category: string, message: string, details?: any): void {
    this.log('debug', category, message, details);
  }
  
  public info(category: string, message: string, details?: any): void {
    this.log('info', category, message, details);
  }
  
  public warn(category: string, message: string, details?: any): void {
    this.log('warn', category, message, details);
  }
  
  public error(category: string, message: string, details?: any): void {
    this.log('error', category, message, details);
  }
  
  /**
   * SSE专用日志方法
   */
  public sseEvent(type: string, message: string, details?: any): void {
    this.info('sse', `${type}: ${message}`, details);
  }
  
  public sseError(message: string, details?: any): void {
    this.error('sse', message, details);
  }
  
  public sseConnection(status: string, details?: any): void {
    this.info('sse', `Connection ${status}`, details);
  }
  
  /**
   * API专用日志方法
   */
  public apiRequest(method: string, url: string, details?: any): void {
    this.debug('api', `${method} ${url}`, details);
  }
  
  public apiError(url: string, error: any, details?: any): void {
    this.error('api', `API Error: ${url}`, { error, ...details });
  }
  
  public apiResponse(url: string, status: number, duration?: number): void {
    this.debug('api', `Response: ${status} ${url}`, { duration });
  }
  
  /**
   * 性能监控日志
   */
  public performance(operation: string, duration: number, details?: any): void {
    this.debug('performance', `${operation}: ${duration}ms`, details);
  }
  
  /**
   * 判断是否应该记录日志
   */
  private shouldLog(level: LogLevel, category: string): boolean {
    if (!this.config.enabled) {
      return false;
    }
    
    const categoryConfig = this.config.categories[category];
    if (categoryConfig && !categoryConfig.enabled) {
      return false;
    }
    
    const requiredLevel = categoryConfig?.level || this.config.level;
    return this.getLevelValue(level) >= this.getLevelValue(requiredLevel);
  }
  
  /**
   * 获取日志级别数值
   */
  private getLevelValue(level: LogLevel): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level];
  }
  
  /**
   * 检查速率限制
   */
  private checkRateLimit(category: string): boolean {
    const categoryConfig = this.config.categories[category];
    if (!categoryConfig?.rateLimit) {
      return true;
    }
    
    const now = Date.now();
    const counter = this.rateLimitCounters.get(category);
    
    if (!counter || now > counter.resetTime) {
      // 重置计数器
      this.rateLimitCounters.set(category, {
        count: 1,
        resetTime: now + 60000 // 1分钟后重置
      });
      return true;
    }
    
    if (counter.count >= categoryConfig.rateLimit) {
      return false; // 超出速率限制
    }
    
    counter.count++;
    return true;
  }
  
  /**
   * 生成日志ID
   */
  private generateLogId(level: LogLevel, category: string, message: string): string {
    const hash = this.simpleHash(`${level}:${category}:${message}`);
    return `${category}_${hash}`;
  }
  
  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 输出到控制台
   */
  private outputToConsole(logEntry: LogEntry, isUpdate = false): void {
    const prefix = isUpdate ? `🔄 [${logEntry.count}x]` : '';
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const categoryTag = `[${logEntry.category.toUpperCase()}]`;
    
    let formattedMessage = `${prefix} ${timestamp} ${categoryTag} ${logEntry.message}`;
    
    if (isUpdate) {
      formattedMessage += ` (last ${new Date(logEntry.lastOccurrence).toLocaleTimeString()})`;
    }
    
    const consoleMethod = this.getOriginalConsoleMethod(logEntry.level);
    
    if (logEntry.details) {
      consoleMethod(formattedMessage, logEntry.details);
    } else {
      consoleMethod(formattedMessage);
    }
    
    // 错误级别显示堆栈跟踪
    if (logEntry.level === 'error' && logEntry.stackTrace) {
      const originalGroupCollapsed = console.groupCollapsed;
      const originalGroupEnd = console.groupEnd;
      const originalConsoleError = this.originalError;
      
      if (originalGroupCollapsed && originalGroupEnd && originalConsoleError) {
        originalGroupCollapsed('Stack Trace');
        originalConsoleError(logEntry.stackTrace);
        originalGroupEnd();
      }
    }
  }
  
  /**
   * 获取对应的console方法
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error': return console.error;
      default: return console.log;
    }
  }
  
  /**
   * 获取原始console方法（避免递归调用）
   */
  private getOriginalConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug': return this.originalDebug;
      case 'info': return this.originalInfo;
      case 'warn': return this.originalWarn;
      case 'error': return this.originalError;
      default: return console.log;
    }
  }
  
  /**
   * 清理旧日志
   */
  private cleanupOldLogs(): void {
    if (this.logs.size <= this.config.maxEntries) {
      return;
    }
    
    const entries = Array.from(this.logs.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // 删除最旧的日志
    const toDelete = entries.slice(0, entries.length - this.config.maxEntries);
    toDelete.forEach(([id]) => this.logs.delete(id));
  }
  
  /**
   * 设置控制台拦截（过滤Antd废弃警告等）
   */
  private setupConsoleInterception(): void {
    console.warn = (...args: any[]) => {
      const message = args[0];
      
      // 过滤Antd废弃警告
      if (typeof message === 'string') {
        if (message.includes('deprecated') && message.includes('antd')) {
          this.debug('antd', `Antd deprecation: ${message}`, args.slice(1));
          return;
        }
        
        if (message.includes('Warning: ') && message.includes('ReactDOM.render')) {
          this.debug('react', `React warning: ${message}`, args.slice(1));
          return;
        }
      }
      
      this.originalWarn.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      const message = args[0];
      
      // 避免递归：只在非logger调用时记录
      if (typeof message === 'string' && !message.includes('[CONSOLE]')) {
        // 使用原始error输出，避免再次触发拦截
        this.originalError.apply(console, args);
        
        // 记录到错误日志系统（但不再输出到console）
        const logEntry: LogEntry = {
          id: this.generateLogId('error', 'console', message),
          timestamp: Date.now(),
          level: 'error',
          category: 'console',
          message,
          details: args.slice(1),
          count: 1,
          firstOccurrence: Date.now(),
          lastOccurrence: Date.now(),
          stackTrace: new Error().stack
        };
        
        this.logs.set(logEntry.id, logEntry);
      } else {
        this.originalError.apply(console, args);
      }
    };
  }
  
  /**
   * 获取日志统计
   */
  public getStats(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const stats = {
      totalLogs: this.logs.size,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 } as Record<LogLevel, number>,
      byCategory: {} as Record<string, number>,
      recentErrors: [] as LogEntry[]
    };
    
    for (const log of this.logs.values()) {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      
      if (log.level === 'error') {
        stats.recentErrors.push(log);
      }
    }
    
    stats.recentErrors.sort((a, b) => b.timestamp - a.timestamp);
    stats.recentErrors = stats.recentErrors.slice(0, 10);
    
    return stats;
  }
  
  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * 清空日志
   */
  public clear(): void {
    this.logs.clear();
    this.rateLimitCounters.clear();
  }
}

// 导出单例实例
export const errorLogger = ErrorLogger.getInstance();

export default ErrorLogger;