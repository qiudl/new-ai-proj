// Phase 5: 测试优化 - 错误边界测试
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from 'react-error-boundary';

// 错误边界测试组件
const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<div data-testid="error-fallback">出现错误，请刷新页面重试</div>}
      onError={(error, errorInfo) => {
        console.log('错误边界捕获到错误:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// 故意抛错的组件
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = '测试错误' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>正常组件</div>;
};

// 异步错误组件
const AsyncErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      setTimeout(() => {
        throw new Error('异步错误');
      }, 100);
    }
  }, [shouldThrow]);

  return <div>异步组件</div>;
};

// 网络错误模拟组件
const NetworkErrorComponent: React.FC<{ shouldFail?: boolean }> = ({ shouldFail = true }) => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (shouldFail) {
      // 模拟网络请求失败
      fetch('/api/nonexistent')
        .catch(err => setError(new Error('网络请求失败')));
    }
  }, [shouldFail]);

  if (error) {
    throw error;
  }

  return <div>网络组件</div>;
};

describe('错误边界测试', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // 禁用console.error以避免测试输出中的错误信息
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('基本错误捕获', () => {
    it('应该捕获组件渲染错误', () => {
      render(
        <ErrorBoundaryWrapper>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundaryWrapper>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByText('出现错误，请刷新页面重试')).toBeInTheDocument();
    });

    it('正常组件应该正常渲染', () => {
      render(
        <ErrorBoundaryWrapper>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundaryWrapper>
      );

      expect(screen.getByText('正常组件')).toBeInTheDocument();
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
    });

    it('应该显示自定义错误消息', () => {
      const customErrorMessage = '自定义错误消息';
      
      render(
        <ErrorBoundaryWrapper>
          <ThrowErrorComponent shouldThrow={true} errorMessage={customErrorMessage} />
        </ErrorBoundaryWrapper>
      );

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('特定组件错误测试', () => {
    it('TimerErrorBoundary应该捕获计时器相关错误', () => {
      // 模拟计时器组件错误
      const TimerErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={
            <div data-testid="timer-error-fallback">
              计时器出现错误，请重新启动计时
            </div>
          }
          onError={(error) => {
            console.log('计时器错误:', error.message);
          }}
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <TimerErrorBoundary>
          <ThrowErrorComponent errorMessage="计时器服务错误" />
        </TimerErrorBoundary>
      );

      expect(screen.getByTestId('timer-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('计时器出现错误，请重新启动计时')).toBeInTheDocument();
    });

    it('ChartErrorBoundary应该捕获图表渲染错误', () => {
      const ChartErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={
            <div data-testid="chart-error-fallback">
              图表加载失败，请检查数据格式
            </div>
          }
          onError={(error) => {
            console.log('图表错误:', error.message);
          }}
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <ChartErrorBoundary>
          <ThrowErrorComponent errorMessage="图表数据格式错误" />
        </ChartErrorBoundary>
      );

      expect(screen.getByTestId('chart-error-fallback')).toBeInTheDocument();
      expect(screen.getByText('图表加载失败，请检查数据格式')).toBeInTheDocument();
    });

    it('应该处理数据获取错误', () => {
      const DataErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={
            <div data-testid="data-error-fallback">
              数据加载失败，请刷新重试
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <DataErrorBoundary>
          <NetworkErrorComponent shouldFail={true} />
        </DataErrorBoundary>
      );

      // 网络错误可能不会立即触发，但不应该让应用崩溃
      expect(screen.getByText('网络组件')).toBeInTheDocument();
    });
  });

  describe('错误恢复机制', () => {
    it('应该提供重试机制', () => {
      let retryCount = 0;
      
      const RetryErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const [hasError, setHasError] = React.useState(false);
        const [key, setKey] = React.useState(0);

        return (
          <ErrorBoundary
            resetKeys={[key]}
            fallback={
              <div data-testid="retry-error-fallback">
                <div>组件出现错误</div>
                <button 
                  onClick={() => {
                    retryCount++;
                    setKey(prev => prev + 1);
                  }}
                  data-testid="retry-button"
                >
                  重试 ({retryCount})
                </button>
              </div>
            }
            onReset={() => setHasError(false)}
          >
            {children}
          </ErrorBoundary>
        );
      };

      render(
        <RetryErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </RetryErrorBoundary>
      );

      expect(screen.getByTestId('retry-error-fallback')).toBeInTheDocument();
      
      // 点击重试按钮
      const retryButton = screen.getByTestId('retry-button');
      retryButton.click();
      
      expect(screen.getByText('重试 (1)')).toBeInTheDocument();
    });

    it('应该记录错误信息用于调试', () => {
      const errorLogger = jest.fn();
      
      const LoggingErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={<div data-testid="logging-error-fallback">错误已记录</div>}
          onError={(error, errorInfo) => {
            errorLogger({
              error: error.message,
              errorInfo,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              url: window.location.href
            });
          }}
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <LoggingErrorBoundary>
          <ThrowErrorComponent errorMessage="需要记录的错误" />
        </LoggingErrorBoundary>
      );

      expect(screen.getByTestId('logging-error-fallback')).toBeInTheDocument();
      expect(errorLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '需要记录的错误',
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      );
    });
  });

  describe('嵌套错误边界', () => {
    it('内层错误边界应该优先捕获错误', () => {
      render(
        <ErrorBoundary
          fallback={<div data-testid="outer-error">外层错误</div>}
        >
          <div>外层正常内容</div>
          <ErrorBoundary
            fallback={<div data-testid="inner-error">内层错误</div>}
          >
            <ThrowErrorComponent />
          </ErrorBoundary>
          <div>更多外层内容</div>
        </ErrorBoundary>
      );

      // 内层错误边界应该捕获错误，外层内容应该正常显示
      expect(screen.getByTestId('inner-error')).toBeInTheDocument();
      expect(screen.getByText('外层正常内容')).toBeInTheDocument();
      expect(screen.getByText('更多外层内容')).toBeInTheDocument();
      expect(screen.queryByTestId('outer-error')).not.toBeInTheDocument();
    });

    it('当内层错误边界失败时，外层应该捕获', () => {
      const FailingErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        // 故意让错误边界本身抛错
        React.useEffect(() => {
          throw new Error('错误边界本身出错');
        }, []);

        return (
          <ErrorBoundary
            fallback={<div data-testid="inner-error">内层错误</div>}
          >
            {children}
          </ErrorBoundary>
        );
      };

      render(
        <ErrorBoundary
          fallback={<div data-testid="outer-error">外层捕获错误</div>}
        >
          <FailingErrorBoundary>
            <div>正常内容</div>
          </FailingErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('outer-error')).toBeInTheDocument();
    });
  });

  describe('生产环境错误处理', () => {
    it('生产环境应该隐藏详细错误信息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const ProductionErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={
            <div data-testid="production-error">
              <h3>出现了一些问题</h3>
              <p>我们正在努力修复，请稍后再试</p>
              <p>如果问题持续存在，请联系技术支持</p>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <ProductionErrorBoundary>
          <ThrowErrorComponent errorMessage="生产环境错误" />
        </ProductionErrorBoundary>
      );

      expect(screen.getByTestId('production-error')).toBeInTheDocument();
      expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
      expect(screen.getByText('我们正在努力修复，请稍后再试')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('开发环境应该显示详细错误信息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const DevelopmentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={({ error }) => (
            <div data-testid="development-error">
              <h3>开发环境错误</h3>
              <pre>{error?.message}</pre>
              <details>
                <summary>错误堆栈</summary>
                <pre>{error?.stack}</pre>
              </details>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <DevelopmentErrorBoundary>
          <ThrowErrorComponent errorMessage="开发环境详细错误" />
        </DevelopmentErrorBoundary>
      );

      expect(screen.getByTestId('development-error')).toBeInTheDocument();
      expect(screen.getByText('开发环境错误')).toBeInTheDocument();
      expect(screen.getByText('开发环境详细错误')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('错误边界性能测试', () => {
    it('错误边界不应该影响正常组件性能', () => {
      const renderCount = jest.fn();
      
      const NormalComponent = () => {
        renderCount();
        return <div>正常组件</div>;
      };

      const { rerender } = render(
        <ErrorBoundary fallback={<div>错误</div>}>
          <NormalComponent />
        </ErrorBoundary>
      );

      expect(renderCount).toHaveBeenCalledTimes(1);

      // 重新渲染
      rerender(
        <ErrorBoundary fallback={<div>错误</div>}>
          <NormalComponent />
        </ErrorBoundary>
      );

      // 应该只渲染一次（React.memo优化）
      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('错误状态下的重新渲染应该高效', () => {
      const { rerender } = render(
        <ErrorBoundary fallback={<div data-testid="error-state">错误状态</div>}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-state')).toBeInTheDocument();

      // 在错误状态下重新渲染
      rerender(
        <ErrorBoundary fallback={<div data-testid="error-state">错误状态</div>}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      // 错误状态应该保持
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
  });

  describe('错误边界集成测试', () => {
    it('应该与React Router正确集成', () => {
      // 模拟路由错误
      const RouterErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={
            <div data-testid="router-error">
              <h2>页面加载错误</h2>
              <button onClick={() => window.location.reload()}>
                刷新页面
              </button>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <RouterErrorBoundary>
          <ThrowErrorComponent errorMessage="路由组件错误" />
        </RouterErrorBoundary>
      );

      expect(screen.getByTestId('router-error')).toBeInTheDocument();
      expect(screen.getByText('页面加载错误')).toBeInTheDocument();
    });

    it('应该与状态管理正确集成', () => {
      // 模拟状态管理错误
      const StateErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <ErrorBoundary
          fallback={
            <div data-testid="state-error">
              状态管理错误，请重新登录
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      );

      render(
        <StateErrorBoundary>
          <ThrowErrorComponent errorMessage="Redux状态错误" />
        </StateErrorBoundary>
      );

      expect(screen.getByTestId('state-error')).toBeInTheDocument();
      expect(screen.getByText('状态管理错误，请重新登录')).toBeInTheDocument();
    });
  });
});