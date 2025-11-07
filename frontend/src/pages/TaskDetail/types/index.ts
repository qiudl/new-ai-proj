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

// ✅ FIXED - Re-export from specific type files to avoid circular dependency (TS2303)
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
} from './task.types';

export type {
  // Document types
  TaskDocument,
  DocumentType,
  DocumentStatus,
  DocumentCreate,
  DocumentUpdate,
} from './document.types';

export type {
  // UI types
  TaskDetailUIState,
  TabKey,
  ModalState,
  LoadingState,
  ErrorState,
  Notification,
} from './ui.types';

export type {
  // API types
  ApiResponse,
  PaginatedResponse,
  ApiError,
  ApiRequest,
} from './api.types';