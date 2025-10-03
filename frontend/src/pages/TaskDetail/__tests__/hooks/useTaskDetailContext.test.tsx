/**
 * useTaskDetailContext - Hooks测试
 *
 * 测试覆盖:
 * - useTaskDetailContext hook
 * - useTask hook
 * - useTaskActions hook
 * - useTaskRelations hook
 * - useTaskDocuments hook
 * - useTaskDetailUI hook
 * - 在Provider外使用时抛出错误
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { TaskDetailProvider } from '../../context/TaskDetailProvider';
import {
  useTaskDetailContext,
  useTask,
  useTaskActions,
  useTaskRelations,
  useTaskDocuments,
  useTaskDetailUI
} from '../../hooks/useTaskDetailContext';
import { TaskService } from '../../../../services/taskService';
import { documentService } from '../../../../services/documentService';

// Mock dependencies
jest.mock('../../../../services/taskService');
jest.mock('../../../../services/documentService');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

describe('TaskDetail Hooks', () => {
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

  const mockDocuments = {
    documents: [],
    total: 0
  };

  const mockSubtasks: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    (TaskService.getTask as jest.Mock).mockResolvedValue(mockTask);
    (TaskService.getTaskChildren as jest.Mock).mockResolvedValue(mockSubtasks);
    (documentService.getTaskDocuments as jest.Mock).mockResolvedValue(mockDocuments);
  });

  // Wrapper component for hooks testing
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TaskDetailProvider projectId={1} taskId={1}>
      {children}
    </TaskDetailProvider>
  );

  describe('useTaskDetailContext', () => {
    it('应该返回完整的context对象', () => {
      const { result } = renderHook(() => useTaskDetailContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.task).toBeDefined();
      expect(result.current.relations).toBeDefined();
      expect(result.current.documents).toBeDefined();
      expect(result.current.ui).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.errors).toBeDefined();
      expect(result.current.actions).toBeDefined();
    });

    it('应该包含projectId和taskId', () => {
      const { result } = renderHook(() => useTaskDetailContext(), { wrapper });

      expect(result.current.projectId).toBe(1);
      expect(result.current.taskId).toBe(1);
    });

    it('应该在Provider外使用时抛出错误', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTaskDetailContext());
      }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');

      console.error = originalError;
    });
  });

  describe('useTask', () => {
    it('应该返回task数据和加载状态', () => {
      const { result } = renderHook(() => useTask(), { wrapper });

      expect(result.current).toHaveProperty('task');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });

    it('应该返回正确的loading状态', () => {
      const { result } = renderHook(() => useTask(), { wrapper });

      expect(typeof result.current.loading).toBe('boolean');
    });

    it('应该返回正确的error状态', () => {
      const { result } = renderHook(() => useTask(), { wrapper });

      expect(result.current.error === null || typeof result.current.error === 'object').toBe(true);
    });

    it('应该在Provider外使用时抛出错误', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTask());
      }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');

      console.error = originalError;
    });
  });

  describe('useTaskActions', () => {
    it('应该返回所有task相关的actions', () => {
      const { result } = renderHook(() => useTaskActions(), { wrapper });

      expect(result.current).toHaveProperty('refreshTask');
      expect(result.current).toHaveProperty('updateTask');
      expect(result.current).toHaveProperty('deleteTask');
      expect(result.current).toHaveProperty('archiveTask');

      expect(typeof result.current.refreshTask).toBe('function');
      expect(typeof result.current.updateTask).toBe('function');
      expect(typeof result.current.deleteTask).toBe('function');
      expect(typeof result.current.archiveTask).toBe('function');
    });

    it('应该正确返回actions函数引用', () => {
      const { result: result1 } = renderHook(() => useTaskActions(), { wrapper });
      const { result: result2 } = renderHook(() => useTaskActions(), { wrapper });

      // Actions应该是稳定的引用
      expect(result1.current.refreshTask).toBe(result2.current.refreshTask);
      expect(result1.current.updateTask).toBe(result2.current.updateTask);
    });

    it('应该在Provider外使用时抛出错误', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTaskActions());
      }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');

      console.error = originalError;
    });
  });

  describe('useTaskRelations', () => {
    it('应该返回relations数据和加载状态', () => {
      const { result } = renderHook(() => useTaskRelations(), { wrapper });

      expect(result.current).toHaveProperty('relations');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });

    it('应该返回正确的relations结构', () => {
      const { result } = renderHook(() => useTaskRelations(), { wrapper });

      expect(result.current.relations).toHaveProperty('parent');
      expect(result.current.relations).toHaveProperty('subtasks');
      expect(result.current.relations).toHaveProperty('siblings');
    });

    it('应该返回正确的loading状态', () => {
      const { result } = renderHook(() => useTaskRelations(), { wrapper });

      expect(typeof result.current.loading).toBe('boolean');
    });

    it('应该在Provider外使用时抛出错误', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTaskRelations());
      }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');

      console.error = originalError;
    });
  });

  describe('useTaskDocuments', () => {
    it('应该返回documents数据和相关actions', () => {
      const { result } = renderHook(() => useTaskDocuments(), { wrapper });

      expect(result.current).toHaveProperty('documents');
      expect(result.current).toHaveProperty('loadDocuments');
      expect(result.current).toHaveProperty('createDocument');
      expect(result.current).toHaveProperty('updateDocument');
      expect(result.current).toHaveProperty('deleteDocument');
    });

    it('应该返回正确的documents结构', () => {
      const { result } = renderHook(() => useTaskDocuments(), { wrapper });

      expect(result.current.documents).toHaveProperty('list');
      expect(result.current.documents).toHaveProperty('total');
      expect(result.current.documents).toHaveProperty('loading');
      expect(result.current.documents).toHaveProperty('error');
    });

    it('应该返回函数类型的actions', () => {
      const { result } = renderHook(() => useTaskDocuments(), { wrapper });

      expect(typeof result.current.loadDocuments).toBe('function');
      expect(typeof result.current.createDocument).toBe('function');
      expect(typeof result.current.updateDocument).toBe('function');
      expect(typeof result.current.deleteDocument).toBe('function');
    });

    it('应该在Provider外使用时抛出错误', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTaskDocuments());
      }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');

      console.error = originalError;
    });
  });

  describe('useTaskDetailUI', () => {
    it('应该返回UI状态和相关actions', () => {
      const { result } = renderHook(() => useTaskDetailUI(), { wrapper });

      expect(result.current).toHaveProperty('ui');
      expect(result.current).toHaveProperty('setActiveTab');
      expect(result.current).toHaveProperty('openModal');
      expect(result.current).toHaveProperty('closeModal');
      expect(result.current).toHaveProperty('toggleSidebar');
    });

    it('应该返回正确的UI状态结构', () => {
      const { result } = renderHook(() => useTaskDetailUI(), { wrapper });

      expect(result.current.ui).toHaveProperty('activeTab');
      expect(result.current.ui).toHaveProperty('sidebar');
      expect(result.current.ui).toHaveProperty('modals');
      expect(result.current.ui).toHaveProperty('loading');
    });

    it('应该返回函数类型的UI actions', () => {
      const { result } = renderHook(() => useTaskDetailUI(), { wrapper });

      expect(typeof result.current.setActiveTab).toBe('function');
      expect(typeof result.current.openModal).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
      expect(typeof result.current.toggleSidebar).toBe('function');
    });

    it('应该在Provider外使用时抛出错误', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTaskDetailUI());
      }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');

      console.error = originalError;
    });
  });

  describe('Hooks集成测试', () => {
    it('不同hooks应该共享相同的context数据', () => {
      const { result: taskResult } = renderHook(() => useTask(), { wrapper });
      const { result: relationsResult } = renderHook(() => useTaskRelations(), { wrapper });
      const { result: documentsResult } = renderHook(() => useTaskDocuments(), { wrapper });
      const { result: uiResult } = renderHook(() => useTaskDetailUI(), { wrapper });

      // 所有hooks应该访问同一个context
      expect(taskResult.current.task).toBe(relationsResult.current.relations.parent || null);
      expect(documentsResult.current.documents).toBeDefined();
      expect(uiResult.current.ui).toBeDefined();
    });

    it('hooks应该返回稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTaskActions(), { wrapper });

      const initialRefreshTask = result.current.refreshTask;
      const initialUpdateTask = result.current.updateTask;

      rerender();

      // 函数引用应该保持不变
      expect(result.current.refreshTask).toBe(initialRefreshTask);
      expect(result.current.updateTask).toBe(initialUpdateTask);
    });
  });

  describe('Error边界测试', () => {
    it('所有hooks在没有Provider时都应该抛出相同的错误', () => {
      const originalError = console.error;
      console.error = jest.fn();

      const hooks = [
        useTaskDetailContext,
        useTask,
        useTaskActions,
        useTaskRelations,
        useTaskDocuments,
        useTaskDetailUI
      ];

      hooks.forEach(hook => {
        expect(() => {
          renderHook(() => hook());
        }).toThrow('useTaskDetailContext must be used within a TaskDetailProvider');
      });

      console.error = originalError;
    });
  });
});
