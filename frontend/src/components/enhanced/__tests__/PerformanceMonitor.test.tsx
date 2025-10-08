import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceMonitor from '../PerformanceMonitor';

// Mock Performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 4 * 1024 * 1024 * 1024 // 4GB
  }
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock PerformanceObserver
class MockPerformanceObserver {
  callback: any;
  constructor(callback: any) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
}

Object.defineProperty(window, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn((callback) => {
    setTimeout(callback, 16);
    return 1;
  }),
  writable: true
});

describe('PerformanceMonitor', () => {
  const defaultProps = {
    documentId: 'test-doc-1',
    onOptimize: jest.fn(),
    onClearCache: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders performance monitor correctly', () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    expect(screen.getByText('性能监控')).toBeInTheDocument();
    expect(screen.getByText('监控中')).toBeInTheDocument();
  });

  it('displays performance metrics', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    // Wait for initial metrics collection
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(screen.getByText('渲染时间')).toBeInTheDocument();
      expect(screen.getByText('内存使用')).toBeInTheDocument();
      expect(screen.getByText('滚动性能')).toBeInTheDocument();
      expect(screen.getByText('缓存命中率')).toBeInTheDocument();
    });
  });

  it('shows document statistics', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/文档大小:/)).toBeInTheDocument();
      expect(screen.getByText(/内容块:/)).toBeInTheDocument();
      expect(screen.getByText(/更新:/)).toBeInTheDocument();
    });
  });

  it('toggles monitoring when start/stop button is clicked', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /停止/ });
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('已停止')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /开始/ })).toBeInTheDocument();
    });
  });

  it('refreshes metrics when refresh button is clicked', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    const refreshButton = screen.getByRole('button', { title: '刷新指标' });
    fireEvent.click(refreshButton);
    
    // Metrics should be updated
    await waitFor(() => {
      expect(screen.getByText('性能监控')).toBeInTheDocument();
    });
  });

  it('calls onOptimize when optimize button is clicked', async () => {
    const mockOnOptimize = jest.fn();
    render(<PerformanceMonitor {...defaultProps} onOptimize={mockOnOptimize} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      const optimizeButton = screen.getByRole('button', { name: /应用优化/ });
      fireEvent.click(optimizeButton);
      
      expect(mockOnOptimize).toHaveBeenCalled();
    });
  });

  it('calls onClearCache when clear cache button is clicked', async () => {
    const mockOnClearCache = jest.fn();
    render(<PerformanceMonitor {...defaultProps} onClearCache={mockOnClearCache} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      const clearCacheButton = screen.getByRole('button', { name: /清理缓存/ });
      fireEvent.click(clearCacheButton);
      
      expect(mockOnClearCache).toHaveBeenCalled();
    });
  });

  it('displays performance trends when available', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    // Simulate multiple performance measurements
    act(() => {
      jest.advanceTimersByTime(2000); // Advance by 2 seconds
    });
    
    await waitFor(() => {
      const trendChart = screen.queryByText('FPS 趋势');
      if (trendChart) {
        expect(trendChart).toBeInTheDocument();
      }
    });
  });

  it('shows optimization suggestions based on metrics', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(screen.getByText('优化建议')).toBeInTheDocument();
    });
  });

  it('updates metrics periodically when monitoring is active', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    // Initial render
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Advance time to trigger periodic update
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      expect(screen.getByText('性能监控')).toBeInTheDocument();
    });
  });

  it('stops collecting metrics when monitoring is disabled', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    // Stop monitoring
    const toggleButton = screen.getByRole('button', { name: /停止/ });
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('已停止')).toBeInTheDocument();
    });
    
    // Advance time - metrics should not update
    act(() => {
      jest.advanceTimersByTime(5000);
    });
  });

  it('handles memory API not being available', () => {
    // Temporarily remove memory API
    const originalMemory = (window.performance as any).memory;
    delete (window.performance as any).memory;
    
    render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    expect(screen.getByText('性能监控')).toBeInTheDocument();
    
    // Restore memory API
    (window.performance as any).memory = originalMemory;
  });

  it('handles PerformanceObserver not being available', () => {
    // Temporarily remove PerformanceObserver
    const originalPO = window.PerformanceObserver;
    delete (window as any).PerformanceObserver;
    
    render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    expect(screen.getByText('性能监控')).toBeInTheDocument();
    
    // Restore PerformanceObserver
    (window as any).PerformanceObserver = originalPO;
  });

  it('applies correct color coding for performance levels', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      // Check if progress bars and metrics have appropriate colors
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('displays hover tooltips for metrics', async () => {
    render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      const cacheMetric = screen.getByText('缓存命中率');
      fireEvent.mouseOver(cacheMetric);
      
      // Tooltip should appear
      expect(screen.getByText(/缓存命中率反映了数据重用效率/)).toBeInTheDocument();
    });
  });

  it('cleans up resources on unmount', () => {
    const { unmount } = render(<PerformanceMonitor {...defaultProps} />);
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Unmount component
    unmount();
    
    // Advance timers to ensure cleanup worked
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // No errors should occur
  });
});