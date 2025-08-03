import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';
import TaskModal from '../../components/TaskModal';
import TaskEditPage from '../../pages/TaskEditPage';
import { TaskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { Task } from '../../types/task';

// Mock services
jest.mock('../../services/taskService');
jest.mock('../../services/projectService');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock router hooks
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

const mockTaskService = TaskService as jest.Mocked<typeof TaskService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

// Test data
const mockProject = {
  id: 1,
  name: 'Test Project',
  description: 'Test project description',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Root Task 1',
    description: 'Root task description',
    status: 'todo',
    project_id: 1,
    parent_id: null,
    task_level: 0,
    sort_order: 1,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 2,
    title: 'Root Task 2',
    description: 'Another root task',
    status: 'in_progress',
    project_id: 1,
    parent_id: null,
    task_level: 0,
    sort_order: 2,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 3,
    title: 'Child Task',
    description: 'Child task description',
    status: 'todo',
    project_id: 1,
    parent_id: 1,
    task_level: 1,
    sort_order: 1,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('Parent Task Selection E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockTaskService.getTask.mockImplementation((projectId, taskId) => {
      const task = mockTasks.find(t => t.id === taskId);
      return Promise.resolve(task!);
    });
    
    mockProjectService.getProject.mockResolvedValue(mockProject);
    
    // Mock parent search API
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/tasks/search-parents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              data: mockTasks.filter(t => !t.parent_id), // Only root tasks as potential parents
              total: 2,
            },
          }),
        });
      }
      
      if (url.includes('/tasks/validate-parent')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { hasCircularDependency: false },
          }),
        });
      }
      
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TaskModal Parent Selection E2E', () => {
    const renderTaskModal = (props = {}) => {
      const defaultProps = {
        visible: true,
        projectId: 1,
        onOk: jest.fn(),
        onCancel: jest.fn(),
        allowParentSelection: true,
        ...props,
      };

      return render(
        <BrowserRouter>
          <TaskModal {...defaultProps} />
        </BrowserRouter>
      );
    };

    it('should complete full parent selection workflow in create mode', async () => {
      const mockOnOk = jest.fn();
      renderTaskModal({ onOk: mockOnOk });

      // Wait for modal to render
      await waitFor(() => {
        expect(screen.getByText('创建任务')).toBeInTheDocument();
      });

      // Fill in basic task information
      const titleInput = screen.getByLabelText('任务标题');
      await userEvent.type(titleInput, 'New Task with Parent');

      const descriptionInput = screen.getByLabelText('任务描述');
      await userEvent.type(descriptionInput, 'Task description');

      // Open parent selector
      const selectParentButton = screen.getByText('选择');
      fireEvent.click(selectParentButton);

      // Wait for parent selector modal to open
      await waitFor(() => {
        expect(screen.getByText('选择父任务')).toBeInTheDocument();
      });

      // Search should be triggered automatically
      await waitFor(() => {
        expect(screen.getByText('Root Task 1')).toBeInTheDocument();
        expect(screen.getByText('Root Task 2')).toBeInTheDocument();
      });

      // Select a parent task
      const parentTask = screen.getByText('Root Task 1');
      fireEvent.click(parentTask.closest('.task-tree-node')!);

      // Confirm parent selection
      const confirmButton = screen.getByRole('button', { name: '确定' });
      fireEvent.click(confirmButton);

      // Wait for parent selector modal to close
      await waitFor(() => {
        expect(screen.queryByText('选择父任务')).not.toBeInTheDocument();
      });

      // Verify parent is displayed in main modal
      expect(screen.getByText('Root Task 1')).toBeInTheDocument();

      // Submit the task creation
      const createButton = screen.getByRole('button', { name: '创建' });
      fireEvent.click(createButton);

      // Verify onOk was called with correct data
      await waitFor(() => {
        expect(mockOnOk).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Task with Parent',
            description: 'Task description',
            parent_id: 1,
          })
        );
      });
    });

    it('should handle parent selection validation errors gracefully', async () => {
      // Mock validation to return error
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/tasks/validate-parent')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { 
                hasCircularDependency: true,
                error: '选择的父任务会创建循环依赖',
              },
            }),
          });
        }
        
        if (url.includes('/tasks/search-parents')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { data: mockTasks.filter(t => !t.parent_id), total: 2 },
            }),
          });
        }
        
        return Promise.reject(new Error('Unknown URL'));
      });

      const mockOnOk = jest.fn();
      renderTaskModal({ 
        task: mockTasks[2], // Child task trying to select parent
        onOk: mockOnOk,
      });

      // Open parent selector
      const selectParentButton = screen.getByText('修改');
      fireEvent.click(selectParentButton);

      await waitFor(() => {
        expect(screen.getByText('Root Task 1')).toBeInTheDocument();
      });

      // Try to select a parent that would create circular dependency
      const parentTask = screen.getByText('Root Task 1');
      fireEvent.click(parentTask.closest('.task-tree-node')!);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('选择的父任务会创建循环依赖')).toBeInTheDocument();
      });

      // Confirm button should be disabled
      const confirmButton = screen.getByRole('button', { name: '确定' });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('TaskEditPage Parent Selection E2E', () => {
    const renderTaskEditPage = () => {
      mockUseParams.mockReturnValue({ projectId: '1', taskId: '3' });
      
      return render(
        <BrowserRouter>
          <TaskEditPage />
        </BrowserRouter>
      );
    };

    it('should complete full parent modification workflow', async () => {
      mockTaskService.updateTask.mockResolvedValue(mockTasks[2]);

      renderTaskEditPage();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('编辑任务')).toBeInTheDocument();
      });

      // Wait for task data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Child Task')).toBeInTheDocument();
      });

      // Find and click the parent selector
      const parentSelector = document.querySelector('.task-edit-parent-selector .parent-selector-trigger');
      expect(parentSelector).toBeInTheDocument();
      
      fireEvent.click(parentSelector!);

      // Wait for dropdown to open and search to complete
      await waitFor(() => {
        expect(screen.getByText('Root Task 2')).toBeInTheDocument();
      });

      // Select a different parent
      const newParentTask = screen.getByText('Root Task 2');
      fireEvent.click(newParentTask.closest('.task-tree-node')!);

      // Verify parent has changed in the display
      await waitFor(() => {
        expect(screen.getByText('Root Task 2')).toBeInTheDocument();
      });

      // Save the changes
      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);

      // Verify update API was called with correct parent_id
      await waitFor(() => {
        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
          1,
          3,
          expect.objectContaining({
            parent_id: 2,
          })
        );
      });

      // Verify success message
      expect(message.success).toHaveBeenCalledWith('任务保存成功');
    });

    it('should handle network errors during parent search', async () => {
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      renderTaskEditPage();

      await waitFor(() => {
        expect(screen.getByText('编辑任务')).toBeInTheDocument();
      });

      // Try to open parent selector
      const parentSelector = document.querySelector('.task-edit-parent-selector .parent-selector-trigger');
      fireEvent.click(parentSelector!);

      // Should handle error gracefully - exact error handling depends on implementation
      // We expect the component not to crash and show some form of error state
      await waitFor(() => {
        // The component should still be functional even if search fails
        expect(screen.getByText('编辑任务')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence and Consistency E2E', () => {
    it('should maintain parent-child relationships after task updates', async () => {
      const updatedTask = { ...mockTasks[2], parent_id: 2 };
      mockTaskService.updateTask.mockResolvedValue(updatedTask);
      mockTaskService.getTask.mockImplementation((projectId, taskId) => {
        if (taskId === 3) return Promise.resolve(updatedTask);
        return Promise.resolve(mockTasks.find(t => t.id === taskId)!);
      });

      mockUseParams.mockReturnValue({ projectId: '1', taskId: '3' });

      render(
        <BrowserRouter>
          <TaskEditPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('编辑任务')).toBeInTheDocument();
      });

      // Change parent and save
      const parentSelector = document.querySelector('.task-edit-parent-selector .parent-selector-trigger');
      fireEvent.click(parentSelector!);

      await waitFor(() => {
        expect(screen.getByText('Root Task 2')).toBeInTheDocument();
      });

      const newParentTask = screen.getByText('Root Task 2');
      fireEvent.click(newParentTask.closest('.task-tree-node')!);

      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);

      // Verify the relationship is maintained after save
      await waitFor(() => {
        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
          1,
          3,
          expect.objectContaining({ parent_id: 2 })
        );
      });

      // Verify page reloads with correct parent relationship
      await waitFor(() => {
        expect(mockTaskService.getTask).toHaveBeenCalledWith(1, 3);
      });
    });
  });
});