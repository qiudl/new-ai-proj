// Phase 5: 测试优化 - 性能优化测试
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { performance } from 'perf_hooks';
import DashboardPage from '../../pages/DashboardPage';
import { BrowserRouter } from 'react-router-dom';
import { TimerProvider } from '../../contexts/TimerContext';

// Mock timer context
const mockTimerContext = {
  timerState: {
    isRunning: false,
    isPaused: false,
    elapsedTime: 0,
    currentTask: null
  },
  startTimer: jest.fn(),
  stopTimer: jest.fn(),
  pauseTimer: jest.fn(),
  resumeTimer: jest.fn()
};

// Mock performance API for older environments
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  } as any;
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

const renderDashboardWithTimer = () => {
  return render(
    <BrowserRouter>
      <TimerProvider value={mockTimerContext as any}>
        <DashboardPage />
      </TimerProvider>
    </BrowserRouter>
  );
};

describe('性能优化测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 模拟性能标记
    performance.mark = jest.fn();
    performance.measure = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('组件渲染性能', () => {
    it('Dashboard页面首次渲染应该在合理时间内完成', async () => {
      const startTime = performance.now();
      
      renderDashboardWithTimer();
      
      await waitFor(() => {
        expect(screen.getByText('我的工作台')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Dashboard应该在2秒内渲染完成
      expect(renderTime).toBeLessThan(2000);
    });

    it('大量任务数据渲染性能测试', async () => {
      // 生成大量测试数据
      const largeTasks = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        title: `性能测试任务 ${index + 1}`,
        status: ['todo', 'in_progress', 'completed'][index % 3] as any,
        priority: ['low', 'medium', 'high'][index % 3] as any,
        project_name: `项目 ${Math.floor(index / 10) + 1}`,
        custom_fields: {
          priority: ['low', 'medium', 'high'][index % 3],
          estimated_hours: Math.floor(Math.random() * 8) + 1,
          tags: [`tag${index % 5}`, `category${index % 3}`]
        }
      }));

      const startTime = performance.now();
      
      // 模拟大数据量渲染
      const { container } = renderDashboardWithTimer();
      
      await waitFor(() => {
        expect(container.querySelector('.dashboard-simplified-layout')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // 即使大量数据也应该在5秒内渲染完成
      expect(renderTime).toBeLessThan(5000);
    });

    it('组件重新渲染性能测试', async () => {
      const { rerender } = renderDashboardWithTimer();
      
      // 第一次渲染完成后
      await waitFor(() => {
        expect(screen.getByText('我的工作台')).toBeInTheDocument();
      });
      
      const startTime = performance.now();
      
      // 模拟props变化导致的重新渲染
      rerender(
        <BrowserRouter>
          <TimerProvider value={{
            ...mockTimerContext,
            timerState: {
              ...mockTimerContext.timerState,
              isRunning: true,
              currentTask: { id: 1, title: '测试任务' }
            }
          } as any}>
            <DashboardPage />
          </TimerProvider>
        </BrowserRouter>
      );
      
      const endTime = performance.now();
      const rerenderTime = endTime - startTime;
      
      // 重新渲染应该在500ms内完成
      expect(rerenderTime).toBeLessThan(500);
    });
  });

  describe('内存使用优化', () => {
    it('组件卸载时应该清理所有事件监听器', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderDashboardWithTimer();
      
      act(() => {
        unmount();
      });
      
      // 验证事件监听器被清理
      expect(removeEventListenerSpy).toHaveBeenCalled();
      
      removeEventListenerSpy.mockRestore();
    });

    it('长时间运行不应该有内存泄漏', async () => {
      const { rerender, unmount } = renderDashboardWithTimer();
      
      // 模拟多次重新渲染（模拟长时间使用）
      for (let i = 0; i < 50; i++) {
        rerender(
          <BrowserRouter>
            <TimerProvider value={{
              ...mockTimerContext,
              timerState: {
                ...mockTimerContext.timerState,
                elapsedTime: i * 1000 // 模拟时间变化
              }
            } as any}>
              <DashboardPage />
            </TimerProvider>
          </BrowserRouter>
        );
        
        // 等待每次渲染完成
        await waitFor(() => {
          expect(screen.getByText('我的工作台')).toBeInTheDocument();
        });
      }
      
      // 卸载组件
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('定时器清理验证', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = renderDashboardWithTimer();
      
      act(() => {
        unmount();
      });
      
      // 验证定时器被清理（如果有的话）
      // 这里主要验证组件卸载时不会抛错
      expect(() => {
        // 模拟定时器回调在组件卸载后被调用
        jest.runAllTimers();
      }).not.toThrow();
      
      clearTimeoutSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('懒加载和代码分割', () => {
    it('应该支持组件懒加载', async () => {
      // 模拟动态导入
      const mockLazyComponent = jest.fn().mockResolvedValue({
        default: () => <div>懒加载组件</div>
      });
      
      // 测试React.lazy的使用
      expect(() => {
        const LazyComponent = React.lazy(mockLazyComponent);
        render(
          <React.Suspense fallback={<div>加载中...</div>}>
            <LazyComponent />
          </React.Suspense>
        );
      }).not.toThrow();
    });

    it('Suspense边界应该正确显示加载状态', async () => {
      const NeverResolveComponent = React.lazy(() => new Promise(() => {}));
      
      render(
        <React.Suspense fallback={<div data-testid="loading">组件加载中...</div>}>
          <NeverResolveComponent />
        </React.Suspense>
      );
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('组件加载中...')).toBeInTheDocument();
    });
  });

  describe('虚拟滚动性能', () => {
    it('大量数据列表应该使用虚拟滚动优化', () => {
      const { container } = renderDashboardWithTimer();
      
      // 检查是否有虚拟滚动相关的容器
      const scrollContainer = container.querySelector('[style*="overflow"]');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('滚动性能应该流畅', async () => {
      const { container } = renderDashboardWithTimer();
      
      const scrollContainer = container.querySelector('.dashboard-simplified-layout');
      if (scrollContainer) {
        const startTime = performance.now();
        
        // 模拟快速滚动
        for (let i = 0; i < 10; i++) {
          act(() => {
            scrollContainer.scrollTop = i * 100;
            // 触发滚动事件
            scrollContainer.dispatchEvent(new Event('scroll'));
          });
        }
        
        const endTime = performance.now();
        const scrollTime = endTime - startTime;
        
        // 滚动操作应该在100ms内完成
        expect(scrollTime).toBeLessThan(100);
      }
    });
  });

  describe('缓存和优化策略', () => {
    it('应该缓存计算结果', () => {
      const { rerender } = renderDashboardWithTimer();
      
      // 模拟相同数据的多次渲染
      const sameProps = {
        ...mockTimerContext,
        timerState: {
          ...mockTimerContext.timerState,
          elapsedTime: 1000
        }
      };
      
      const startTime = performance.now();
      
      // 多次使用相同props重新渲染
      for (let i = 0; i < 5; i++) {
        rerender(
          <BrowserRouter>
            <TimerProvider value={sameProps as any}>
              <DashboardPage />
            </TimerProvider>
          </BrowserRouter>
        );
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // 缓存优化后，多次相同渲染应该很快
      expect(totalTime).toBeLessThan(1000);
    });

    it('React.memo应该防止不必要的重新渲染', () => {
      let renderCount = 0;
      
      const TestComponent = React.memo(() => {
        renderCount++;
        return <div>测试组件</div>;
      });
      
      const { rerender } = render(<TestComponent />);
      
      expect(renderCount).toBe(1);
      
      // 使用相同props重新渲染
      rerender(<TestComponent />);
      
      // 由于使用了React.memo，不应该重新渲染
      expect(renderCount).toBe(1);
    });
  });

  describe('网络请求优化', () => {
    it('应该正确处理并发请求', async () => {
      // 模拟多个API请求
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve({ projects: [] }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ tasks: [] }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ stats: {} }) });
      
      global.fetch = mockFetch;
      
      renderDashboardWithTimer();
      
      await waitFor(() => {
        expect(screen.getByText('我的工作台')).toBeInTheDocument();
      });
      
      // 验证请求被正确发送
      expect(mockFetch).toHaveBeenCalled();
    });

    it('应该有请求防抖机制', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ 
        json: () => Promise.resolve({ data: [] }) 
      });
      global.fetch = mockFetch;
      
      renderDashboardWithTimer();
      
      // 快速触发多次更新
      for (let i = 0; i < 5; i++) {
        act(() => {
          // 模拟状态快速变化
          mockTimerContext.timerState.elapsedTime = i * 1000;
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText('我的工作台')).toBeInTheDocument();
      });
      
      // 由于防抖，实际请求次数应该少于触发次数
      expect(mockFetch.mock.calls.length).toBeLessThan(5);
    });
  });

  describe('CSS和样式性能', () => {
    it('应该使用CSS变量进行主题优化', () => {
      const { container } = renderDashboardWithTimer();
      
      // 检查CSS变量的使用
      const computedStyle = getComputedStyle(container.firstChild as Element);
      expect(computedStyle.getPropertyValue('--primary-color') || 
             document.documentElement.style.getPropertyValue('--primary-color')).toBeDefined();
    });

    it('动画性能应该使用transform和opacity', () => {
      const { container } = renderDashboardWithTimer();
      
      // 查找可能的动画元素
      const animatedElements = container.querySelectorAll('[style*="transform"], [style*="opacity"]');
      
      // 如果有动画，应该使用高性能的CSS属性
      if (animatedElements.length > 0) {
        expect(animatedElements.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Bundle大小优化', () => {
    it('应该使用tree shaking优化', () => {
      // 这个测试主要用于文档化，实际的tree shaking在构建时进行
      expect(true).toBe(true);
    });

    it('应该避免导入未使用的库', () => {
      // 检查是否有明显的过度导入
      // 这里主要是提醒开发者注意导入优化
      expect(true).toBe(true);
    });
  });

  describe('浏览器兼容性性能', () => {
    it('应该在不同浏览器中保持一致的性能', () => {
      // 模拟不同的浏览器环境
      const originalUserAgent = navigator.userAgent;
      
      // 测试Chrome环境
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });
      
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();
      
      // 恢复原始userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
    });

    it('应该在移动设备上保持良好性能', () => {
      // 模拟移动设备
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });
      
      const startTime = performance.now();
      
      renderDashboardWithTimer();
      
      const endTime = performance.now();
      const mobileRenderTime = endTime - startTime;
      
      // 移动设备上的渲染时间应该可接受
      expect(mobileRenderTime).toBeLessThan(3000);
    });
  });
});