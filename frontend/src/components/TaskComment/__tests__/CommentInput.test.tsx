/**
 * CommentInput 组件单元测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CommentInput from '../CommentInput';
import * as taskCommentService from '../../../services/taskCommentService';

// Mock the service
jest.mock('../../../services/taskCommentService');

describe('CommentInput Component', () => {
  const mockOnCommentAdded = jest.fn();
  const defaultProps = {
    taskId: 1,
    onCommentAdded: mockOnCommentAdded,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders comment input with placeholder', () => {
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    expect(textarea).toBeInTheDocument();
  });

  test('displays submit and clear buttons', () => {
    render(<CommentInput {...defaultProps} />);

    expect(screen.getByText(/评论/)).toBeInTheDocument();
    expect(screen.getByText('清空')).toBeInTheDocument();
  });

  test('shows character count', () => {
    render(<CommentInput {...defaultProps} />);

    expect(screen.getByText('0 / 2000')).toBeInTheDocument();
  });

  test('updates character count when typing', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    await user.type(textarea, 'Hello');

    expect(screen.getByText('5 / 2000')).toBeInTheDocument();
  });

  test('disables submit button when content is empty', () => {
    render(<CommentInput {...defaultProps} />);

    const submitButton = screen.getByText(/评论/);
    expect(submitButton).toBeDisabled();
  });

  test('enables submit button when content is not empty', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    await user.type(textarea, 'Test comment');

    const submitButton = screen.getByText(/评论/);
    expect(submitButton).not.toBeDisabled();
  });

  test('disables submit button when content is only whitespace', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    await user.type(textarea, '   ');

    const submitButton = screen.getByText(/评论/);
    expect(submitButton).toBeDisabled();
  });

  test('shows error when content exceeds max length', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    const longText = 'a'.repeat(2001);
    await user.type(textarea, longText);

    // Character count should show exceeded
    expect(screen.getByText(/2001 \/ 2000/)).toBeInTheDocument();
  });

  test('clears content when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...') as HTMLTextAreaElement;
    await user.type(textarea, 'Test comment');

    expect(textarea.value).toBe('Test comment');

    const clearButton = screen.getByText('清空');
    await user.click(clearButton);

    expect(textarea.value).toBe('');
    expect(screen.getByText('0 / 2000')).toBeInTheDocument();
  });

  test('submits comment successfully', async () => {
    const user = userEvent.setup();
    const mockCreateComment = jest.spyOn(taskCommentService, 'createComment')
      .mockResolvedValue({
        id: 1,
        task_id: 1,
        user_id: 1,
        content: 'Test comment',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        can_delete: true,
      });

    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    await user.type(textarea, 'Test comment');

    const submitButton = screen.getByText(/评论/);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(1, 'Test comment');
      expect(mockOnCommentAdded).toHaveBeenCalled();
    });

    // Content should be cleared after successful submission
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  test('handles submission error gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockCreateComment = jest.spyOn(taskCommentService, 'createComment')
      .mockRejectedValue(new Error('Failed to create comment'));

    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    await user.type(textarea, 'Test comment');

    const submitButton = screen.getByText(/评论/);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create comment:',
        expect.any(Error)
      );
    });

    // onCommentAdded should not be called on error
    expect(mockOnCommentAdded).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('supports Ctrl+Enter keyboard shortcut for submission', async () => {
    const user = userEvent.setup();
    const mockCreateComment = jest.spyOn(taskCommentService, 'createComment')
      .mockResolvedValue({
        id: 1,
        task_id: 1,
        user_id: 1,
        content: 'Test comment',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        can_delete: true,
      });

    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');

    // Type content first
    fireEvent.change(textarea, { target: { value: 'Test comment' } });

    // Simulate Ctrl+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true, preventDefault: jest.fn() });

    await waitFor(() => {
      expect(mockCreateComment).toHaveBeenCalledWith(1, 'Test comment');
      expect(mockOnCommentAdded).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const mockCreateComment = jest.spyOn(taskCommentService, 'createComment')
      .mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve;
      }));

    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('添加评论...');
    await user.type(textarea, 'Test comment');

    const submitButton = screen.getByRole('button', { name: /评论/i });
    await user.click(submitButton);

    // Check button has loading state (aria-busy or has loading class)
    await waitFor(() => {
      expect(submitButton.className).toContain('ant-btn-loading');
    });

    // Resolve the promise
    resolvePromise!({
      id: 1,
      task_id: 1,
      user_id: 1,
      content: 'Test comment',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      can_delete: true,
    });

    await waitFor(() => {
      expect(mockOnCommentAdded).toHaveBeenCalled();
    });
  });

  test('applies custom className', () => {
    const { container } = render(
      <CommentInput {...defaultProps} className="custom-class" />
    );

    const commentInput = container.querySelector('.custom-class');
    expect(commentInput).toBeInTheDocument();
  });

  test('applies custom style', () => {
    const customStyle = { marginTop: '20px' };
    const { container } = render(
      <CommentInput {...defaultProps} style={customStyle} />
    );

    const commentInput = container.firstChild as HTMLElement;
    expect(commentInput).toHaveStyle('margin-top: 20px');
  });
});
