/**
 * EnhancedTaskHeaderCard - Enhanced task header card with full feature parity
 *
 * Features:
 * - Status-based background color and border
 * - Task progress bar (TaskProgressInline)
 * - Daily Focus toggle button
 * - Archive status alert
 * - Restore task button (for archived tasks)
 * - Edit and Delete actions
 */

import React from 'react';
import { Card, Typography, Tag, Button, Alert, Space } from 'antd';
import {
  FileTextOutlined,
  TagOutlined,
  UserOutlined,
  UserAddOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import DailyFocusTaskToggle from '../../../../components/DailyFocusTaskToggle';
import { TaskProgressInline } from './TaskProgressInline';
import type { Task, TaskStatus } from '../../types/task.types';

const { Title, Text } = Typography;

export interface EnhancedTaskHeaderCardProps {
  /** Task data */
  task: Task;
  /** Project ID */
  projectId: number;
  /** Status configuration */
  statusConfig?: {
    text: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  /** Priority configuration */
  priorityConfig?: {
    text: string;
    color: string;
  };
  /** Time remaining info */
  timeRemaining?: {
    text: string;
    type: 'danger' | 'warning' | 'normal';
  };
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Unarchive handler */
  onUnarchive?: () => void;
  /** Daily Focus toggle complete handler */
  onDailyFocusToggle?: (isInFocus: boolean) => void;
  /** Loading state */
  loading?: boolean;
  /** Custom class name */
  className?: string;
  /** Test ID */
  testId?: string;
}

export const EnhancedTaskHeaderCard: React.FC<EnhancedTaskHeaderCardProps> = ({
  task,
  projectId,
  statusConfig,
  priorityConfig,
  timeRemaining,
  onEdit,
  onDelete,
  onUnarchive,
  onDailyFocusToggle,
  loading = false,
  className = '',
  testId = 'enhanced-task-header-card'
}) => {
  return (
    <Card
      className={`task-status-card ${className}`.trim()}
      data-testid={testId}
      style={{
        marginBottom: '24px',
        background: statusConfig?.bgColor || '#ffffff',
        border: `2px solid ${statusConfig?.color || '#d9d9d9'}`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* Task Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px', color: statusConfig?.color || '#666' }}>
              {statusConfig?.icon || <FileTextOutlined />}
            </div>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              {task.title}
            </Title>
          </div>

          {/* Task Metadata */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TagOutlined style={{ color: '#666' }} />
              <Text>ID: #{task.id} | 状态:</Text>
              <Tag color={statusConfig?.color || 'default'} icon={statusConfig?.icon}>
                {statusConfig?.text || '加载中'}
              </Tag>
              <Text>| 优先级:</Text>
              <Tag color={priorityConfig?.color || 'default'}>
                {priorityConfig?.text || '加载中'}
              </Tag>
            </div>

            {task.assignee_id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserOutlined style={{ color: '#666' }} />
                <Text>负责人: {(task as any).assignee_name || `用户 ${task.assignee_id}`}</Text>
              </div>
            )}

            {(task as any).created_by && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserAddOutlined style={{ color: '#666' }} />
                <Text>创建人: {(task as any).creator_name || `用户 ${(task as any).created_by}`}</Text>
              </div>
            )}

            {timeRemaining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarOutlined
                  style={{
                    color:
                      timeRemaining.type === 'danger'
                        ? '#ff4d4f'
                        : timeRemaining.type === 'warning'
                        ? '#fa8c16'
                        : '#666'
                  }}
                />
                <Text
                  style={{
                    color:
                      timeRemaining.type === 'danger'
                        ? '#ff4d4f'
                        : timeRemaining.type === 'warning'
                        ? '#fa8c16'
                        : '#666'
                  }}
                >
                  {timeRemaining.text}
                </Text>
              </div>
            )}
          </div>

          {/* Task Progress Bar */}
          <TaskProgressInline
            taskId={task.id}
            status={
              task.status as 'todo' | 'in_progress' | 'blocked' | 'completed'
            }
            style={{ marginBottom: '16px' }}
          />
        </div>

        {/* Archive Alert */}
        {task.status === 'archived' && (
          <Alert
            message="任务已归档"
            description="此任务已被归档，不能进行编辑操作。如需恢复，请点击'恢复任务'按钮。"
            type="warning"
            showIcon
            icon={<InboxOutlined />}
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {task.status !== 'archived' && (
            <DailyFocusTaskToggle
              taskId={task.id}
              taskTitle={task.title}
              initialPriority="high"
              onToggleComplete={(isInFocus) => {
                console.log(`Task ${task.id} daily focus status changed to:`, isInFocus);
                onDailyFocusToggle?.(isInFocus);
              }}
            />
          )}
          {task.status === 'archived' ? (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onUnarchive}
              loading={loading}
            >
              恢复任务
            </Button>
          ) : (
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                编辑任务
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
                删除
              </Button>
            </Space>
          )}
        </div>
      </div>
    </Card>
  );
};

EnhancedTaskHeaderCard.displayName = 'EnhancedTaskHeaderCard';

export default EnhancedTaskHeaderCard;
