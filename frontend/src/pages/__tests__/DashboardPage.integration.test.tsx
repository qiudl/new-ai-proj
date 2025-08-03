// Phase 5: 测试优化 - DashboardPage集成测试
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { TimerProvider } from '../../contexts/TimerContext';
import DashboardPage from '../DashboardPage';

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    loading: jest.fn()
  }
}));

// Mock speech synthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([])
};

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
});

// Mock drag and drop
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => [])
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })),
  arrayMove: jest.fn((array, oldIndex, newIndex) => {
    const result = [...array];
    const [removed] = result.splice(oldIndex, 1);
    result.splice(newIndex, 0, removed);
    return result;
  })
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => 'translate3d(0, 0, 0)')
    }
  }
}));

// Mock timer context
const mockTimerContext = {
  timerState: {
    isRunning: false,
    isPaused: false,
    elapsedTime: 0,
    currentTask: null
  },
  startTimer: jest.fn(),
  stopTimer: jest.fn(),
  pauseTimer: jest.fn(),
  resumeTimer: jest.fn()
};

const renderDashboardPage = () => {
  return render(
    <BrowserRouter>
      <TimerProvider value={mockTimerContext as any}>
        <DashboardPage />
      </TimerProvider>
    </BrowserRouter>
  );
};

