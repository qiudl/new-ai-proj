/**
 * 全局 Console 输出控制
 * 在生产环境中过滤掉不必要的日志输出
 */

interface ConsoleMethod {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
}

class ConsoleManager {
  private originalConsole: ConsoleMethod;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // 保存原始的console方法
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)};
  }

  /**
   * 检查消息是否应该被过滤掉
   */
  private shouldFilter(args: any[]): boolean {
    if (this.isDevelopment) {
      return false; // 开发环境不过滤
    }

    const message = args.join(' ').toLowerCase();
    
    // 过滤 webpack chunk loading 相关消息
    const chunksPatterns = [
      'chunk loading error',
      'loading chunk',
      'chunk failed',
      'script error',
      'loading css chunk',
      'chunk load error',
      'failed to fetch dynamically imported module'
    ];

    // 过滤 API 请求相关的信息日志
    const apiPatterns = [
      'fetching user profile',
      'user profile response',
      'user profile loaded successfully',
      'api request',
      'api response'
    ];

    // 过滤调试信息
    const debugPatterns = [
      '[dev]',
      'debug:',
      'timer debug',
      'react-hot-loader',
      'hmr'
    ];

    const allPatterns = [...chunksPatterns, ...apiPatterns, ...debugPatterns];
    
    return allPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * 创建过滤后的console方法
   */
  private createFilteredMethod(originalMethod: Function, level: 'log' | 'info' | 'warn' | 'error' | 'debug') {
    return (...args: any[]) => {
      // 总是允许错误级别的日志
      if (level === 'error' || !this.shouldFilter(args)) {
        originalMethod(...args);
      }
    };
  }

  /**
   * 安装console过滤器
   */
  install(): void {
    if (this.isDevelopment) {
      // 开发环境下不做任何修改
      return;
    }

    // 只在生产环境下安装过滤器
    console.log = this.createFilteredMethod(this.originalConsole.log, 'log');
    console.info = this.createFilteredMethod(this.originalConsole.info, 'info');
    console.warn = this.createFilteredMethod(this.originalConsole.warn, 'warn');
    console.debug = this.createFilteredMethod(this.originalConsole.debug, 'debug');
    
    // 错误日志保持不变，以便调试生产环境问题
    // console.error = this.originalConsole.error;
  }

  /**
   * 卸载console过滤器，恢复原始行为
   */
  uninstall(): void {
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
  }

  /**
   * 强制输出消息（绕过过滤器）
   */
  force = {
    log: (...args: any[]) => this.originalConsole.log(...args),
    info: (...args: any[]) => this.originalConsole.info(...args),
    warn: (...args: any[]) => this.originalConsole.warn(...args),
    error: (...args: any[]) => this.originalConsole.error(...args),
    debug: (...args: any[]) => this.originalConsole.debug(...args)};
}

// 创建全局实例
const consoleManager = new ConsoleManager();

// 自动安装（在生产环境）
consoleManager.install();

export { consoleManager };
export default consoleManager;