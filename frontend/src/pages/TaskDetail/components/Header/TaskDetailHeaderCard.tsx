/**
 * TaskDetailHeaderCard - Enhanced Card-based task header component
 * 
 * This component provides a Card-based layout for the task header with
 * improved visual hierarchy, better information grouping, and enhanced UX.
 * It wraps the existing TaskDetailHeader functionality in a Card format.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Space,
  Button,
  Tag,
  Typography,
  Dropdown,
  Tooltip,
  Badge,
  Avatar
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  MoreOutlined,
  CalendarOutlined,
  UserOutlined,
  StarOutlined,
  StarFilled,
  ClockCircleOutlined
} from '@ant-design/icons';
// ✅ FIXED - Comment out non-existent hook (TS2307)
// import { useKeyboardShortcuts } from '../../hooks/ui/useKeyboardShortcuts';
import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import MVPTaskDetailTimer from '../../../../components/MVPTaskDetailTimer';
import { TaskBreadcrumb } from './TaskBreadcrumb';
import './TaskDetailHeaderCard.css';

const { Title, Text } = Typography;

export interface TaskDetailHeaderCardProps {
  /** Task data to display */
  task: Task;
  /** Parent task (for breadcrumb navigation) */
  parentTask?: Task | null;
  /** Project ID */
  projectId: number;
  /** Callback for edit action */
  onEdit?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Callback for status change */
  onStatusChange?: (status: TaskStatus) => void;
  /** Callback for share action */
  onShare?: () => void;
  /** Callback for priority change */
  onPriorityChange?: (priority: TaskPriority) => void;
  /** Callback for favorite toggle */
  onToggleFavorite?: () => void;
  /** Whether task is favorited */
  isFavorite?: boolean;
  /** Loading states for different actions */
  loading?: {
    edit?: boolean;
    delete?: boolean;
    share?: boolean;
    status?: boolean;
    priority?: boolean;
  };
  /** Permission flags */
  permissions?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
    canChangeStatus?: boolean;
    canChangePriority?: boolean;
  };
  /** Custom CSS class */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Status configuration with colors and icons
 */
const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  planning: { color: 'blue', label: '规划中' },
  todo: { color: 'orange', label: '待办' },
  in_progress: { color: 'processing', label: '进行中' },
  testing: { color: 'purple', label: '测试中' },
  completed: { color: 'success', label: '已完成' },
  cancelled: { color: 'error', label: '已取消' },
  on_hold: { color: 'warning', label: '暂停' },
  suspended: { color: 'default', label: '挂起' },
  blocked: { color: 'error', label: '阻塞' },
  archived: { color: 'default', label: '已归档' },
};

/**
 * Priority configuration with colors
 */
const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: 'blue', label: '低' },
  medium: { color: 'orange', label: '中' },
  high: { color: 'red', label: '高' },
  urgent: { color: 'magenta', label: '紧急' },
  critical: { color: 'volcano', label: '严重' },
};

