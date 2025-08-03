#!/usr/bin/env node

/**
 * AI TypeScript类型优化器
 * 专注于精确类型定义和高级类型应用
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 高级类型映射
const ADVANCED_TYPE_MAPPINGS = {
  // API类型规范
  'any': 'unknown',
  'object': 'Record<string, unknown>',
  'function': '(...args: unknown[]) => unknown',
  
  // React特定类型
  'React.SyntheticEvent': 'React.SyntheticEvent<HTMLElement>',
  'React.ChangeEvent': 'React.ChangeEvent<HTMLInputElement>',
  'React.FormEvent': 'React.FormEvent<HTMLFormElement>',
  'React.KeyboardEvent': 'React.KeyboardEvent<HTMLElement>',
  'React.MouseEvent': 'React.MouseEvent<HTMLElement>',
  
  // 组件Props类型
  'ComponentProps': 'React.ComponentPropsWithoutRef',
  'ElementRef': 'React.ElementRef',
  'PropsWithChildren': 'React.PropsWithChildren',
  
  // 状态管理类型
  'State': 'Readonly<State>',
  'Action': 'PayloadAction | SimpleAction',
  'Dispatch': 'React.Dispatch<Action>',
  
  // 实用工具类型
  'ID': 'string | number',
  'Timestamp': 'string', // ISO string
  'Optional': 'Partial',
  'Required': 'Required',
  'Nullable': 'T | null',
  'Maybe': 'T | null | undefined'
};

// 创建完整的类型定义文件
function createTypeDefinitions() {
  const typesContent = `/**
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
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
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
  status: 'active' | 'archived' | 'completed';
  ownerId: ID;
  members: ProjectMember[];
  settings: ProjectSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 项目成员 */
export interface ProjectMember {
  userId: ID;
  role: 'owner' | 'admin' | 'member' | 'viewer';
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
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

/** 任务优先级 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

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
    typeof (value as ApiResponse).success === 'boolean'
  );
}

/** 检查是否为错误响应 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  );
}

/** 检查是否为有效用户 */
export function isValidUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'username' in value &&
    'email' in value
  );
}

/** 检查是否为有效任务 */
export function isValidTask(value: unknown): value is Task {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value
  );
}

// ============================================================================
// 导出所有类型
// ============================================================================

export * from './task';
export * from './project';
export * from './user';
export * from './api';
`;

  const typesDir = path.join(__dirname, 'frontend/src/types');
  const enhancedTypesPath = path.join(typesDir, 'enhanced.ts');
  
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  fs.writeFileSync(enhancedTypesPath, typesContent);
  console.log('✅ 创建增强类型定义文件: src/types/enhanced.ts');
}

// 修复特定文件的any类型
function fixAnyTypesInFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  const originalContent = content;
  
  // 1. 替换独立的any类型
  content = content.replace(/:\s*any\b(?!\w)/g, ': unknown');
  
  // 2. 替换any[]为unknown[]
  content = content.replace(/:\s*any\[\]/g, ': unknown[]');
  
  // 3. 替换函数返回类型的any
  content = content.replace(/\):\s*any\b/g, '): unknown');
  
  // 4. 替换Promise<any>为Promise<unknown>
  content = content.replace(/Promise<any>/g, 'Promise<unknown>');
  
  // 5. 替换Record<string, any>为Record<string, unknown>
  content = content.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');
  
  // 6. 处理事件处理器类型
  content = content.replace(/event:\s*any/g, 'event: React.FormEvent | React.ChangeEvent<HTMLInputElement>');
  content = content.replace(/e:\s*any/g, 'e: React.FormEvent | React.ChangeEvent<HTMLInputElement>');
  
  // 7. 处理API响应类型
  content = content.replace(/response:\s*any/g, 'response: Record<string, unknown>');
  content = content.replace(/data:\s*any/g, 'data: Record<string, unknown>');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    modified = true;
  }
  
  return modified;
}

// 获取所有TypeScript文件
function getAllTSFiles() {
  try {
    const output = execSync('find frontend/src -name "*.ts" -o -name "*.tsx"', { 
      encoding: 'utf-8',
      cwd: __dirname
    });
    return output.trim().split('\n').filter(f => f && !f.includes('node_modules'));
  } catch (error) {
    console.error('Error finding TS files:', error.message);
    return [];
  }
}

// 运行TypeScript检查
function runTypeCheck() {
  try {
    execSync('npm run type-check', {
      stdio: 'inherit',
      cwd: __dirname
    });
    return true;
  } catch (error) {
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 开始TypeScript类型优化...\n');
  
  const startTime = Date.now();
  
  // 1. 创建增强类型定义
  console.log('📝 创建增强类型定义...');
  createTypeDefinitions();
  
  // 2. 批量修复any类型
  console.log('\n🔧 批量修复any类型...');
  const tsFiles = getAllTSFiles();
  console.log(`📁 找到 ${tsFiles.length} 个TypeScript文件`);
  
  let fixedFiles = 0;
  for (const file of tsFiles) {
    const fullPath = path.join(__dirname, file);
    if (fixAnyTypesInFile(fullPath)) {
      console.log(`✅ 优化 ${file} - 精确类型替换`);
      fixedFiles++;
    }
  }
  
  // 3. 运行类型检查
  console.log('\n📋 运行TypeScript类型检查...');
  const typeCheckPassed = runTypeCheck();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log(`\n✨ TypeScript优化完成！`);
  console.log(`📊 优化统计:`);
  console.log(`   - 类型修复文件: ${fixedFiles} 个`);
  console.log(`   - 执行时间: ${duration} 秒`);
  console.log(`   - 类型检查: ${typeCheckPassed ? '✅ 通过' : '❌ 失败'}`);
  console.log(`⚡ AI超人类类型推断完成！`);
}

if (require.main === module) {
  main();
}