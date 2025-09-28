import React, { Suspense, memo, ComponentType, ReactNode, useState, useEffect } from 'react';
import { Spin, Alert, Button } from 'antd';
import { errorLogger } from '../../utils/ErrorLogger';

interface LazyComponentLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  loadingMessage?: string;
  componentName?: string;
}

interface LazyLoadState {
  hasError: boolean;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * 增强的懒加载组件包装器
 * 
 * 特性：
 * 1. 错误边界保护
 * 2. 自动重试机制
 * 3. 性能监控
 * 4. 自定义加载状态
 * 5. 错误恢复
 */
const LazyComponentLoader: React.FC<LazyComponentLoaderProps> = memo(({
  children,
  fallback,
  errorFallback,
  onError,
  retry = true,
  retryDelay = 2000,
  maxRetries = 3,
  loadingMessage = '正在加载组件...',
  componentName = 'Unknown'
}) => {
  const [state, setState] = useState<LazyLoadState>({
    hasError: false,
    retryCount: 0,
    isRetrying: false
  });

  // 默认加载占位符
  const defaultFallback = (
    <div style={{ 
      textAlign: 'center', 
      padding: '40px',
      background: '#fafafa',
      borderRadius: '6px'
    }}>
      <Spin size="large" />
      <div style={{ marginTop: '16px', color: '#666' }}>
        {loadingMessage}
      </div>
    </div>
  );

  // 默认错误占位符
  const defaultErrorFallback = (
    <Alert
      message="组件加载失败"
      description={
        <div>
          <div style={{ marginBottom: '12px' }}>
            组件 "{componentName}" 加载时出现错误
          </div>
          {retry && state.retryCount < maxRetries && (
            <Button
              type="primary"
              size="small"
              loading={state.isRetrying}
              onClick={handleRetry}
            >
              重试 ({state.retryCount + 1}/{maxRetries})
            </Button>
          )}
          {state.retryCount >= maxRetries && (
            <div style={{ color: '#999', fontSize: '12px' }}>
              已达到最大重试次数
            </div>
          )}
        </div>
      }
      type="error"
      showIcon
    />
  );

  // 重试处理
  const handleRetry = async () => {
    if (state.retryCount >= maxRetries) return;

    setState(prev => ({ ...prev, isRetrying: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      setState(prev => ({
        hasError: false,
        retryCount: prev.retryCount + 1,
        isRetrying: false
      }));
      
      errorLogger.info('performance', 'LazyComponentLoader: 重试成功', {
        componentName,
        retryCount: state.retryCount + 1
      });
    } catch (error) {
      setState(prev => ({ ...prev, isRetrying: false }));
      
      errorLogger.error('performance', 'LazyComponentLoader: 重试失败', {
        componentName,
        retryCount: state.retryCount + 1,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 错误处理
  useEffect(() => {
    if (state.hasError) {
      errorLogger.error('performance', 'LazyComponentLoader: 组件加载错误', {
        componentName,
        retryCount: state.retryCount
      });
    }
  }, [state.hasError, componentName, state.retryCount]);

  if (state.hasError) {
    return errorFallback || defaultErrorFallback;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        setState(prev => ({ ...prev, hasError: true }));
        onError?.(error, errorInfo);
        
        errorLogger.error('performance', 'LazyComponentLoader: 错误边界捕获错误', {
          componentName,
          error: error.message,
          errorInfo
        });
      }}
    >
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

LazyComponentLoader.displayName = 'LazyComponentLoader';

// 错误边界组件
interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      throw this.state.error;
    }

    return this.props.children;
  }
}

/**
 * 高阶组件：为懒加载组件添加增强功能
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options?: Omit<LazyComponentLoaderProps, 'children'>
) {
  const WrappedComponent = memo((props: P) => (
    <LazyComponentLoader {...options}>
      <Component {...props} />
    </LazyComponentLoader>
  ));

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook：动态懒加载组件
 */
export function useLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    preload?: boolean;
    cacheTimeout?: number;
  }
) {
  const [Component, setComponent] = useState<ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = async () => {
    if (Component || loading) return;

    setLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(() => module.default);
      
      errorLogger.debug('performance', 'useLazyComponent: 组件加载成功', {
        componentName: module.default.displayName || module.default.name
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('组件加载失败');
      setError(error);
      
      errorLogger.error('performance', 'useLazyComponent: 组件加载失败', {
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 预加载
  useEffect(() => {
    if (options?.preload) {
      loadComponent();
    }
  }, [options?.preload]);

  return {
    Component,
    loading,
    error,
    loadComponent
  };
}

/**
 * 批量懒加载组件的工厂函数
 */
export function createLazyComponents<T extends Record<string, () => Promise<{ default: ComponentType<any> }>>>(
  componentMap: T
): { [K in keyof T]: ComponentType<any> } {
  const lazyComponents = {} as { [K in keyof T]: ComponentType<any> };

  for (const [key, importFn] of Object.entries(componentMap)) {
    lazyComponents[key as keyof T] = React.lazy(importFn);
  }

  return lazyComponents;
}

export default LazyComponentLoader;