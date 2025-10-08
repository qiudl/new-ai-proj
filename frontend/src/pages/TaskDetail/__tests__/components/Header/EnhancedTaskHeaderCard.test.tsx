/**
 * EnhancedTaskHeaderCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedTaskHeaderCard } from '../../../components/Header/EnhancedTaskHeaderCard';
import type { Task } from '../../../types/task.types';

// Mock DailyFocusTaskToggle
jest.mock('../../../../../components/DailyFocusTaskToggle', () => {
  return function MockDailyFocusTaskToggle({ taskId, onToggleComplete }: any) {
    return (
      <button
        data-testid="daily-focus-toggle"
        onClick={() => onToggleComplete(true)}
      >
        Daily Focus Toggle {taskId}
      </button>
    );
  };
});

describe('EnhancedTaskHeaderCard', () => {
  const mockTask: Task = {
    id: 123,
    project_id: 1,
    title: 'Test Task',
    description: 'Test description',
    status: 'in_progress',
    priority: 'medium',
    assignee_id: 456,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const defaultProps = {
    task: mockTask,
    projectId: 1,
    statusConfig: {
      text: 'In Progress',
      color: '#1890ff',
      bgColor: '#e6f7ff',
      icon: <span>Icon</span>,
    },
    priorityConfig: {
      text: 'Medium',
      color: 'orange',
    },
  };

  describe('Rendering', () => {
    it('should render task title', () => {
      render(<EnhancedTaskHeaderCard {...defaultProps} />);
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should render task ID and status', () => {
      render(<EnhancedTaskHeaderCard {...defaultProps} />);
      expect(screen.getByText(/ID: #123/)).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should render priority', () => {
      render(<EnhancedTaskHeaderCard {...defaultProps} />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should apply status background color', () => {
      const { container } = render(<EnhancedTaskHeaderCard {...defaultProps} />);
      const card = container.querySelector('.task-status-card');
      expect(card).toHaveStyle({ background: '#e6f7ff' });
    });
  });

  describe('Archive Status', () => {
    it('should show archive alert for archived tasks', () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      render(<EnhancedTaskHeaderCard {...defaultProps} task={archivedTask} />);
      expect(screen.getByText('任务已归档')).toBeInTheDocument();
    });

    it('should show restore button for archived tasks', () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      render(<EnhancedTaskHeaderCard {...defaultProps} task={archivedTask} />);
      expect(screen.getByText('恢复任务')).toBeInTheDocument();
    });

    it('should call onUnarchive when restore button clicked', () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      const onUnarchive = jest.fn();
      render(
        <EnhancedTaskHeaderCard {...defaultProps} task={archivedTask} onUnarchive={onUnarchive} />
      );
      fireEvent.click(screen.getByText('恢复任务'));
      expect(onUnarchive).toHaveBeenCalled();
    });
  });

  describe('Non-Archived Tasks', () => {
    it('should show edit and delete buttons for non-archived tasks', () => {
      render(<EnhancedTaskHeaderCard {...defaultProps} />);
      expect(screen.getByText('编辑任务')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('should call onEdit when edit button clicked', () => {
      const onEdit = jest.fn();
      render(<EnhancedTaskHeaderCard {...defaultProps} onEdit={onEdit} />);
      fireEvent.click(screen.getByText('编辑任务'));
      expect(onEdit).toHaveBeenCalled();
    });

    it('should call onDelete when delete button clicked', () => {
      const onDelete = jest.fn();
      render(<EnhancedTaskHeaderCard {...defaultProps} onDelete={onDelete} />);
      fireEvent.click(screen.getByText('删除'));
      expect(onDelete).toHaveBeenCalled();
    });

    it('should show Daily Focus toggle for non-archived tasks', () => {
      render(<EnhancedTaskHeaderCard {...defaultProps} />);
      expect(screen.getByTestId('daily-focus-toggle')).toBeInTheDocument();
    });

    it('should not show Daily Focus toggle for archived tasks', () => {
      const archivedTask = { ...mockTask, status: 'archived' as const };
      render(<EnhancedTaskHeaderCard {...defaultProps} task={archivedTask} />);
      expect(screen.queryByTestId('daily-focus-toggle')).not.toBeInTheDocument();
    });
  });

  describe('Time Remaining', () => {
    it('should show time remaining when provided', () => {
      const timeRemaining = {
        text: '3 days left',
        type: 'warning' as const,
      };
      render(<EnhancedTaskHeaderCard {...defaultProps} timeRemaining={timeRemaining} />);
      expect(screen.getByText('3 days left')).toBeInTheDocument();
    });

    it('should apply danger color for overdue tasks', () => {
      const timeRemaining = {
        text: 'Overdue by 2 days',
        type: 'danger' as const,
      };
      render(<EnhancedTaskHeaderCard {...defaultProps} timeRemaining={timeRemaining} />);
      const text = screen.getByText('Overdue by 2 days');
      expect(text).toHaveStyle({ color: '#ff4d4f' });
    });
  });

  describe('Assignee', () => {
    it('should show assignee when assignee_id is present', () => {
      const taskWithAssignee = { ...mockTask, assignee_id: 456 } as any;
      taskWithAssignee.assignee_name = 'John Doe';
      render(<EnhancedTaskHeaderCard {...defaultProps} task={taskWithAssignee} />);
      expect(screen.getByText(/负责人: John Doe/)).toBeInTheDocument();
    });

    it('should show user ID when assignee_name is not present', () => {
      render(<EnhancedTaskHeaderCard {...defaultProps} />);
      expect(screen.getByText(/负责人: 用户 456/)).toBeInTheDocument();
    });
  });
});
