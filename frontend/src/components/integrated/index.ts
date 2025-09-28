/**
 * 集成和优化组件导出
 * 
 * 这个模块包含了：
 * 1. 集成的增强组件
 * 2. 性能优化工具
 * 3. 懒加载组件
 * 4. 监控和分析工具
 */

// 集成组件
export { default as EnhancedTaskDetailPage } from './EnhancedTaskDetailPage';

// 性能优化组件
export { default as LazyComponentLoader, withLazyLoading, useLazyComponent, createLazyComponents } from '../optimization/LazyComponentLoader';
export { default as PerformanceMonitor } from '../optimization/PerformanceMonitor';

// 重构后的组件（重新导出）
export * from '../refactored';

// 状态管理（重新导出）
export * from '../../contexts';

/**
 * 性能优化的最佳实践：
 * 
 * 1. 使用 LazyComponentLoader 进行组件懒加载：
 * ```tsx
 * import { LazyComponentLoader } from '@/components/integrated';
 * 
 * const MyLazyComponent = React.lazy(() => import('./MyComponent'));
 * 
 * function App() {
 *   return (
 *     <LazyComponentLoader
 *       componentName="MyComponent"
 *       retry={true}
 *       maxRetries={3}
 *     >
 *       <MyLazyComponent />
 *     </LazyComponentLoader>
 *   );
 * }
 * ```
 * 
 * 2. 使用 PerformanceMonitor 监控组件性能：
 * ```tsx
 * import { PerformanceMonitor } from '@/components/integrated';
 * 
 * function MyComponent() {
 *   return (
 *     <PerformanceMonitor
 *       componentName="MyComponent"
 *       enableDevMode={true}
 *       thresholds={{
 *         renderTime: 16,
 *         reRenderCount: 10
 *       }}
 *     >
 *       {/* 组件内容 */}
 *     </PerformanceMonitor>
 *   );
 * }
 * ```
 * 
 * 3. 使用增强的任务详情页面：
 * ```tsx
 * import { EnhancedTaskDetailPage } from '@/components/integrated';
 * 
 * function TaskPage() {
 *   return (
 *     <EnhancedTaskDetailPage
 *       taskId={taskId}
 *       mode="page"
 *     />
 *   );
 * }
 * ```
 * 
 * 4. 使用状态管理和操作 Hooks：
 * ```tsx
 * import { useTaskOperations, useDocumentOperations } from '@/components/integrated';
 * 
 * function TaskCard({ taskId }) {
 *   const { toggleTaskStatus, isLoading } = useTaskOperations();
 *   const { publishDocument } = useDocumentOperations();
 *   
 *   // 使用智能操作...
 * }
 * ```
 */

/**
 * 组件性能指标说明：
 * 
 * - 渲染时间: 单次渲染所需时间，理想值 < 16ms (60fps)
 * - 重渲染次数: 组件重新渲染的次数，过多可能影响性能
 * - 内存使用: 组件占用的内存大小，需要注意内存泄漏
 * - 性能分数: 综合评分，90+ 优秀，70+ 良好，50+ 一般，<50 需要优化
 * 
 * 性能优化建议：
 * 
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 使用 useMemo 和 useCallback 缓存计算结果和函数
 * 3. 合理使用 useEffect 依赖项
 * 4. 避免在渲染函数中创建新对象或函数
 * 5. 使用虚拟化技术处理大列表
 * 6. 实施代码分割和懒加载
 * 7. 监控和分析性能瓶颈
 */

/**
 * 迁移指南：
 * 
 * 从原有组件迁移到增强组件：
 * 
 * 1. 逐步替换：可以逐个组件进行替换，不需要一次性更换所有组件
 * 2. 配置兼容：新组件保持与原组件的 API 兼容性
 * 3. 性能监控：在开发环境中启用性能监控，观察优化效果
 * 4. 渐进增强：先使用基础功能，然后逐步启用高级特性
 * 
 * 示例迁移步骤：
 * 
 * ```tsx
 * // 原有组件
 * import TaskInfoEditor from '@/components/TaskInfoEditor';
 * 
 * // 迁移后
 * import { TaskInfoEditor } from '@/components/integrated';
 * 
 * // 使用增强功能
 * <TaskInfoEditor
 *   task={task}
 *   onUpdate={handleUpdate}
 *   readOnly={false}
 *   showEditHistory={true} // 新功能
 * />
 * ```
 */