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
    
    // 结束追踪
    performanceMonitor.endApiCall(
      trackingId,
      response.status,
      responseSize,
      cacheHit,
      response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    );
    
    activeApiCalls.delete(requestKey);
    return response;
  } catch (error) {
    // 记录错误
    const errorMessage = error instanceof Error ? error.message : 'Network Error';
    performanceMonitor.endApiCall(trackingId, 0, 0, false, errorMessage);
    
    activeApiCalls.delete(requestKey);
    throw error;
  }
};

// Axios拦截器（如果使用Axios）
export const setupAxiosInterceptors = (axiosInstance: any) => {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config: any) => {
      const url = config.url || '';
      const method = config.method?.toUpperCase() || 'GET';
      
      // 开始追踪
      const trackingId = performanceMonitor.startApiCall(url, method, {
        baseURL: config.baseURL,
        headers: config.headers,
        params: config.params,
      });
      
      // 将追踪ID附加到请求配置
      config._performanceTrackingId = trackingId;
      config._performanceStartTime = Date.now();
      
      return config;
    },
    (error: any) => {
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
        onSuccess: (data: any, query: any) => {
          // 追踪成功的查询
          performanceMonitor.trackUserAction('query-success', query.queryKey.join('/'), {
            dataSize: JSON.stringify(data).length,
            fromCache: query._isCached,
          });
        },
        onError: (error: any, query: any) => {
          // 追踪失败的查询
          performanceMonitor.trackUserAction('query-error', query.queryKey.join('/'), {
            error: error.message,
          });
        },
      },
      mutations: {
        onSuccess: (data: any, variables: any, context: any, mutation: any) => {
          performanceMonitor.trackUserAction('mutation-success', mutation.mutationKey?.join('/') || 'unknown', {
            dataSize: JSON.stringify(data).length,
          });
        },
        onError: (error: any, variables: any, context: any, mutation: any) => {
          performanceMonitor.trackUserAction('mutation-error', mutation.mutationKey?.join('/') || 'unknown', {
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
    console.log('Performance monitoring fetch interceptor installed');
  }
};

// 卸载fetch拦截器
export const uninstallFetchInterceptor = () => {
  if (typeof window !== 'undefined' && window.fetch === enhancedFetch) {
    window.fetch = originalFetch;
    console.log('Performance monitoring fetch interceptor uninstalled');
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
  const renderStartTime = React.useRef<number>(0);
  
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
    return function (this: any, ...args: any[]) {
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
  
  console.log('Performance monitoring interceptors installed');
};

// 清理所有拦截器
export const uninstallPerformanceInterceptors = () => {
  uninstallFetchInterceptor();
  console.log('Performance monitoring interceptors uninstalled');
};