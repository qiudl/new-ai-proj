import { useEffect, useRef, useCallback } from 'react';
import { RefreshConfig, DEFAULT_REFRESH_CONFIG } from '../types/refreshConfig';

interface UseAutoRefreshOptions {
  refreshFn: () => Promise<void> | void;
  interval: number; // in seconds
  enabled?: boolean;
  onError?: (error: Error) => void;
  config?: Partial<RefreshConfig>;
}

interface UseAutoRefreshResult {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: Error | null;
  refresh: () => Promise<void>;
  stats?: {
    totalRefreshes: number;
    errors: number;
  };
}

/**
 * Simplified auto-refresh hook without circular dependencies
 */
export function useAutoRefresh({
  refreshFn,
  interval,
  enabled = true,
  onError,
  config = {}
}: UseAutoRefreshOptions): UseAutoRefreshResult {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshing = useRef(false);
  const lastRefresh = useRef<Date | null>(null);
  const error = useRef<Error | null>(null);
  const statsRef = useRef({ totalRefreshes: 0, errors: 0 });
  const mountedRef = useRef(true);

  const mergedConfig = { ...DEFAULT_REFRESH_CONFIG, ...config };

  const refresh = useCallback(async () => {
    if (!mountedRef.current || isRefreshing.current) return;
    
    isRefreshing.current = true;
    error.current = null;
    
    try {
      await refreshFn();
      lastRefresh.current = new Date();
      statsRef.current.totalRefreshes++;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.current = errorObj;
      statsRef.current.errors++;
      
      if (onError) {
        onError(errorObj);
      }
      
      // Log error if debug is enabled
      if (mergedConfig.enableDebugLogs) {
        console.error('[useAutoRefresh] Refresh error:', errorObj);
      }
    } finally {
      isRefreshing.current = false;
    }
  }, [refreshFn, onError, mergedConfig.enableDebugLogs]);

  // Handle visibility change
  useEffect(() => {
    if (!mergedConfig.enableVisibilityDetection) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (enabled && interval > 0) {
        // Page is visible, restart interval
        refresh();
        intervalRef.current = setInterval(refresh, interval * 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval, refresh, mergedConfig.enableVisibilityDetection]);

  // Set up interval
  useEffect(() => {
    if (!enabled || interval <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial refresh
    refresh();

    // Set up interval
    intervalRef.current = setInterval(refresh, interval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    isRefreshing: isRefreshing.current,
    lastRefresh: lastRefresh.current,
    error: error.current,
    refresh,
    stats: statsRef.current
  };
}

// Export a simple version for backward compatibility
export function useSimpleAutoRefresh(
  refreshFn: () => void | Promise<void>,
  intervalSeconds: number,
  enabled: boolean = true
) {
  return useAutoRefresh({
    refreshFn,
    interval: intervalSeconds,
    enabled
  });
}
