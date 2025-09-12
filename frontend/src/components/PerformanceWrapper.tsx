import React, { 
  memo, 
  useCallback, 
  useMemo, 
  useEffect, 
  useRef,
  ComponentType,
  ComponentPropsWithoutRef 
} from 'react';
import performanceMonitor from '../utils/PerformanceMonitor';
import performanceOptimizer from '../utils/PerformanceOptimizer';

/**
 * 性能优化包装器HOC
 * 提供组件级别的性能监控和优化
 */

interface PerformanceWrapperOptions {
  displayName?: string;
  enableMemoization?: boolean;
  enableRenderTracking?: boolean;
  enableErrorBoundary?: boolean;
  cacheKey?: (props: any) => string;
  shouldUpdate?: (prevProps: any, nextProps: any) => boolean;
}

/**
 * 性能优化HOC
 */
export function withPerformanceOptimization<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: PerformanceWrapperOptions = {}
) {
  const {
    displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component',
    enableMemoization = true,
    enableRenderTracking = true,
    enableErrorBoundary = true,
    cacheKey,
    shouldUpdate
  } = options;

  const OptimizedComponent: React.FC<P> = (props) => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(0);
    const mountTime = useRef(Date.now());

    // 渲染性能跟踪
    useEffect(() => {
      if (enableRenderTracking) {
        renderCount.current++;
        const now = performance.now();
        const renderTime = now - lastRenderTime.current;
        lastRenderTime.current = now;

        performanceMonitor.addMetric({
          name: `component.${displayName}.render`,
          value: renderTime,
          timestamp: Date.now(),
          metadata: {
            category: 'component',
            renderCount: renderCount.current,
            mountDuration: now - mountTime.current
          }
        });

        // 检查渲染频率
        if (renderCount.current > 10 && renderTime > 50) {
          console.warn(`⚠️ 组件 ${displayName} 渲染频繁且耗时: ${renderTime.toFixed(2)}ms`);
        }
      }
    });

    // 组件卸载时的清理
    useEffect(() => {
      return () => {
        if (enableRenderTracking) {
          const totalLifetime = Date.now() - mountTime.current;
          performanceMonitor.addMetric({
            name: `component.${displayName}.lifetime`,
            value: totalLifetime,
            timestamp: Date.now(),
            metadata: {
              category: 'component',
              totalRenders: renderCount.current
            }
          });
        }
      };
    }, []);

    // 使用缓存优化渲染
    const memoizedProps = useMemo(() => {
      if (!enableMemoization) return props;
      
      const key = cacheKey ? cacheKey(props) : JSON.stringify(props);
      return performanceOptimizer.cacheComponent(
        `${displayName}-props-${key}`,
        () => props,
        30000 // 30秒缓存
      );
    }, [props]);

    return <WrappedComponent {...(memoizedProps as P)} />;
  };

  // 设置显示名称
  OptimizedComponent.displayName = `withPerformanceOptimization(${displayName})`;

  // 根据选项决定是否使用React.memo
  if (enableMemoization) {
    const memoizedComponent = memo(OptimizedComponent, shouldUpdate);
    memoizedComponent.displayName = OptimizedComponent.displayName;
    return memoizedComponent;
  }

  return OptimizedComponent;
}

/**
 * 懒加载组件包装器
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback: React.ComponentType = () => <div>加载中...</div>
) {
  const LazyComponent = React.lazy(() => 
    performanceMonitor.measureAsyncFunction('lazy-import', importFn)
  );

  return (props: P) => (
    <React.Suspense fallback={<fallback />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
}

/**
 * 虚拟化列表组件
 */
interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
  onScroll
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i < endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }
      });
    }
    return result;
  }, [startIndex, endIndex, items, itemHeight]);

  const handleScroll = useCallback(
    performanceOptimizer.createThrottledFunction((e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    }, 16),
    [onScroll]
  );

  useEffect(() => {
    if (enableRenderTracking) {
      performanceMonitor.addMetric({
        name: 'virtualized-list.visible-items',
        value: visibleItems.length,
        timestamp: Date.now(),
        metadata: {
          category: 'virtualization',
          totalItems: items.length,
          startIndex,
          endIndex
        }
      });
    }
  }, [visibleItems.length, items.length, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: items.length * itemHeight,
          position: 'relative'
        }}
      >
        {visibleItems.map(({ index, item, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 图片懒加载组件
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

export const LazyImage: React.FC<LazyImageProps> = memo(({
  src,
  alt,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  className,
  style,
  ...props
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const loadStartTime = performance.now();
          
          const image = new Image();
          image.onload = () => {
            const loadTime = performance.now() - loadStartTime;
            setImageSrc(src);
            setIsLoaded(true);
            
            performanceMonitor.addMetric({
              name: 'image.lazy-load',
              value: loadTime,
              timestamp: Date.now(),
              metadata: {
                category: 'image',
                src: src.substring(0, 100), // 截断长URL
                success: true
              }
            });
          };
          
          image.onerror = () => {
            const loadTime = performance.now() - loadStartTime;
            setIsError(true);
            
            performanceMonitor.addMetric({
              name: 'image.lazy-load',
              value: loadTime,
              timestamp: Date.now(),
              metadata: {
                category: 'image',
                src: src.substring(0, 100),
                success: false
              }
            });
          };
          
          image.src = src;
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src, threshold, rootMargin]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'loaded' : ''} ${isError ? 'error' : ''}`}
      style={{
        transition: 'opacity 0.3s ease',
        opacity: isLoaded ? 1 : 0.7,
        ...style
      }}
      {...props}
    />
  );
});

LazyImage.displayName = 'LazyImage';

/**
 * 错误边界组件
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PerformanceErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 记录错误性能指标
    performanceMonitor.addMetric({
      name: 'error.component',
      value: 1,
      timestamp: Date.now(),
      metadata: {
        category: 'error',
        message: error.message,
        componentStack: errorInfo.componentStack.substring(0, 500)
      }
    });

    console.error('组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>组件渲染出错</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>错误详情</summary>
            <p><strong>错误:</strong> {this.state.error?.message}</p>
            {this.state.errorInfo && (
              <p><strong>组件堆栈:</strong> {this.state.errorInfo.componentStack}</p>
            )}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 性能分析钩子
 */
export function usePerformanceProfiler(componentName: string) {
  const renderStart = useRef(0);
  const renderCount = useRef(0);

  const startProfiler = useCallback(() => {
    renderStart.current = performance.now();
    renderCount.current++;
  }, []);

  const endProfiler = useCallback(() => {
    if (renderStart.current > 0) {
      const renderTime = performance.now() - renderStart.current;
      
      performanceMonitor.addMetric({
        name: `component.${componentName}.render-time`,
        value: renderTime,
        timestamp: Date.now(),
        metadata: {
          category: 'profiling',
          renderCount: renderCount.current
        }
      });

      renderStart.current = 0;
    }
  }, [componentName]);

  return { startProfiler, endProfiler, renderCount: renderCount.current };
}

/**
 * 内存使用钩子
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = React.useState<any>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory);
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

export default {
  withPerformanceOptimization,
  withLazyLoading,
  VirtualizedList,
  LazyImage,
  PerformanceErrorBoundary,
  usePerformanceProfiler,
  useMemoryMonitor
};