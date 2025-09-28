/**
 * Tests for useTaskHierarchy Hook
 * useTaskHierarchy Hook 的单元测试
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskHierarchy, UseTaskHierarchyOptions } from '../useTaskHierarchy';
import * as taskService from '../../services/taskService';
import { UnifiedTaskNode } from '../../types/UnifiedTaskNode';

// Mock the taskService
jest.mock('../../services/taskService', () => ({
  fetchTaskDescendants: jest.fn(),
  fetchTaskDescendantsV2: jest.fn()
}));

// Mock antd message
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockFetchTaskDescendants = taskService.fetchTaskDescendants as jest.MockedFunction<typeof taskService.fetchTaskDescendants>;
const mockFetchTaskDescendantsV2 = taskService.fetchTaskDescendantsV2 as jest.MockedFunction<typeof taskService.fetchTaskDescendantsV2>;

describe('useTaskHierarchy', () => {
  const mockOptions: UseTaskHierarchyOptions = {
    projectId: 1,
    rootTaskId: 100,
    initialDepth: 2,
    pageSize: 50,
    enableLazyLoad: true,
    enableCache: true,
    apiVersion: 'v2'
  };

  const mockTaskNodes: UnifiedTaskNode[] = [
    {
      id: 101,
      parent_id: 100,
      project_id: 1,
      title: 'Task 101',
      status: 'todo',
      level: 1,
      has_children: true,
      sort_order: 1
    },
    {
      id: 102,
      parent_id: 100,
      project_id: 1,
      title: 'Task 102',
      status: 'in_progress',
      level: 1,
      has_children: false,
      sort_order: 2
    }
  ];

  const mockApiResponse = {
    data: {
      data: mockTaskNodes,
      meta: {
        requested_depth: 2,
        max_depth_reached: false,
        truncated: false,
        total_returned: 2,
        hidden_nodes_truncated: false
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTaskDescendantsV2.mockResolvedValue(mockApiResponse);
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      expect(result.current.childrenByParent).toBeInstanceOf(Map);
      expect(result.current.childrenByParent.size).toBe(0);
      expect(result.current.expanded).toBeInstanceOf(Set);
      expect(result.current.expanded.size).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.initialLoading).toBe(false);
      expect(result.current.initialError).toBe(null);
    });

    it('should load initial data when rootTaskId is provided', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      await waitFor(() => {
        expect(mockFetchTaskDescendantsV2).toHaveBeenCalledWith(
          mockOptions.projectId,
          mockOptions.rootTaskId,
          expect.objectContaining({
            depth: 1,
            limit: mockOptions.pageSize,
            includeExtended: false,
            apiVersion: 'v2'
          })
        );
      });

      await waitFor(() => {
        expect(result.current.childrenByParent.get(100)).toEqual(mockTaskNodes);
      });
    });

    it('should not initialize when rootTaskId is not provided', () => {
      const optionsWithoutRoot = { ...mockOptions, rootTaskId: undefined };
      const { result } = renderHook(() => useTaskHierarchy(optionsWithoutRoot));

      expect(result.current.initialLoading).toBe(false);
      expect(mockFetchTaskDescendantsV2).not.toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('should load children for a specific parent', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      await act(async () => {
        await result.current.loadChildren(101);
      });

      expect(mockFetchTaskDescendantsV2).toHaveBeenCalledWith(
        mockOptions.projectId,
        101,
        expect.objectContaining({
          depth: 1,
          limit: mockOptions.pageSize
        })
      );
    });

    it('should handle loading errors gracefully', async () => {
      const error = new Error('API Error');
      mockFetchTaskDescendantsV2.mockRejectedValueOnce(error);

      const onError = jest.fn();
      const { result } = renderHook(() => 
        useTaskHierarchy({ ...mockOptions, onError })
      );

      await act(async () => {
        await result.current.loadChildren(101);
      });

      expect(result.current.getNodeError(101)).toBe('API Error');
      expect(onError).toHaveBeenCalledWith(error, 'loadChildren(101)');
    });

    it('should use cache when enabled', async () => {
      const { result } = renderHook(() => 
        useTaskHierarchy({ ...mockOptions, enableCache: true })
      );

      // First call should fetch from API
      await act(async () => {
        await result.current.loadChildren(101);
      });

      expect(mockFetchTaskDescendantsV2).toHaveBeenCalledTimes(2); // Once for root, once for 101

      // Second call should use cache
      await act(async () => {
        await result.current.loadChildren(101);
      });

      expect(mockFetchTaskDescendantsV2).toHaveBeenCalledTimes(2); // Should not increase
    });
  });

  describe('Node Operations', () => {
    it('should toggle node expansion', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      expect(result.current.isExpanded(101)).toBe(false);

      act(() => {
        result.current.toggleExpanded(101);
      });

      expect(result.current.isExpanded(101)).toBe(true);

      act(() => {
        result.current.toggleExpanded(101);
      });

      expect(result.current.isExpanded(101)).toBe(false);
    });

    it('should expand node and load children when lazy loading is enabled', async () => {
      const { result } = renderHook(() => 
        useTaskHierarchy({ ...mockOptions, enableLazyLoad: true })
      );

      await act(async () => {
        result.current.expandNode(101);
      });

      expect(result.current.isExpanded(101)).toBe(true);
      await waitFor(() => {
        expect(mockFetchTaskDescendantsV2).toHaveBeenCalledWith(
          mockOptions.projectId,
          101,
          expect.any(Object)
        );
      });
    });

    it('should collapse node', () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      act(() => {
        result.current.expandNode(101);
      });
      expect(result.current.isExpanded(101)).toBe(true);

      act(() => {
        result.current.collapseNode(101);
      });
      expect(result.current.isExpanded(101)).toBe(false);
    });
  });

  describe('Query Methods', () => {
    it('should get children for a parent', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      await waitFor(() => {
        expect(result.current.getChildren(100)).toEqual(mockTaskNodes);
      });
    });

    it('should check if node has children', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      await waitFor(() => {
        expect(result.current.hasChildren(100)).toBe(true);
        expect(result.current.hasChildren(999)).toBe(false);
      });
    });

    it('should check loading state', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      act(() => {
        result.current.loadChildren(101);
      });

      expect(result.current.isNodeLoading(101)).toBe(true);

      await waitFor(() => {
        expect(result.current.isNodeLoading(101)).toBe(false);
      });
    });
  });

  describe('Batch Operations', () => {
    it('should expand all nodes', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.childrenByParent.size).toBe(1);
      });

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.isExpanded(100)).toBe(true);
    });

    it('should collapse all nodes', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      // First expand some nodes
      act(() => {
        result.current.expandNode(100);
        result.current.expandNode(101);
      });

      expect(result.current.isExpanded(100)).toBe(true);
      expect(result.current.isExpanded(101)).toBe(true);

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.isExpanded(100)).toBe(false);
      expect(result.current.isExpanded(101)).toBe(false);
    });

    it('should load multiple children in parallel', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      await act(async () => {
        await result.current.loadMultipleChildren([101, 102]);
      });

      expect(mockFetchTaskDescendantsV2).toHaveBeenCalledTimes(3); // root + 101 + 102
    });
  });

  describe('Refresh and Reset', () => {
    it('should refresh data', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.childrenByParent.size).toBe(1);
      });

      const initialCallCount = mockFetchTaskDescendantsV2.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetchTaskDescendantsV2).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('should clear all data', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.childrenByParent.size).toBe(1);
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.childrenByParent.size).toBe(0);
      expect(result.current.expanded.size).toBe(0);
      expect(result.current.initialError).toBe(null);
    });

    it('should reset to initial state', async () => {
      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.childrenByParent.size).toBe(1);
      });

      // Expand some nodes
      act(() => {
        result.current.expandNode(101);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.childrenByParent.size).toBe(0);
      expect(result.current.expanded.size).toBe(0);
    });
  });

  describe('API Version Support', () => {
    it('should use v1 API when specified', async () => {
      const v1Options = { ...mockOptions, apiVersion: 'v1' as const };
      mockFetchTaskDescendants.mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useTaskHierarchy(v1Options));

      await act(async () => {
        await result.current.loadChildren(101);
      });

      expect(mockFetchTaskDescendants).toHaveBeenCalledWith(
        v1Options.projectId,
        101,
        expect.objectContaining({
          depth: 1,
          limit: v1Options.pageSize,
          includeExtended: false,
          apiVersion: 'v1'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle initial load errors', async () => {
      const error = new Error('Initial load failed');
      mockFetchTaskDescendantsV2.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTaskHierarchy(mockOptions));

      await waitFor(() => {
        expect(result.current.initialError).toBe('Initial load failed');
        expect(result.current.initialLoading).toBe(false);
      });
    });

    it('should call onError callback when provided', async () => {
      const error = new Error('Test error');
      const onError = jest.fn();
      mockFetchTaskDescendantsV2.mockRejectedValueOnce(error);

      const { result } = renderHook(() => 
        useTaskHierarchy({ ...mockOptions, onError })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error, 'initializeData');
      });
    });
  });

  describe('Custom Sort Function', () => {
    it('should use custom sort function when provided', async () => {
      const customSortFn = (a: UnifiedTaskNode, b: UnifiedTaskNode) => 
        b.id - a.id; // Reverse sort by ID

      const { result } = renderHook(() => 
        useTaskHierarchy({ ...mockOptions, sortFn: customSortFn })
      );

      await waitFor(() => {
        const children = result.current.getChildren(100);
        expect(children).toEqual([mockTaskNodes[1], mockTaskNodes[0]]); // Reversed order
      });
    });
  });
});