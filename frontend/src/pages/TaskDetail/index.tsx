/**
 * TaskDetail Module - Main Entry Point
 * 
 * This is the refactored version of TaskDetailPageNew.tsx
 * Split into smaller, focused components for better maintainability
 */

import React, { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { useParams } from 'react-router-dom';

// Lazy load the main page component for better performance
const TaskDetailPage = lazy(() => import('./TaskDetailPage'));

/**
 * TaskDetail Route Component
 * This component serves as the route-level entry point
 */
const TaskDetail: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();

  if (!projectId || !taskId) {
    return (
      <div className="task-detail-error">
        <h2>Invalid Task Parameters</h2>
        <p>Project ID and Task ID are required.</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="task-detail-loading">
          <Spin size="large" tip="Loading task details...">
            <div style={{ minHeight: '100px' }} />
          </Spin>
        </div>
      }
    >
      <TaskDetailPage 
        projectId={parseInt(projectId, 10)} 
        taskId={parseInt(taskId, 10)} 
      />
    </Suspense>
  );
};

export default TaskDetail;