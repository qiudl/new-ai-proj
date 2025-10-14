/**
 * CommentItem 组件单元测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommentItem from '../CommentItem';
import { TaskComment } from '../../../types/taskComment';
import * as taskCommentService from '../../../services/taskCommentService';

// Mock the service
jest.mock('../../../services/taskCommentService');

// Mock antd Modal.confirm
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    Modal: {
      ...actual.Modal,
      confirm: jest.fn((config) => {
        // Simulate user confirming
        if (config.onOk) {
          config.onOk();
        }
      }),
    },
  };
});

describe('CommentItem Component', () => {
  const mockOnDeleted = jest.fn();

  const mockComment: TaskComment = {
    id: 1,
    task_id: 1,
    user_id: 1,
    content: 'This is a test comment',
    status: 'active',
    created_at: '2025-10-10T10:00:00Z',
    updated_at: '2025-10-10T10:00:00Z',
    user: {
      id: 1,
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
    },
    can_delete: true,
  };

  const defaultProps = {
    comment: mockComment,
    taskId: 1,
    onDeleted: mockOnDeleted,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders comment content', () => {
    render(<CommentItem {...defaultProps} />);

    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  test('renders user name', () => {
    render(<CommentItem {...defaultProps} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('renders user avatar', () => {
    const { container } = render(<CommentItem {...defaultProps} />);

    // Check avatar is rendered by looking for the ant-avatar component
    const avatar = container.querySelector('.ant-avatar');
    expect(avatar).toBeInTheDocument();
  });

  test('renders default avatar when user has no avatar', () => {
    const commentWithoutAvatar = {
      ...mockComment,
      user: {
        ...mockComment.user!,
        avatar: undefined,
      },
    };

    const { container } = render(<CommentItem {...defaultProps} comment={commentWithoutAvatar} />);

    // Should render UserOutlined icon instead
    const avatar = container.querySelector('.ant-avatar');
    expect(avatar).toBeInTheDocument();
  });

  test('displays relative time', () => {
    render(<CommentItem {...defaultProps} />);

    // dayjs will format this as relative time (e.g., "a few seconds ago", "2 hours ago")
    // We just check that some time text is rendered
    const timeElement = screen.getByText(/ago|前|刚刚|小时|分钟|天/i);
    expect(timeElement).toBeInTheDocument();
  });

  test('shows delete button when can_delete is true', () => {
    render(<CommentItem {...defaultProps} />);

    expect(screen.getByLabelText('delete')).toBeInTheDocument();
  });

  test('hides delete button when can_delete is false', () => {
    const commentNoDelete = {
      ...mockComment,
      can_delete: false,
    };

    render(<CommentItem {...defaultProps} comment={commentNoDelete} />);

    expect(screen.queryByLabelText('delete')).not.toBeInTheDocument();
  });

  test('deletes comment successfully when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockDeleteComment = jest.spyOn(taskCommentService, 'deleteComment')
      .mockResolvedValue();

    render(<CommentItem {...defaultProps} />);

    const deleteButton = screen.getByLabelText('delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalledWith(1, 1);
      expect(mockOnDeleted).toHaveBeenCalled();
    });
  });

  test('handles delete error gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockDeleteComment = jest.spyOn(taskCommentService, 'deleteComment')
      .mockRejectedValue(new Error('Failed to delete comment'));

    render(<CommentItem {...defaultProps} />);

    const deleteButton = screen.getByLabelText('delete');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteComment).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to delete comment:',
        expect.any(Error)
      );
    });

    // onDeleted should not be called on error
    expect(mockOnDeleted).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('renders comment without user info gracefully', () => {
    const commentWithoutUser = {
      ...mockComment,
      user: undefined,
    };

    const { container } = render(<CommentItem {...defaultProps} comment={commentWithoutUser} />);

    // Should still render the comment content
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();

    // Should render a default avatar
    const avatar = container.querySelector('.ant-avatar');
    expect(avatar).toBeInTheDocument();
  });

  test('formats multiline content correctly', () => {
    const multilineComment = {
      ...mockComment,
      content: 'Line 1\nLine 2\nLine 3',
    };

    const { container } = render(<CommentItem {...defaultProps} comment={multilineComment} />);

    // Check that the content is rendered (it's split across elements)
    expect(container).toHaveTextContent('Line 1');
    expect(container).toHaveTextContent('Line 2');
    expect(container).toHaveTextContent('Line 3');
  });

  test('applies custom className', () => {
    const { container } = render(
      <CommentItem {...defaultProps} className="custom-class" />
    );

    const commentItem = container.querySelector('.custom-class');
    expect(commentItem).toBeInTheDocument();
  });

  test('applies custom style', () => {
    const customStyle = { marginBottom: '10px' };
    const { container } = render(
      <CommentItem {...defaultProps} style={customStyle} />
    );

    const commentItem = container.firstChild as HTMLElement;
    expect(commentItem).toHaveStyle('margin-bottom: 10px');
  });

  test('displays different status for deleted comments', () => {
    const deletedComment = {
      ...mockComment,
      status: 'deleted' as const,
      deleted_at: '2025-10-10T11:00:00Z',
    };

    render(<CommentItem {...defaultProps} comment={deletedComment} />);

    // The component might render differently for deleted comments
    // This test ensures it doesn't crash with deleted status
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  test('renders comment with very long content', () => {
    const longContent = 'a'.repeat(2000);
    const longComment = {
      ...mockComment,
      content: longContent,
    };

    render(<CommentItem {...defaultProps} comment={longComment} />);

    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  test('renders comment with special characters', () => {
    const specialComment = {
      ...mockComment,
      content: 'Special chars: <>&"\'`@#$%^&*()',
    };

    render(<CommentItem {...defaultProps} comment={specialComment} />);

    expect(screen.getByText('Special chars: <>&"\'`@#$%^&*()')).toBeInTheDocument();
  });
});