export const TaskDetailHeaderCard: React.FC<TaskDetailHeaderCardProps> = React.memo(({
  task,
  parentTask,
  projectId,
  onEdit,
  onDelete,
  onStatusChange,
  onShare,
  onPriorityChange,
  onToggleFavorite,
  isFavorite = false,
  loading = {},
  permissions = {},
  className = '',
  testId = 'task-detail-header-card',
}) => {
  // Default permissions
  const {
    canEdit = true,
    canDelete = true,
    canShare = true,
    canChangeStatus = true,
    canChangePriority = true,
  } = permissions;

  // Keyboard shortcuts
  // ✅ FIXED - Comment out non-existent hook usage (TS2307)
  /*
  useKeyboardShortcuts([
    {
      key: 'e',
      modifiers: [],
      description: 'Edit task',
      handler: () => canEdit && onEdit?.(),
      enabled: canEdit && !!onEdit,
      preventDefault: true,
    },
    {
      key: 'Delete',
      modifiers: [],
      description: 'Delete task',
      handler: () => canDelete && onDelete?.(),
      enabled: canDelete && !!onDelete,
      preventDefault: true,
    },
  ]);
  */

  // Status change menu items
  const statusMenuItems = useMemo(() => {
    if (!canChangeStatus) return [];

    return Object.entries(STATUS_CONFIG)
      .filter(([status]) => status !== task.status)
      .map(([status, config]) => ({
        key: status,
        label: config.label,
        onClick: () => onStatusChange?.(status as TaskStatus),
      }));
  }, [task.status, canChangeStatus, onStatusChange]);

  // Priority change menu items
  const priorityMenuItems = useMemo(() => {
    if (!canChangePriority) return [];

    return Object.entries(PRIORITY_CONFIG)
      .filter(([priority]) => priority !== task.priority)
      .map(([priority, config]) => ({
        key: priority,
        label: config.label,
        onClick: () => onPriorityChange?.(priority as TaskPriority),
      }));
  }, [task.priority, canChangePriority, onPriorityChange]);

  // More actions menu
  const moreMenuItems = useMemo(() => {
    const items = [];

    if (canShare && onShare) {
      items.push({
        key: 'share',
        icon: <ShareAltOutlined />,
        label: '分享任务',
        onClick: onShare,
      });
    }

    if (onToggleFavorite) {
      items.push({
        key: 'favorite',
        icon: isFavorite ? <StarFilled /> : <StarOutlined />,
        label: isFavorite ? '取消收藏' : '添加收藏',
        onClick: onToggleFavorite,
      });
    }

    return items;
  }, [canShare, onShare, onToggleFavorite, isFavorite]);

  // Format due date
  const formatDueDate = useCallback((dueDate: string | undefined) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Text type="danger">逾期 {Math.abs(diffDays)} 天</Text>;
    } else if (diffDays === 0) {
      return <Text type="warning">今天到期</Text>;
    } else if (diffDays <= 7) {
      return <Text type="warning">{diffDays} 天后到期</Text>;
    } else {
      return <Text>{date.toLocaleDateString()}</Text>;
    }
  }, []);

  // Action buttons
  const actionButtons = (
    <Space size="middle">
      {/* Task Timer */}
      <MVPTaskDetailTimer
        taskId={task.id}
        taskTitle={task.title}
        taskStatus={task.status}
        projectId={task.project_id}
        className="task-header-timer"
      />
      
      {/* Edit Button */}
      {canEdit && onEdit && (
        <Tooltip title="编辑任务 (E)">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onEdit}
            loading={loading.edit}
          >
            编辑
          </Button>
        </Tooltip>
      )}

      {/* Delete Button */}
      {canDelete && onDelete && (
        <Tooltip title="删除任务 (Del)">
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
            loading={loading.delete}
          >
            删除
          </Button>
        </Tooltip>
      )}

      {/* More Actions */}
      {moreMenuItems.length > 0 && (
        <Dropdown 
          menu={{ items: moreMenuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )}
    </Space>
  );

  return (
    <div
      className={`task-detail-header ${className}`.trim()}
      data-testid={testId}
    >
      {/* Breadcrumb Navigation */}
      <div className="task-header-breadcrumb">
        <TaskBreadcrumb
          task={task}
          parentTask={parentTask}
          projectId={projectId}
        />
      </div>

      {/* Main Header Content */}
      <div className="task-header-main">
        <div className="task-header-left">
          {/* Task Title */}
          <div className="task-header-title">
            <Title level={2} className="task-title" editable={false}>
              {task.title}
            </Title>
            
            {/* Task ID Badge */}
            <Badge count={`#${task.id}`} 
              style={{ 
                backgroundColor: '#f0f2f5', 
                color: '#666',
                fontSize: '12px'
              }} 
            />
          </div>

          {/* Task Meta Information */}
          <div className="task-header-meta">
            <Space size="middle">
              {/* Status */}
              <Dropdown 
                menu={{ items: statusMenuItems }}
                disabled={!canChangeStatus || loading.status}
                trigger={['click']}
              >
                <Tag 
                  color={STATUS_CONFIG[task.status]?.color || 'default'}
                  className="task-status-tag clickable"
                >
                  {STATUS_CONFIG[task.status]?.label || task.status}
                </Tag>
              </Dropdown>

              {/* Priority */}
              <Dropdown 
                menu={{ items: priorityMenuItems }}
                disabled={!canChangePriority || loading.priority}
                trigger={['click']}
              >
                <Tag 
                  color={PRIORITY_CONFIG[task.priority]?.color || 'default'}
                  className="task-priority-tag clickable"
                >
                  {PRIORITY_CONFIG[task.priority]?.label || task.priority}
                </Tag>
              </Dropdown>

              {/* Assignee */}
              {task.assignee_id && (
                <Tooltip title="负责人">
                  <div className="task-assignee">
                    <Avatar size="small" icon={<UserOutlined />} />
                    <Text className="assignee-name">负责人</Text>
                  </div>
                </Tooltip>
              )}

              {/* Due Date */}
              {task.due_date && (
                <Tooltip title="截止日期">
                  <div className="task-due-date">
                    <CalendarOutlined />
                    {formatDueDate(task.due_date)}
                  </div>
                </Tooltip>
              )}

              {/* Time Tracking */}
              {(task.estimated_hours || task.actual_hours) && (
                <Tooltip title="工时统计">
                  <div className="task-time">
                    <ClockCircleOutlined />
                    <Text>
                      {task.actual_hours || 0}h / {task.estimated_hours || 0}h
                    </Text>
                  </div>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="task-header-actions">
          {actionButtons}
        </div>
      </div>

      {/* Task Description Preview */}
      {task.description && (
        <div className="task-header-description">
          <Text 
            type="secondary" 
            ellipsis={true}
            className="task-description-text"
          >
            {task.description}
          </Text>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.task?.id === nextProps.task?.id &&
    prevProps.task?.title === nextProps.task?.title &&
    prevProps.task?.status === nextProps.task?.status &&
    prevProps.task?.priority === nextProps.task?.priority &&
    prevProps.task?.updated_at === nextProps.task?.updated_at &&
    prevProps.parentTask?.id === nextProps.parentTask?.id &&
    prevProps.parentTask?.title === nextProps.parentTask?.title &&
    prevProps.projectId === nextProps.projectId &&
    prevProps.isFavorite === nextProps.isFavorite &&
    JSON.stringify(prevProps.loading) === JSON.stringify(nextProps.loading) &&
    JSON.stringify(prevProps.permissions) === JSON.stringify(nextProps.permissions) &&
    prevProps.className === nextProps.className
  );
});

export default TaskDetailHeaderCard;