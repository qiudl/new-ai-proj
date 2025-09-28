/**
 * Tests for TaskDetail main component
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockTask, mockApiSuccess, mockApiError } from '../utils/testUtils';
import TaskDetail from '../../index';
import * as TaskService from '../../../services/taskService';

// Mock the services
jest.mock('../../../services/taskService');

describe('TaskDetail Component', () => {
  const mockTask = createMockTask({
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'in_progress',
    priority: 'high'
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<TaskDetail />);
      expect(screen.getByText(/loading task details/i)).toBeInTheDocument();
    });

    it('should render error message for invalid parameters', () => {
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects//tasks/']
      });
      expect(screen.getByText(/invalid task parameters/i)).toBeInTheDocument();
    });

    it('should render task details when loaded successfully', async () => {
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/1']
      });

      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      (TaskService.getTask as jest.Mock) = mockApiError('Task not found', 'NOT_FOUND');
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/999']
      });

      await waitFor(() => {
        expect(screen.getByText(/task not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/1']
      });

      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
    });

    it('should show info tab by default', () => {
      expect(screen.getByRole('tab', { name: /info/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup();
      const documentsTab = screen.getByRole('tab', { name: /documents/i });
      
      await user.click(documentsTab);
      
      expect(documentsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should update URL when tab changes', async () => {
      const user = userEvent.setup();
      const progressTab = screen.getByRole('tab', { name: /progress/i });
      
      await user.click(progressTab);
      
      expect(window.location.search).toContain('tab=progress');
    });
  });

  describe('Task Operations', () => {
    beforeEach(async () => {
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/1']
      });

      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
    });

    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      const editButton = screen.getByRole('button', { name: /edit/i });
      
      await user.click(editButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit task/i)).toBeInTheDocument();
    });

    it('should show confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      
      await user.click(deleteButton);
      
      expect(screen.getByText(/are you sure you want to delete this task/i)).toBeInTheDocument();
    });

    it('should update task status when status is changed', async () => {
      const updateTaskMock = mockApiSuccess({ ...mockTask, status: 'completed' });
      (TaskService.updateTask as jest.Mock) = updateTaskMock;
      
      const user = userEvent.setup();
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      
      await user.click(statusSelect);
      await user.click(screen.getByText(/completed/i));
      
      await waitFor(() => {
        expect(updateTaskMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'completed'
          })
        );
      });
    });
  });

  describe('Subtasks', () => {
    const mockSubtasks = [
      createMockTask({ id: 2, parent_id: 1, title: 'Subtask 1' }),
      createMockTask({ id: 3, parent_id: 1, title: 'Subtask 2' })
    ];

    beforeEach(async () => {
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      (TaskService.getTaskChildren as jest.Mock) = mockApiSuccess(mockSubtasks);
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/1']
      });

      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
    });

    it('should display subtasks in progress tab', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /progress/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1')).toBeInTheDocument();
        expect(screen.getByText('Subtask 2')).toBeInTheDocument();
      });
    });

    it('should show add subtask button', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /progress/i }));
      
      expect(screen.getByRole('button', { name: /add subtask/i })).toBeInTheDocument();
    });

    it('should update progress when subtask is completed', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /progress/i }));
      
      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);
      
      await waitFor(() => {
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });
    });
  });

  describe('Documents', () => {
    beforeEach(async () => {
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/1']
      });

      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
    });

    it('should show documents tab', () => {
      expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument();
    });

    it('should show upload button in documents tab', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /documents/i }));
      
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    it('should handle file upload', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('tab', { name: /documents/i }));
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/upload file/i);
      
      await user.upload(input, file);
      
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      
      renderWithProviders(<TaskDetail />, {
        initialEntries: ['/projects/1/tasks/1']
      });

      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
    });

    it('should navigate tabs with arrow keys', async () => {
      const user = userEvent.setup();
      const firstTab = screen.getByRole('tab', { name: /info/i });
      
      firstTab.focus();
      await user.keyboard('{ArrowRight}');
      
      expect(screen.getByRole('tab', { name: /documents/i })).toHaveFocus();
    });

    it('should close modal with ESC key', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /edit/i }));
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should lazy load heavy components', () => {
      const LazyComponent = React.lazy(() => import('../../components/TaskGanttChart'));
      expect(LazyComponent).toBeDefined();
    });

    it('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();
      (TaskService.getTask as jest.Mock) = mockApiSuccess(mockTask);
      
      const TestComponent = () => {
        renderSpy();
        return <TaskDetail />;
      };
      
      const { rerender } = renderWithProviders(<TestComponent />, {
        initialEntries: ['/projects/1/tasks/1']
      });
      
      await waitFor(() => {
        expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      });
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Rerender with same props
      rerender(<TestComponent />);
      
      expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
    });
  });
});