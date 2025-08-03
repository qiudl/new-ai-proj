/**
 * 🤖 AI生成的TypeScript类型定义
 * 强化类型安全和开发体验
 */

// ============================================================================
// 基础工具类型
// ============================================================================

/** 严格的ID类型 */
export type ID = string | number;

/** ISO时间戳字符串 */
export type Timestamp = string;

/** 可空类型 */
export type Nullable<T> = T | null;

/** 可能未定义类型 */
export type Maybe<T> = T | null | undefined;

/** 深度只读 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** 深度部分 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// API响应类型
// ============================================================================

/** 标准API响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: Timestamp;
}

/** 分页响应结构 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** API错误响应 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Timestamp;
}

// ============================================================================
// React组件类型
// ============================================================================

/** 严格的组件Props基类 */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/** 表单组件Props */
export interface FormComponentProps<T = unknown> extends BaseComponentProps {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

/** 列表组件Props */
export interface ListComponentProps<T = unknown> extends BaseComponentProps {
  items: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

/** 模态框组件Props */
export interface ModalComponentProps extends BaseComponentProps {
  visible: boolean;
  title?: React.ReactNode;
  onCancel: () => void;
  onOk?: () => void | Promise<void>;
  confirmLoading?: boolean;
  destroyOnClose?: boolean;
}

// ============================================================================
// 状态管理类型
// ============================================================================

/** Redux Action基类 */
export interface BaseAction {
  type: string;
  timestamp?: Timestamp;
}

/** 载荷Action */
export interface PayloadAction<T = unknown> extends BaseAction {
  payload: T;
}

/** 异步状态 */
export interface AsyncState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: Timestamp;
}

/** 分页状态 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// 业务领域类型
// ============================================================================

/** 用户类型 */
export interface User {
  id: ID;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest;
  status: 'active' | 'inactive' | 'suspended;
  profile?: UserProfile;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 用户资料 */
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  preferences: Record<string, unknown>;
}

/** 项目类型 */
export interface Project {
  id: ID;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed;
  ownerId: ID;
  members: ProjectMember[];
  settings: ProjectSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 项目成员 */
export interface ProjectMember {
  userId: ID;
  role: 'owner' | 'admin' | 'member' | 'viewer;
  joinedAt: Timestamp;
  permissions: string[];
}

/** 项目设置 */
export interface ProjectSettings {
  isPublic: boolean;
  allowInvitations: boolean;
  defaultTaskStatus: string;
  customFields: Record<string, unknown>;
}

/** 任务类型 */
export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: ID;
  assigneeId?: ID;
  parentId?: ID;
  taskLevel: number;
  sortOrder: number;
  tags: string[];
  customFields: Record<string, unknown>;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
}

/** 任务状态 */
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled;

/** 任务优先级 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent;

// ============================================================================
// 事件类型
// ============================================================================

/** React事件类型别名 */
export type ChangeEvent<T = HTMLInputElement> = React.ChangeEvent<T>;
export type FormEvent<T = HTMLFormElement> = React.FormEvent<T>;
export type KeyboardEvent<T = HTMLElement> = React.KeyboardEvent<T>;
export type MouseEvent<T = HTMLElement> = React.MouseEvent<T>;
export type FocusEvent<T = HTMLElement> = React.FocusEvent<T>;

// ============================================================================
// 高级类型工具
// ============================================================================

/** 提取Promise的返回类型 */
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

/** 提取函数的参数类型 */
export type FunctionParams<T> = T extends (...args: infer P) => unknown ? P : never;

/** 提取函数的返回类型 */
export type FunctionReturn<T> = T extends (...args: unknown[]) => infer R ? R : never;

/** 递归键路径 */
export type KeyPath<T> = T extends object ? {
  [K in keyof T]: K extends string 
    ? T[K] extends object 
      ? K | `${K}.${KeyPath<T[K]>}`
      : K
    : never;
}[keyof T] : never;

/** 条件类型筛选 */
export type FilterByType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// ============================================================================
// 类型守卫工具
// ============================================================================

/** 检查是否为有效的API响应 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ApiResponse).success === 'boolean;
}

/** 检查是否为错误响应 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value;
}

/** 检查是否为有效用户 */
export function isValidUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'username' in value &&
    'email' in value;
}

/** 检查是否为有效任务 */
export function isValidTask(value: unknown): value is Task {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value;
}

// ============================================================================
// 导出所有类型
// ============================================================================

export * from './task;
export * from './project;
export * from './user;
export * from './api;

))))