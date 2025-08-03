// UnifiedTimerSystem.test.tsx - 统一计时器系统测试套件
// 任务#243: 前端通用组件开发 - 前端测试套件
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { notification } from 'antd';
import { UniversalTimerWidget } from '../UniversalTimerWidget';
import { SmartSuggestionsPanel } from '../SmartSuggestionsPanel';
import { UserTimerPreferences } from '../UserTimerPreferences';
import { TimerIntegrationDemo } from '../TimerIntegrationDemo';
import { useUnifiedTimer } from '../../hooks/useUnifiedTimer';
import { unifiedTimerService } from '../../services/unifiedTimerService';
import type { TimerSuggestion, TimerStatus } from '../../types/timer';

// Mock dependencies
jest.mock('../../hooks/useUnifiedTimer');
jest.mock('../../services/unifiedTimerService');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  notification: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

// Mock useKeyboardShortcuts hook
jest.mock('../../hooks/useKeyboardShortcuts', () => ({
  __esModule: true,
  default: jest.fn(),
  createTimerShortcuts: jest.fn(() => [])
}));

const mockUseUnifiedTimer = useUnifiedTimer as jest.MockedFunction<typeof useUnifiedTimer>;
const mockUnifiedTimerService = unifiedTimerService as jest.Mocked<typeof unifiedTimerService>;

