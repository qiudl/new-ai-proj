/**
 * TaskDetailPage - Main container component
 * 
 * This is the main page component that orchestrates all TaskDetail features
 */

import React, { useEffect, useMemo } from 'react';
import { Spin, Alert, ConfigProvider } from 'antd';
import { TaskDetailProvider } from './context/TaskDetailProvider';
import { TaskDetailLayout } from './components/Layout/TaskDetailLayout';
import { TaskDetailHeader } from './components/Header/TaskDetailHeader';
import { TaskDetailContent } from './components/Content/TaskDetailContent';
import { TaskDetailSidebar } from './components/Sidebar/TaskDetailSidebar';
import { TaskDetailModals } from './components/Modals/TaskDetailModals';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useTaskDetail } from './hooks/data/useTaskDetail';
import type { Task } from './types';
import './styles/TaskDetail.css';

export interface TaskDetailPageProps {
  projectId: number;
  taskId: number;
}

/**
 * Inner component that uses the context
 */
const TaskDetailPageContent: React.FC = () => {
  const { task, loading, error, refreshTask } = useTaskDetail();

  // Auto-refresh on mount
  useEffect(() => {
    refreshTask();
  }, [refreshTask]);

  // Handle loading state
  if (loading.initial) {
    return (
      <div className="task-detail-loading-container">
        <Spin size="large" tip="Loading task details..." />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="task-detail-error-container">
        <Alert
          message="Error Loading Task"
          description={error.message || 'Failed to load task details. Please try again.'}
          type="error"
          showIcon
          action={
            <button
              className="task-detail-retry-button"
              onClick={refreshTask}
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  // Handle not found state
  if (!task) {
    return (
      <div className="task-detail-not-found">
        <Alert
          message="Task Not Found"
          description="The requested task could not be found."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <TaskDetailLayout
      header={<TaskDetailHeader task={task} />}
      content={<TaskDetailContent task={task} />}
      sidebar={<TaskDetailSidebar task={task} />}
    />
  );
};

/**
 * Main TaskDetailPage component
 */
const TaskDetailPage: React.FC<TaskDetailPageProps> = ({ projectId, taskId }) => {
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ projectId, taskId }), [projectId, taskId]);

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 4,
          },
        }}
      >
        <TaskDetailProvider {...contextValue}>
          <div className="task-detail-page">
            <TaskDetailPageContent />
            <TaskDetailModals />
          </div>
        </TaskDetailProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default TaskDetailPage;