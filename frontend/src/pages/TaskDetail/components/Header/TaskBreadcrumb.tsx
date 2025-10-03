/**
 * TaskBreadcrumb - Task detail breadcrumb navigation
 *
 * Displays hierarchical breadcrumb navigation for tasks:
 * 项目任务 > 父任务 > 当前任务
 */

import React from 'react';
import { Breadcrumb } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../../types/task.types';

export interface TaskBreadcrumbProps {
  /** Current task */
  task: Task;
  /** Parent task (if any) */
  parentTask?: Task | null;
  /** Project ID */
  projectId: number;
  /** Custom CSS class */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

export const TaskBreadcrumb: React.FC<TaskBreadcrumbProps> = ({
  task,
  parentTask,
  projectId,
  className = '',
  testId = 'task-breadcrumb',
}) => {
  const navigate = useNavigate();

  const breadcrumbItems = [
    // 返回按钮和项目任务根节点
    {
      title: (
        <span
          onClick={() => navigate(`/projects/${projectId}`)}
          style={{
            color: '#1890ff',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0',
            fontSize: '14px',
            lineHeight: '22px',
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: '12px' }} />
          项目任务
        </span>
      ),
    },
    // 如果有父任务，显示父任务链接
    ...(task.parent_id && parentTask
      ? [
          {
            title: (
              <span
                onClick={() =>
                  navigate(`/projects/${task.project_id}/tasks/${task.parent_id}`)
                }
                style={{
                  color: '#1890ff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '22px',
                }}
              >
                {parentTask.title}
              </span>
            ),
          },
        ]
      : []),
    // 当前任务名称
    {
      title: (
        <span
          style={{
            fontSize: '14px',
            lineHeight: '22px',
            color: '#8c8c8c',
            fontWeight: 500,
          }}
        >
          {task.title}
        </span>
      ),
    },
  ];

  return (
    <Breadcrumb
      className={className}
      data-testid={testId}
      style={{
        marginBottom: '16px',
        fontSize: '14px',
        lineHeight: '22px',
      }}
      items={breadcrumbItems}
    />
  );
};

TaskBreadcrumb.displayName = 'TaskBreadcrumb';

export default TaskBreadcrumb;