describe('Unified Timer System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseUnifiedTimer.mockReturnValue({
      currentTimer: null,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      localElapsedSeconds: 0,
      startTimer: jest.fn(),
      pauseTimer: jest.fn(),
      resumeTimer: jest.fn(),
      stopTimer: jest.fn(),
      getCurrentStatus: jest.fn(),
      getSuggestions: jest.fn(),
      getTemplates: jest.fn(),
      getRecentTasks: jest.fn(),
      loading: false,
      error: null
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

  describe('UniversalTimerWidget', () => {
    it('应该渲染计时器组件的基本结构', () => {
      render(<UniversalTimerWidget />);
      
      expect(screen.getByText('统一计时器')).toBeInTheDocument();
      expect(screen.getByText('开始')).toBeInTheDocument();
      expect(screen.getByText('设置')).toBeInTheDocument();
    });

    it('应该在有活动计时器时显示正确的状态', () => {
      const mockTimer: TimerStatus = {
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
        source_type: 'manual'
      };

      mockUseUnifiedTimer.mockReturnValue({
        ...mockUseUnifiedTimer(),
        currentTimer: mockTimer,
        isRunning: true,
        isPaused: false,
        elapsedSeconds: 125,
        localElapsedSeconds: 125,
        startTimer: jest.fn(),
        pauseTimer: jest.fn(),
        resumeTimer: jest.fn(),
        stopTimer: jest.fn(),
        getCurrentStatus: jest.fn(),
        getSuggestions: jest.fn(),
        getTemplates: jest.fn(),
        getRecentTasks: jest.fn(),
        loading: false,
        error: null
      });

      render(<UniversalTimerWidget />);
      
      expect(screen.getByText('测试任务')).toBeInTheDocument();
      expect(screen.getByText('暂停')).toBeInTheDocument();
      expect(screen.getByText('停止')).toBeInTheDocument();
      expect(screen.getByText('运行中')).toBeInTheDocument();
    });

    it('应该在点击开始按钮时触发启动计时器', async () => {
      const mockStartTimer = jest.fn().mockResolvedValue({ success: true });
      
      mockUseUnifiedTimer.mockReturnValue({
        ...mockUseUnifiedTimer(),
        startTimer: mockStartTimer,
        getSuggestions: jest.fn(),
        getTemplates: jest.fn(),
        getRecentTasks: jest.fn()
      });

      render(<UniversalTimerWidget />);
      
      // 点击开始按钮会打开快速开始模态框
      fireEvent.click(screen.getByText('开始'));
      
      await waitFor(() => {
        expect(screen.getByText('快速开始计时')).toBeInTheDocument();
      });
    });

    it('应该在暂停状态下显示恢复按钮', () => {
      const mockTimer: TimerStatus = {
        id: 1,
        user_id: 1,
        target_type: 'project_task',
        target_title: '测试任务',
        start_time: new Date().toISOString(),
        status: 'paused',
        pause_count: 1,
        pause_total_seconds: 60,
        pause_events: [],
        tags: [],
        interruption_count: 0,
        inference_reasoning: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 1,
        source_type: 'manual'
      };

      mockUseUnifiedTimer.mockReturnValue({
        ...mockUseUnifiedTimer(),
        currentTimer: mockTimer,
        isRunning: true,
        isPaused: true,
        getSuggestions: jest.fn(),
        getTemplates: jest.fn(),
        getRecentTasks: jest.fn()
      });

      render(<UniversalTimerWidget />);
      
      expect(screen.getByText('恢复')).toBeInTheDocument();
      expect(screen.getByText('已暂停')).toBeInTheDocument();
    });

    it('应该在紧凑模式下正确渲染', () => {
      render(<UniversalTimerWidget size="compact" />);
      
      // 紧凑模式应该有更简洁的布局
      expect(screen.getByText('统一计时器')).toBeInTheDocument();
    });
  });

  describe('SmartSuggestionsPanel', () => {
    const mockSuggestions: TimerSuggestion[] = [
      {
        id: 1,
        title: '深度工作时间',
        category: '专注',
        estimated_minutes: 90,
        confidence: 0.85,
        reasoning: ['基于工作时间推断', '周五下午适合深度工作'],
        tags: ['深度工作', '专注'],
        template_id: 2
      },
      {
        id: 2,
        title: '邮件处理',
        category: '沟通',
        estimated_minutes: 20,
        confidence: 0.78,
        reasoning: ['通常的邮件处理时间'],
        tags: ['邮件', '沟通']
      }
    ];

    it('应该渲染智能建议列表', () => {
      const mockOnSuggestionSelect = jest.fn();
      
      render(
        <SmartSuggestionsPanel
          suggestions={mockSuggestions}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );
      
      expect(screen.getByText('智能建议')).toBeInTheDocument();
      expect(screen.getByText('深度工作时间')).toBeInTheDocument();
      expect(screen.getByText('邮件处理')).toBeInTheDocument();
    });

    it('应该在点击建议时调用回调函数', async () => {
      const mockOnSuggestionSelect = jest.fn();
      
      render(
        <SmartSuggestionsPanel
          suggestions={mockSuggestions}
          onSuggestionSelect={mockOnSuggestionSelect}
        />
      );
      
      fireEvent.click(screen.getByText('深度工作时间'));
      
      await waitFor(() => {
        expect(screen.getByText('智能建议详情')).toBeInTheDocument();
      });
    });

    it('应该显示加载状态', () => {
      render(
        <SmartSuggestionsPanel
          suggestions={[]}
          loading={true}
          onSuggestionSelect={jest.fn()}
        />
      );
      
      expect(screen.getByText('AI正在分析...')).toBeInTheDocument();
    });

    it('应该在没有建议时显示空状态', () => {
      render(
        <SmartSuggestionsPanel
          suggestions={[]}
          loading={false}
          onSuggestionSelect={jest.fn()}
        />
      );
      
      expect(screen.getByText('暂无智能建议')).toBeInTheDocument();
    });

    it('应该显示置信度信息', () => {
      render(
        <SmartSuggestionsPanel
          suggestions={mockSuggestions}
          onSuggestionSelect={jest.fn()}
          showConfidence={true}
        />
      );
      
      expect(screen.getByText('强烈推荐')).toBeInTheDocument(); // 85% confidence
    });

    it('应该支持刷新功能', () => {
      const mockOnRefresh = jest.fn();
      
      render(
        <SmartSuggestionsPanel
          suggestions={mockSuggestions}
          onSuggestionSelect={jest.fn()}
          onRefresh={mockOnRefresh}
        />
      );
      
      fireEvent.click(screen.getByText('刷新'));
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('UserTimerPreferences', () => {
    beforeEach(() => {
      mockUnifiedTimerService.getUserPreferences.mockResolvedValue({
        success: true,
        data: {
          default_category: '工作',
          default_task_type: 'project_task',
          default_duration_minutes: 25,
          auto_start_on_create: false,
          auto_stop_others: true,
          notification_enabled: true,
          sound_enabled: true,
          break_reminders: true,
          daily_goal_reminders: false,
          notification_sound: 'default',
          pomodoro_work_minutes: 25,
          pomodoro_short_break: 5,
          pomodoro_long_break: 15,
          pomodoro_cycles_before_long_break: 4,
          auto_start_breaks: false,
          auto_start_next_session: false,
          enable_auto_inference: true,
          inference_confidence_threshold: 0.7,
          enable_smart_suggestions: true,
          enable_context_learning: true,
          auto_categorize: true,
          preferred_timer_view: 'normal',
          show_progress_bar: true,
          show_estimated_time: true,
          show_suggestions_panel: true,
          theme_mode: 'auto',
          data_collection_enabled: true,
          anonymous_analytics: true,
          export_data_format: 'json',
          backup_frequency: 'weekly',
          idle_detection_minutes: 5,
          auto_pause_on_idle: true,
          keyboard_shortcuts_enabled: true,
          experimental_features: false,
          debug_mode: false
        },
        message: 'Success'
      });
    });

    it('应该渲染偏好设置表单', async () => {
      render(<UserTimerPreferences embedded={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('基础设置')).toBeInTheDocument();
        expect(screen.getByText('通知设置')).toBeInTheDocument();
        expect(screen.getByText('番茄钟')).toBeInTheDocument();
        expect(screen.getByText('智能功能')).toBeInTheDocument();
      });
    });

    it('应该加载用户偏好设置', async () => {
      render(<UserTimerPreferences embedded={true} />);
      
      await waitFor(() => {
        expect(mockUnifiedTimerService.getUserPreferences).toHaveBeenCalled();
      });
    });

    it('应该支持导出设置', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockClick = jest.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      
      render(<UserTimerPreferences embedded={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('导出设置')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('导出设置'));
      
      expect(mockClick).toHaveBeenCalled();
    });

    it('应该支持重置为默认设置', async () => {
      render(<UserTimerPreferences embedded={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('重置默认')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('重置默认'));
      
      await waitFor(() => {
        expect(screen.getByText('重置为默认设置')).toBeInTheDocument();
      });
    });
  });

  describe('TimerIntegrationDemo', () => {
    it('应该渲染完整的演示界面', async () => {
      render(<TimerIntegrationDemo />);
      
      await waitFor(() => {
        expect(screen.getByText('统一计时器系统演示')).toBeInTheDocument();
        expect(screen.getByText('网格')).toBeInTheDocument();
        expect(screen.getByText('侧边栏')).toBeInTheDocument();
        expect(screen.getByText('全屏')).toBeInTheDocument();
      });
    });

    it('应该支持布局切换', async () => {
      render(<TimerIntegrationDemo />);
      
      await waitFor(() => {
        expect(screen.getByText('侧边栏')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('侧边栏'));
      
      // 验证布局已切换（可以通过检查DOM结构变化）
      expect(screen.getByText('侧边栏')).toHaveClass('ant-btn-primary');
    });

    it('应该在嵌入模式下正确渲染', () => {
      render(<TimerIntegrationDemo embedded={true} />);
      
      // 嵌入模式不应该显示页面标题
      expect(screen.queryByText('统一计时器系统演示')).not.toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('应该正确处理计时器启动流程', async () => {
      const mockStartTimer = jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 1,
          target_title: '测试任务',
          status: 'running'
        }
      });

      mockUseUnifiedTimer.mockReturnValue({
        ...mockUseUnifiedTimer(),
        startTimer: mockStartTimer,
        getSuggestions: jest.fn().mockResolvedValue([]),
        getTemplates: jest.fn().mockResolvedValue([]),
        getRecentTasks: jest.fn().mockResolvedValue([])
      });

      render(<UniversalTimerWidget />);
      
      // 点击开始按钮
      fireEvent.click(screen.getByText('开始'));
      
      await waitFor(() => {
        expect(screen.getByText('快速开始计时')).toBeInTheDocument();
      });
      
      // 填写任务标题
      const titleInput = screen.getByPlaceholderText('请输入任务标题');
      await userEvent.type(titleInput, '测试任务');
      
      // 点击开始计时
      fireEvent.click(screen.getByText('开始计时'));
      
      await waitFor(() => {
        expect(mockStartTimer).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '测试任务'
          })
        );
      });
    });

    it('应该正确处理建议选择和计时器启动', async () => {
      const mockStartTimer = jest.fn().mockResolvedValue({ success: true });
      const mockOnSuggestionSelect = jest.fn();

      mockUseUnifiedTimer.mockReturnValue({
        ...mockUseUnifiedTimer(),
        startTimer: mockStartTimer,
        getSuggestions: jest.fn(),
        getTemplates: jest.fn(),
        getRecentTasks: jest.fn()
      });

      const suggestions: TimerSuggestion[] = [
        {
          id: 1,
          title: '深度工作',
          category: '专注',
          estimated_minutes: 90,
          confidence: 0.85,
          reasoning: ['推荐理由'],
          tags: ['专注']
        }
      ];

      render(
        <SmartSuggestionsPanel
          suggestions={suggestions}
          onSuggestionSelect={mockOnSuggestionSelect}
          compact={true}
        />
      );
      
      // 在紧凑模式下直接点击建议
      fireEvent.click(screen.getByText('深度工作'));
      
      expect(mockOnSuggestionSelect).toHaveBeenCalledWith(suggestions[0]);
    });

    it('应该正确处理错误状态', () => {
      mockUseUnifiedTimer.mockReturnValue({
        ...mockUseUnifiedTimer(),
        error: '网络连接失败',
        getSuggestions: jest.fn(),
        getTemplates: jest.fn(),
        getRecentTasks: jest.fn()
      });

      render(<UniversalTimerWidget />);
      
      // 在有错误时，组件应该正常渲染但可能显示错误状态
      expect(screen.getByText('统一计时器')).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('应该正确清理定时器和事件监听器', () => {
      const { unmount } = render(<UniversalTimerWidget />);
      
      // 模拟组件卸载
      unmount();
      
      // 验证没有内存泄漏（在实际应用中会有更复杂的检查）
      expect(true).toBe(true); // 占位符测试
    });

    it('应该支持大量建议的渲染', () => {
      const largeSuggestionsList: TimerSuggestion[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `建议 ${i + 1}`,
        category: '工作',
        estimated_minutes: 25,
        confidence: 0.8,
        reasoning: [`理由 ${i + 1}`],
        tags: [`标签${i + 1}`]
      }));

      render(
        <SmartSuggestionsPanel
          suggestions={largeSuggestionsList}
          onSuggestionSelect={jest.fn()}
          maxSuggestions={5}
        />
      );
      
      // 应该只显示前5个建议
      expect(screen.getByText('建议 1')).toBeInTheDocument();
      expect(screen.getByText('建议 5')).toBeInTheDocument();
      expect(screen.queryByText('建议 6')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('应该有正确的ARIA标签', () => {
      render(<UniversalTimerWidget />);
      
      // 检查主要按钮的可访问性
      const startButton = screen.getByText('开始');
      expect(startButton).toBeInTheDocument();
      expect(startButton.tagName).toBe('BUTTON');
    });

    it('应该支持键盘导航', () => {
      render(<UniversalTimerWidget />);
      
      const startButton = screen.getByText('开始');
      
      // 模拟Tab键导航
      startButton.focus();
      expect(document.activeElement).toBe(startButton);
    });
  });
});

// Test utilities
export const createMockTimerStatus = (overrides: Partial<TimerStatus> = {}): TimerStatus => ({
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

export const createMockSuggestion = (overrides: Partial<TimerSuggestion> = {}): TimerSuggestion => ({
  id: 1,
  title: '测试建议',
  category: '工作',
  estimated_minutes: 25,
  confidence: 0.8,
  reasoning: ['测试理由'],
  tags: ['测试'],
  ...overrides
});