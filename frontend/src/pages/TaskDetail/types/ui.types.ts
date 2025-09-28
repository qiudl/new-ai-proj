/**
 * UI state type definitions
 */

// ========== Main UI State ==========

export interface TaskDetailUIState {
  activeTab: TabKey;
  sidebar: SidebarState;
  modals: ModalsState;
  loading: LoadingState;
  errors: ErrorState;
  notifications: Notification[];
  preferences: UIPreferences;
  expandedNodes: string[];
  selectedItems: SelectionState;
  filters: FilterState;
  sort: SortState;
}

// ========== Tab Management ==========

export type TabKey = 'info' | 'documents' | 'progress' | 'timeline' | 'comments' | 'settings';

export interface TabConfig {
  key: TabKey;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  hidden?: boolean;
}

export interface TabState {
  active: TabKey;
  visited: TabKey[];
  modified: Partial<Record<TabKey, boolean>>;
  config: TabConfig[];
}

// ========== Sidebar State ==========

export interface SidebarState {
  collapsed: boolean;
  width: number;
  activeSection: SidebarSection;
  pinnedSections: SidebarSection[];
  hiddenSections: SidebarSection[];
}

export type SidebarSection = 
  | 'timer'
  | 'related-tasks'
  | 'quick-actions'
  | 'metadata'
  | 'activity';

// ========== Modal State ==========

export interface ModalsState {
  edit: ModalState;
  delete: ModalState;
  archive: ModalState;
  bulkImport: ModalState;
  documentEdit: ModalState;
  share: ModalState;
  export: ModalState;
  settings: ModalState;
  [key: string]: ModalState;
}

export interface ModalState {
  visible: boolean;
  loading?: boolean;
  data?: any;
  error?: string;
}

// ========== Loading State ==========

export interface LoadingState {
  page: boolean;
  task: boolean;
  documents: boolean;
  subtasks: boolean;
  timeline: boolean;
  comments: boolean;
  [key: string]: boolean;
}

// ========== Error State ==========

export interface ErrorState {
  global?: ErrorInfo;
  task?: ErrorInfo;
  documents?: ErrorInfo;
  subtasks?: ErrorInfo;
  [key: string]: ErrorInfo | undefined;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  retryable?: boolean;
}

// ========== Notifications ==========

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: NotificationAction;
  timestamp: number;
}

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  handler: () => void;
}

// ========== UI Preferences ==========

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'comfortable' | 'spacious';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 0 | 1 | 6; // Sunday, Monday, Saturday
  showDescriptions: boolean;
  autoSave: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  animations: boolean;
}

// ========== Selection State ==========

export interface SelectionState {
  tasks: number[];
  documents: number[];
  comments: number[];
  mode: SelectionMode;
}

export type SelectionMode = 'single' | 'multiple' | 'range';

// ========== Filter State ==========

export interface FilterState {
  tasks: TaskFilterState;
  documents: DocumentFilterState;
  timeline: TimelineFilterState;
  active: boolean;
}

export interface TaskFilterState {
  status?: string[];
  priority?: string[];
  assignee?: number[];
  tags?: string[];
  dateRange?: DateRange;
}

export interface DocumentFilterState {
  type?: string[];
  status?: string[];
  creator?: number[];
  tags?: string[];
  dateRange?: DateRange;
}

export interface TimelineFilterState {
  eventTypes?: string[];
  actors?: number[];
  dateRange?: DateRange;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

// ========== Sort State ==========

export interface SortState {
  tasks: SortConfig;
  documents: SortConfig;
  timeline: SortConfig;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  secondary?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// ========== Drag and Drop State ==========

export interface DragDropState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  dropTarget: DropTarget | null;
  validTargets: string[];
}

export interface DragItem {
  type: 'task' | 'document' | 'file';
  id: number | string;
  data: any;
}

export interface DropTarget {
  type: 'task' | 'folder' | 'list';
  id: number | string;
  position?: 'before' | 'after' | 'inside';
}

// ========== View State ==========

export interface ViewState {
  layout: LayoutType;
  zoom: number;
  scroll: ScrollPosition;
  splitView: boolean;
  fullscreen: boolean;
}

export type LayoutType = 'default' | 'compact' | 'card' | 'timeline' | 'kanban';

export interface ScrollPosition {
  x: number;
  y: number;
  element?: string;
}

// ========== Form State ==========

export interface FormState<T = any> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

// ========== Pagination State ==========

export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger: boolean;
  pageSizeOptions: number[];
}

// ========== Search State ==========

export interface SearchState {
  query: string;
  results: SearchResults;
  loading: boolean;
  history: string[];
  suggestions: string[];
}

export interface SearchResults {
  tasks: any[];
  documents: any[];
  comments: any[];
  total: number;
}

// ========== Context Menu State ==========

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  target?: any;
}

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  handler: () => void;
  children?: ContextMenuItem[];
}

// ========== Keyboard Shortcuts ==========

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  handler: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

// ========== Tour/Onboarding State ==========

export interface TourState {
  active: boolean;
  currentStep: number;
  steps: TourStep[];
  completed: string[];
  skipped: boolean;
}

export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}