/**
 * TaskDetailContext - Central state management for TaskDetail module
 */

import { createContext } from 'react';
import type { 
  Task, 
  TaskDocument,
  TaskRelations,
  TaskStatistics,
  TaskUpdate,
  TaskDetailUIState,
  ApiError
} from '../types';

export interface TaskDetailContextValue {
  // ========== Core Data ==========
  task: Task | null;
  projectId: number;
  taskId: number;
  
  // ========== Related Data ==========
  relations: TaskRelations;
  documents: {
    list: TaskDocument[];
    total: number;
    loading: boolean;
    error: ApiError | null;
  };
  statistics: TaskStatistics | null;
  
  // ========== UI State ==========
  ui: TaskDetailUIState;
  
  // ========== Loading States ==========
  loading: {
    initial: boolean;
    task: boolean;
    documents: boolean;
    relations: boolean;
    statistics: boolean;
  };
  
  // ========== Error States ==========
  errors: {
    task: ApiError | null;
    documents: ApiError | null;
    relations: ApiError | null;
    statistics: ApiError | null;
  };
  
  // ========== Actions ==========
  actions: {
    // Task operations
    refreshTask: () => Promise<void>;
    updateTask: (updates: TaskUpdate) => Promise<void>;
    deleteTask: () => Promise<void>;
    archiveTask: () => Promise<void>;

    // Document operations
    loadDocuments: (page?: number) => Promise<void>;
    createDocument: (document: Partial<TaskDocument>) => Promise<void>;
    updateDocument: (id: number, updates: Partial<TaskDocument>) => Promise<void>;
    deleteDocument: (id: number) => Promise<void>;

    // Relations operations
    loadRelations: () => Promise<void>;
    createSubtask: (title: string, description?: string) => Promise<void>;

    // Statistics operations
    loadStatistics: () => Promise<void>;

    // UI operations
    setActiveTab: (tab: string) => void;
    openModal: (modal: string) => void;
    closeModal: (modal: string) => void;
    toggleSidebar: () => void;
    setUI: (uiUpdates: Partial<TaskDetailUIState>) => void;

    // Utility
    reset: () => void;
  };
}

// Create the context with undefined as default
export const TaskDetailContext = createContext<TaskDetailContextValue | undefined>(undefined);

// Display name for debugging
TaskDetailContext.displayName = 'TaskDetailContext';