// API拦截器：自动追踪所有API调用的性能指标
import { performanceMonitor } from '../services/performanceMonitor';

// API调用追踪映射
const activeApiCalls = new Map<string, string>();

// 获取响应大小
const getResponseSize = (response: Response): number => {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  // 如果没有content-length头，尝试估算
  return 0;
};

// 判断是否为缓存命中
const isCacheHit = (response: Response): boolean => {
  // 检查常见的缓存头
  const cacheControl = response.headers.get('cache-control');
  const etag = response.headers.get('etag');
  const lastModified = response.headers.get('last-modified');
  
  // 如果响应来自缓存，通常会有这些特征
  return !!(etag || lastModified || (cacheControl && cacheControl.includes('max-age')));
};

// 原始fetch的引用
const originalFetch = window.fetch;

// 检查是否为已知的开发中API（需要静默处理500错误）
const isAnalysisApi = (url: string): boolean => {
  return url.includes('/api/v1/analysis/');
};

// 非关键的API：失败时不应污染控制台错误（降级为debug）
const isNonCriticalApi = (url: string): boolean => {
  // recent-tasks 仅用于补全显示信息，失败可降级
  return url.includes('/api/v1/timer/recent-tasks') || url.includes('suppressLog=1');
};

// 增强的fetch函数
const enhancedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';
  
  // 开始追踪API调用
  const trackingId = performanceMonitor.startApiCall(url, method, {
    headers: init?.headers,
    body: init?.body ? 'present' : undefined,
  });
  
  const requestKey = `${method}:${url}:${Date.now()}`;
  activeApiCalls.set(requestKey, trackingId);

  try {
    // 执行原始的fetch
    const response = await originalFetch(input, init);
    
    // 获取响应信息
    const responseSize = getResponseSize(response);
    const cacheHit = isCacheHit(response);
    
    // 对于分析API的500错误，进行静默处理
    const isKnownAnalysisError = !response.ok && response.status === 500 && isAnalysisApi(url);
    const nonCritical = isNonCriticalApi(url);
    const errorMessage = response.ok ? undefined : 
      isKnownAnalysisError ? 'Analysis service unavailable (Node.js environment needed)' :
      `HTTP ${response.status}: ${response.statusText}`;
    
    // 结束追踪
    performanceMonitor.endApiCall(
      trackingId,
      response.status,
      responseSize,
      cacheHit,
      errorMessage
    );
    
    // 对于已知的分析API错误，不在控制台显示错误
    if (isKnownAnalysisError) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`Analysis API temporarily unavailable: ${method} ${url} (Node.js environment needed)`);
      }
    } else if (!response.ok) {
      if (nonCritical) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`Non-critical API error: ${method} ${url} - ${response.status} ${response.statusText}`);
        }
      } else {
        console.error(`API Error: ${method} ${url} - ${response.status} ${response.statusText}`);
      }
    }
    
    activeApiCalls.delete(requestKey);
    return response;
  } catch (error) {
    // 记录错误
    const errorMessage = error instanceof Error ? error.message : 'Network Error';
    performanceMonitor.endApiCall(trackingId, 0, 0, false, errorMessage);
    
    // 对于分析API或非关键API，使用debug级别日志
    if (isAnalysisApi(url) || isNonCriticalApi(url)) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`Non-critical network issue: ${method} ${url}`, error);
      }
    } else {
      console.error(`Network Error: ${method} ${url}`, error);
    }
    
    activeApiCalls.delete(requestKey);
    throw error;
  }
};

// Axios拦截器（如果使用Axios）
export const setupAxiosInterceptors = (axiosInstance: any) => {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config: unknown) => {
      const url = (config as any).url || '';
      const method = (config as any).method?.toUpperCase() || 'GET';
      
      // 开始追踪
      const trackingId = performanceMonitor.startApiCall(url, method, {
        baseURL: (config as any).baseURL,
        headers: (config as any).headers,
        params: (config as any).params,
      });
      
      // 将追踪ID附加到请求配置
      (config as any)._performanceTrackingId = trackingId;
      (config as any)._performanceStartTime = Date.now();
      
      return config;
    },
    (error: Error | unknown) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response: any) => {
      const config = response.config;
      const trackingId = config._performanceTrackingId;
      
      if (trackingId) {
        const responseSize = JSON.stringify(response.data).length;
        const cacheHit = !!(response.headers['etag'] || response.headers['last-modified']);
        
        performanceMonitor.endApiCall(
          trackingId,
          response.status,
          responseSize,
          cacheHit
        );
      }
      
      return response;
    },
    (error: any) => {
      const config = error.config;
      const trackingId = config?._performanceTrackingId;
      
      if (trackingId) {
        const status = error.response?.status || 0;
        const errorMessage = error.message || 'Request failed';
        
        performanceMonitor.endApiCall(
          trackingId,
          status,
          0,
          false,
          errorMessage
        );
      }
      
      return Promise.reject(error);
    }
  );
};

