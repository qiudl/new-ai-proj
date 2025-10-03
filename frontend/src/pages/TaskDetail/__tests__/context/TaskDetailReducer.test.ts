/**
 * TaskDetailReducer - Reducer测试
 *
 * 测试覆盖:
 * - 所有action types
 * - 状态更新逻辑
 * - Edge cases
 */

import {
  taskDetailReducer,
  TaskDetailState,
  TaskDetailAction
} from '../../context/TaskDetailReducer';
import type { Task, TaskRelations, TaskDetailUIState } from '../../types';

describe('TaskDetailReducer', () => {
  // Helper to create initial state
  const createInitialState = (): TaskDetailState => ({
    task: null,
    relations: {
      parent: null,
      subtasks: [],
      siblings: []
    },
    documents: {
      list: [],
      total: 0,
      loading: false,
      error: null
    },
    statistics: null,
    ui: {
      activeTab: 'info',
      sidebar: {
        collapsed: false,
        width: 320,
        activeSection: 'timer',
        pinnedSections: ['timer', 'related-tasks'],
        hiddenSections: []
      },
      modals: {
        edit: { visible: false },
        delete: { visible: false },
        archive: { visible: false },
        bulkImport: { visible: false },
        documentEdit: { visible: false },
        share: { visible: false },
        export: { visible: false },
        settings: { visible: false }
      },
      loading: {
        page: false,
        task: false,
        documents: false,
        subtasks: false,
        timeline: false,
        comments: false
      },
      errors: {},
      notifications: [],
      preferences: {
        theme: 'light',
        density: 'comfortable',
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        firstDayOfWeek: 1,
        showDescriptions: true,
        autoSave: true,
        autoRefresh: true,
        refreshInterval: 30000,
        animations: true
      },
      expandedNodes: [],
      selectedItems: {
        tasks: [],
        documents: [],
        comments: [],
        mode: 'single'
      },
      filters: {
        tasks: {},
        documents: {},
        timeline: {},
        active: false
      },
      sort: {
        tasks: { field: 'created_at', direction: 'desc' },
        documents: { field: 'created_at', direction: 'desc' },
        timeline: { field: 'timestamp', direction: 'desc' }
      }
    },
    loading: {
      initial: true,
      task: false,
      documents: false,
      relations: false,
      statistics: false
    },
    errors: {
      task: null,
      documents: null,
      relations: null,
      statistics: null
    }
  });

  const mockTask: Task = {
    id: 1,
    project_id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  describe('Task Actions', () => {
    it('SET_TASK: 应该设置任务并清除task错误', () => {
      const state = createInitialState();
      state.errors.task = { message: 'Previous error', code: 'ERROR' };

      const action: TaskDetailAction = {
        type: 'SET_TASK',
        payload: mockTask
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.task).toEqual(mockTask);
      expect(newState.errors.task).toBeNull();
      expect(newState.errors.documents).toBe(state.errors.documents); // 其他错误不受影响
    });

    it('SET_TASK: 应该能够设置null (删除任务场景)', () => {
      const state = createInitialState();
      state.task = mockTask;

      const action: TaskDetailAction = {
        type: 'SET_TASK',
        payload: null
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.task).toBeNull();
      expect(newState.errors.task).toBeNull();
    });

    it('UPDATE_TASK: 应该更新任务并清除task错误', () => {
      const state = createInitialState();
      state.task = mockTask;
      state.errors.task = { message: 'Previous error', code: 'ERROR' };

      const updatedTask = { ...mockTask, title: 'Updated Title' };
      const action: TaskDetailAction = {
        type: 'UPDATE_TASK',
        payload: updatedTask
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.task).toEqual(updatedTask);
      expect(newState.errors.task).toBeNull();
    });
  });

  describe('Relations Actions', () => {
    it('SET_RELATIONS: 应该设置关系数据并清除relations错误', () => {
      const state = createInitialState();
      state.errors.relations = { message: 'Previous error', code: 'ERROR' };

      const relations: TaskRelations = {
        parent: mockTask,
        subtasks: [{ ...mockTask, id: 2 }],
        siblings: [{ ...mockTask, id: 3 }]
      };

      const action: TaskDetailAction = {
        type: 'SET_RELATIONS',
        payload: relations
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.relations).toEqual(relations);
      expect(newState.errors.relations).toBeNull();
    });

    it('SET_RELATIONS: 应该能处理空数组', () => {
      const state = createInitialState();

      const relations: TaskRelations = {
        parent: null,
        subtasks: [],
        siblings: []
      };

      const action: TaskDetailAction = {
        type: 'SET_RELATIONS',
        payload: relations
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.relations.subtasks).toEqual([]);
      expect(newState.relations.siblings).toEqual([]);
      expect(newState.relations.parent).toBeNull();
    });
  });

  describe('Documents Actions', () => {
    it('SET_DOCUMENTS: 应该设置文档数据并清除documents错误', () => {
      const state = createInitialState();
      state.errors.documents = { message: 'Previous error', code: 'ERROR' };

      const documents = {
        list: [
          {
            id: 1,
            task_id: 1,
            project_id: 1,
            title: 'Doc 1',
            content: 'Content',
            type: 'markdown' as const,
            status: 'published' as const,
            created_at: '2024-01-01',
            updated_at: '2024-01-01'
          }
        ],
        total: 1,
        loading: false,
        error: null
      };

      const action: TaskDetailAction = {
        type: 'SET_DOCUMENTS',
        payload: documents
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.documents).toEqual(documents);
      expect(newState.errors.documents).toBeNull();
    });
  });

  describe('Statistics Actions', () => {
    it('SET_STATISTICS: 应该设置统计数据并清除statistics错误', () => {
      const state = createInitialState();
      state.errors.statistics = { message: 'Previous error', code: 'ERROR' };

      const statistics = {
        completion: {
          total: 10,
          completed: 5,
          inProgress: 3,
          todo: 2,
          blocked: 0,
          rate: 50,
          trend: 'up' as const
        },
        time: {
          totalEstimated: 100,
          totalActual: 80,
          totalRemaining: 20,
          averageCompletionTime: 16,
          overdueCount: 1
        },
        quality: {
          bugCount: 2,
          reworkCount: 1,
          reviewScore: 4.5,
          testCoverage: 85
        },
        team: {
          assignedMembers: 3,
          activeMembers: 2,
          workload: {},
          productivity: {}
        }
      };

      const action: TaskDetailAction = {
        type: 'SET_STATISTICS',
        payload: statistics
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.statistics).toEqual(statistics);
      expect(newState.errors.statistics).toBeNull();
    });

    it('SET_STATISTICS: 应该能设置null', () => {
      const state = createInitialState();
      state.statistics = {} as any;

      const action: TaskDetailAction = {
        type: 'SET_STATISTICS',
        payload: null
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.statistics).toBeNull();
    });
  });

  describe('UI Actions', () => {
    it('SET_UI: 应该部分更新UI状态', () => {
      const state = createInitialState();

      const action: TaskDetailAction = {
        type: 'SET_UI',
        payload: { activeTab: 'document' }
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.ui.activeTab).toBe('document');
      expect(newState.ui.sidebar).toEqual(state.ui.sidebar); // 其他UI状态不变
    });

    it('SET_UI: 应该能更新嵌套的UI状态', () => {
      const state = createInitialState();

      const action: TaskDetailAction = {
        type: 'SET_UI',
        payload: {
          sidebar: {
            ...state.ui.sidebar,
            collapsed: true,
            width: 400
          }
        }
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.ui.sidebar.collapsed).toBe(true);
      expect(newState.ui.sidebar.width).toBe(400);
      expect(newState.ui.activeTab).toBe(state.ui.activeTab); // activeTab不变
    });

    it('SET_ACTIVE_TAB: 应该设置活动标签页', () => {
      const state = createInitialState();

      const action: TaskDetailAction = {
        type: 'SET_ACTIVE_TAB',
        payload: 'progress'
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.ui.activeTab).toBe('progress');
    });

    it('TOGGLE_MODAL: 应该切换模态框状态', () => {
      const state = createInitialState();

      const openAction: TaskDetailAction = {
        type: 'TOGGLE_MODAL',
        payload: { modal: 'edit', visible: true }
      };

      const newState1 = taskDetailReducer(state, openAction);
      expect(newState1.ui.modals.edit.visible).toBe(true);

      const closeAction: TaskDetailAction = {
        type: 'TOGGLE_MODAL',
        payload: { modal: 'edit', visible: false }
      };

      const newState2 = taskDetailReducer(newState1, closeAction);
      expect(newState2.ui.modals.edit.visible).toBe(false);
    });

    it('TOGGLE_SIDEBAR: 应该切换侧边栏展开状态', () => {
      const state = createInitialState();
      state.ui.sidebar.collapsed = false;

      const action: TaskDetailAction = {
        type: 'TOGGLE_SIDEBAR'
      };

      const newState1 = taskDetailReducer(state, action);
      expect(newState1.ui.sidebar.collapsed).toBe(true);

      const newState2 = taskDetailReducer(newState1, action);
      expect(newState2.ui.sidebar.collapsed).toBe(false);
    });
  });

  describe('Loading Actions', () => {
    it('SET_LOADING: 应该设置加载状态', () => {
      const state = createInitialState();

      const action: TaskDetailAction = {
        type: 'SET_LOADING',
        payload: { key: 'task', value: true }
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.loading.task).toBe(true);
      expect(newState.loading.documents).toBe(state.loading.documents); // 其他loading不变
    });

    it('SET_LOADING: 应该能设置多个loading键', () => {
      const state = createInitialState();

      const action1: TaskDetailAction = {
        type: 'SET_LOADING',
        payload: { key: 'task', value: true }
      };

      const newState1 = taskDetailReducer(state, action1);

      const action2: TaskDetailAction = {
        type: 'SET_LOADING',
        payload: { key: 'documents', value: true }
      };

      const newState2 = taskDetailReducer(newState1, action2);

      expect(newState2.loading.task).toBe(true);
      expect(newState2.loading.documents).toBe(true);
      expect(newState2.loading.relations).toBe(false);
    });

    it('SET_UI_LOADING: 应该设置UI加载状态', () => {
      const state = createInitialState();

      const action: TaskDetailAction = {
        type: 'SET_UI_LOADING',
        payload: { key: 'modal', value: true }
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.ui.loading.modal).toBe(true);
    });
  });

  describe('Error Actions', () => {
    it('SET_ERROR: 应该设置错误状态', () => {
      const state = createInitialState();

      const error = { message: 'Test error', code: 'TEST_ERROR' };
      const action: TaskDetailAction = {
        type: 'SET_ERROR',
        payload: { key: 'task', error }
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.errors.task).toEqual(error);
      expect(newState.errors.documents).toBeNull(); // 其他错误不变
    });

    it('SET_ERROR: 应该能清除错误（设置为null）', () => {
      const state = createInitialState();
      state.errors.task = { message: 'Previous error', code: 'ERROR' };

      const action: TaskDetailAction = {
        type: 'SET_ERROR',
        payload: { key: 'task', error: null }
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.errors.task).toBeNull();
    });

    it('CLEAR_ERRORS: 应该清除所有错误', () => {
      const state = createInitialState();
      state.errors.task = { message: 'Task error', code: 'ERROR' };
      state.errors.documents = { message: 'Documents error', code: 'ERROR' };
      state.errors.relations = { message: 'Relations error', code: 'ERROR' };
      state.errors.statistics = { message: 'Statistics error', code: 'ERROR' };

      const action: TaskDetailAction = {
        type: 'CLEAR_ERRORS'
      };

      const newState = taskDetailReducer(state, action);

      expect(newState.errors.task).toBeNull();
      expect(newState.errors.documents).toBeNull();
      expect(newState.errors.relations).toBeNull();
      expect(newState.errors.statistics).toBeNull();
    });
  });

  describe('Utility Actions', () => {
    it('RESET: 应该返回当前状态（由Provider处理重置）', () => {
      const state = createInitialState();
      state.task = mockTask;

      const action: TaskDetailAction = {
        type: 'RESET'
      };

      const newState = taskDetailReducer(state, action);

      // RESET只是标记，实际重置由Provider处理
      expect(newState).toBe(state);
    });
  });

  describe('Edge Cases', () => {
    it('应该处理未知action type（返回原状态）', () => {
      const state = createInitialState();
      const action = { type: 'UNKNOWN_ACTION' } as any;

      const newState = taskDetailReducer(state, action);

      expect(newState).toBe(state);
    });

    it('应该保持状态不可变性', () => {
      const state = createInitialState();
      const originalState = JSON.parse(JSON.stringify(state));

      const action: TaskDetailAction = {
        type: 'SET_TASK',
        payload: mockTask
      };

      taskDetailReducer(state, action);

      // 原状态应该没有被修改
      expect(state).toEqual(originalState);
    });

    it('应该正确处理深层嵌套更新', () => {
      const state = createInitialState();

      const action: TaskDetailAction = {
        type: 'TOGGLE_MODAL',
        payload: { modal: 'documentEdit', visible: true }
      };

      const newState = taskDetailReducer(state, action);

      // 新状态的修改应该不影响原状态
      expect(state.ui.modals.documentEdit.visible).toBe(false);
      expect(newState.ui.modals.documentEdit.visible).toBe(true);

      // 其他嵌套属性应该保持不变
      expect(newState.ui.modals.edit).toBe(state.ui.modals.edit);
      expect(newState.ui.sidebar).toBe(state.ui.sidebar);
    });
  });
});
