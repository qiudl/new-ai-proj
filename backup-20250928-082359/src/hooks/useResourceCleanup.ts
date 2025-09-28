import { useEffect, useRef, useCallback } from 'react';

// 定时器管理Hook - 自动清理防止内存泄漏
export const useTimerCleanup = () => {
  const timers = useRef<Set<any>>(new Set());
  
  // 创建受管理的定时器
  const createTimer = useCallback((callback: Function, delay: number, isInterval = false) => {
    const timer = isInterval 
      ? setInterval(callback as TimerHandler, delay)
      : setTimeout(callback as TimerHandler, delay);
    
    timers.current.add(timer);
    
    // 返回清理函数
    return () => {
      if (isInterval) {
        clearInterval(timer);
      } else {
        clearTimeout(timer);
      }
      timers.current.delete(timer);
    };
  }, []);
  
  // 受管理的setTimeout
  const setManagedTimeout = useCallback((callback: Function, delay: number) => {
    return createTimer(callback, delay, false);
  }, [createTimer]);
  
  // 受管理的setInterval
  const setManagedInterval = useCallback((callback: Function, delay: number) => {
    return createTimer(callback, delay, true);
  }, [createTimer]);
  
  // 清理所有定时器
  const clearAllTimers = useCallback(() => {
    timers.current.forEach(timer => {
      clearTimeout(timer);  // clearTimeout也能清理interval
      clearInterval(timer);
    });
    timers.current.clear();
  }, []);
  
  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);
  
  return {
    setManagedTimeout,
    setManagedInterval,
    clearAllTimers,
    activeTimerCount: timers.current.size
  };
};

// 事件监听器管理Hook - 自动清理防止内存泄漏
export const useEventListenerCleanup = () => {
  const listeners = useRef<Array<{
    element: EventTarget;
    event: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>>([]);
  
  // 添加受管理的事件监听器
  const addEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    element.addEventListener(event, handler, options);
    listeners.current.push({ element, event, handler, options });
    
    // 返回清理函数
    return () => {
      element.removeEventListener(event, handler, options);
      listeners.current = listeners.current.filter(
        l => !(l.element === element && l.event === event && l.handler === handler)
      );
    };
  }, []);
  
  // 清理所有监听器
  const clearAllListeners = useCallback(() => {
    listeners.current.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    listeners.current = [];
  }, []);
  
  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      clearAllListeners();
    };
  }, [clearAllListeners]);
  
  return {
    addEventListener,
    clearAllListeners,
    activeListenerCount: listeners.current.length
  };
};

// 综合资源清理Hook
export const useResourceCleanup = () => {
  const { setManagedTimeout, setManagedInterval, clearAllTimers, activeTimerCount } = useTimerCleanup();
  const { addEventListener, clearAllListeners, activeListenerCount } = useEventListenerCleanup();
  
  // 全面清理
  const cleanupAll = useCallback(() => {
    clearAllTimers();
    clearAllListeners();
    
    // 清理其他可能的资源
    if ('gc' in window && process.env.NODE_ENV === 'development') {
      (window as any).gc();
    }
  }, [clearAllTimers, clearAllListeners]);
  
  // 页面卸载时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupAll();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupAll();
    };
  }, [cleanupAll]);
  
  return {
    // 定时器管理
    setManagedTimeout,
    setManagedInterval,
    clearAllTimers,
    activeTimerCount,
    
    // 事件监听器管理
    addEventListener,
    clearAllListeners,
    activeListenerCount,
    
    // 全面清理
    cleanupAll
  };
};