/**
 * useTaskDetailContext - Hook to access TaskDetail context
 */

import { useContext } from 'react';
import { TaskDetailContext } from '../context/TaskDetailContext';

/**
 * Hook to access TaskDetail context
 * @throws Error if used outside TaskDetailProvider
 */
export const useTaskDetailContext = () => {
  const context = useContext(TaskDetailContext);

  if (context === undefined) {
    throw new Error(
      'useTaskDetailContext must be used within a TaskDetailProvider'
    );
  }

  return context;
};

/**
 * Hook to access task data
 */
export const useTask = () => {
  const { task, loading, errors } = useTaskDetailContext();
  return { task, loading: loading.task, error: errors.task };
};

/**
 * Hook to access task actions
 */
export const useTaskActions = () => {
  const { actions } = useTaskDetailContext();
  return {
    refreshTask: actions.refreshTask,
    updateTask: actions.updateTask,
    deleteTask: actions.deleteTask,
    archiveTask: actions.archiveTask
  };
};

/**
 * Hook to access relations data
 */
export const useTaskRelations = () => {
  const { relations, loading, errors } = useTaskDetailContext();
  return { relations, loading: loading.relations, error: errors.relations };
};

/**
 * Hook to access documents data
 */
export const useTaskDocuments = () => {
  const { documents, actions } = useTaskDetailContext();
  return {
    documents,
    loadDocuments: actions.loadDocuments,
    createDocument: actions.createDocument,
    updateDocument: actions.updateDocument,
    deleteDocument: actions.deleteDocument
  };
};

/**
 * Hook to access UI state
 */
export const useTaskDetailUI = () => {
  const { ui, actions } = useTaskDetailContext();
  return {
    ui,
    setActiveTab: actions.setActiveTab,
    openModal: actions.openModal,
    closeModal: actions.closeModal,
    toggleSidebar: actions.toggleSidebar
  };
};