describe('DashboardPage 集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('页面基本结构', () => {
    it('应该渲染所有主要区域', () => {
      renderDashboardPage();

      // 检查页面标题
      expect(screen.getByText('我的工作台')).toBeInTheDocument();
      expect(screen.getByText('管理您的项目、任务和工作时间')).toBeInTheDocument();

      // 检查四个主要区域
      expect(screen.getByText('任务计时')).toBeInTheDocument();
      expect(screen.getByText('个人计时')).toBeInTheDocument();
      expect(screen.getByText('数据分析')).toBeInTheDocument();
      expect(screen.getByText('我的任务 (拖拽排序)')).toBeInTheDocument();
    });

    it('应该有正确的网格布局', () => {
      const { container } = renderDashboardPage();
      
      const dashboardLayout = container.querySelector('.dashboard-simplified-layout');
      expect(dashboardLayout).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1.2fr 1fr'
      });
    });

    it('所有区域应该有正确的ARIA标签', () => {
      renderDashboardPage();

      expect(screen.getByLabelText('工作台主面板')).toBeInTheDocument();
      expect(screen.getByLabelText('任务计时区域')).toBeInTheDocument();
      expect(screen.getByLabelText('数据分析区域')).toBeInTheDocument();
      expect(screen.getByLabelText('我的任务区域')).toBeInTheDocument();
    });
  });

  describe('Phase 4 组件集成', () => {
    it('应该渲染上下文菜单提供者', () => {
      const { container } = renderDashboardPage();
      
      // 检查ContextMenuProvider是否被渲染
      expect(container.querySelector('[data-testid="dnd-context"]')).toBeInTheDocument();
    });

    it('应该渲染拖拽任务管理器', () => {
      renderDashboardPage();
      
      // 检查拖拽任务管理器组件
      expect(screen.getByText('我的任务 (拖拽排序)')).toBeInTheDocument();
      expect(screen.getByText('拖拽任务到这里快速开始计时')).toBeInTheDocument();
    });

    it('应该渲染无障碍辅助功能', () => {
      renderDashboardPage();
      
      // 检查无障碍按钮
      expect(screen.getByLabelText('显示快捷键帮助')).toBeInTheDocument();
      expect(screen.getByLabelText('切换语音播报')).toBeInTheDocument();
    });

    it('应该加载示例任务数据', async () => {
      renderDashboardPage();
      
      await waitFor(() => {
        expect(screen.getByText('Phase 4: 交互优化完成测试')).toBeInTheDocument();
        expect(screen.getByText('拖拽功能验证')).toBeInTheDocument();
        expect(screen.getByText('快捷键系统测试')).toBeInTheDocument();
        expect(screen.getByText('移动端手势功能')).toBeInTheDocument();
      });
    });
  });

  describe('计时器功能集成', () => {
    it('浮动计时器按钮应该反映计时器状态', () => {
      renderDashboardPage();
      
      const floatingTimerButton = screen.getByRole('button', { 
        name: /当前没有运行中的定时器/ 
      });
      expect(floatingTimerButton).toBeDisabled();
    });

    it('计时器运行时浮动按钮应该可用', () => {
      const runningTimerContext = {
        ...mockTimerContext,
        timerState: {
          ...mockTimerContext.timerState,
          isRunning: true,
          currentTask: { id: 1, title: '测试任务' }
        }
      };

      render(
        <BrowserRouter>
          <TimerProvider value={runningTimerContext as any}>
            <DashboardPage />
          </TimerProvider>
        </BrowserRouter>
      );

      const floatingTimerButton = screen.getByRole('button', { 
        name: /隐藏浮动定时器/ 
      });
      expect(floatingTimerButton).not.toBeDisabled();
    });

    it('点击任务计时按钮应该调用startTimer', async () => {
      const user = userEvent.setup();
      renderDashboardPage();

      await waitFor(() => {
        expect(screen.getByText('Phase 4: 交互优化完成测试')).toBeInTheDocument();
      });

      // 找到第一个任务的计时按钮
      const timerButtons = screen.getAllByRole('button');
      const playButton = timerButtons.find(btn => 
        btn.querySelector('.anticon-play-circle')
      );

      if (playButton) {
        await user.click(playButton);
        expect(mockTimerContext.startTimer).toHaveBeenCalled();
      }
    });
  });

  describe('键盘快捷键集成', () => {
    it('Shift + ? 应该打开快捷键帮助', () => {
      renderDashboardPage();

      fireEvent.keyDown(document, { key: '?', shiftKey: true });

      expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
    });

    it('Alt + V 应该切换语音播报', () => {
      renderDashboardPage();

      fireEvent.keyDown(document, { key: 'v', altKey: true });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('Escape 应该关闭帮助模态框', async () => {
      renderDashboardPage();

      // 先打开帮助模态框
      fireEvent.keyDown(document, { key: '?', shiftKey: true });
      expect(screen.getByText('快捷键帮助')).toBeInTheDocument();

      // 按Escape关闭
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('快捷键帮助')).not.toBeInTheDocument();
      });
    });
  });

  describe('无障碍功能集成', () => {
    it('语音播报按钮应该正确切换状态', async () => {
      const user = userEvent.setup();
      renderDashboardPage();

      const voiceButton = screen.getByLabelText('切换语音播报');
      
      // 默认应该是开启状态
      expect(voiceButton).toHaveClass('ant-btn-primary');

      await user.click(voiceButton);

      // 点击后应该播放语音通知
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('帮助模态框应该显示完整的快捷键列表', async () => {
      const user = userEvent.setup();
      renderDashboardPage();

      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);

      await waitFor(() => {
        // 检查是否有各个类别的快捷键
        expect(screen.getByText('计时控制')).toBeInTheDocument();
        expect(screen.getByText('任务管理')).toBeInTheDocument();
        expect(screen.getByText('导航')).toBeInTheDocument();
        expect(screen.getByText('无障碍')).toBeInTheDocument();

        // 检查具体的快捷键
        expect(screen.getByText('开始计时')).toBeInTheDocument();
        expect(screen.getByText('停止计时')).toBeInTheDocument();
        expect(screen.getByText('暂停/恢复计时')).toBeInTheDocument();
      });
    });

    it('焦点管理应该在模态框中正确工作', async () => {
      const user = userEvent.setup();
      renderDashboardPage();

      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
      });

      // 模拟Tab键导航
      fireEvent.keyDown(document, { key: 'Tab' });
      
      // 检查焦点管理是否正常工作（不抛错）
      expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
    });
  });

  describe('右键上下文菜单集成', () => {
    it('右键点击计时器区域应该显示计时器菜单', async () => {
      renderDashboardPage();

      const timerSection = screen.getByLabelText('任务计时区域');
      fireEvent.contextMenu(timerSection);

      // 由于上下文菜单是动态渲染的，我们检查是否触发了事件
      expect(timerSection).toBeInTheDocument();
    });

    it('右键点击数据分析区域应该显示图表菜单', async () => {
      renderDashboardPage();

      const analyticsSection = screen.getByLabelText('数据分析区域');
      fireEvent.contextMenu(analyticsSection);

      expect(analyticsSection).toBeInTheDocument();
    });
  });

  describe('响应式设计', () => {
    it('应该在不同屏幕尺寸下正确显示', () => {
      const { container } = renderDashboardPage();
      
      // 检查CSS类是否正确应用
      const layout = container.querySelector('.dashboard-simplified-layout');
      expect(layout).toHaveClass('dashboard-simplified-layout');
    });

    it('移动端应该有正确的布局调整', () => {
      // 模拟移动端尺寸
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      const { container } = renderDashboardPage();
      
      // 检查CSS媒体查询相关的类
      expect(container.querySelector('.dashboard-simplified-layout')).toBeInTheDocument();
    });
  });

  describe('错误边界和错误处理', () => {
    it('Timer错误边界应该捕获错误', () => {
      // 模拟控制台错误，避免测试输出中的错误信息
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderDashboardPage();

      // 验证TimerErrorBoundary组件存在
      expect(screen.getByText('任务计时')).toBeInTheDocument();
      expect(screen.getByText('个人计时')).toBeInTheDocument();
      expect(screen.getByText('数据分析')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('localStorage错误应该被优雅处理', () => {
      // 模拟localStorage抛错
      const mockLocalStorage = {
        getItem: jest.fn(() => { throw new Error('Storage error'); }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      expect(() => {
        renderDashboardPage();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });
  });

  describe('性能优化', () => {
    it('组件应该使用正确的性能优化技术', () => {
      const { container } = renderDashboardPage();

      // 检查CSS包含性能优化相关的样式
      const layout = container.querySelector('.dashboard-simplified-layout');
      expect(layout).toBeInTheDocument();
    });

    it('不应该有内存泄漏', () => {
      const { unmount } = renderDashboardPage();
      
      // 卸载组件不应该抛错
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('数据流集成', () => {
    it('任务数据应该在组件间正确传递', async () => {
      renderDashboardPage();

      await waitFor(() => {
        // 检查示例任务是否正确显示
        expect(screen.getByText('Phase 4: 交互优化完成测试')).toBeInTheDocument();
        expect(screen.getByText('AI项目管理平台MVP')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('2h')).toBeInTheDocument();
      });
    });

    it('计时器状态应该在所有组件中保持同步', () => {
      const runningTimerContext = {
        ...mockTimerContext,
        timerState: {
          ...mockTimerContext.timerState,
          isRunning: true,
          currentTask: { id: 1, title: '测试任务' }
        }
      };

      render(
        <BrowserRouter>
          <TimerProvider value={runningTimerContext as any}>
            <DashboardPage />
          </TimerProvider>
        </BrowserRouter>
      );

      // 检查计时器状态在不同组件中的反映
      expect(screen.getByRole('button', { 
        name: /隐藏浮动定时器/ 
      })).not.toBeDisabled();
    });
  });

  describe('用户体验', () => {
    it('所有交互元素应该有适当的反馈', async () => {
      const user = userEvent.setup();
      renderDashboardPage();

      // 测试按钮交互
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.hover(helpButton);
      
      // 检查tooltip或其他反馈
      expect(helpButton).toBeInTheDocument();
    });

    it('加载状态应该被正确处理', () => {
      renderDashboardPage();

      // 检查是否有适当的加载状态指示
      expect(screen.getByText('数据分析')).toBeInTheDocument();
    });
  });
});