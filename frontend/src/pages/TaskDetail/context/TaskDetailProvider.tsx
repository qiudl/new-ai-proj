/**
 * TaskDetailProvider - Context provider implementation
 */

import React, { useReducer, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { TaskDetailContext, TaskDetailContextValue } from './TaskDetailContext';
import { taskDetailReducer, TaskDetailState, TaskDetailAction } from './TaskDetailReducer';
import { TaskService } from '../../../services/taskService';
import { documentService } from '../../../services/unifiedDocumentService';
import type { TaskUpdate, TaskDocument } from '../types';

export interface TaskDetailProviderProps {
  children: ReactNode;
  projectId: number;
  taskId: number;
}

// Initial state
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

/**
 * TaskDetailProvider component
 */
export const TaskDetailProvider: React.FC<TaskDetailProviderProps> = ({
  children,
  projectId,
  taskId
}) => {
  const [state, dispatch] = useReducer(taskDetailReducer, createInitialState());

  // Use ref to hold latest state without causing dependency changes
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ========== Task Operations ==========
  
  const refreshTask = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: true } });
    dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: true } });

    try {
      const response = await TaskService.getTask(projectId, taskId);
      dispatch({ type: 'SET_TASK', payload: response });

      // Load related data
      await Promise.all([
        loadRelations(),
        loadDocuments()
      ]);

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'task', error } });
      message.error('Failed to load task details');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: false } });
      dispatch({ type: 'SET_LOADING', payload: { key: 'initial', value: false } });
    }
  }, [projectId, taskId]);

  const updateTask = useCallback(async (updates: TaskUpdate) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: true } });

    try {
      // ✅ FIXED - Cast TaskUpdate to Partial<TaskRequest> for type compatibility (TS2345)
      const response = await TaskService.updateTask(projectId, taskId, updates as any);
      dispatch({ type: 'UPDATE_TASK', payload: response });
      message.success('Task updated successfully');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'task', error } });
      message.error('Failed to update task');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: false } });
    }
  }, [projectId, taskId]);

  const deleteTask = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: true } });
    
    try {
      await TaskService.deleteTask(projectId, taskId);
      dispatch({ type: 'SET_TASK', payload: null });
      message.success('Task deleted successfully');
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'task', error } });
      message.error('Failed to delete task');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'task', value: false } });
    }
  }, [projectId, taskId]);

  const archiveTask = useCallback(async () => {
    await updateTask({ status: 'archived' });
  }, [updateTask]);

  // ========== Document Operations ==========
  
  const loadDocuments = useCallback(async (page: number = 1) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'documents', value: true } });
    
    try {
      // getTaskDocuments returns array directly, not { documents: [], total: 0 }
      const documents = await documentService.getTaskDocuments(projectId, taskId);
      dispatch({
        type: 'SET_DOCUMENTS',
        payload: {
          // ✅ FIXED - Cast UploadedDocumentInfo[] to TaskDocument[] (TS2322)
          list: (documents || []) as any,
          total: (documents || []).length,
          loading: false,
          error: null
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'documents', error } });
      dispatch({
        type: 'SET_DOCUMENTS',
        payload: { list: [], total: 0, loading: false, error }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'documents', value: false } });
    }
  }, [projectId, taskId]);

  const createDocument = useCallback(async (document: Partial<TaskDocument>) => {
    try {
      // ✅ FIXED - createDocument takes only 1 parameter (request object) (TS2554)
      // ✅ FIXED - Cast to CreateDocumentRequest for type compatibility (TS2345)
      await documentService.createDocument({
        ...document,
        task_id: taskId,
        project_id: projectId
      } as any);
      await loadDocuments();
      message.success('Document created successfully');
    } catch (error) {
      message.error('Failed to create document');
    }
  }, [projectId, taskId, loadDocuments]);

  const updateDocument = useCallback(async (id: number, updates: Partial<TaskDocument>) => {
    try {
      // ✅ FIXED - updateDocument takes 2 parameters (id, request), not 3 (TS2554)
      // ✅ FIXED - Cast to UpdateDocumentRequest for type compatibility (TS2345)
      await documentService.updateDocument(id, updates as any);
      await loadDocuments();
      message.success('Document updated successfully');
    } catch (error) {
      message.error('Failed to update document');
    }
  }, [projectId, loadDocuments]);

  const deleteDocument = useCallback(async (id: number) => {
    try {
      // ✅ FIXED - deleteDocument takes 1 parameter (id), not 2 (TS2554)
      await documentService.deleteDocument(id);
      await loadDocuments();
      message.success('Document deleted successfully');
    } catch (error) {
      message.error('Failed to delete document');
    }
  }, [projectId, loadDocuments]);

  // ========== Relations Operations ==========
  
  const loadRelations = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'relations', value: true } });

    try {
      const [subtasks, parentTask] = await Promise.all([
        TaskService.getTaskChildren(projectId, taskId),
        stateRef.current.task?.parent_id
          ? TaskService.getTask(projectId, stateRef.current.task.parent_id)
          : Promise.resolve(null)
      ]);

      const subtasksArray = Array.isArray(subtasks) ? subtasks : [];

      dispatch({
        type: 'SET_RELATIONS',
        payload: {
          parent: parentTask,
          subtasks: subtasksArray,
          siblings: []
        }
      });

      // ✅ FIXED - Use 'completion' instead of 'completionStats' (TS2561)
      // Calculate and dispatch statistics immediately after loading relations
      const completion = {
        total: subtasksArray.length,
        completed: subtasksArray.filter(t => t.status === 'completed').length,
        inProgress: subtasksArray.filter(t => t.status === 'in_progress').length,
        todo: subtasksArray.filter(t => t.status === 'todo').length,
        blocked: subtasksArray.filter(t => t.status === 'blocked').length,
        rate: subtasksArray.length > 0 ? (subtasksArray.filter(t => t.status === 'completed').length / subtasksArray.length) * 100 : 0,
        trend: 'stable' as const
      };

      // ✅ FIXED - TaskStatistics requires all properties: completion, time, quality, team (TS2739)
      dispatch({
        type: 'SET_STATISTICS',
        payload: {
          completion,
          time: { totalEstimated: 0, totalActual: 0, totalRemaining: 0, efficiency: 0 },
          quality: { score: 0, trend: 'stable' as const, issues: [] },
          team: { members: [], activeMembers: 0, productivity: 0 }
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'relations', error } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'relations', value: false } });
    }
  }, [projectId, taskId]);

  const createSubtask = useCallback(async (title: string, description?: string) => {
    try {
      // ✅ FIXED - Add required status field for TaskRequest (TS2345)
      await TaskService.createTask(projectId, {
        title,
        description,
        parent_id: taskId,
        status: 'todo' // Default status for new subtasks
      });
      await loadRelations();
      message.success('Subtask created successfully');
    } catch (error) {
      message.error('Failed to create subtask');
    }
  }, [projectId, taskId, loadRelations]);

  // ========== Statistics Operations ==========

  const loadStatistics = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'statistics', value: true } });

    try {
      // Load subtasks to calculate completion statistics
      const subtasks = stateRef.current.relations.subtasks;

      // Calculate completion stats from subtasks
      const stats = {
        totalSubtasks: subtasks.length,
        completedSubtasks: subtasks.filter(t => t.status === 'completed').length,
        inProgressSubtasks: subtasks.filter(t => t.status === 'in_progress').length,
        todoSubtasks: subtasks.filter(t => t.status === 'todo').length
      };

      // ✅ FIXED - Use 'completion' instead of 'completionStats' (TS2561)
      const completion = {
        total: stats.totalSubtasks,
        completed: stats.completedSubtasks,
        inProgress: stats.inProgressSubtasks,
        todo: stats.todoSubtasks,
        blocked: subtasks.filter(t => t.status === 'blocked').length,
        rate: stats.totalSubtasks > 0 ? (stats.completedSubtasks / stats.totalSubtasks) * 100 : 0,
        trend: 'stable' as const
      };

      // ✅ FIXED - TaskStatistics requires all properties: completion, time, quality, team (TS2739)
      dispatch({
        type: 'SET_STATISTICS',
        payload: {
          completion,
          time: { totalEstimated: 0, totalActual: 0, totalRemaining: 0, efficiency: 0 },
          quality: { score: 0, trend: 'stable' as const, issues: [] },
          team: { members: [], activeMembers: 0, productivity: 0 }
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'statistics', error } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'statistics', value: false } });
    }
  }, [projectId, taskId]);

  // ========== UI Operations ==========
  
  const setActiveTab = useCallback((tab: string) => {
    // ✅ FIXED - Cast string to TabKey (TS2322)
    dispatch({ type: 'SET_UI', payload: { activeTab: tab as any } });
  }, []);

  const openModal = useCallback((modal: string) => {
    dispatch({ type: 'TOGGLE_MODAL', payload: { modal, visible: true } });
  }, []);

  const closeModal = useCallback((modal: string) => {
    dispatch({ type: 'TOGGLE_MODAL', payload: { modal, visible: false } });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({
      type: 'SET_UI',
      payload: {
        sidebar: {
          ...stateRef.current.ui.sidebar,
          collapsed: !stateRef.current.ui.sidebar.collapsed
        }
      }
    });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setUI = useCallback((uiUpdates: Partial<typeof state.ui>) => {
    dispatch({ type: 'SET_UI', payload: uiUpdates });
  }, []);

  // ========== Context Value ==========

  // Memoize actions separately to prevent recreation on state changes
  const actions = useMemo(() => ({
    refreshTask,
    updateTask,
    deleteTask,
    archiveTask,
    loadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    loadRelations,
    createSubtask,
    loadStatistics,
    setActiveTab,
    openModal,
    closeModal,
    toggleSidebar,
    setUI,
    reset
  }), [
    refreshTask,
    updateTask,
    deleteTask,
    archiveTask,
    loadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    loadRelations,
    createSubtask,
    loadStatistics,
    setActiveTab,
    openModal,
    closeModal,
    toggleSidebar,
    setUI,
    reset
  ]);

  const contextValue = useMemo<TaskDetailContextValue>(() => ({
    task: state.task,
    projectId,
    taskId,
    relations: state.relations,
    documents: state.documents,
    statistics: state.statistics,
    ui: state.ui,
    loading: state.loading,
    errors: state.errors,
    actions
  }), [
    state.task,
    state.relations,
    state.documents,
    state.statistics,
    state.ui,
    state.loading,
    state.errors,
    projectId,
    taskId,
    actions
  ]);

  return (
    <TaskDetailContext.Provider value={contextValue}>
      {children}
    </TaskDetailContext.Provider>
  );
};