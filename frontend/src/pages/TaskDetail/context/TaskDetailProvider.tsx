/**
 * TaskDetailProvider - Context provider implementation
 */

import React, { useReducer, useCallback, useMemo, ReactNode } from 'react';
import { message } from 'antd';
import { TaskDetailContext, TaskDetailContextValue } from './TaskDetailContext';
import { taskDetailReducer, TaskDetailState, TaskDetailAction } from './TaskDetailReducer';
import { TaskService } from '../../../services/taskService';
import { documentService } from '../../../services/documentService';
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
        loadDocuments(),
        loadStatistics()
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
      const response = await TaskService.updateTask(projectId, taskId, updates);
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
      const response = await documentService.getTaskDocuments(projectId, taskId);
      dispatch({ 
        type: 'SET_DOCUMENTS', 
        payload: {
          list: response.documents || [],
          total: response.total || 0,
          loading: false,
          error: null
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'documents', error } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'documents', value: false } });
    }
  }, [projectId, taskId]);

  const createDocument = useCallback(async (document: Partial<TaskDocument>) => {
    try {
      await documentService.createDocument(projectId, {
        ...document,
        task_id: taskId
      });
      await loadDocuments();
      message.success('Document created successfully');
    } catch (error) {
      message.error('Failed to create document');
    }
  }, [projectId, taskId, loadDocuments]);

  const updateDocument = useCallback(async (id: number, updates: Partial<TaskDocument>) => {
    try {
      await documentService.updateDocument(projectId, id, updates);
      await loadDocuments();
      message.success('Document updated successfully');
    } catch (error) {
      message.error('Failed to update document');
    }
  }, [projectId, loadDocuments]);

  const deleteDocument = useCallback(async (id: number) => {
    try {
      await documentService.deleteDocument(projectId, id);
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
        state.task?.parent_id 
          ? TaskService.getTask(projectId, state.task.parent_id)
          : Promise.resolve(null)
      ]);
      
      dispatch({
        type: 'SET_RELATIONS',
        payload: {
          parent: parentTask,
          subtasks: Array.isArray(subtasks) ? subtasks : [],
          siblings: []
        }
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'relations', error } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'relations', value: false } });
    }
  }, [projectId, taskId, state.task?.parent_id]);

  const createSubtask = useCallback(async (title: string, description?: string) => {
    try {
      await TaskService.createTask(projectId, {
        title,
        description,
        parent_id: taskId
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
      // Placeholder for statistics loading
      // const response = await TaskService.getTaskStatistics(projectId, taskId);
      // dispatch({ type: 'SET_STATISTICS', payload: response });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'statistics', error } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'statistics', value: false } });
    }
  }, [projectId, taskId]);

  // ========== UI Operations ==========
  
  const setActiveTab = useCallback((tab: string) => {
    dispatch({ type: 'SET_UI', payload: { activeTab: tab } });
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
          ...state.ui.sidebar,
          collapsed: !state.ui.sidebar.collapsed
        }
      }
    });
  }, [state.ui.sidebar]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // ========== Context Value ==========
  
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
    actions: {
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
      setActiveTab,
      openModal,
      closeModal,
      toggleSidebar,
      reset
    }
  }), [
    state,
    projectId,
    taskId,
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
    setActiveTab,
    openModal,
    closeModal,
    toggleSidebar,
    reset
  ]);

  return (
    <TaskDetailContext.Provider value={contextValue}>
      {children}
    </TaskDetailContext.Provider>
  );
};