// React Hook用于组件性能追踪
import { useEffect, useRef } from 'react';
import { usePerformanceMonitor } from '../services/performanceMonitor';

// 组件渲染性能追踪
export const useComponentPerformanceTracking = (componentName: string) => {
  const { trackComponent, trackUserAction } = usePerformanceMonitor();
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const mountTime = useRef<number>(0);

  // 记录挂载时间
  useEffect(() => {
    mountTime.current = performance.now();
    renderCount.current = 0;

    return () => {
      // 组件卸载时记录生命周期
      const unmountTime = performance.now();
      trackUserAction('component-lifecycle', componentName, {
        totalLifetime: unmountTime - mountTime.current,
        totalRenders: renderCount.current,
      });
    };
  }, [componentName, trackUserAction]);

  // 记录每次渲染
  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;

    // 在下一个事件循环中计算渲染时间
    const timeoutId = setTimeout(() => {
      const renderTime = performance.now() - renderStartTime.current;
      trackComponent(componentName, renderTime, renderCount.current);
    }, 0);

    return () => clearTimeout(timeoutId);
  });

  return {
    renderCount: renderCount.current,
    trackUserInteraction: (action: string, details?: Record<string, any>) => {
      trackUserAction(action, componentName, details);
    },
  };
};

// API调用性能追踪（用于手动API调用）
export const useApiPerformanceTracking = () => {
  const { startApiCall, endApiCall } = usePerformanceMonitor();
  
  const trackApiCall = async <T>(
    url: string,
    method: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const trackingId = startApiCall(url, method, metadata);
    
    try {
      const result = await apiCall();
      
      // 尝试估算响应大小
      const responseSize = JSON.stringify(result).length;
      endApiCall(trackingId, 200, responseSize, false);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API call failed';
      endApiCall(trackingId, 500, 0, false, errorMessage);
      throw error;
    }
  };

  return { trackApiCall };
};

// 页面性能追踪
export const usePagePerformanceTracking = (pageName: string) => {
  const { trackUserAction } = usePerformanceMonitor();
  const pageLoadTime = useRef<number>(0);
  const interactionCount = useRef<number>(0);

  useEffect(() => {
    pageLoadTime.current = performance.now();
    interactionCount.current = 0;

    // 追踪页面访问
    trackUserAction('page-visit', pageName, {
      timestamp: Date.now(),
      url: window.location.href,
    });

    // 监听用户交互
    const handleUserInteraction = () => {
      interactionCount.current += 1;
    };

    // 添加各种用户交互监听器
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      // 页面卸载时记录统计
      const totalTime = performance.now() - pageLoadTime.current;
      trackUserAction('page-unload', pageName, {
        totalTime,
        interactionCount: interactionCount.current,
        engagement: interactionCount.current / (totalTime / 1000), // 每秒交互数
      });

      // 清理事件监听器
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [pageName, trackUserAction]);

  const trackPageAction = (action: string, details?: Record<string, any>) => {
    interactionCount.current += 1;
    trackUserAction(`page-action:${action}`, pageName, {
      ...details,
      pageTime: performance.now() - pageLoadTime.current,
      interactionSequence: interactionCount.current,
    });
  };

  return {
    interactionCount: interactionCount.current,
    trackPageAction,
  };
};

// 表单性能追踪
export const useFormPerformanceTracking = (formName: string) => {
  const { trackUserAction } = usePerformanceMonitor();
  const formStartTime = useRef<number>(0);
  const fieldInteractions = useRef<Record<string, number>>({});

  useEffect(() => {
    formStartTime.current = performance.now();
    fieldInteractions.current = {};
  }, []);

  const trackFieldInteraction = (fieldName: string, action: 'focus' | 'blur' | 'change') => {
    if (!fieldInteractions.current[fieldName]) {
      fieldInteractions.current[fieldName] = 0;
    }
    fieldInteractions.current[fieldName] += 1;

    trackUserAction(`form-field:${action}`, `${formName}.${fieldName}`, {
      formTime: performance.now() - formStartTime.current,
      fieldInteractionCount: fieldInteractions.current[fieldName],
    });
  };

  const trackFormSubmit = (success: boolean, data?: any) => {
    const formTime = performance.now() - formStartTime.current;
    const totalInteractions = Object.values(fieldInteractions.current).reduce((sum, count) => sum + count, 0);
    
    trackUserAction('form-submit', formName, {
      success,
      formTime,
      totalInteractions,
      fieldCount: Object.keys(fieldInteractions.current).length,
      dataSize: data ? JSON.stringify(data).length : 0,
    });
  };

  return {
    trackFieldInteraction,
    trackFormSubmit,
  };
};

// 搜索性能追踪
export const useSearchPerformanceTracking = (searchContext: string) => {
  const { trackUserAction } = usePerformanceMonitor();
  const searchStartTime = useRef<number>(0);

  const trackSearchStart = (query: string) => {
    searchStartTime.current = performance.now();
    trackUserAction('search-start', searchContext, {
      query,
      queryLength: query.length,
    });
  };

  const trackSearchResult = (query: string, resultCount: number, fromCache: boolean = false) => {
    const searchTime = performance.now() - searchStartTime.current;
    trackUserAction('search-complete', searchContext, {
      query,
      queryLength: query.length,
      resultCount,
      searchTime,
      fromCache,
      efficiency: resultCount / searchTime, // 结果数/毫秒
    });
  };

  const trackSearchError = (query: string, error: string) => {
    const searchTime = performance.now() - searchStartTime.current;
    trackUserAction('search-error', searchContext, {
      query,
      queryLength: query.length,
      searchTime,
      error,
    });
  };

  return {
    trackSearchStart,
    trackSearchResult,
    trackSearchError,
  };
};

// 导航性能追踪
export const useNavigationPerformanceTracking = () => {
  const { trackUserAction } = usePerformanceMonitor();
  
  const trackNavigation = (from: string, to: string, method: 'link' | 'button' | 'programmatic' = 'programmatic') => {
    trackUserAction('navigation', `${from} -> ${to}`, {
      from,
      to,
      method,
      timestamp: Date.now(),
    });
  };

  return { trackNavigation };
};

// 实用工具：批量追踪多个指标
export const useBatchPerformanceTracking = () => {
  const { trackUserAction, trackComponent } = usePerformanceMonitor();
  
  const trackBatch = (metrics: Array<{
    type: 'user-action' | 'component';
    name: string;
    target?: string;
    duration?: number;
    metadata?: Record<string, any>;
  }>) => {
    metrics.forEach(metric => {
      if (metric.type === 'user-action') {
        trackUserAction(metric.name, metric.target || 'unknown', metric.metadata);
      } else if (metric.type === 'component' && metric.duration) {
        trackComponent(metric.name, metric.duration);
      }
    });
  };

  return { trackBatch };
};