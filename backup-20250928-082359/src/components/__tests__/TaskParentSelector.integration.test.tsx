import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TaskParentSelector } from '../TaskParentSelector';
import { Task } from '../../types/task';
import * as useTaskParentSearchHook from '../../hooks/useTaskParentSearch';
import * as useParentValidationHook from '../../hooks/useParentValidation';

// Mock the hooks
jest.mock('../../hooks/useTaskParentSearch');
jest.mock('../../hooks/useParentValidation');
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: unknown) => fn,
}));

const mockUseTaskParentSearch = useTaskParentSearchHook as jest.Mocked<typeof useTaskParentSearchHook>;
const mockUseParentValidation = useParentValidationHook as jest.Mocked<typeof useParentValidationHook>;

const mockSearchResults = {
  tasks: [
    {
      id: 1,
      title: 'Parent Task 1',
      task_level: 0,
      project_id: 1,
      status: 'in_progress',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    } as Task,
    {
      id: 2,
      title: 'Parent Task 2',
      task_level: 1,
      project_id: 1,
      status: 'todo',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    } as Task,
  ],
  loading: false,
  error: null,
  hasMore: false,
  total: 2,
};

const mockSearchParentTasks = jest.fn();
const mockClearResults = jest.fn();
const mockLoadMore = jest.fn();
const mockValidateParentSelection = jest.fn();
const mockValidateTaskLevel = jest.fn();

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();

  mockUseTaskParentSearch.useTaskParentSearch.mockReturnValue({
    searchResults: mockSearchResults,
    searchParentTasks: mockSearchParentTasks,
    clearResults: mockClearResults,
    loadMore: mockLoadMore,
  });

  mockUseParentValidation.useParentValidation.mockReturnValue({
    validateParentSelection: mockValidateParentSelection,
    validateTaskLevel: mockValidateTaskLevel,
  });

  // Default validation to pass
  mockValidateParentSelection.mockResolvedValue({ isValid: true });
  mockValidateTaskLevel.mockReturnValue({ isValid: true });
});

describe('TaskParentSelector Integration Tests', () => {
  const defaultProps = {
    projectId: 1,
    currentTaskId: 3,
    currentParentId: null,
    onChange: jest.fn(),
  };

  it('should render selector with placeholder when no parent selected', () => {
    render(<TaskParentSelector {...defaultProps} />);
    
    expect(screen.getByText('搜索并选择父任务...')).toBeInTheDocument();
  });

  it('should open dropdown and trigger search when clicked', async () => {
    render(<TaskParentSelector {...defaultProps} />);
    
    const trigger = screen.getByText('搜索并选择父任务...');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(mockSearchParentTasks).toHaveBeenCalledWith({
        projectId: 1,
        keyword: '',
        excludeTaskId: 3,
        maxLevel: 2,
        limit: 20,
        offset: 0,
      });
    });
  });

  it('should validate parent selection and call onChange on valid selection', async () => {
    render(<TaskParentSelector {...defaultProps} />);
    
    const trigger = screen.getByText('搜索并选择父任务...');
    fireEvent.click(trigger);

    // Wait for dropdown to open and tasks to be available
    await waitFor(() => {
      expect(screen.getByText('Parent Task 1')).toBeInTheDocument();
    });

    // Click on a task
    const taskNode = screen.getByText('Parent Task 1');
    fireEvent.click(taskNode.closest('.task-tree-node')!);

    await waitFor(() => {
      expect(mockValidateParentSelection).toHaveBeenCalledWith(3, 1);
      expect(mockValidateTaskLevel).toHaveBeenCalledWith(0);
      expect(defaultProps.onChange).toHaveBeenCalledWith(1, mockSearchResults.tasks[0]);
    });
  });

  it('should show validation error when parent selection is invalid', async () => {
    mockValidateParentSelection.mockResolvedValue({
      isValid: false,
      error: '选择的父任务会创建循环依赖',
      errorCode: 'CIRCULAR_DEPENDENCY',
    });

    render(<TaskParentSelector {...defaultProps} />);
    
    const trigger = screen.getByText('搜索并选择父任务...');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Parent Task 1')).toBeInTheDocument();
    });

    // Click on a task
    const taskNode = screen.getByText('Parent Task 1');
    fireEvent.click(taskNode.closest('.task-tree-node')!);

    await waitFor(() => {
      expect(screen.getByText('选择的父任务会创建循环依赖')).toBeInTheDocument();
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  it('should show validation error when task level is invalid', async () => {
    mockValidateTaskLevel.mockReturnValue({
      isValid: false,
      error: '无法在第4级任务下创建子任务（系统支持最多4级）',
      errorCode: 'MAX_LEVEL_EXCEEDED',
    });

    render(<TaskParentSelector {...defaultProps} />);
    
    const trigger = screen.getByText('搜索并选择父任务...');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Parent Task 1')).toBeInTheDocument();
    });

    // Click on a task
    const taskNode = screen.getByText('Parent Task 1');
    fireEvent.click(taskNode.closest('.task-tree-node')!);

    await waitFor(() => {
      expect(screen.getByText('无法在第4级任务下创建子任务（系统支持最多4级）')).toBeInTheDocument();
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  it('should perform search when typing in search input', async () => {
    render(<TaskParentSelector {...defaultProps} />);
    
    // Open dropdown
    const trigger = screen.getByText('搜索并选择父任务...');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索父任务...')).toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText('搜索父任务...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    await waitFor(() => {
      expect(mockSearchParentTasks).toHaveBeenCalledWith({
        projectId: 1,
        keyword: 'test search',
        excludeTaskId: 3,
        maxLevel: 2,
        limit: 20,
        offset: 0,
      });
    });
  });

  it('should clear selection when clear button is clicked', () => {
    const props = {
      ...defaultProps,
      value: 1,
    };

    // Mock selected task
    mockUseTaskParentSearch.useTaskParentSearch.mockReturnValue({
      searchResults: {
        ...mockSearchResults,
        tasks: mockSearchResults.tasks,
      },
      searchParentTasks: mockSearchParentTasks,
      clearResults: mockClearResults,
      loadMore: mockLoadMore,
    });

    render(<TaskParentSelector {...props} />);

    // Should show selected task
    expect(screen.getByText('Parent Task 1')).toBeInTheDocument();

    // Click clear button
    const clearButton = screen.getByTitle('清除选择');
    fireEvent.click(clearButton);

    expect(props.onChange).toHaveBeenCalledWith(null, null);
  });

  it('should handle errors gracefully during validation', async () => {
    mockValidateParentSelection.mockRejectedValue(new Error('Network error'));

    render(<TaskParentSelector {...defaultProps} />);
    
    const trigger = screen.getByText('搜索并选择父任务...');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Parent Task 1')).toBeInTheDocument();
    });

    // Click on a task
    const taskNode = screen.getByText('Parent Task 1');
    fireEvent.click(taskNode.closest('.task-tree-node')!);

    await waitFor(() => {
      expect(screen.getByText('选择父任务时发生错误，请重试')).toBeInTheDocument();
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  it('should be disabled when disabled prop is true', () => {
    render(<TaskParentSelector {...defaultProps} disabled={true} />);
    
    const triggerElement = document.querySelector('.parent-selector-trigger');
    expect(triggerElement).toHaveClass('disabled');
  });
});