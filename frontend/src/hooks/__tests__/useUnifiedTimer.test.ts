// useUnifiedTimer.test.ts - 统一计时器Hook测试
// 任务#243: 前端通用组件开发 - Hook测试
import { renderHook, act, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { useUnifiedTimer } from '../useUnifiedTimer';
import { unifiedTimerService } from '../../services/unifiedTimerService';
import type { TimerStatus, StartTimerRequest } from '../../types/timer';

// Mock dependencies
jest.mock('../../services/unifiedTimerService');
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

const mockUnifiedTimerService = unifiedTimerService as jest.Mocked<typeof unifiedTimerService>;

// Test utilities
const createMockTimerStatus = (overrides: Partial<TimerStatus> = {}): TimerStatus => ({
  id: 1,
  user_id: 1,
  target_type: 'project_task',
  target_title: '测试任务',
  start_time: new Date().toISOString(),
  status: 'running',
  pause_count: 0,
  pause_total_seconds: 0,
  pause_events: [],
  tags: [],
  interruption_count: 0,
  inference_reasoning: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 1,
  source_type: 'manual',
  ...overrides
});

describe('useUnifiedTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
      success: true,
      data: null,
      message: '当前没有活动的计时器'
    });

    mockUnifiedTimerService.getSuggestions.mockResolvedValue({
      success: true,
      data: [],
      message: 'Success'
    });

    mockUnifiedTimerService.getTemplates.mockResolvedValue({
      success: true,
      data: [],
      message: 'Success'
    });

    mockUnifiedTimerService.getRecentTasks.mockResolvedValue({
      success: true,
      data: [],
      message: 'Success'
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('应该初始化为默认状态', async () => {
      const { result } = renderHook(() => useUnifiedTimer());

      expect(result.current.currentTimer).toBeNull();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      // 等待初始化完成
      await waitFor(() => {
        expect(mockUnifiedTimerService.getCurrentTimer).toHaveBeenCalled();
      });
    });

    it('应该在初始化时获取当前计时器状态', async () => {
      const mockTimer = createMockTimerStatus();
      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: mockTimer,
        message: 'Success'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        expect(result.current.currentTimer).toEqual(mockTimer);
        expect(result.current.isRunning).toBe(true);
        expect(result.current.isPaused).toBe(false);
      });
    });

    it('应该处理初始化时的错误', async () => {
      mockUnifiedTimerService.getCurrentTimer.mockRejectedValue(new Error('网络错误'));

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        expect(result.current.error).toBe('网络错误');
      });
    });
  });

  describe('Timer Operations', () => {
    describe('startTimer', () => {
      const mockStartRequest: StartTimerRequest = {
        title: '测试任务',
        category: '开发',
        estimated_minutes: 60
      };

      it('应该成功启动计时器', async () => {
        const mockTimer = createMockTimerStatus({ target_title: '测试任务' });
        
        mockUnifiedTimerService.startTimer.mockResolvedValue({
          success: true,
          data: mockTimer,
          message: '启动成功'
        });

        mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
          success: true,
          data: mockTimer,
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const response = await result.current.startTimer(mockStartRequest);
          expect(response.success).toBe(true);
        });

        expect(mockUnifiedTimerService.startTimer).toHaveBeenCalledWith(mockStartRequest);
        expect(message.success).toHaveBeenCalledWith('计时器启动成功');
        
        await waitFor(() => {
          expect(result.current.isRunning).toBe(true);
          expect(result.current.currentTimer?.target_title).toBe('测试任务');
        });
      });

      it('应该处理启动失败的情况', async () => {
        mockUnifiedTimerService.startTimer.mockResolvedValue({
          success: false,
          error: '任务不存在',
          message: '启动失败'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          try {
            await result.current.startTimer(mockStartRequest);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
          }
        });

        expect(message.error).toHaveBeenCalledWith('启动失败');
        expect(result.current.error).toBe('启动失败');
      });

      it('应该在启动计时器时显示加载状态', async () => {
        let resolvePromise: (value: any) => void;
        const startPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        mockUnifiedTimerService.startTimer.mockReturnValue(startPromise);

        const { result } = renderHook(() => useUnifiedTimer());

        act(() => {
          result.current.startTimer(mockStartRequest);
        });

        expect(result.current.loading).toBe(true);

        await act(async () => {
          resolvePromise!({
            success: true,
            data: createMockTimerStatus(),
            message: 'Success'
          });
          await startPromise;
        });

        expect(result.current.loading).toBe(false);
      });
    });

    describe('pauseTimer', () => {
      it('应该成功暂停计时器', async () => {
        const mockTimer = createMockTimerStatus({ status: 'paused' });
        
        mockUnifiedTimerService.pauseTimer.mockResolvedValue({
          success: true,
          data: mockTimer,
          message: '暂停成功'
        });

        mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
          success: true,
          data: mockTimer,
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const response = await result.current.pauseTimer();
          expect(response.success).toBe(true);
        });

        expect(mockUnifiedTimerService.pauseTimer).toHaveBeenCalled();
        expect(message.info).toHaveBeenCalledWith('计时器已暂停');
        
        await waitFor(() => {
          expect(result.current.isPaused).toBe(true);
        });
      });

      it('应该处理暂停失败的情况', async () => {
        mockUnifiedTimerService.pauseTimer.mockResolvedValue({
          success: false,
          error: '没有活动计时器',
          message: '暂停失败'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          try {
            await result.current.pauseTimer();
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
          }
        });

        expect(message.error).toHaveBeenCalledWith('暂停失败');
      });
    });

    describe('resumeTimer', () => {
      it('应该成功恢复计时器', async () => {
        const mockTimer = createMockTimerStatus({ status: 'running' });
        
        mockUnifiedTimerService.resumeTimer.mockResolvedValue({
          success: true,
          data: mockTimer,
          message: '恢复成功'
        });

        mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
          success: true,
          data: mockTimer,
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const response = await result.current.resumeTimer();
          expect(response.success).toBe(true);
        });

        expect(mockUnifiedTimerService.resumeTimer).toHaveBeenCalled();
        expect(message.success).toHaveBeenCalledWith('计时器已恢复');
        
        await waitFor(() => {
          expect(result.current.isRunning).toBe(true);
          expect(result.current.isPaused).toBe(false);
        });
      });
    });

    describe('stopTimer', () => {
      it('应该成功停止计时器', async () => {
        mockUnifiedTimerService.stopTimer.mockResolvedValue({
          success: true,
          data: { duration_seconds: 3600 },
          message: '停止成功'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const response = await result.current.stopTimer();
          expect(response.success).toBe(true);
        });

        expect(mockUnifiedTimerService.stopTimer).toHaveBeenCalled();
        expect(message.success).toHaveBeenCalledWith('计时器已停止');
        
        expect(result.current.currentTimer).toBeNull();
        expect(result.current.isRunning).toBe(false);
        expect(result.current.elapsedSeconds).toBe(0);
      });

      it('应该处理停止失败的情况', async () => {
        mockUnifiedTimerService.stopTimer.mockResolvedValue({
          success: false,
          error: '停止失败',
          message: '网络错误'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          try {
            await result.current.stopTimer();
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
          }
        });

        expect(message.error).toHaveBeenCalledWith('网络错误');
      });
    });
  });

  describe('Local Timer Management', () => {
    it('应该启动本地计时器当计时器运行时', async () => {
      const mockTimer = createMockTimerStatus();
      
      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: mockTimer,
        message: 'Success'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      // 模拟时间流逝
      act(() => {
        jest.advanceTimersByTime(5000); // 5秒
      });

      // 本地计时器应该更新
      expect(result.current.localElapsedSeconds).toBeGreaterThan(0);
    });

    it('应该在暂停时停止本地计时器', async () => {
      const runningTimer = createMockTimerStatus({ status: 'running' });
      const pausedTimer = createMockTimerStatus({ status: 'paused' });
      
      mockUnifiedTimerService.getCurrentTimer
        .mockResolvedValueOnce({
          success: true,
          data: runningTimer,
          message: 'Success'
        })
        .mockResolvedValueOnce({
          success: true,
          data: pausedTimer,
          message: 'Success'
        });

      mockUnifiedTimerService.pauseTimer.mockResolvedValue({
        success: true,
        data: pausedTimer,
        message: 'Success'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      // 等待初始状态
      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      const initialElapsed = result.current.localElapsedSeconds;

      // 暂停计时器
      await act(async () => {
        await result.current.pauseTimer();
      });

      // 模拟时间流逝
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // 暂停时本地计时器不应该继续增加
      await waitFor(() => {
        expect(result.current.isPaused).toBe(true);
      });
    });

    it('应该正确计算服务器时间', async () => {
      const startTime = new Date();
      const mockTimer = createMockTimerStatus({
        start_time: startTime.toISOString(),
        pause_total_seconds: 10 // 暂停了10秒
      });

      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: mockTimer,
        message: 'Success'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        expect(result.current.currentTimer).toEqual(mockTimer);
      });

      // 验证时间计算（应该减去暂停时间）
      const expectedElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000) - 10;
      expect(result.current.elapsedSeconds).toBeCloseTo(expectedElapsed, 0);
    });
  });

  describe('Data Fetching', () => {
    describe('getSuggestions', () => {
      it('应该成功获取智能建议', async () => {
        const mockSuggestions = [
          {
            id: 1,
            title: '深度工作',
            category: '专注',
            estimated_minutes: 90,
            confidence: 0.85,
            reasoning: [],
            tags: []
          }
        ];

        mockUnifiedTimerService.getSuggestions.mockResolvedValue({
          success: true,
          data: mockSuggestions,
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const suggestions = await result.current.getSuggestions();
          expect(suggestions).toEqual(mockSuggestions);
        });

        expect(mockUnifiedTimerService.getSuggestions).toHaveBeenCalled();
      });

      it('应该处理获取建议失败的情况', async () => {
        mockUnifiedTimerService.getSuggestions.mockRejectedValue(new Error('获取失败'));

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const suggestions = await result.current.getSuggestions();
          expect(suggestions).toEqual([]);
        });
      });
    });

    describe('getTemplates', () => {
      it('应该成功获取模板列表', async () => {
        const mockTemplates = [
          {
            id: 1,
            name: '番茄工作法',
            target_type: 'pomodoro' as const,
            default_duration_minutes: 25
          }
        ];

        mockUnifiedTimerService.getTemplates.mockResolvedValue({
          success: true,
          data: mockTemplates,
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const templates = await result.current.getTemplates();
          expect(templates).toEqual(mockTemplates);
        });

        expect(mockUnifiedTimerService.getTemplates).toHaveBeenCalled();
      });
    });

    describe('getRecentTasks', () => {
      it('应该成功获取最近任务', async () => {
        const mockRecentTasks = [
          {
            id: 1,
            task_title: '最近任务',
            total_seconds: 3600
          }
        ];

        mockUnifiedTimerService.getRecentTasks.mockResolvedValue({
          success: true,
          data: mockRecentTasks,
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          const recentTasks = await result.current.getRecentTasks(5);
          expect(recentTasks).toEqual(mockRecentTasks);
        });

        expect(mockUnifiedTimerService.getRecentTasks).toHaveBeenCalledWith(5);
      });

      it('应该使用默认limit值', async () => {
        mockUnifiedTimerService.getRecentTasks.mockResolvedValue({
          success: true,
          data: [],
          message: 'Success'
        });

        const { result } = renderHook(() => useUnifiedTimer());

        await act(async () => {
          await result.current.getRecentTasks();
        });

        expect(mockUnifiedTimerService.getRecentTasks).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Polling and Auto-refresh', () => {
    it('应该定期轮询计时器状态', async () => {
      const mockTimer = createMockTimerStatus();
      
      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: mockTimer,
        message: 'Success'
      });

      renderHook(() => useUnifiedTimer());

      // 等待初始化
      await waitFor(() => {
        expect(mockUnifiedTimerService.getCurrentTimer).toHaveBeenCalledTimes(1);
      });

      // 模拟30秒过去（轮询间隔）
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockUnifiedTimerService.getCurrentTimer).toHaveBeenCalledTimes(2);
      });
    });

    it('应该在组件卸载时清理定时器', () => {
      const { unmount } = renderHook(() => useUnifiedTimer());

      // 确保有定时器在运行
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // 卸载组件
      unmount();

      // 验证定时器被清理（通过检查没有更多的API调用）
      const callCountBeforeUnmount = mockUnifiedTimerService.getCurrentTimer.mock.calls.length;
      
      act(() => {
        jest.advanceTimersByTime(35000); // 超过轮询间隔
      });

      expect(mockUnifiedTimerService.getCurrentTimer.mock.calls.length).toBe(callCountBeforeUnmount);
    });
  });

  describe('Error Handling', () => {
    it('应该正确处理网络错误', async () => {
      mockUnifiedTimerService.startTimer.mockRejectedValue(new Error('网络连接失败'));

      const { result } = renderHook(() => useUnifiedTimer());

      await act(async () => {
        try {
          await result.current.startTimer({ title: '测试任务' });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current.error).toBe('启动计时器失败');
      expect(message.error).toHaveBeenCalledWith('启动计时器失败');
    });

    it('应该在操作成功后清除错误状态', async () => {
      // 首先设置一个错误状态
      mockUnifiedTimerService.startTimer
        .mockRejectedValueOnce(new Error('网络错误'))
        .mockResolvedValueOnce({
          success: true,
          data: createMockTimerStatus(),
          message: 'Success'
        });

      const { result } = renderHook(() => useUnifiedTimer());

      // 第一次调用失败
      await act(async () => {
        try {
          await result.current.startTimer({ title: '测试任务' });
        } catch (error) {
          // 预期的错误
        }
      });

      expect(result.current.error).toBe('启动计时器失败');

      // 第二次调用成功
      await act(async () => {
        await result.current.startTimer({ title: '测试任务' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('应该处理空的计时器响应', async () => {
      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: null,
        message: '没有活动计时器'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        expect(result.current.currentTimer).toBeNull();
        expect(result.current.isRunning).toBe(false);
        expect(result.current.isPaused).toBe(false);
      });
    });

    it('应该处理无效的开始时间', async () => {
      const mockTimer = createMockTimerStatus({
        start_time: '' // 无效时间
      });

      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: mockTimer,
        message: 'Success'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        expect(result.current.elapsedSeconds).toBe(0);
      });
    });

    it('应该处理极大的暂停时间', async () => {
      const startTime = new Date();
      const mockTimer = createMockTimerStatus({
        start_time: startTime.toISOString(),
        pause_total_seconds: 999999 // 极大的暂停时间
      });

      mockUnifiedTimerService.getCurrentTimer.mockResolvedValue({
        success: true,
        data: mockTimer,
        message: 'Success'
      });

      const { result } = renderHook(() => useUnifiedTimer());

      await waitFor(() => {
        // 应该不会有负数时间
        expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(0);
      });
    });
  });
});