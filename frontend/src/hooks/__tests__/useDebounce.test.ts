import { renderHook, act } from '@testing-library/react';
import { useDebounce, useThrottle } from '../useDebounce';

// Mock timers for testing
jest.useFakeTimers();

describe('useDebounce', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('基础功能', () => {
    it('应该返回初始值', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('应该在延迟后更新值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 300 },
        }
      );

      expect(result.current).toBe('initial');

      // 更新值
      rerender({ value: 'updated', delay: 300 });

      // 立即检查，值应该还是旧的
      expect(result.current).toBe('initial');

      // 快进时间到延迟之前
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(result.current).toBe('initial');

      // 快进到延迟时间
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current).toBe('updated');
    });

    it('应该使用默认延迟时间300ms', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce(value),
        {
          initialProps: 'initial',
        }
      );

      rerender('updated');
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('清理和重置', () => {
    it('应该在值变化时取消之前的定时器', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce(value, 300),
        {
          initialProps: 'first',
        }
      );

      // 第一次更新
      rerender('second');
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // 第二次更新（在第一次定时器完成之前）
      rerender('third');

      // 快进第一次定时器的剩余时间
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // 值应该还是初始值，因为第一次定时器被取消了
      expect(result.current).toBe('first');

      // 快进第二次定时器
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // 现在应该是最后一次更新的值
      expect(result.current).toBe('third');
    });

    it('应该在组件卸载时清理定时器', () => {
      const { result, rerender, unmount } = renderHook(
        (value) => useDebounce(value, 300),
        {
          initialProps: 'initial',
        }
      );

      rerender('updated');

      // 卸载组件
      unmount();

      // 快进时间
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // 值不应该改变（因为组件已卸载）
      expect(result.current).toBe('initial');
    });
  });

  describe('快速连续更新', () => {
    it('应该只触发最后一次更新', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce(value, 300),
        {
          initialProps: 'v0',
        }
      );

      // 快速连续更新多次
      rerender('v1');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      rerender('v2');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      rerender('v3');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      rerender('v4');
      act(() => {
        jest.advanceTimersByTime(50);
      });

      rerender('v5');

      // 还没到延迟时间，值应该还是初始值
      expect(result.current).toBe('v0');

      // 快进到最后一次更新的延迟时间
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // 应该只更新为最后一次的值
      expect(result.current).toBe('v5');
    });
  });

  describe('延迟参数变化', () => {
    it('应该在延迟参数变化时重置定时器', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 300 },
        }
      );

      // 更新值
      rerender({ value: 'updated', delay: 300 });

      // 快进一半时间
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // 改变延迟时间
      rerender({ value: 'updated', delay: 500 });

      // 快进原来延迟的剩余时间
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // 值应该还没更新（因为延迟时间变长了）
      expect(result.current).toBe('initial');

      // 快进新延迟的剩余时间
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // 现在值应该更新了
      expect(result.current).toBe('updated');
    });
  });

  describe('不同数据类型', () => {
    it('应该支持字符串类型', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce<string>(value, 300),
        {
          initialProps: 'hello',
        }
      );

      rerender('world');
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe('world');
    });

    it('应该支持数字类型', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce<number>(value, 300),
        {
          initialProps: 0,
        }
      );

      rerender(42);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe(42);
    });

    it('应该支持对象类型', () => {
      const obj1 = { name: 'Alice', age: 30 };
      const obj2 = { name: 'Bob', age: 25 };

      const { result, rerender } = renderHook(
        (value) => useDebounce(value, 300),
        {
          initialProps: obj1,
        }
      );

      rerender(obj2);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toEqual(obj2);
    });

    it('应该支持数组类型', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce<number[]>(value, 300),
        {
          initialProps: [1, 2, 3],
        }
      );

      rerender([4, 5, 6]);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toEqual([4, 5, 6]);
    });

    it('应该支持null和undefined', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce<string | null>(value, 300),
        {
          initialProps: 'value',
        }
      );

      rerender(null);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe(null);

      rerender(undefined as any);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe(undefined);
    });
  });

  describe('边界情况', () => {
    it('应该处理延迟为0的情况', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce(value, 0),
        {
          initialProps: 'initial',
        }
      );

      rerender('updated');

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('应该处理非常大的延迟', () => {
      const { result, rerender } = renderHook(
        (value) => useDebounce(value, 10000),
        {
          initialProps: 'initial',
        }
      );

      rerender('updated');

      act(() => {
        jest.advanceTimersByTime(9999);
      });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.restoreAllMocks();
  });

  describe('基础功能', () => {
    it('应该返回初始值', () => {
      const { result } = renderHook(() => useThrottle('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('应该在限制时间后更新值', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(0);

      const { result, rerender } = renderHook(
        ({ value, limit }) => useThrottle(value, limit),
        {
          initialProps: { value: 'initial', limit: 300 },
        }
      );

      expect(result.current).toBe('initial');

      // 更新值
      mockNow.mockReturnValue(100);
      rerender({ value: 'updated', limit: 300 });

      // 快进到限制时间
      act(() => {
        mockNow.mockReturnValue(400);
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('updated');
    });

    it('应该使用默认限制时间300ms', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(0);

      const { result, rerender } = renderHook(
        (value) => useThrottle(value),
        {
          initialProps: 'initial',
        }
      );

      mockNow.mockReturnValue(100);
      rerender('updated');

      act(() => {
        mockNow.mockReturnValue(400);
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('节流行为', () => {
    it('应该在限制时间内忽略中间值', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(0);

      const { result, rerender } = renderHook(
        (value) => useThrottle(value, 300),
        {
          initialProps: 'v0',
        }
      );

      // 第一次更新
      mockNow.mockReturnValue(50);
      rerender('v1');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // 第二次更新（在限制时间内）
      mockNow.mockReturnValue(100);
      rerender('v2');
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // 应该忽略v2，因为还在限制时间内
      expect(result.current).toBe('v0');

      // 第三次更新（超过限制时间）
      mockNow.mockReturnValue(400);
      rerender('v3');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // 应该更新为v3
      expect(result.current).toBe('v3');
    });
  });

  describe('清理', () => {
    it('应该在组件卸载时清理定时器', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(0);

      const { result, rerender, unmount } = renderHook(
        (value) => useThrottle(value, 300),
        {
          initialProps: 'initial',
        }
      );

      mockNow.mockReturnValue(100);
      rerender('updated');

      // 卸载组件
      unmount();

      // 快进时间
      act(() => {
        mockNow.mockReturnValue(500);
        jest.advanceTimersByTime(300);
      });

      // 值不应该改变
      expect(result.current).toBe('initial');
    });
  });

  describe('不同数据类型', () => {
    it('应该支持数字类型', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(0);

      const { result, rerender } = renderHook(
        (value) => useThrottle<number>(value, 300),
        {
          initialProps: 0,
        }
      );

      mockNow.mockReturnValue(100);
      rerender(42);

      act(() => {
        mockNow.mockReturnValue(500);
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe(42);
    });

    it('应该支持对象类型', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValue(0);

      const obj1 = { name: 'Alice' };
      const obj2 = { name: 'Bob' };

      const { result, rerender } = renderHook(
        (value) => useThrottle(value, 300),
        {
          initialProps: obj1,
        }
      );

      mockNow.mockReturnValue(100);
      rerender(obj2);

      act(() => {
        mockNow.mockReturnValue(500);
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toEqual(obj2);
    });
  });
});
