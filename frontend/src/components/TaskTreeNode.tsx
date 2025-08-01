import React, { memo, useMemo } from 'react';
import { Task } from '../types/task';
import { Tag, Tooltip } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { formatDate } from '../utils/dateUtils';

export interface TaskTreeNodeProps {
  task: Task;
  level: number;
  isSelected?: boolean;
  isDisabled?: boolean;
  showDetails?: boolean;
  onClick?: (task: Task) => void;
  className?: string;
}

/**
 * Task tree node component for hierarchical display
 * Shows task information in a tree structure with level indentation
 * Memoized for performance optimization
 */
export const TaskTreeNode: React.FC<TaskTreeNodeProps> = memo(({
  task,
  level,
  isSelected = false,
  isDisabled = false,
  showDetails = true,
  onClick,
  className = '',
}) => {
  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(task);
    }
  };


  const getLevelIcon = (level: number, hasChildren: boolean = false) => {
    if (level === 0) {
      return hasChildren ? <FolderOpenOutlined /> : <FolderOutlined />;
    }
    return <FileTextOutlined />;
  };

  // Memoize expensive calculations
  const indentStyle = useMemo(() => ({
    paddingLeft: `${level * 20 + 8}px`,
  }), [level]);

  const nodeClassName = useMemo(() => [
    'task-tree-node',
    isSelected ? 'selected' : '',
    isDisabled ? 'disabled' : '',
    onClick ? 'clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' '), [isSelected, isDisabled, onClick, className]);

  // Memoize status-related calculations
  const statusInfo = useMemo(() => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed':
          return 'success';
        case 'in_progress':
          return 'processing';
        case 'cancelled':
          return 'error';
        default:
          return 'default';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'todo':
          return '待办';
        case 'in_progress':
          return '进行中';
        case 'completed':
          return '已完成';
        case 'cancelled':
          return '已取消';
        default:
          return status;
      }
    };

    return {
      color: getStatusColor(task.status),
      text: getStatusText(task.status),
    };
  }, [task.status]);

  return (
    <div
      className={nodeClassName}
      style={indentStyle}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !isDisabled ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick && !isDisabled) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="task-tree-node-content">
        {/* Level indicator and icon */}
        <div className="task-tree-node-icon">
          {getLevelIcon(level, (task as any).children_count > 0)}
        </div>

        {/* Task title and basic info */}
        <div className="task-tree-node-main">
          <div className="task-tree-node-title">
            <Tooltip title={task.description || task.title}>
              <span className="task-title">{task.title}</span>
            </Tooltip>
            {level > 0 && (
              <span className="task-level-indicator">L{level}</span>
            )}
          </div>

          {showDetails && (
            <div className="task-tree-node-details">
              {/* Status tag */}
              <Tag color={statusInfo.color}>
                {statusInfo.text}
              </Tag>

              {/* Due date */}
              {task.due_date && (
                <Tooltip title="截止日期">
                  <span className="task-detail-item">
                    <CalendarOutlined />
                    {formatDate(task.due_date)}
                  </span>
                </Tooltip>
              )}

              {/* Assignee */}
              {task.assignee_id && (
                <Tooltip title="负责人">
                  <span className="task-detail-item">
                    <UserOutlined />
                    {(task as any).assignee_name || `用户${task.assignee_id}`}
                  </span>
                </Tooltip>
              )}

              {/* Children count */}
              {(task as any).children_count > 0 && (
                <span className="task-children-count">
                  ({(task as any).children_count}个子任务)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .task-tree-node {
          padding: 8px 0;
          border-radius: 4px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .task-tree-node.clickable {
          cursor: pointer;
        }

        .task-tree-node.clickable:hover {
          background-color: #f5f5f5;
          border-color: #d9d9d9;
        }

        .task-tree-node.selected {
          background-color: #e6f7ff;
          border-color: #1890ff;
        }

        .task-tree-node.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .task-tree-node-content {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .task-tree-node-icon {
          flex-shrink: 0;
          color: #8c8c8c;
          font-size: 14px;
          line-height: 22px;
        }

        .task-tree-node-main {
          flex: 1;
          min-width: 0;
        }

        .task-tree-node-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .task-title {
          font-weight: 500;
          color: #262626;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .task-level-indicator {
          background-color: #f0f0f0;
          color: #8c8c8c;
          padding: 0 4px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: normal;
          flex-shrink: 0;
        }

        .task-tree-node-details {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .task-detail-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #8c8c8c;
        }

        .task-children-count {
          font-size: 12px;
          color: #8c8c8c;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .task-tree-node {
            padding: 6px 0;
          }

          .task-tree-node-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .task-detail-item {
            font-size: 11px;
          }
        }
        `
      }} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.due_date === nextProps.task.due_date &&
    prevProps.task.assignee_id === nextProps.task.assignee_id &&
    prevProps.level === nextProps.level &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDisabled === nextProps.isDisabled &&
    prevProps.showDetails === nextProps.showDetails &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick
  );
});