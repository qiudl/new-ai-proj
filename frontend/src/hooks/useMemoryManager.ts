import { useEffect, useRef, useCallback } from 'react';

/**
 * 内存管理Hook
 * 用于管理定时器、缓存和其他需要清理的资源
 */

export interface MemoryManager {
  timers: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timer>;
  abortControllers: Set<AbortController>;
  eventListeners: Set<{ element: EventTarget; event: string; handler: EventListener }>;
  cleanupFunctions: Set<() => void>;
}

export const useMemoryManager = () => {
  const managerRef = useRef<MemoryManager>({
    timers: new Set(),
    intervals: new Set(),
    abortControllers: new Set(),
    eventListeners: new Set(),
    cleanupFunctions: new Set()
  });

  // 创建带清理的定时器
  const createTimer = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      managerRef.current.timers.delete(timer);
      callback();
    }, delay);
    managerRef.current.timers.add(timer);
    return timer;
  }, []);

  // 创建带清理的间隔定时器
  const createInterval = useCallback((callback: () => void, delay: number): NodeJS.Timer => {
    const timer = setInterval(callback, delay);
    managerRef.current.intervals.add(timer);
    return timer;
  }, []);

  // 创建带清理的AbortController
  const createAbortController = useCallback((): AbortController => {
    const controller = new AbortController();
    managerRef.current.abortControllers.add(controller);
    return controller;
  }, []);

  // 添加事件监听器
  const addEventListener = useCallback((
    element: EventTarget, 
    event: string, 
    handler: EventListener,
    options?: AddEventListenerOptions
  ) => {
    element.addEventListener(event, handler, options);
    managerRef.current.eventListeners.add({ element, event, handler });
  }, []);

  // 添加清理函数
  const addCleanupFunction = useCallback((cleanup: () => void) => {
    managerRef.current.cleanupFunctions.add(cleanup);
  }, []);

  // 清理单个定时器
  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    if (managerRef.current.timers.has(timer)) {
      clearTimeout(timer);
      managerRef.current.timers.delete(timer);
    }
  }, []);

  // 清理单个间隔定时器
  const clearInterval = useCallback((timer: NodeJS.Timer) => {
    if (managerRef.current.intervals.has(timer)) {
      clearInterval(timer);
      managerRef.current.intervals.delete(timer);
    }
  }, []);

  // 获取资源使用统计
  const getResourceStats = useCallback(() => {
    return {
      activeTimers: managerRef.current.timers.size,
      activeIntervals: managerRef.current.intervals.size,
      activeControllers: managerRef.current.abortControllers.size,
      activeListeners: managerRef.current.eventListeners.size,
      cleanupFunctions: managerRef.current.cleanupFunctions.size
    };
  }, []);

  // 清理所有资源
  const cleanupAll = useCallback(() => {
    const manager = managerRef.current;
    
    // 清理定时器
    manager.timers.forEach(timer => clearTimeout(timer));
    manager.timers.clear();
    
    // 清理间隔定时器
    manager.intervals.forEach(timer => clearInterval(timer));
    manager.intervals.clear();
    
    // 取消所有请求
    manager.abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (error) {
        console.warn('Failed to abort controller:', error);
      }
    });
    manager.abortControllers.clear();
    
    // 移除事件监听器
    manager.eventListeners.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn('Failed to remove event listener:', error);
      }
    });
    manager.eventListeners.clear();
    
    // 执行清理函数
    manager.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    manager.cleanupFunctions.clear();
    
    console.log('🧹 Memory manager cleaned up all resources');
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    createTimer,
    createInterval,
    createAbortController,
    addEventListener,
    addCleanupFunction,
    clearTimer,
    clearInterval,
    getResourceStats,
    cleanupAll
  };
};
