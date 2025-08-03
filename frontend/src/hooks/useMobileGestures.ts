// Phase 4: 移动端手势支持 Hook - 支持触摸手势操作
import { useEffect, useCallback, useRef } from 'react';

export interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  
  // 配置参数
  swipeThreshold?: number; // 滑动触发距离阈值
  longPressDelay?: number; // 长按触发延迟
  doubleTapDelay?: number; // 双击时间窗口
  pinchThreshold?: number; // 缩放触发阈值
  enabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useMobileGestures = (
  elementRef: React.RefObject<HTMLElement>,
  config: GestureConfig
) => {
  const startPointRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number>(0);
  const isGestureActiveRef = useRef<boolean>(false);

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    onPinch,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 0.1,
    enabled = true
  } = config;

  // 计算两点间距离
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 清除长按定时器
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const now = Date.now();

    // 记录起始点
    startPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: now
    };

    // 多点触控处理（缩放手势）
    if (e.touches.length === 2 && onPinch) {
      isGestureActiveRef.current = true;
      initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      clearLongPressTimer();
      return;
    }

    // 单点触控处理
    if (e.touches.length === 1) {
      // 检查双击
      if (lastTapRef.current && onDoubleTap) {
        const timeDiff = now - lastTapRef.current.timestamp;
        const distance = Math.sqrt(
          Math.pow(touch.clientX - lastTapRef.current.x, 2) +
          Math.pow(touch.clientY - lastTapRef.current.y, 2)
        );

        if (timeDiff < doubleTapDelay && distance < 30) {
          onDoubleTap();
          lastTapRef.current = null;
          clearLongPressTimer();
          return;
        }
      }

      // 设置长按定时器
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (startPointRef.current) {
            onLongPress();
            isGestureActiveRef.current = true;
          }
        }, longPressDelay);
      }
    }
  }, [enabled, onPinch, onDoubleTap, onLongPress, getDistance, doubleTapDelay, longPressDelay, clearLongPressTimer]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !startPointRef.current) return;

    // 清除长按定时器（开始移动后取消长按）
    clearLongPressTimer();

    // 缩放手势处理
    if (e.touches.length === 2 && onPinch && initialDistanceRef.current > 0) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      
      if (Math.abs(scale - 1) > pinchThreshold) {
        onPinch(scale);
      }
      return;
    }

    // 阻止页面滚动（在手势活跃时）
    if (isGestureActiveRef.current && e.touches.length === 1) {
      e.preventDefault();
    }
  }, [enabled, onPinch, getDistance, pinchThreshold, clearLongPressTimer]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !startPointRef.current) return;

    clearLongPressTimer();

    // 如果是手势操作，直接返回
    if (isGestureActiveRef.current) {
      isGestureActiveRef.current = false;
      startPointRef.current = null;
      return;
    }

    const endTouch = e.changedTouches[0];
    const startPoint = startPointRef.current;
    const now = Date.now();

    const deltaX = endTouch.clientX - startPoint.x;
    const deltaY = endTouch.clientY - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = now - startPoint.timestamp;

    // 判断是否为滑动手势
    if (distance > swipeThreshold && duration < 1000) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY) {
        // 水平滑动
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // 垂直滑动
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    } else if (distance < 10 && duration < 300) {
      // 判断为点击
      if (onTap) {
        onTap();
      }

      // 记录点击以检测双击
      lastTapRef.current = {
        x: endTouch.clientX,
        y: endTouch.clientY,
        timestamp: now
      };

      // 清除双击记录的定时器
      setTimeout(() => {
        if (lastTapRef.current && now - lastTapRef.current.timestamp >= doubleTapDelay) {
          lastTapRef.current = null;
        }
      }, doubleTapDelay);
    }

    startPointRef.current = null;
    initialDistanceRef.current = 0;
  }, [enabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, swipeThreshold, doubleTapDelay, clearLongPressTimer]);

  // 处理触摸取消
  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    startPointRef.current = null;
    isGestureActiveRef.current = false;
    initialDistanceRef.current = 0;
  }, [clearLongPressTimer]);

  // 绑定事件监听器
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    isGestureActive: isGestureActiveRef.current
  };
};

// 预定义的计时器手势配置
export const createTimerGestureConfig = (actions: {
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onPauseTimer?: () => void;
  onSwitchTask?: () => void;
  onOpenSettings?: () => void;
  onViewStats?: () => void;
}): GestureConfig => ({
  onTap: actions.onStartTimer,
  onDoubleTap: actions.onStopTimer,
  onLongPress: actions.onOpenSettings,
  onSwipeLeft: actions.onSwitchTask,
  onSwipeRight: actions.onViewStats,
  onSwipeUp: actions.onPauseTimer,
  swipeThreshold: 60,
  longPressDelay: 600,
  doubleTapDelay: 250,
  enabled: true
});

// 预定义的任务手势配置
export const createTaskGestureConfig = (actions: {
  onOpenTask?: () => void;
  onEditTask?: () => void;
  onDeleteTask?: () => void;
  onStartTimer?: () => void;
  onMarkComplete?: () => void;
  onArchive?: () => void;
}): GestureConfig => ({
  onTap: actions.onOpenTask,
  onDoubleTap: actions.onStartTimer,
  onLongPress: actions.onEditTask,
  onSwipeLeft: actions.onDeleteTask,
  onSwipeRight: actions.onMarkComplete,
  onSwipeUp: actions.onArchive,
  swipeThreshold: 50,
  longPressDelay: 500,
  doubleTapDelay: 300,
  enabled: true
});

export default useMobileGestures;