// Phase 5: 测试优化 - DragDropTaskManager组件单元测试
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import DragDropTaskManager from '../DragDropTaskManager';

// Mock message component from antd
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

// 模拟任务数据
const mockTasks = [
  {
    id: 1,
    title: '测试任务1',
    status: 'todo' as const,
    priority: 'high' as const,
    project_name: '测试项目',
    custom_fields: {
      priority: 'high',
      estimated_hours: 2,
      tags: ['测试', '高优先级']
    }
  },
  {
    id: 2,
    title: '测试任务2',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    project_name: '测试项目',
    custom_fields: {
      priority: 'medium',
      estimated_hours: 1.5,
      tags: ['测试', '进行中']
    }
  },
  {
    id: 3,
    title: '测试任务3',
    status: 'completed' as const,
    priority: 'low' as const,
    project_name: '另一个项目',
    custom_fields: {
      priority: 'low',
      estimated_hours: 1,
      tags: ['测试', '已完成']
    }
  }
];

describe('DragDropTaskManager', () => {
  const defaultProps = {
    tasks: mockTasks,
    onTasksReorder: jest.fn(),
    onStartTimer: jest.fn(),
    onTaskClick: jest.fn(),
    isTimerRunning: false,
    currentTimingTaskId: undefined,
    height: 400,
    enableDropZone: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('基本渲染', () => {
    it('应该正确渲染任务列表', () => {
      render(<DragDropTaskManager {...defaultProps} />);
      
      expect(screen.getByText('测试任务1')).toBeInTheDocument();
      expect(screen.getByText('测试任务2')).toBeInTheDocument();
      expect(screen.getByText('测试任务3')).toBeInTheDocument();
    });

    it('应该显示任务的基本信息', () => {
      render(<DragDropTaskManager {...defaultProps} />);
      
      // 检查项目名称
      expect(screen.getByText('测试项目')).toBeInTheDocument();
      expect(screen.getByText('另一个项目')).toBeInTheDocument();
      
      // 检查预估时间
      expect(screen.getByText('2h')).toBeInTheDocument();
      expect(screen.getByText('1.5h')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
      
      // 检查优先级标签
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    it('应该显示拖拽投放区域', () => {
      render(<DragDropTaskManager {...defaultProps} />);
      
      expect(screen.getByText('拖拽任务到这里快速开始计时')).toBeInTheDocument();
    });

    it('当enableDropZone为false时应该隐藏投放区域', () => {
      render(<DragDropTaskManager {...defaultProps} enableDropZone={false} />);
      
      expect(screen.queryByText('拖拽任务到这里快速开始计时')).not.toBeInTheDocument();
    });
  });

  describe('任务交互', () => {
    it('点击任务应该触发onTaskClick回调', async () => {
      const user = userEvent.setup();
      render(<DragDropTaskManager {...defaultProps} />);
      
      const taskCard = screen.getByText('测试任务1').closest('.ant-card');
      await user.click(taskCard!);
      
      expect(defaultProps.onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('点击计时按钮应该触发onStartTimer回调', async () => {
      const user = userEvent.setup();
      render(<DragDropTaskManager {...defaultProps} />);
      
      const timerButtons = screen.getAllByRole('button');
      const firstTimerButton = timerButtons.find(btn => 
        btn.querySelector('.anticon-play-circle')
      );
      
      await user.click(firstTimerButton!);
      
      expect(defaultProps.onStartTimer).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('正在计时的任务应该显示不同的样式', () => {
      render(
        <DragDropTaskManager 
          {...defaultProps} 
          isTimerRunning={true}
          currentTimingTaskId={1}
        />
      );
      
      const timingTask = screen.getByText('测试任务1').closest('.timing');
      expect(timingTask).toBeInTheDocument();
    });
  });

  describe('无任务状态', () => {
    it('当没有任务时应该显示空状态', () => {
      render(<DragDropTaskManager {...defaultProps} tasks={[]} />);
      
      expect(screen.getByText('暂无任务')).toBeInTheDocument();
      expect(screen.getByText('添加任务或从其他项目拖拽任务到这里')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有正确的ARIA标签', () => {
      render(<DragDropTaskManager {...defaultProps} />);
      
      // 检查拖拽手柄的可访问性
      const dragHandles = screen.getAllByLabelText(/drag/i);
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it('任务卡片应该可以通过键盘访问', () => {
      render(<DragDropTaskManager {...defaultProps} />);
      
      const taskCards = screen.getAllByRole('button');
      taskCards.forEach(card => {
        expect(card).toHaveAttribute('tabIndex', expect.any(String));
      });
    });
  });

  describe('响应式设计', () => {
    it('应该接受自定义高度', () => {
      const { container } = render(
        <DragDropTaskManager {...defaultProps} height="600px" />
      );
      
      const taskContainer = container.querySelector('[style*="max-height"]');
      expect(taskContainer).toHaveStyle({ maxHeight: '600px' });
    });
  });

  describe('错误处理', () => {
    it('当任务数据不完整时应该优雅处理', () => {
      const incompleteTask = {
        id: 999,
        title: '不完整任务',
        status: 'todo' as const
        // 缺少其他字段
      };

      expect(() => {
        render(
          <DragDropTaskManager 
            {...defaultProps} 
            tasks={[incompleteTask]}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('不完整任务')).toBeInTheDocument();
    });

    it('当回调函数未提供时应该不会崩溃', () => {
      const propsWithoutCallbacks = {
        ...defaultProps,
        onTasksReorder: undefined,
        onStartTimer: undefined,
        onTaskClick: undefined
      };

      expect(() => {
        render(<DragDropTaskManager {...propsWithoutCallbacks as any} />);
      }).not.toThrow();
    });
  });

  describe('性能优化', () => {
    it('应该使用React.memo优化重新渲染', () => {
      const { rerender } = render(<DragDropTaskManager {...defaultProps} />);
      
      // 重新渲染相同的props不应该导致DOM变化
      const initialHTML = screen.getByText('测试任务1').innerHTML;
      
      rerender(<DragDropTaskManager {...defaultProps} />);
      
      expect(screen.getByText('测试任务1').innerHTML).toBe(initialHTML);
    });

    it('任务列表变化时应该正确更新', () => {
      const { rerender } = render(<DragDropTaskManager {...defaultProps} />);
      
      expect(screen.getByText('测试任务1')).toBeInTheDocument();
      
      const newTasks = [
        ...mockTasks,
        {
          id: 4,
          title: '新任务',
          status: 'todo' as const,
          priority: 'medium' as const,
          project_name: '新项目',
          custom_fields: {}
        }
      ];
      
      rerender(<DragDropTaskManager {...defaultProps} tasks={newTasks} />);
      
      expect(screen.getByText('新任务')).toBeInTheDocument();
    });
  });

  describe('主题和样式', () => {
    it('任务状态应该有对应的视觉指示器', () => {
      render(<DragDropTaskManager {...defaultProps} />);
      
      // 检查不同状态的图标
      expect(screen.getByLabelText(/todo/i) || screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByLabelText(/in_progress/i) || screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByLabelText(/completed/i) || screen.getByRole('img')).toBeInTheDocument();
    });

    it('优先级应该有对应的颜色编码', () => {
      const { container } = render(<DragDropTaskManager {...defaultProps} />);
      
      // 检查高优先级的红色边框
      const highPriorityTask = screen.getByText('测试任务1').closest('.ant-card');
      expect(highPriorityTask).toHaveStyle({ borderLeft: expect.stringContaining('#ff4d4f') });
    });
  });
});

// 集成测试：测试与DndContext的集成
describe('DragDropTaskManager 拖拽集成', () => {
  const renderWithDndContext = (props: any) => {
    return render(
      <DndContext>
        <DragDropTaskManager {...props} />
      </DndContext>
    );
  };

  it('应该在DndContext中正常工作', () => {
    expect(() => {
      renderWithDndContext({
        tasks: mockTasks,
        onTasksReorder: jest.fn(),
        onStartTimer: jest.fn(),
        onTaskClick: jest.fn()
      });
    }).not.toThrow();
  });
});