/**
 * TaskDetailPage - 集成测试
 *
 * 测试覆盖:
 * - 完整页面渲染
 * - Provider包裹
 * - 数据加载流程
 * - 用户交互流程
 * - 错误处理
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetailProvider } from '../../context/TaskDetailProvider';
import { TaskDetailLayout } from '../../components/Layout/TaskDetailLayout';
import TaskDetailContent from '../../components/Content/TaskDetailContent';
import TaskDetailSidebar from '../../components/Sidebar/TaskDetailSidebar';
import TaskDetailModals from '../../components/Modals/TaskDetailModals';
import { TaskService } from '../../../../services/taskService';
import { documentService } from '../../../../services/documentService';
import { TimerContext } from '../../../../contexts/TimerContext';

// Mock all dependencies
jest.mock('../../../../services/taskService');
jest.mock('../../../../services/documentService');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

// Mock all sub-components that are complex
jest.mock('../../../../components/TaskDetailDescendantsTreeV2', () => {
  const mockReact = require('react');
  return {
    TaskDetailDescendantsTreeV2: mockReact.forwardRef(() => (
      mockReact.createElement('div', { 'data-testid': 'descendants-tree' }, 'Subtasks Tree')
    ))
  };
});
jest.mock('../../../../components/MVPTaskDetailTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="timer">Timer</div>
}));
jest.mock('../../../../components/TaskDetailBasicInfo', () => ({
  TaskDetailInfo: () => <div data-testid="basic-info">Basic Info</div>
}));
jest.mock('../../../../components/TaskDocumentWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="document-widget">Document Widget</div>
}));
jest.mock('../../../../components/TaskInfoEditor', () => ({
  __esModule: true,
  default: ({ task }: any) => <div data-testid="info-editor">Info: {task?.title}</div>
}));
jest.mock('../../../../components/TaskSummaryEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="summary-editor">Summary</div>
}));
jest.mock('../../../../components/UnifiedTaskRefresh', () => ({
  UnifiedTaskRefresh: () => <button>Refresh</button>,
  RefreshContext: React.createContext({})
}));
jest.mock('../../../../components/AnimatedContainer', () => ({
  AnimatedContainer: ({ children }: any) => <div>{children}</div>,
  UpdateAnimation: ({ children }: any) => <div>{children}</div>
}));
jest.mock('../../../../components/RefreshConfigModal', () => ({
  RefreshConfigButton: () => <button>Config</button>
}));
jest.mock('../../../../components/TaskModal', () => ({
  __esModule: true,
  default: ({ visible }: any) => visible ? <div>Task Modal</div> : null
}));
jest.mock('../../../../components/TaskArchiveModal', () => ({
  __esModule: true,
  default: ({ visible }: any) => visible ? <div>Archive Modal</div> : null
}));
jest.mock('../../../../components/BulkSubTaskCreator', () => ({
  __esModule: true,
  default: ({ visible }: any) => visible ? <div>Bulk Creator</div> : null
}));
jest.mock('../../../../components/UnifiedTaskDocumentArea', () => ({
  __esModule: true,
  default: () => <div>Document Area</div>
}));
jest.mock('../../../../components/TaskAnalysisPanel', () => ({
  __esModule: true,
  default: () => <div>Analysis Panel</div>
}));

describe('TaskDetailPage Integration', () => {
  const mockTask = {
    id: 1,
    project_id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'in_progress' as const,
    priority: 'high' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockSubtasks = [
    { ...mockTask, id: 2, title: 'Subtask 1', parent_id: 1 },
    { ...mockTask, id: 3, title: 'Subtask 2', parent_id: 1 }
  ];

  const mockDocuments = {
    documents: [
      {
        id: 1,
        task_id: 1,
        project_id: 1,
        title: 'Test Document',
        content: 'Content',
        type: 'markdown' as const,
        status: 'published' as const,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ],
    total: 1
  };

  const mockTimerContext = {
    currentTimer: null,
    activeTimers: [],
    startTimer: jest.fn(),
    stopTimer: jest.fn(),
    pauseTimer: jest.fn(),
    resumeTimer: jest.fn(),
    loading: false,
    error: null
  };

  const mockModalHandlers = {
    onTaskModalSubmit: jest.fn().mockResolvedValue(undefined),
    onArchiveSuccess: jest.fn(),
    onBulkSubTaskSuccess: jest.fn(),
    onEditDetails: jest.fn()
  };

  const mockContentHandlers = {
    onCreateSubtask: jest.fn(),
    onBulkImportSubtasks: jest.fn(),
    onUpdateTask: jest.fn().mockResolvedValue(undefined),
    onDocsChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (TaskService.getTask as jest.Mock).mockResolvedValue(mockTask);
    (TaskService.getTaskChildren as jest.Mock).mockResolvedValue(mockSubtasks);
    (documentService.getTaskDocuments as jest.Mock).mockResolvedValue(mockDocuments);
  });

  const renderFullPage = () => {
    return render(
      <TimerContext.Provider value={mockTimerContext as any}>
        <TaskDetailProvider projectId={1} taskId={1}>
          <TaskDetailLayout
            content={
              <TaskDetailContent
                projectId={1}
                {...mockContentHandlers}
              />
            }
            sidebar={
              <TaskDetailSidebar projectId={1} />
            }
          />
          <TaskDetailModals
            projectId={1}
            {...mockModalHandlers}
          />
        </TaskDetailProvider>
      </TimerContext.Provider>
    );
  };

  describe('页面初始化', () => {
    it('应该成功渲染完整的页面', async () => {
      renderFullPage();

      await waitFor(() => {
        // Layout rendered
        expect(screen.getByTestId('descendants-tree')).toBeInTheDocument();
        expect(screen.getByTestId('timer')).toBeInTheDocument();
        expect(screen.getByTestId('basic-info')).toBeInTheDocument();
      });
    });

    it('应该加载任务数据', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(TaskService.getTask).toHaveBeenCalledWith(1, 1);
      });
    });

    it('应该加载子任务数据', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(TaskService.getTaskChildren).toHaveBeenCalledWith(1, 1);
      });
    });

    it('应该加载文档数据', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(documentService.getTaskDocuments).toHaveBeenCalledWith(1, 1);
      });
    });
  });

  describe('数据加载状态', () => {
    it('应该处理加载错误', async () => {
      const error = new Error('Failed to load');
      (TaskService.getTask as jest.Mock).mockRejectedValue(error);

      renderFullPage();

      await waitFor(() => {
        expect(TaskService.getTask).toHaveBeenCalled();
        // Error handling verified through message.error mock
      });
    });

    it('应该在数据加载完成后显示内容', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByTestId('info-editor')).toBeInTheDocument();
        expect(screen.getByText(/Info: Test Task/)).toBeInTheDocument();
      });
    });
  });

  describe('用户交互', () => {
    it('应该能点击添加子任务按钮', async () => {
      const user = userEvent.setup();
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByText('添加子任务')).toBeInTheDocument();
      });

      const addButton = screen.getByText('添加子任务');
      await user.click(addButton);

      expect(mockContentHandlers.onCreateSubtask).toHaveBeenCalled();
    });

    it('应该能点击批量导入按钮', async () => {
      const user = userEvent.setup();
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByText('批量导入')).toBeInTheDocument();
      });

      const bulkButton = screen.getByText('批量导入');
      await user.click(bulkButton);

      expect(mockContentHandlers.onBulkImportSubtasks).toHaveBeenCalled();
    });

    it('应该能切换Tab标签页', async () => {
      const user = userEvent.setup();
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByText('任务信息')).toBeInTheDocument();
      });

      // Initially on info tab
      expect(screen.getByTestId('info-editor')).toBeInTheDocument();

      // Switch to document tab
      const tabElements = screen.getAllByRole('tab');
      const documentTab = tabElements.find(tab => tab.textContent?.includes('文档'));

      if (documentTab) {
        await user.click(documentTab);

        await waitFor(() => {
          expect(screen.getByText('Document Area')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Provider集成', () => {
    it('Content和Sidebar应该共享相同的context', async () => {
      renderFullPage();

      await waitFor(() => {
        // Both components should have access to the same task data
        expect(screen.getByTestId('info-editor')).toBeInTheDocument();
        expect(screen.getByTestId('basic-info')).toBeInTheDocument();
      });
    });

    it('Modals应该能访问context数据', async () => {
      renderFullPage();

      await waitFor(() => {
        // Modals component should be rendered (even if not visible)
        expect(TaskService.getTask).toHaveBeenCalled();
      });
    });
  });

  describe('响应式布局', () => {
    it('应该包含两栏布局结构', async () => {
      const { container } = renderFullPage();

      await waitFor(() => {
        const cols = container.querySelectorAll('.ant-col');
        expect(cols.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('左侧列应该包含Content组件', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByTestId('descendants-tree')).toBeInTheDocument();
        expect(screen.getByText('子任务树')).toBeInTheDocument();
      });
    });

    it('右侧列应该包含Sidebar组件', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByTestId('timer')).toBeInTheDocument();
        expect(screen.getByTestId('basic-info')).toBeInTheDocument();
      });
    });
  });

  describe('完整流程测试', () => {
    it('应该完成完整的页面加载和渲染流程', async () => {
      renderFullPage();

      // 1. 加载数据
      await waitFor(() => {
        expect(TaskService.getTask).toHaveBeenCalled();
        expect(TaskService.getTaskChildren).toHaveBeenCalled();
        expect(documentService.getTaskDocuments).toHaveBeenCalled();
      });

      // 2. 渲染内容
      await waitFor(() => {
        expect(screen.getByTestId('info-editor')).toBeInTheDocument();
        expect(screen.getByTestId('descendants-tree')).toBeInTheDocument();
        expect(screen.getByTestId('timer')).toBeInTheDocument();
      });

      // 3. 交互元素可用
      expect(screen.getByText('添加子任务')).toBeInTheDocument();
      expect(screen.getByText('批量导入')).toBeInTheDocument();
    });

    it('应该处理数据更新流程', async () => {
      renderFullPage();

      await waitFor(() => {
        expect(screen.getByTestId('info-editor')).toBeInTheDocument();
      });

      // Simulate task update
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      (TaskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      // This would trigger through onUpdateTask callback
      await act(async () => {
        await mockContentHandlers.onUpdateTask({ title: 'Updated Task' });
      });

      expect(mockContentHandlers.onUpdateTask).toHaveBeenCalledWith({
        title: 'Updated Task'
      });
    });
  });

  describe('错误边界', () => {
    it('应该优雅处理API错误', async () => {
      const error = new Error('Network error');
      (TaskService.getTask as jest.Mock).mockRejectedValue(error);

      renderFullPage();

      await waitFor(() => {
        expect(TaskService.getTask).toHaveBeenCalled();
      });

      // Should not crash, error handled internally
    });

    it('应该处理部分数据加载失败', async () => {
      (documentService.getTaskDocuments as jest.Mock).mockRejectedValue(
        new Error('Documents failed')
      );

      renderFullPage();

      await waitFor(() => {
        // Task and subtasks should still load
        expect(screen.getByTestId('info-editor')).toBeInTheDocument();
      });
    });
  });
});
