/**
 * URL Builder Utility
 * 统一的URL构建工具，解决URL配置错误和重复路径问题
 * 
 * 功能：
 * - 智能环境变量检测和验证
 * - URL路径标准化和去重
 * - 类型安全的URL构建
 * - 详细的错误信息和日志
 */

export interface URLConfig {
  baseUrl?: string;
  apiPrefix?: string;
  debug?: boolean;
}

export interface URLBuildResult {
  url: string;
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

class URLBuilder {
  private static instance: URLBuilder;
  private config: Required<URLConfig>;
  private validatedBaseUrl: string | null = null;
  
  private constructor(config: URLConfig = {}) {
    // 首先设置基础配置，但延迟执行detectBaseUrl以避免依赖this.config
    const apiPrefix = config.apiPrefix || '/api/v1';
    const debug = config.debug || false;
    
    this.config = {
      baseUrl: config.baseUrl || this.detectBaseUrlWithPrefix(apiPrefix, debug),
      apiPrefix: apiPrefix,
      debug: debug
    };
    
    this.validateAndNormalizeConfig();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(config?: URLConfig): URLBuilder {
    if (!URLBuilder.instance) {
      URLBuilder.instance = new URLBuilder(config);
    }
    return URLBuilder.instance;
  }
  
  /**
   * 重新配置实例
   */
  public static reconfigure(config: URLConfig): URLBuilder {
    URLBuilder.instance = new URLBuilder(config);
    return URLBuilder.instance;
  }
  
  /**
   * 检测基础URL（带API前缀处理）
   */
  private detectBaseUrlWithPrefix(apiPrefix: string, debug: boolean): string {
    // 按优先级检查环境变量
    const candidates = [
      process.env.REACT_APP_API_URL,
      process.env.REACT_APP_API_BASE_URL,
      process.env.REACT_APP_BASE_URL,
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.trim()) {
        const cleanCandidate = candidate.trim();

        // 如果URL已经包含API前缀，返回不含前缀的部分
        if (cleanCandidate.includes(apiPrefix)) {
          const baseUrl = cleanCandidate.replace(new RegExp(apiPrefix.replace('/', '\\/') + '.*$'), '');
          return baseUrl;
        }

        return cleanCandidate;
      }
    }

    // 生产环境不应该fallback到localhost
    // 使用当前域名作为fallback
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }

    // SSR环境fallback - 不应该在生产环境运行到这里
    // 如果运行到这里说明环境变量配置有问题
    console.error('⚠️ URLBuilder: No environment variable set and window is undefined. This should not happen in production!');
    return '';
  }
  
  /**
   * 验证和标准化配置
   */
  private validateAndNormalizeConfig(): void {
    try {
      // 检查是否为相对路径（用于开发环境代理）
      if (this.config.baseUrl.startsWith('/')) {
        // 相对路径，直接使用（webpack dev server会处理代理）
        this.validatedBaseUrl = '';  // 对于相对路径，基础URL为空
        return;
      }
      
      // 验证绝对URL格式
      const testUrl = new URL(this.config.baseUrl);
      
      // 移除末尾的斜杠和API前缀
      let cleanBaseUrl = testUrl.origin;
      if (testUrl.pathname && testUrl.pathname !== '/') {
        cleanBaseUrl += testUrl.pathname.replace(/\/+$/, ''); // 移除末尾斜杠
      }
      
      // 检查并移除重复的API前缀
      if (cleanBaseUrl.endsWith(this.config.apiPrefix)) {
        cleanBaseUrl = cleanBaseUrl.slice(0, -this.config.apiPrefix.length);
      }
      
      this.validatedBaseUrl = cleanBaseUrl;
      
    } catch (error) {
      console.error(`URLBuilder: Invalid base URL: ${this.config.baseUrl}`, error);
      this.validatedBaseUrl = null;
    }
  }
  
