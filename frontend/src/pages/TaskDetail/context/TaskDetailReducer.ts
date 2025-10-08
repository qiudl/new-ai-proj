/**
 * TaskDetailReducer - State reducer for TaskDetail module
 */

import type {
  Task,
  TaskDocument,
  TaskRelations,
  TaskStatistics,
  TaskDetailUIState,
  ApiError
} from '../types';

// ========== State Type ==========

export interface TaskDetailState {
  // Core data
  task: Task | null;
  relations: TaskRelations;
  documents: {
    list: TaskDocument[];
    total: number;
    loading: boolean;
    error: ApiError | null;
  };
  statistics: TaskStatistics | null;

  // UI state
  ui: TaskDetailUIState;

  // Loading states
  loading: {
    initial: boolean;
    task: boolean;
    documents: boolean;
    relations: boolean;
    statistics: boolean;
  };

  // Error states
  errors: {
    task: ApiError | null;
    documents: ApiError | null;
    relations: ApiError | null;
    statistics: ApiError | null;
  };
}

// ========== Action Types ==========

export type TaskDetailAction =
  // Task actions
  | { type: 'SET_TASK'; payload: Task | null }
  | { type: 'UPDATE_TASK'; payload: Task }

  // Relations actions
  | { type: 'SET_RELATIONS'; payload: TaskRelations }

  // Documents actions
  | { type: 'SET_DOCUMENTS'; payload: TaskDetailState['documents'] }

  // Statistics actions
  | { type: 'SET_STATISTICS'; payload: TaskStatistics | null }

  // UI actions
  | { type: 'SET_UI'; payload: Partial<TaskDetailUIState> }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'TOGGLE_MODAL'; payload: { modal: string; visible: boolean } }
  | { type: 'TOGGLE_SIDEBAR' }

  // Loading actions
  | { type: 'SET_LOADING'; payload: { key: keyof TaskDetailState['loading']; value: boolean } }
  | { type: 'SET_UI_LOADING'; payload: { key: string; value: boolean } }

  // Error actions
  | { type: 'SET_ERROR'; payload: { key: keyof TaskDetailState['errors']; error: ApiError | null } }
  | { type: 'CLEAR_ERRORS' }

  // Utility actions
  | { type: 'RESET' };

// ========== Reducer Function ==========

export const taskDetailReducer = (
  state: TaskDetailState,
  action: TaskDetailAction
): TaskDetailState => {
  switch (action.type) {
    // ========== Task Actions ==========
    case 'SET_TASK':
      return {
        ...state,
        task: action.payload,
        errors: {
          ...state.errors,
          task: null
        }
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        task: action.payload,
        errors: {
          ...state.errors,
          task: null
        }
      };

    // ========== Relations Actions ==========
    case 'SET_RELATIONS':
      return {
        ...state,
        relations: action.payload,
        errors: {
          ...state.errors,
          relations: null
        }
      };

    // ========== Documents Actions ==========
    case 'SET_DOCUMENTS':
      return {
        ...state,
        documents: action.payload,
        errors: {
          ...state.errors,
          documents: null
        }
      };

    // ========== Statistics Actions ==========
    case 'SET_STATISTICS':
      return {
        ...state,
        statistics: action.payload,
        errors: {
          ...state.errors,
          statistics: null
        }
      };

    // ========== UI Actions ==========
    case 'SET_UI':
      return {
        ...state,
        ui: {
          ...state.ui,
          ...action.payload
        }
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload
        }
      };

    case 'TOGGLE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            [action.payload.modal]: {
              ...state.ui.modals[action.payload.modal as keyof typeof state.ui.modals],
              visible: action.payload.visible
            }
          }
        }
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebar: {
            ...state.ui.sidebar,
            collapsed: !state.ui.sidebar.collapsed
          }
        }
      };

    // ========== Loading Actions ==========
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };

    case 'SET_UI_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: {
            ...state.ui.loading,
            [action.payload.key]: action.payload.value
          }
        }
      };

    // ========== Error Actions ==========
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {
          task: null,
          documents: null,
          relations: null,
          statistics: null
        }
      };

    // ========== Utility Actions ==========
    case 'RESET':
      // Return to initial state - will be handled by Provider
      return state;

    default:
      return state;
  }
};
