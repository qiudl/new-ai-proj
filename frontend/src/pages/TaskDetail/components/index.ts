/**
 * Central export point for all TaskDetail components
 */

// Export Header components
export { TaskBreadcrumb } from './Header/TaskBreadcrumb';
export type { TaskBreadcrumbProps } from './Header/TaskBreadcrumb';
export { TaskDetailHeaderCard } from './Header/TaskDetailHeaderCard';
export type { TaskDetailHeaderCardProps } from './Header/TaskDetailHeaderCard';
export { TaskProgressInline } from './Header/TaskProgressInline';
export type { TaskProgressInlineProps } from './Header/TaskProgressInline';
export { EnhancedTaskHeaderCard } from './Header/EnhancedTaskHeaderCard';
export type { EnhancedTaskHeaderCardProps } from './Header/EnhancedTaskHeaderCard';

// Export Content components
export { default as TaskDetailContent } from './Content/TaskDetailContent';
export type { TaskDetailContentProps } from './Content/TaskDetailContent';

// Export Sidebar components
export { default as TaskDetailSidebar } from './Sidebar/TaskDetailSidebar';
export type { TaskDetailSidebarProps } from './Sidebar/TaskDetailSidebar';

// Export Modal components
export { default as TaskDetailModals } from './Modals/TaskDetailModals';
export type { TaskDetailModalsProps } from './Modals/TaskDetailModals';

// Export Layout components
export { default as TaskDetailLayout } from './Layout/TaskDetailLayout';
export type { TaskDetailLayoutProps } from './Layout/TaskDetailLayout';
