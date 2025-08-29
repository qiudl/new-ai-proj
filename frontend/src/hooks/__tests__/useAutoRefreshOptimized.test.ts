import { renderHook, act } from '@testing-library/react';
import { useAutoRefreshOptimized } from '../useAutoRefreshOptimized';
import { RefreshConfigProvider } from '../../contexts/RefreshConfigContext';

describe('useAutoRefreshOptimized', () => {
  const mockFetchFunction = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call fetch function on initial load', async () => {
    mockFetchFunction.mockResolvedValue('test data');
    
    const { result } = renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        interval: 30000
      })
    );

    await act(async () => {
      await Promise.resolve(); // Wait for initial call
    });

    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should auto refresh at specified interval', async () => {
    mockFetchFunction.mockResolvedValue('test data');
    
    renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        interval: 30000
      })
    );

    // Initial call
    await act(async () => {
      await Promise.resolve();
    });

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchFunction).toHaveBeenCalledTimes(2);
  });

  it('should pause refresh when page is not visible', async () => {
    mockFetchFunction.mockResolvedValue('test data');
    
    // Mock page visibility API
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });

    renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        interval: 30000,
        enableVisibilityDetection: true
      })
    );

    // Simulate page becoming hidden
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should not refresh when page is hidden
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should handle errors with retry mechanism', async () => {
    mockFetchFunction
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success');
    
    const { result } = renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        maxRetries: 2,
        retryInterval: 1000
      })
    );

    // Initial failed call
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeTruthy();

    // Wait for retry
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchFunction).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('should implement request deduplication', async () => {
    mockFetchFunction.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('data'), 100))
    );
    
    renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        cacheKey: 'test-key',
        enableCache: true
      })
    );

    // Trigger multiple rapid refreshes
    await act(async () => {
      await Promise.resolve();
    });

    // Should only call once due to deduplication
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should clean up timers on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        interval: 30000
      })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should handle dependencies changes correctly', async () => {
    mockFetchFunction.mockResolvedValue('data');
    
    const { rerender } = renderHook(
      ({ deps }) => useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        interval: 30000,
        dependencies: deps
      }),
      { initialProps: { deps: [1] } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchFunction).toHaveBeenCalledTimes(1);

    // Change dependencies
    rerender({ deps: [2] });

    await act(async () => {
      await Promise.resolve();
    });

    // Should trigger immediate refresh due to dependency change
    expect(mockFetchFunction).toHaveBeenCalledTimes(2);
  });

  it('should respect enabled/disabled state', async () => {
    mockFetchFunction.mockResolvedValue('data');
    
    const { rerender } = renderHook(
      ({ enabled }) => useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        interval: 30000,
        enabled
      }),
      { initialProps: { enabled: false } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Should not call when disabled
    expect(mockFetchFunction).toHaveBeenCalledTimes(0);

    // Enable the hook
    rerender({ enabled: true });

    await act(async () => {
      await Promise.resolve();
    });

    // Should call when enabled
    expect(mockFetchFunction).toHaveBeenCalledTimes(1);
  });

  it('should provide correct refresh state information', async () => {
    mockFetchFunction.mockResolvedValue('data');
    
    const { result } = renderHook(() =>
      useAutoRefreshOptimized(mockFetchFunction, {
        immediate: true,
        interval: 30000
      })
    );

    // Initially should be refreshing
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.refreshType).toBe('initial');

    await act(async () => {
      await Promise.resolve();
    });

    // After completion
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.lastRefreshTime).toBeInstanceOf(Date);
  });
});
