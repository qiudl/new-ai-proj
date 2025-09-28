/**
 * 增强的状态管理系统导出
 * 
 * 这个状态管理系统提供了以下特性：
 * 1. Context API 统一状态管理
 * 2. 智能缓存机制
 * 3. 乐观更新支持
 * 4. 错误处理和重试
 * 5. 性能优化的选择器
 * 6. 批量操作支持
 */

// Context Providers
export { 
  DocumentProvider, 
  useDocumentContext,
  useDocuments,
  useSelectedDocument,
  useDocumentStatistics,
  useDocumentLoading,
  useDocumentError 
} from './DocumentContext';

export { 
  TaskProvider, 
  useTaskContext,
  useTasks,
  useSelectedTask,
  useTaskStatistics,
  useTaskLoading,
  useTaskError,
  useTaskFilters 
} from './TaskContext';

// Custom Hooks for Operations
export { useTaskOperations } from '../hooks/useTaskOperations';
export { useDocumentOperations } from '../hooks/useDocumentOperations';

// Types
export type { DocumentFilter } from '../services/documentService';
export type { Task } from '../types/task';

/**
 * 使用指南：
 * 
 * 1. 在应用根组件中包装 Providers：
 * ```tsx
 * import { DocumentProvider, TaskProvider } from '@/contexts';
 * 
 * function App() {
 *   return (
 *     <TaskProvider cacheTimeout={300000} enableOptimisticUpdates={true}>
 *       <DocumentProvider cacheTimeout={300000}>
 *         <YourApp />
 *       </DocumentProvider>
 *     </TaskProvider>
 *   );
 * }
 * ```
 * 
 * 2. 在组件中使用状态：
 * ```tsx
 * import { useTasks, useTaskOperations } from '@/contexts';
 * 
 * function TaskList() {
 *   const tasks = useTasks();
 *   const { toggleTaskStatus, batchUpdateStatus } = useTaskOperations();
 *   
 *   // 使用状态和操作...
 * }
 * ```
 * 
 * 3. 性能优化的选择器：
 * ```tsx
 * // 只订阅特定状态，避免不必要的重渲染
 * const loading = useTaskLoading();
 * const error = useTaskError();
 * const statistics = useTaskStatistics();
 * ```
 * 
 * 4. 智能操作 Hooks：
 * ```tsx
 * import { useTaskOperations } from '@/contexts';
 * 
 * function TaskCard({ taskId }) {
 *   const { 
 *     toggleTaskStatus, 
 *     setTaskPriority,
 *     getRecommendedActions,
 *     isLoading 
 *   } = useTaskOperations();
 *   
 *   const recommendations = getRecommendedActions(taskId);
 *   const loading = isLoading(`toggle-${taskId}`);
 *   
 *   // 使用智能操作...
 * }
 * ```
 * 
 * 特性说明：
 * 
 * - **缓存机制**: 自动缓存API响应，减少网络请求
 * - **乐观更新**: 立即更新UI，后台同步数据
 * - **错误恢复**: 自动重试失败的操作
 * - **批量操作**: 高效的批量更新支持
 * - **智能推荐**: 基于上下文的操作建议
 * - **性能优化**: 选择器模式避免不必要的重渲染
 */

/**
 * Provider 组合组件
 * 简化多个 Provider 的嵌套使用
 */
import React, { ReactNode } from 'react';

interface StateProvidersProps {
  children: ReactNode;
  taskCacheTimeout?: number;
  documentCacheTimeout?: number;
  enableOptimisticUpdates?: boolean;
}

export const StateProviders: React.FC<StateProvidersProps> = ({
  children,
  taskCacheTimeout = 3 * 60 * 1000, // 3分钟
  documentCacheTimeout = 5 * 60 * 1000, // 5分钟
  enableOptimisticUpdates = true
}) => {
  return (
    <TaskProvider 
      cacheTimeout={taskCacheTimeout}
      enableOptimisticUpdates={enableOptimisticUpdates}
    >
      <DocumentProvider cacheTimeout={documentCacheTimeout}>
        {children}
      </DocumentProvider>
    </TaskProvider>
  );
};