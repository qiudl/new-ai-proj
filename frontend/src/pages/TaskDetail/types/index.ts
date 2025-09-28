/**
 * Central export point for all type definitions
 */

// Export all task-related types
export * from './task.types';

// Export all document-related types
export * from './document.types';

// Export all UI state types
export * from './ui.types';

// Export all API-related types
export * from './api.types';

// Re-export commonly used types for convenience
export type {
  // Task types
  Task,
  TaskStatus,
  TaskPriority,
  TaskRelations,
  TaskProgress,
  TaskStatistics,
  TaskUpdate,
  TaskCreate,
  
  // Document types
  TaskDocument,
  DocumentType,
  DocumentStatus,
  DocumentCreate,
  DocumentUpdate,
  
  // UI types
  TaskDetailUIState,
  TabKey,
  ModalState,
  LoadingState,
  ErrorState,
  Notification,
  
  // API types
  ApiResponse,
  PaginatedResponse,
  ApiError,
  ApiRequest,
} from './index';