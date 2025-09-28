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
  onToggle?: () => void;
  isExpanded?: boolean;
  hasChildren?: boolean;
  className?: string;
  searchKeyword?: string;
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
  onToggle,
  isExpanded = false,
  hasChildren = false,
  className = '',
  searchKeyword = '',
}) => {
  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(task);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggle) {
      onToggle();
    }
  };

  // Highlight search keyword in text
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <span key={index} className="highlight-keyword">{part}</span>;
      }
      return part;
    });
  };


  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return '#1890ff';
      case 1: return '#52c41a';
      case 2: return '#faad14';
      case 3: return '#722ed1';
      default: return '#8c8c8c';
    }
  };

  const getLevelIcon = (level: number, hasChildren: boolean = false, isExpanded: boolean = false) => {
    const color = getLevelColor(level);
    
    if (hasChildren) {
      switch (level) {
        case 0:
          return isExpanded ? <FolderOpenOutlined style={{ color }} /> : <FolderOutlined style={{ color }} />;
        case 1:
        case 2:
        default:
          return isExpanded ? <FolderOpenOutlined style={{ color }} /> : <FolderOutlined style={{ color }} />;
      }
    } else {
      return <FileTextOutlined style={{ color }} />;
    }
  };

  // Memoize expensive calculations with enhanced indentation
  const indentStyle = useMemo(() => ({
    paddingLeft: `${level * 24 + 12}px`,
    borderLeft: level > 0 ? `2px solid ${getLevelColor(level)}` : 'none',
    marginLeft: level > 0 ? '8px' : '0',
  }), [level]);

  const nodeClassName = useMemo(() => [
    'task-tree-node',
    isSelected ? 'selected' : '',
    isDisabled ? 'disabled' : '',
    onClick ? 'clickable' : '',
    task.status === 'archived' ? 'archived' : '',
    className,
  ]
    .filter(Boolean)
    .join(' '), [isSelected, isDisabled, onClick, task.status, className]);

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
        case 'archived':
          return 'default';
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
        case 'archived':
          return '已归档';
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
        {/* Expand/collapse button */}
        {hasChildren && (
          <div className="expand-toggle" onClick={handleToggle}>
            <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>
          </div>
        )}
        
        {/* Task icon */}
        <div className="task-tree-node-icon">
          {getLevelIcon(level, hasChildren, isExpanded)}
        </div>
        
        {/* Level badge */}
        <span className={`task-level-badge level-${level}`}>
          {level === 0 ? '根任务' : `L${level + 1}`}
        </span>
        
        {/* Task ID */}
        <span className="task-id">
          #{task.id}
        </span>
        
        {/* Task title with tooltip */}
        <Tooltip title={task.description || task.title}>
          <span className="task-title">
            {highlightText(task.title, searchKeyword)}
          </span>
        </Tooltip>
        
        {/* Status tag - compact inline version */}
        <span className={`task-status-inline status-${task.status}`}>
          {statusInfo.text}
        </span>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .task-tree-node {
          height: 36px;
          padding: 0 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
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

        .task-tree-node.archived {
          opacity: 0.6;
          background-color: #fafafa;
          filter: grayscale(20%);
        }

        .task-tree-node.archived .task-title {
          color: #8c8c8c;
          text-decoration: line-through;
        }

        .task-tree-node.archived .task-tree-node-icon {
          color: #bfbfbf;
        }

        .task-tree-node-content {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
        }

        .expand-toggle {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 2px;
          transition: background-color 0.2s;
          flex-shrink: 0;
        }

        .expand-toggle:hover {
          background-color: #f0f0f0;
        }

        .toggle-icon {
          font-size: 10px;
          color: #8c8c8c;
          transition: transform 0.2s ease;
          user-select: none;
        }

        .toggle-icon.expanded {
          transform: rotate(90deg);
        }

        .task-tree-node-icon {
          flex-shrink: 0;
          color: #8c8c8c;
          font-size: 14px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .task-title {
          font-weight: 500;
          color: #262626;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          font-size: 14px;
        }

        .task-level-badge {
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .task-level-badge.level-0 {
          background-color: #e6f7ff;
          color: #1890ff;
          border: 1px solid #91d5ff;
        }

        .task-level-badge.level-1 {
          background-color: #f6ffed;
          color: #52c41a;
          border: 1px solid #b7eb8f;
        }

        .task-level-badge.level-2 {
          background-color: #fff7e6;
          color: #faad14;
          border: 1px solid #ffd591;
        }

        .task-level-badge.level-3 {
          background-color: #f9f0ff;
          color: #722ed1;
          border: 1px solid #d3adf7;
        }

        .task-id {
          color: #8c8c8c;
          font-size: 11px;
          font-weight: 500;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background-color: #f5f5f5;
          padding: 1px 4px;
          border-radius: 3px;
          flex-shrink: 0;
          border: 1px solid #e8e8e8;
        }

        .task-status-inline {
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .task-status-inline.status-todo {
          background-color: #f6ffed;
          color: #52c41a;
        }

        .task-status-inline.status-in_progress {
          background-color: #e6f7ff;
          color: #1890ff;
        }

        .task-status-inline.status-completed {
          background-color: #f0f0f0;
          color: #8c8c8c;
        }

        .task-status-inline.status-cancelled {
          background-color: #fff2f0;
          color: #ff4d4f;
        }
        .task-status-inline.status-archived {
          background-color: #f5f5f5;
          color: #8c8c8c;
        }

        .highlight-keyword {
          background-color: #fff566;
          padding: 1px 2px;
          border-radius: 2px;
          font-weight: 500;
          color: #d48806;
        }

        @media (max-width: 768px) {
          .task-tree-node {
            height: 32px;
            padding: 0 6px;
          }

          .task-tree-node-content {
            gap: 6px;
          }

          .task-title {
            font-size: 13px;
          }

          .task-level-badge,
          .task-status-inline {
            font-size: 9px;
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