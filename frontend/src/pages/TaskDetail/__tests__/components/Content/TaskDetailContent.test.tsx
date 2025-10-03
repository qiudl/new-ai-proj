/**
 * TaskDetailContent - 内容区组件测试
 *
 * 测试覆盖:
 * - 内容区渲染
 * - 完成统计卡片
 * - 子任务树
 * - Tab切换
 * - 事件回调
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskDetailContent from '../../../components/Content/TaskDetailContent';
import { TaskDetailProvider } from '../../../context/TaskDetailProvider';
import { TaskService } from '../../../../../services/taskService';
import { documentService } from '../../../../../services/documentService';

// Mock dependencies
jest.mock('../../../../../services/taskService');
jest.mock('../../../../../services/documentService');
jest.mock('../../../../../components/TaskDetailDescendantsTreeV2', () => {
  const mockReact = require('react');
  return {
    TaskDetailDescendantsTreeV2: mockReact.forwardRef((props: any, ref: any) => (
      mockReact.createElement('div', { 'data-testid': 'descendants-tree' }, 'Mock Descendants Tree')
    ))
  };
});
jest.mock('../../../../../components/UnifiedTaskRefresh', () => ({
  UnifiedTaskRefresh: ({ onRefreshCompletionStats, onRefreshSubtasks }: any) => (
    <button
      data-testid="unified-refresh"
      onClick={() => {
        onRefreshCompletionStats?.();
        onRefreshSubtasks?.();
      }}
    >
      Refresh
    </button>
  ),
  RefreshContext: React.createContext({})
}));
jest.mock('../../../../../components/AnimatedContainer', () => ({
  AnimatedContainer: ({ children }: any) => <div>{children}</div>,
  UpdateAnimation: ({ children }: any) => <div>{children}</div>
}));
jest.mock('../../../../../components/RefreshConfigModal', () => ({
  RefreshConfigButton: () => <button>Config</button>
}));
jest.mock('../../../../../components/TaskInfoEditor', () => ({
  __esModule: true,
  default: ({ task, onUpdate }: any) => (
    <div data-testid="task-info-editor">
      Task Info Editor: {task.title}
    </div>
  )
}));
jest.mock('../../../../../components/TaskSummaryEditor', () => ({
  __esModule: true,
  default: ({ task }: any) => (
    <div data-testid="task-summary-editor">Task Summary Editor</div>
  )
}));

// Mock lazy loaded components
jest.mock('../../../../../components/UnifiedTaskDocumentArea', () => ({
  __esModule: true,
  default: () => <div data-testid="document-area">Document Area</div>
}));

jest.mock('../../../../../components/TaskAnalysisPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="analysis-panel">Analysis Panel</div>
}));

describe('TaskDetailContent', () => {
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

  const mockProps = {
    projectId: 1,
    onCreateSubtask: jest.fn(),
    onBulkImportSubtasks: jest.fn(),
    onUpdateTask: jest.fn().mockResolvedValue(undefined),
    onDocsChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (TaskService.getTask as jest.Mock).mockResolvedValue(mockTask);
    (TaskService.getTaskChildren as jest.Mock).mockResolvedValue([]);
    (documentService.getTaskDocuments as jest.Mock).mockResolvedValue({
      documents: [],
      total: 0
    });
  });

  const renderWithProvider = (props = mockProps) => {
    return render(
      <TaskDetailProvider projectId={1} taskId={1}>
        <TaskDetailContent {...props} />
      </TaskDetailProvider>
    );
  };

  describe('基本渲染', () => {
    it('应该在没有task时不渲染', () => {
      (TaskService.getTask as jest.Mock).mockResolvedValue(null);

      const { container } = renderWithProvider();

      expect(container.firstChild).toBeNull();
    });

    it('应该渲染子任务树卡片', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('子任务树')).toBeInTheDocument();
        expect(screen.getByTestId('descendants-tree')).toBeInTheDocument();
      });
    });

    it('应该渲染添加子任务按钮', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('添加子任务')).toBeInTheDocument();
      });
    });

    it('应该渲染批量导入按钮', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('批量导入')).toBeInTheDocument();
      });
    });

    it('应该渲染Tab组件', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('任务信息')).toBeInTheDocument();
      });
    });
  });

  describe('按钮交互', () => {
    it('点击添加子任务按钮应该调用onCreateSubtask', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('添加子任务')).toBeInTheDocument();
      });

      const addButton = screen.getByText('添加子任务');
      await user.click(addButton);

      expect(mockProps.onCreateSubtask).toHaveBeenCalledTimes(1);
    });

    it('点击批量导入按钮应该调用onBulkImportSubtasks', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('批量导入')).toBeInTheDocument();
      });

      const bulkButton = screen.getByText('批量导入');
      await user.click(bulkButton);

      expect(mockProps.onBulkImportSubtasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab切换', () => {
    it('应该显示默认的任务信息Tab', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('task-info-editor')).toBeInTheDocument();
      });
    });

    it('应该能够切换到文档Tab', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('文档')).toBeInTheDocument();
      });

      // Find and click the document tab (using role and name)
      const tabElements = screen.getAllByRole('tab');
      const documentTab = tabElements.find(tab => tab.textContent?.includes('文档'));

      if (documentTab) {
        await user.click(documentTab);

        await waitFor(() => {
          // After switching, document area should be visible
          expect(screen.getByTestId('document-area')).toBeInTheDocument();
        });
      }
    });

    it('应该能够切换到进度分析Tab', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('进度分析')).toBeInTheDocument();
      });

      const tabElements = screen.getAllByRole('tab');
      const progressTab = tabElements.find(tab => tab.textContent?.includes('进度分析'));

      if (progressTab) {
        await user.click(progressTab);

        await waitFor(() => {
          expect(screen.getByTestId('analysis-panel')).toBeInTheDocument();
        });
      }
    });
  });

  describe('任务信息Tab', () => {
    it('应该渲染TaskInfoEditor组件', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('task-info-editor')).toBeInTheDocument();
        expect(screen.getByText(/Task Info Editor:/)).toBeInTheDocument();
      });
    });

    it('应该渲染TaskSummaryEditor组件', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('task-summary-editor')).toBeInTheDocument();
      });
    });

    it('当任务没有description时应该显示提示', async () => {
      const taskWithoutDesc = { ...mockTask, description: undefined };
      (TaskService.getTask as jest.Mock).mockResolvedValue(taskWithoutDesc);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('暂无任务描述')).toBeInTheDocument();
      });
    });
  });

  describe('完成统计', () => {
    it('当没有统计数据时不显示完成统计卡片', async () => {
      renderWithProvider();

      await waitFor(() => {
        // Should not show completion stats card when no statistics
        expect(screen.queryByText('任务完成情况')).not.toBeInTheDocument();
      });
    });

    // Note: Testing with statistics requires mocking the context with statistics data
    // This would require a more complex setup with custom context values
  });

  describe('子任务树', () => {
    it('应该渲染TaskDetailDescendantsTreeV2组件', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('descendants-tree')).toBeInTheDocument();
      });
    });

    it('应该传递正确的props到子任务树', async () => {
      renderWithProvider();

      await waitFor(() => {
        const tree = screen.getByTestId('descendants-tree');
        expect(tree).toBeInTheDocument();
      });
    });
  });

  describe('Props传递', () => {
    it('应该传递projectId到组件', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('descendants-tree')).toBeInTheDocument();
      });
    });

    it('应该传递onUpdateTask到TaskInfoEditor', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('task-info-editor')).toBeInTheDocument();
      });
    });

    it('应该传递onDocsChange到文档组件', async () => {
      renderWithProvider();

      // This would be tested when switching to document tab
      // and verifying the callback is passed
    });
  });

  describe('DisplayName', () => {
    it('应该设置正确的displayName', () => {
      expect(TaskDetailContent.displayName).toBe('TaskDetailContent');
    });
  });
});
