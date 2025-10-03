/**
 * TaskBreadcrumb Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TaskBreadcrumb } from '../../../components/Header/TaskBreadcrumb';
import type { Task } from '../../../types/task.types';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('TaskBreadcrumb', () => {
  const mockTask: Task = {
    id: 123,
    project_id: 1,
    title: 'Test Task',
    description: 'Test description',
    status: 'in_progress',
    priority: 'medium',
    parent_id: 100,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockParentTask: Task = {
    id: 100,
    project_id: 1,
    title: 'Parent Task',
    description: 'Parent description',
    status: 'in_progress',
    priority: 'high',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Rendering', () => {
    it('should render breadcrumb with project and current task', () => {
      renderWithRouter(
        <TaskBreadcrumb task={mockTask} projectId={1} />
      );

      expect(screen.getByText('项目任务')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should render breadcrumb with parent task when provided', () => {
      renderWithRouter(
        <TaskBreadcrumb
          task={mockTask}
          parentTask={mockParentTask}
          projectId={1}
        />
      );

      expect(screen.getByText('项目任务')).toBeInTheDocument();
      expect(screen.getByText('Parent Task')).toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should not render parent task when task has no parent_id', () => {
      const taskWithoutParent = { ...mockTask, parent_id: undefined };
      renderWithRouter(
        <TaskBreadcrumb
          task={taskWithoutParent}
          parentTask={mockParentTask}
          projectId={1}
        />
      );

      expect(screen.getByText('项目任务')).toBeInTheDocument();
      expect(screen.queryByText('Parent Task')).not.toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should not render parent task when parentTask is null', () => {
      renderWithRouter(
        <TaskBreadcrumb
          task={mockTask}
          parentTask={null}
          projectId={1}
        />
      );

      expect(screen.getByText('项目任务')).toBeInTheDocument();
      expect(screen.queryByText('Parent Task')).not.toBeInTheDocument();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to project page when clicking project breadcrumb', () => {
      renderWithRouter(
        <TaskBreadcrumb task={mockTask} projectId={1} />
      );

      const projectLink = screen.getByText('项目任务');
      fireEvent.click(projectLink);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });

    it('should navigate to parent task when clicking parent breadcrumb', () => {
      renderWithRouter(
        <TaskBreadcrumb
          task={mockTask}
          parentTask={mockParentTask}
          projectId={1}
        />
      );

      const parentLink = screen.getByText('Parent Task');
      fireEvent.click(parentLink);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/1/tasks/100');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <TaskBreadcrumb
          task={mockTask}
          projectId={1}
          className="custom-class"
        />
      );

      const breadcrumb = container.querySelector('.custom-class');
      expect(breadcrumb).toBeInTheDocument();
    });

    it('should apply testId', () => {
      renderWithRouter(
        <TaskBreadcrumb
          task={mockTask}
          projectId={1}
          testId="custom-test-id"
        />
      );

      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have clickable project link', () => {
      renderWithRouter(
        <TaskBreadcrumb task={mockTask} projectId={1} />
      );

      const projectLink = screen.getByText('项目任务');
      expect(projectLink).toHaveStyle({ cursor: 'pointer' });
    });

    it('should have clickable parent link when parent exists', () => {
      renderWithRouter(
        <TaskBreadcrumb
          task={mockTask}
          parentTask={mockParentTask}
          projectId={1}
        />
      );

      const parentLink = screen.getByText('Parent Task');
      expect(parentLink).toHaveStyle({ cursor: 'pointer' });
    });

    it('should display current task as non-clickable text', () => {
      renderWithRouter(
        <TaskBreadcrumb task={mockTask} projectId={1} />
      );

      const currentTaskText = screen.getByText('Test Task');
      expect(currentTaskText).toHaveStyle({ color: '#8c8c8c' });
    });
  });
});
