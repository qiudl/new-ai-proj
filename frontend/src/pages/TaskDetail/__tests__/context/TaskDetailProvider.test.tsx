/**
 * TaskDetailProvider - Context Provider测试
 *
 * 测试覆盖:
 * - Provider正确提供context value
 * - 初始化状态
 * - Actions调用(refreshTask, updateTask, deleteTask等)
 * - Loading/Error状态管理
 * - useReducer集成
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { message } from 'antd';
import { TaskDetailProvider } from '../../context/TaskDetailProvider';
import { useTaskDetailContext } from '../../hooks/useTaskDetailContext';
import { TaskService } from '../../../../services/taskService';
import { documentService } from '../../../../services/documentService';

// Mock dependencies
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

jest.mock('../../../../services/taskService');
jest.mock('../../../../services/documentService');

// Test component to access context
const TestConsumer: React.FC<{ onRender?: (context: any) => void }> = ({ onRender }) => {
  const context = useTaskDetailContext();

  React.useEffect(() => {
    if (onRender) {
      onRender(context);
    }
  }, [context, onRender]);

  return (
    <div>
      <div data-testid="task-id">{context.task?.id || 'null'}</div>
      <div data-testid="loading-initial">{context.loading.initial ? 'true' : 'false'}</div>
      <div data-testid="loading-task">{context.loading.task ? 'true' : 'false'}</div>
      <div data-testid="error-task">{context.errors.task ? 'error' : 'null'}</div>
    </div>
  );
};

const renderProvider = (projectId = 1, taskId = 1) => {
  let contextValue: any = null;

  const onRender = (context: any) => {
    contextValue = context;
  };

  const result = render(
    <TaskDetailProvider projectId={projectId} taskId={taskId}>
      <TestConsumer onRender={onRender} />
    </TaskDetailProvider>
  );

  return { ...result, getContext: () => contextValue };
};

describe('TaskDetailProvider', () => {
  const mockTask = {
    id: 1,
    project_id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo' as const,
    priority: 'medium' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockSubtasks = [
    { ...mockTask, id: 2, parent_id: 1, title: 'Subtask 1' },
    { ...mockTask, id: 3, parent_id: 1, title: 'Subtask 2' }
  ];

  const mockDocuments = {
    documents: [
      {
        id: 1,
        task_id: 1,
        project_id: 1,
        title: 'Test Document',
        content: 'Test Content',
        type: 'markdown' as const,
        status: 'published' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ],
    total: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful mocks
    (TaskService.getTask as jest.Mock).mockResolvedValue(mockTask);
    (TaskService.getTaskChildren as jest.Mock).mockResolvedValue(mockSubtasks);
    (documentService.getTaskDocuments as jest.Mock).mockResolvedValue(mockDocuments);
  });

  describe('初始化和渲染', () => {
    it('应该正确提供context value', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context).toBeDefined();
        expect(context.projectId).toBe(1);
        expect(context.taskId).toBe(1);
        expect(context.actions).toBeDefined();
      });
    });

    it('应该初始化为正确的初始状态', () => {
      renderProvider(1, 1);

      expect(screen.getByTestId('task-id')).toHaveTextContent('null');
      expect(screen.getByTestId('loading-initial')).toHaveTextContent('true');
      expect(screen.getByTestId('error-task')).toHaveTextContent('null');
    });

    it('应该包含所有必需的actions', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toHaveProperty('refreshTask');
        expect(context.actions).toHaveProperty('updateTask');
        expect(context.actions).toHaveProperty('deleteTask');
        expect(context.actions).toHaveProperty('archiveTask');
        expect(context.actions).toHaveProperty('loadDocuments');
        expect(context.actions).toHaveProperty('createDocument');
        expect(context.actions).toHaveProperty('updateDocument');
        expect(context.actions).toHaveProperty('deleteDocument');
        expect(context.actions).toHaveProperty('loadRelations');
        expect(context.actions).toHaveProperty('createSubtask');
        expect(context.actions).toHaveProperty('setActiveTab');
        expect(context.actions).toHaveProperty('openModal');
        expect(context.actions).toHaveProperty('closeModal');
        expect(context.actions).toHaveProperty('toggleSidebar');
        expect(context.actions).toHaveProperty('setUI');
        expect(context.actions).toHaveProperty('reset');
      });
    });
  });

  describe('Task Operations', () => {
    it('refreshTask: 应该成功加载任务数据', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.refreshTask();
      });

      await waitFor(() => {
        expect(TaskService.getTask).toHaveBeenCalledWith(1, 1);
        expect(TaskService.getTaskChildren).toHaveBeenCalledWith(1, 1);
        expect(documentService.getTaskDocuments).toHaveBeenCalledWith(1, 1);
      });

      const updatedContext = getContext();
      expect(updatedContext.task).toEqual(mockTask);
      expect(updatedContext.loading.task).toBe(false);
      expect(updatedContext.loading.initial).toBe(false);
    });

    it('refreshTask: 应该处理加载错误', async () => {
      const error = new Error('Failed to load task');
      (TaskService.getTask as jest.Mock).mockRejectedValue(error);

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.refreshTask();
      });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to load task details');
        const updatedContext = getContext();
        expect(updatedContext.errors.task).toBeTruthy();
        expect(updatedContext.loading.task).toBe(false);
      });
    });

    it('updateTask: 应该成功更新任务', async () => {
      const updates = { title: 'Updated Title', status: 'in_progress' as const };
      const updatedTask = { ...mockTask, ...updates };
      (TaskService.updateTask as jest.Mock).mockResolvedValue(updatedTask);

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.updateTask(updates);
      });

      await waitFor(() => {
        expect(TaskService.updateTask).toHaveBeenCalledWith(1, 1, updates);
        expect(message.success).toHaveBeenCalledWith('Task updated successfully');
        const updatedContext = getContext();
        expect(updatedContext.task).toEqual(updatedTask);
      });
    });

    it('updateTask: 应该处理更新错误', async () => {
      const error = new Error('Update failed');
      (TaskService.updateTask as jest.Mock).mockRejectedValue(error);

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.updateTask({ title: 'New Title' });
      });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to update task');
        const updatedContext = getContext();
        expect(updatedContext.errors.task).toBeTruthy();
      });
    });

    it('deleteTask: 应该成功删除任务', async () => {
      (TaskService.deleteTask as jest.Mock).mockResolvedValue({});

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.deleteTask();
      });

      await waitFor(() => {
        expect(TaskService.deleteTask).toHaveBeenCalledWith(1, 1);
        expect(message.success).toHaveBeenCalledWith('Task deleted successfully');
        const updatedContext = getContext();
        expect(updatedContext.task).toBeNull();
      });
    });

    it('archiveTask: 应该调用updateTask设置archived状态', async () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      (TaskService.updateTask as jest.Mock).mockResolvedValue(archivedTask);

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.archiveTask();
      });

      await waitFor(() => {
        expect(TaskService.updateTask).toHaveBeenCalledWith(1, 1, { status: 'archived' });
      });
    });
  });

  describe('Document Operations', () => {
    it('loadDocuments: 应该成功加载文档列表', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.loadDocuments();
      });

      await waitFor(() => {
        expect(documentService.getTaskDocuments).toHaveBeenCalledWith(1, 1);
        const updatedContext = getContext();
        expect(updatedContext.documents.list).toEqual(mockDocuments.documents);
        expect(updatedContext.documents.total).toBe(1);
        expect(updatedContext.documents.loading).toBe(false);
      });
    });

    it('createDocument: 应该成功创建文档', async () => {
      (documentService.createDocument as jest.Mock).mockResolvedValue({});

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();
      const newDoc = { title: 'New Document', content: 'Content' };

      await act(async () => {
        await context.actions.createDocument(newDoc);
      });

      await waitFor(() => {
        expect(documentService.createDocument).toHaveBeenCalledWith(1, {
          ...newDoc,
          task_id: 1
        });
        expect(message.success).toHaveBeenCalledWith('Document created successfully');
      });
    });

    it('updateDocument: 应该成功更新文档', async () => {
      (documentService.updateDocument as jest.Mock).mockResolvedValue({});

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();
      const updates = { title: 'Updated Title' };

      await act(async () => {
        await context.actions.updateDocument(1, updates);
      });

      await waitFor(() => {
        expect(documentService.updateDocument).toHaveBeenCalledWith(1, 1, updates);
        expect(message.success).toHaveBeenCalledWith('Document updated successfully');
      });
    });

    it('deleteDocument: 应该成功删除文档', async () => {
      (documentService.deleteDocument as jest.Mock).mockResolvedValue({});

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.deleteDocument(1);
      });

      await waitFor(() => {
        expect(documentService.deleteDocument).toHaveBeenCalledWith(1, 1);
        expect(message.success).toHaveBeenCalledWith('Document deleted successfully');
      });
    });
  });

  describe('Relations Operations', () => {
    it('loadRelations: 应该成功加载关系数据', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.loadRelations();
      });

      await waitFor(() => {
        expect(TaskService.getTaskChildren).toHaveBeenCalledWith(1, 1);
        const updatedContext = getContext();
        expect(updatedContext.relations.subtasks).toEqual(mockSubtasks);
      });
    });

    it('createSubtask: 应该成功创建子任务', async () => {
      (TaskService.createTask as jest.Mock).mockResolvedValue({ id: 4 });

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.createSubtask('New Subtask', 'Description');
      });

      await waitFor(() => {
        expect(TaskService.createTask).toHaveBeenCalledWith(1, {
          title: 'New Subtask',
          description: 'Description',
          parent_id: 1
        });
        expect(message.success).toHaveBeenCalledWith('Subtask created successfully');
      });
    });
  });

  describe('UI Operations', () => {
    it('setActiveTab: 应该更新活动标签页', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      act(() => {
        context.actions.setActiveTab('document');
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.ui.activeTab).toBe('document');
      });
    });

    it('openModal: 应该打开模态框', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      act(() => {
        context.actions.openModal('edit');
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.ui.modals.edit.visible).toBe(true);
      });
    });

    it('closeModal: 应该关闭模态框', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      act(() => {
        context.actions.openModal('edit');
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.ui.modals.edit.visible).toBe(true);
      });

      act(() => {
        context.actions.closeModal('edit');
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.ui.modals.edit.visible).toBe(false);
      });
    });

    it('toggleSidebar: 应该切换侧边栏状态', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();
      const initialCollapsed = context.ui.sidebar.collapsed;

      act(() => {
        context.actions.toggleSidebar();
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.ui.sidebar.collapsed).toBe(!initialCollapsed);
      });
    });

    it('setUI: 应该更新UI状态', async () => {
      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      act(() => {
        context.actions.setUI({ activeTab: 'progress' });
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.ui.activeTab).toBe('progress');
      });
    });
  });

  describe('Loading States', () => {
    it('应该在任务加载时设置loading状态', async () => {
      let resolveTask: any;
      const taskPromise = new Promise((resolve) => {
        resolveTask = resolve;
      });
      (TaskService.getTask as jest.Mock).mockReturnValue(taskPromise);

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      act(() => {
        context.actions.refreshTask();
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.loading.task).toBe(true);
        expect(updatedContext.loading.initial).toBe(true);
      });

      await act(async () => {
        resolveTask(mockTask);
        await taskPromise;
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.loading.task).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('应该在操作失败时设置error状态', async () => {
      const error = new Error('Network error');
      (TaskService.getTask as jest.Mock).mockRejectedValue(error);

      const { getContext } = renderProvider(1, 1);

      await waitFor(() => {
        const context = getContext();
        expect(context.actions).toBeDefined();
      });

      const context = getContext();

      await act(async () => {
        await context.actions.refreshTask();
      });

      await waitFor(() => {
        const updatedContext = getContext();
        expect(updatedContext.errors.task).toBeTruthy();
      });
    });
  });
});