  /**
   * 构建完整的API URL
   */
  public buildApiUrl(endpoint: string, params?: Record<string, string | number>): URLBuildResult {
    const warnings: string[] = [];
    
    // 检查是否为相对路径模式（开发环境代理）
    const isRelativeMode = this.config.baseUrl.startsWith('/');
    
    if (!isRelativeMode && this.validatedBaseUrl === null) {
      return {
        url: '',
        isValid: false,
        error: `Invalid base URL configuration: ${this.config.baseUrl}`
      };
    }
    
    // 标准化endpoint
    let normalizedEndpoint = endpoint.trim();
    
    // 移除endpoint开头的斜杠（将由我们统一添加）
    if (normalizedEndpoint.startsWith('/')) {
      normalizedEndpoint = normalizedEndpoint.slice(1);
    }
    
    // 检查endpoint是否包含API前缀
    if (normalizedEndpoint.startsWith(this.config.apiPrefix.slice(1))) {
      normalizedEndpoint = normalizedEndpoint.slice(this.config.apiPrefix.length - 1);
      warnings.push(`Removed duplicate API prefix from endpoint: ${endpoint}`);
    }
    
    // 构建完整URL
    const fullPath = `${this.config.apiPrefix}/${normalizedEndpoint}`.replace(/\/+/g, '/');
    
    if (isRelativeMode) {
      // 相对路径模式，直接返回相对URL（webpack dev server会处理代理）
      let relativeUrl = fullPath;
      
      // 添加查询参数
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.set(key, String(value));
        });
        relativeUrl += `?${searchParams.toString()}`;
      }
      
      const result: URLBuildResult = {
        url: relativeUrl,
        isValid: true
      };
      
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      
      return result;
    }
    
    // 绝对URL模式
    const fullUrl = `${this.validatedBaseUrl}${fullPath}`;
    
    try {
      const url = new URL(fullUrl);
      
      // 添加查询参数
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
      }
      
      const result: URLBuildResult = {
        url: url.toString(),
        isValid: true
      };
      
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      
      if (this.config.debug) {
        console.log(`URLBuilder: Built URL: ${result.url}`);
        if (warnings.length > 0) {
          console.warn(`URLBuilder: Warnings:`, warnings);
        }
      }
      
      return result;
      
    } catch (error) {
      return {
        url: '',
        isValid: false,
        error: `Failed to construct URL: ${error}`,
        warnings
      };
    }
  }
  
  /**
   * 构建SSE URL（特殊处理）
   */
  public buildSSEUrl(endpoint: string, token?: string): URLBuildResult {
    const result = this.buildApiUrl(endpoint);

    if (!result.isValid) {
      return result;
    }

    try {
      // 检查是否为相对路径模式
      const isRelativeMode = this.config.baseUrl.startsWith('/');

      if (isRelativeMode || result.url.startsWith('/')) {
        // 相对路径模式：需要手动添加token参数
        let finalUrl = result.url;
        if (token) {
          const separator = finalUrl.includes('?') ? '&' : '?';
          finalUrl = `${finalUrl}${separator}token=${encodeURIComponent(token)}`;
        }

        // 相对路径需要转换为绝对URL（EventSource要求）
        // 使用window.location构建完整URL
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const absoluteUrl = `${baseUrl}${finalUrl}`;

        return {
          ...result,
          url: absoluteUrl
        };
      }

      // 绝对URL模式
      const url = new URL(result.url);

      // 添加token参数（SSE不支持自定义headers）
      if (token) {
        url.searchParams.set('token', token);
      }

      return {
        ...result,
        url: url.toString()
      };

    } catch (error) {
      return {
        url: '',
        isValid: false,
        error: `Failed to add SSE parameters: ${error}`,
        warnings: result.warnings
      };
    }
  }
  
  /**
   * 验证URL格式
   */
  public static validateUrl(urlString: string): { isValid: boolean; error?: string } {
    try {
      new URL(urlString);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid URL format: ${error}` 
      };
    }
  }
  
  /**
   * 获取当前配置
   */
  public getConfig(): Required<URLConfig> {
    return { ...this.config };
  }
  
  /**
   * 获取验证后的基础URL
   */
  public getValidatedBaseUrl(): string | null {
    return this.validatedBaseUrl;
  }
  
  /**
   * 更新认证token（用于SSE重连等场景）
   */
  public updateToken(token: string): void {
    if (this.config.debug) {
      console.log('URLBuilder: Auth token updated');
    }
    // 这里可以存储token供后续SSE连接使用
  }
  
  /**
   * 检查环境配置状态
   */
  public getEnvironmentStatus(): {
    baseUrl: string;
    source: string;
    isValid: boolean;
    availableVars: string[];
  } {
    const envVars = {
      'REACT_APP_API_URL': process.env.REACT_APP_API_URL,
      'REACT_APP_API_BASE_URL': process.env.REACT_APP_API_BASE_URL,
      'REACT_APP_BASE_URL': process.env.REACT_APP_BASE_URL
    };
    
    const availableVars = Object.entries(envVars)
      .filter(([, value]) => value && value.trim())
      .map(([key]) => key);
    
    let source = 'default (window.location)';
    if (availableVars.length > 0) {
      source = availableVars[0];
    }
    
    return {
      baseUrl: this.config.baseUrl,
      source,
      isValid: this.validatedBaseUrl !== null,
      availableVars
    };
  }
}

// 导出默认实例
export const urlBuilder = URLBuilder.getInstance({
  debug: process.env.NODE_ENV === 'development'
});

export default URLBuilder;