// React Query拦截器
export const createPerformanceQueryClient = () => {
  const { QueryClient } = require('@tanstack/react-query');
  
  return new QueryClient({
    defaultOptions: {
      queries: {
        onSuccess: (data: Record<string, unknown>, query: unknown) => {
          // 追踪成功的查询
          performanceMonitor.trackUserAction('query-success', (query as any).queryKey.join('/'), {
            dataSize: JSON.stringify(data).length,
            fromCache: (query as any)._isCached,
          });
        },
        onError: (error: Error | unknown, query: unknown) => {
          // 追踪失败的查询
          performanceMonitor.trackUserAction('query-error', (query as any).queryKey.join('/'), {
            error: (error as any).message,
          });
        },
      },
      mutations: {
        onSuccess: (data: Record<string, unknown>, variables: unknown, context: unknown, mutation: unknown) => {
          performanceMonitor.trackUserAction('mutation-success', (mutation as any).mutationKey?.join('/') || 'unknown', {
            dataSize: JSON.stringify(data).length,
          });
        },
        onError: (error: Error | unknown, variables: unknown, context: unknown, mutation: unknown) => {
          performanceMonitor.trackUserAction('mutation-error', (mutation as any).mutationKey?.join('/') || 'unknown', {
            error: error instanceof Error ? error.message : 'Mutation failed',
          });
        },
      },
    },
  });
};

// 安装fetch拦截器
export const installFetchInterceptor = () => {
  if (typeof window !== 'undefined' && window.fetch === originalFetch) {
    window.fetch = enhancedFetch;
    }
};

// 卸载fetch拦截器
export const uninstallFetchInterceptor = () => {
  if (typeof window !== 'undefined' && window.fetch === enhancedFetch) {
    window.fetch = originalFetch;
    }
};

// React组件性能追踪HOC
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const ComponentWithPerformanceTracking = (props: P) => {
    const React = require('react');
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';
    
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        performanceMonitor.trackComponent(name, renderTime);
      };
    }, []);
    
    return React.createElement(WrappedComponent, props);
  };
  
  ComponentWithPerformanceTracking.displayName = `withPerformanceTracking(${componentName || 'Component'})`;
  return ComponentWithPerformanceTracking;
};

// React Hook：追踪组件渲染性能
export const useComponentPerformance = (componentName: string) => {
  const React = require('react');
  const [renderCount, setRenderCount] = React.useState(0);
  const renderStartTime = React.useRef(0);
  
  React.useEffect(() => {
    renderStartTime.current = performance.now();
    setRenderCount(prev => prev + 1);
  });
  
  React.useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.trackComponent(componentName, renderTime, renderCount);
  });
  
  return { renderCount };
};

// 用户交互追踪装饰器
export const trackUserInteraction = (action: string, target?: string) => {
  return (originalFunction: Function) => {
    return function (this: unknown, ...args: unknown[]) {
      performanceMonitor.trackUserAction(action, target || 'unknown', {
        arguments: args.length,
        timestamp: Date.now(),
      });
      
      return originalFunction.apply(this, args);
    };
  };
};

// 自动安装所有拦截器
export const installPerformanceInterceptors = () => {
  installFetchInterceptor();
  
  // 设置用户ID（如果可用）
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.user_id) {
        performanceMonitor.setUserId(payload.user_id);
      }
    }
  } catch (error) {
    console.warn('Failed to extract user ID from token:', error);
  }
  
  // 追踪页面加载
  if (typeof window !== 'undefined') {
    performanceMonitor.trackPageLoad(window.location.pathname);
  }
  
  };

// 清理所有拦截器
export const uninstallPerformanceInterceptors = () => {
  uninstallFetchInterceptor();
  };