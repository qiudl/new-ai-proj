// Phase 5: 测试优化 - useMobileGestures Hook单元测试
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import useMobileGestures, { 
  createTimerGestureConfig, 
  createTaskGestureConfig 
} from '../useMobileGestures';

// 创建模拟的HTMLElement
const createMockElement = () => {
  const element = document.createElement('div');
  const ref = { current: element };
  
  // 添加事件监听器模拟
  element.addEventListener = jest.fn();
  element.removeEventListener = jest.fn();
  
  return { element, ref };
};

// 创建模拟的触摸事件
const createTouchEvent = (type: string, touches: any[], changedTouches?: any[]) => {
  return new TouchEvent(type, {
    touches: touches as any,
    changedTouches: (changedTouches || touches) as any,
    bubbles: true,
    cancelable: true
  });
};

// 创建触摸点
const createTouch = (x: number, y: number, identifier = 0) => ({
  clientX: x,
  clientY: y,
  identifier,
  pageX: x,
  pageY: y,
  screenX: x,
  screenY: y,
  radiusX: 0,
  radiusY: 0,
  rotationAngle: 0,
  force: 1,
  target: document.createElement('div')
});

describe('useMobileGestures', () => {
  const mockCallbacks = {
    onSwipeLeft: jest.fn(),
    onSwipeRight: jest.fn(),
    onSwipeUp: jest.fn(),
    onSwipeDown: jest.fn(),
    onTap: jest.fn(),
    onDoubleTap: jest.fn(),
    onLongPress: jest.fn(),
    onPinch: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('基本功能', () => {
    it('应该正确注册事件监听器', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onTap: mockCallbacks.onTap,
        enabled: true
      }));

      expect(element.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(element.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(element.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
      expect(element.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: false });
    });

    it('当enabled为false时不应该注册事件监听器', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onTap: mockCallbacks.onTap,
        enabled: false
      }));

      expect(element.addEventListener).not.toHaveBeenCalled();
    });

    it('应该在组件卸载时清理事件监听器', () => {
      const { element, ref } = createMockElement();
      
      const { unmount } = renderHook(() => useMobileGestures(ref, {
        onTap: mockCallbacks.onTap,
        enabled: true
      }));

      unmount();

      expect(element.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(element.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(element.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(element.removeEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function));
    });
  });

  describe('点击手势', () => {
    it('应该检测单击', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onTap: mockCallbacks.onTap,
        enabled: true
      }));

      // 模拟触摸开始
      const touch = createTouch(100, 100);
      fireEvent(element, createTouchEvent('touchstart', [touch]));

      // 模拟触摸结束（短时间内，小移动距离）
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [touch]));
      }, 100);

      jest.advanceTimersByTime(100);

      expect(mockCallbacks.onTap).toHaveBeenCalled();
    });

    it('应该检测双击', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onDoubleTap: mockCallbacks.onDoubleTap,
        doubleTapDelay: 300,
        enabled: true
      }));

      const touch1 = createTouch(100, 100);
      const touch2 = createTouch(105, 105); // 稍微偏移但在范围内

      // 第一次点击
      fireEvent(element, createTouchEvent('touchstart', [touch1]));
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [touch1]));
      }, 100);

      jest.advanceTimersByTime(100);

      // 第二次点击（在双击时间窗口内）
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchstart', [touch2]));
        setTimeout(() => {
          fireEvent(element, createTouchEvent('touchend', [], [touch2]));
        }, 100);
      }, 200);

      jest.advanceTimersByTime(200);

      expect(mockCallbacks.onDoubleTap).toHaveBeenCalled();
    });

    it('应该检测长按', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onLongPress: mockCallbacks.onLongPress,
        longPressDelay: 500,
        enabled: true
      }));

      const touch = createTouch(100, 100);
      fireEvent(element, createTouchEvent('touchstart', [touch]));

      // 等待长按延迟时间
      jest.advanceTimersByTime(500);

      expect(mockCallbacks.onLongPress).toHaveBeenCalled();
    });

    it('移动触摸应该取消长按', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onLongPress: mockCallbacks.onLongPress,
        longPressDelay: 500,
        enabled: true
      }));

      const touch = createTouch(100, 100);
      fireEvent(element, createTouchEvent('touchstart', [touch]));

      // 在长按触发前移动
      const movedTouch = createTouch(150, 150);
      fireEvent(element, createTouchEvent('touchmove', [movedTouch]));

      jest.advanceTimersByTime(500);

      expect(mockCallbacks.onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('滑动手势', () => {
    it('应该检测向右滑动', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onSwipeRight: mockCallbacks.onSwipeRight,
        swipeThreshold: 50,
        enabled: true
      }));

      const startTouch = createTouch(100, 100);
      const endTouch = createTouch(200, 100); // 向右移动100px

      fireEvent(element, createTouchEvent('touchstart', [startTouch]));
      
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [endTouch]));
      }, 200);

      jest.advanceTimersByTime(200);

      expect(mockCallbacks.onSwipeRight).toHaveBeenCalled();
    });

    it('应该检测向左滑动', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onSwipeLeft: mockCallbacks.onSwipeLeft,
        swipeThreshold: 50,
        enabled: true
      }));

      const startTouch = createTouch(200, 100);
      const endTouch = createTouch(100, 100); // 向左移动100px

      fireEvent(element, createTouchEvent('touchstart', [startTouch]));
      
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [endTouch]));
      }, 200);

      jest.advanceTimersByTime(200);

      expect(mockCallbacks.onSwipeLeft).toHaveBeenCalled();
    });

    it('应该检测向上滑动', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onSwipeUp: mockCallbacks.onSwipeUp,
        swipeThreshold: 50,
        enabled: true
      }));

      const startTouch = createTouch(100, 200);
      const endTouch = createTouch(100, 100); // 向上移动100px

      fireEvent(element, createTouchEvent('touchstart', [startTouch]));
      
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [endTouch]));
      }, 200);

      jest.advanceTimersByTime(200);

      expect(mockCallbacks.onSwipeUp).toHaveBeenCalled();
    });

    it('应该检测向下滑动', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onSwipeDown: mockCallbacks.onSwipeDown,
        swipeThreshold: 50,
        enabled: true
      }));

      const startTouch = createTouch(100, 100);
      const endTouch = createTouch(100, 200); // 向下移动100px

      fireEvent(element, createTouchEvent('touchstart', [startTouch]));
      
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [endTouch]));
      }, 200);

      jest.advanceTimersByTime(200);

      expect(mockCallbacks.onSwipeDown).toHaveBeenCalled();
    });

    it('短距离移动不应该触发滑动', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onSwipeRight: mockCallbacks.onSwipeRight,
        swipeThreshold: 50,
        enabled: true
      }));

      const startTouch = createTouch(100, 100);
      const endTouch = createTouch(130, 100); // 移动30px，小于阈值

      fireEvent(element, createTouchEvent('touchstart', [startTouch]));
      
      setTimeout(() => {
        fireEvent(element, createTouchEvent('touchend', [], [endTouch]));
      }, 200);

      jest.advanceTimersByTime(200);

      expect(mockCallbacks.onSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe('缩放手势', () => {
    it('应该检测缩放手势', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onPinch: mockCallbacks.onPinch,
        pinchThreshold: 0.1,
        enabled: true
      }));

      // 两个触摸点开始
      const touch1Start = createTouch(100, 100, 0);
      const touch2Start = createTouch(200, 200, 1);
      fireEvent(element, createTouchEvent('touchstart', [touch1Start, touch2Start]));

      // 两个触摸点分开（放大）
      const touch1Move = createTouch(80, 80, 0);
      const touch2Move = createTouch(220, 220, 1);
      fireEvent(element, createTouchEvent('touchmove', [touch1Move, touch2Move]));

      expect(mockCallbacks.onPinch).toHaveBeenCalledWith(expect.any(Number));
    });

    it('小幅度缩放不应该触发回调', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onPinch: mockCallbacks.onPinch,
        pinchThreshold: 0.2, // 较高的阈值
        enabled: true
      }));

      const touch1Start = createTouch(100, 100, 0);
      const touch2Start = createTouch(200, 200, 1);
      fireEvent(element, createTouchEvent('touchstart', [touch1Start, touch2Start]));

      // 轻微移动
      const touch1Move = createTouch(95, 95, 0);
      const touch2Move = createTouch(205, 205, 1);
      fireEvent(element, createTouchEvent('touchmove', [touch1Move, touch2Move]));

      expect(mockCallbacks.onPinch).not.toHaveBeenCalled();
    });
  });

  describe('配置选项', () => {
    it('应该使用自定义阈值', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onSwipeRight: mockCallbacks.onSwipeRight,
        swipeThreshold: 100, // 自定义阈值
        enabled: true
      }));

      const startTouch = createTouch(100, 100);
      const endTouch = createTouch(180, 100); // 移动80px，小于自定义阈值

      fireEvent(element, createTouchEvent('touchstart', [startTouch]));
      fireEvent(element, createTouchEvent('touchend', [], [endTouch]));

      expect(mockCallbacks.onSwipeRight).not.toHaveBeenCalled();
    });

    it('应该使用自定义长按延迟', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onLongPress: mockCallbacks.onLongPress,
        longPressDelay: 1000, // 自定义延迟
        enabled: true
      }));

      const touch = createTouch(100, 100);
      fireEvent(element, createTouchEvent('touchstart', [touch]));

      // 在默认延迟时间检查（应该还没触发）
      jest.advanceTimersByTime(500);
      expect(mockCallbacks.onLongPress).not.toHaveBeenCalled();

      // 在自定义延迟时间检查（应该已触发）
      jest.advanceTimersByTime(500);
      expect(mockCallbacks.onLongPress).toHaveBeenCalled();
    });
  });

  describe('预定义配置', () => {
    it('createTimerGestureConfig应该返回正确的配置', () => {
      const actions = {
        onStartTimer: jest.fn(),
        onStopTimer: jest.fn(),
        onPauseTimer: jest.fn(),
        onSwitchTask: jest.fn(),
        onOpenSettings: jest.fn(),
        onViewStats: jest.fn()
      };

      const config = createTimerGestureConfig(actions);

      expect(config.onTap).toBe(actions.onStartTimer);
      expect(config.onDoubleTap).toBe(actions.onStopTimer);
      expect(config.onLongPress).toBe(actions.onOpenSettings);
      expect(config.onSwipeLeft).toBe(actions.onSwitchTask);
      expect(config.onSwipeRight).toBe(actions.onViewStats);
      expect(config.onSwipeUp).toBe(actions.onPauseTimer);
      expect(config.swipeThreshold).toBe(60);
      expect(config.longPressDelay).toBe(600);
      expect(config.doubleTapDelay).toBe(250);
      expect(config.enabled).toBe(true);
    });

    it('createTaskGestureConfig应该返回正确的配置', () => {
      const actions = {
        onOpenTask: jest.fn(),
        onEditTask: jest.fn(),
        onDeleteTask: jest.fn(),
        onStartTimer: jest.fn(),
        onMarkComplete: jest.fn(),
        onArchive: jest.fn()
      };

      const config = createTaskGestureConfig(actions);

      expect(config.onTap).toBe(actions.onOpenTask);
      expect(config.onDoubleTap).toBe(actions.onStartTimer);
      expect(config.onLongPress).toBe(actions.onEditTask);
      expect(config.onSwipeLeft).toBe(actions.onDeleteTask);
      expect(config.onSwipeRight).toBe(actions.onMarkComplete);
      expect(config.onSwipeUp).toBe(actions.onArchive);
      expect(config.swipeThreshold).toBe(50);
      expect(config.longPressDelay).toBe(500);
      expect(config.doubleTapDelay).toBe(300);
      expect(config.enabled).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('当元素ref为null时应该优雅处理', () => {
      const nullRef = { current: null };
      
      expect(() => {
        renderHook(() => useMobileGestures(nullRef, {
          onTap: mockCallbacks.onTap,
          enabled: true
        }));
      }).not.toThrow();
    });

    it('当回调函数未定义时应该不会崩溃', () => {
      const { element, ref } = createMockElement();
      
      expect(() => {
        renderHook(() => useMobileGestures(ref, {
          enabled: true
          // 没有提供任何回调函数
        }));

        const touch = createTouch(100, 100);
        fireEvent(element, createTouchEvent('touchstart', [touch]));
        fireEvent(element, createTouchEvent('touchend', [], [touch]));
      }).not.toThrow();
    });

    it('touchcancel事件应该正确清理状态', () => {
      const { element, ref } = createMockElement();
      
      renderHook(() => useMobileGestures(ref, {
        onLongPress: mockCallbacks.onLongPress,
        longPressDelay: 500,
        enabled: true
      }));

      const touch = createTouch(100, 100);
      fireEvent(element, createTouchEvent('touchstart', [touch]));
      
      // 触发touchcancel
      fireEvent(element, createTouchEvent('touchcancel', [touch]));
      
      // 长按不应该被触发
      jest.advanceTimersByTime(500);
      expect(mockCallbacks.onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    it('应该正确清理定时器', () => {
      const { element, ref } = createMockElement();
      
      const { unmount } = renderHook(() => useMobileGestures(ref, {
        onLongPress: mockCallbacks.onLongPress,
        longPressDelay: 500,
        enabled: true
      }));

      const touch = createTouch(100, 100);
      fireEvent(element, createTouchEvent('touchstart', [touch]));
      
      // 卸载组件
      unmount();
      
      // 定时器应该被清理，不会触发回调
      jest.advanceTimersByTime(500);
      expect(mockCallbacks.onLongPress).not.toHaveBeenCalled();
    });

    it('应该防止不必要的重新计算', () => {
      const { element, ref } = createMockElement();
      
      const { rerender } = renderHook(
        ({ config }) => useMobileGestures(ref, config),
        {
          initialProps: {
            config: {
              onTap: mockCallbacks.onTap,
              enabled: true
            }
          }
        }
      );

      // 重新渲染相同的配置
      rerender({
        config: {
          onTap: mockCallbacks.onTap,
          enabled: true
        }
      });

      // 应该不会重新注册事件监听器
      expect(element.removeEventListener).not.toHaveBeenCalled();
    });
  });
});