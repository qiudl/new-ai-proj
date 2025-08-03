import React from 'react';
import { Task } from '../types/task';
import { TaskTreeNode } from './TaskTreeNode';
import { Empty, Spin, Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export interface TaskTreeListProps {
  tasks: Task[];
  loading?: boolean;
  error?: string | null;
  selectedTaskId?: number;
  disabledTaskIds?: number[];
  showDetails?: boolean;
  showLevelFilter?: boolean;
  maxDisplayLevel?: number;
  onTaskSelect?: (task: Task) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  emptyText?: string;
  searchKeyword?: string;
}

/**
 * Task tree list component with hierarchical display
 * Supports selection, filtering, and pagination
 */
export const TaskTreeList: React.FC<TaskTreeListProps> = ({
  tasks,
  loading = false,
  error = null,
  selectedTaskId,
  disabledTaskIds = [],
  showDetails = true,
  showLevelFilter = false,
  maxDisplayLevel = 3,
  onTaskSelect,
  onLoadMore,
  hasMore = false,
  className = '',
  emptyText = '暂无可选的父任务',
  searchKeyword = '',
}) => {
  // Ensure tasks is always an array
  const safeTasks = React.useMemo(() => {
    const result = Array.isArray(tasks) ? tasks : [];
    return result;
  }, [tasks]);

  // Filter tasks by level if specified
  const filteredTasks = React.useMemo(() => {
    let result;
    if (!showLevelFilter || maxDisplayLevel === undefined) {
      result = safeTasks;
    } else {
      result = safeTasks.filter(task => task.task_level <= maxDisplayLevel);
    }
    return result;
  }, [safeTasks, showLevelFilter, maxDisplayLevel]);

  // Group tasks by level for better display
  const tasksByLevel = React.useMemo(() => {
    const groups: { [level: number]: Task[] } = {};
    filteredTasks.forEach(task => {
      const level = task.task_level || 0;
      if (!groups[level]) {
        groups[level] = [];
      }
      groups[level].push(task);
    });
    return groups;
  }, [filteredTasks]);

  const handleTaskClick = (task: Task) => {
    if (onTaskSelect && !disabledTaskIds.includes(task.id)) {
      onTaskSelect(task);
    }
  };

  const handleLoadMore = () => {
    if (onLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  };

  const renderTasks = () => {
    if (error) {
      return (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          className="task-tree-error"
        />
      );
    }

    if (!loading && filteredTasks.length === 0) {
      return (
        <Empty
          description={emptyText}
          className="task-tree-empty"
        />
      );
    }

    // Render tasks in level order
    const sortedLevels = Object.keys(tasksByLevel)
      .map(Number)
      .sort((a, b) => a - b);
    
    return (
      <div className="task-tree-content">
        {sortedLevels.map(level => {
          const levelTasks = tasksByLevel[level];
          return (
            <div key={level} className="task-level-group">
              {showLevelFilter && level > 0 && (
                <div className={`level-separator level-${level}`}>
                  <div className="level-line"></div>
                  <span className={`level-label level-${level}`}>
                    {'└'.repeat(level)} 第{level + 1}级任务 ({tasksByLevel[level].length}个)
                  </span>
                  <div className="level-line"></div>
                </div>
              )}
              
              {tasksByLevel[level]
                .sort((a, b) => a.title.localeCompare(b.title))
                .map(task => {
                  return (
                    <TaskTreeNode
                      key={task.id}
                      task={task}
                      level={level}
                      isSelected={selectedTaskId === task.id}
                      isDisabled={disabledTaskIds.includes(task.id)}
                      showDetails={showDetails}
                      onClick={handleTaskClick}
                      className="task-tree-item"
                      searchKeyword={searchKeyword}
                    />
                  );
                })}
            </div>
          );
        })}

        {/* Load more button */}
        {hasMore && (
          <div className="task-tree-load-more">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="load-more-button"
            >
              {loading ? (
                <>
                  <LoadingOutlined /> 加载中...
                </>
              ) : (
                '加载更多'
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`task-tree-list ${className}`}>
      {loading && filteredTasks.length === 0 ? (
        <div className="task-tree-loading">
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            tip="加载任务列表..."
          />
        </div>
      ) : (
        renderTasks()
      )}

      <style jsx global>{`
        .task-tree-list {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          background: #fff;
        }

        .task-tree-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
        }

        .task-tree-error {
          margin: 16px;
        }

        .task-tree-empty {
          padding: 40px 20px;
        }

        .task-tree-content {
          padding: 8px;
        }

        .task-level-group {
          margin-bottom: 12px;
          position: relative;
        }

        .task-level-group:last-child {
          margin-bottom: 0;
        }

        .level-separator {
          display: flex;
          align-items: center;
          margin: 16px 12px 12px 12px;
          font-size: 12px;
        }

        .level-separator.level-1 {
          margin-left: 24px;
        }

        .level-separator.level-2 {
          margin-left: 36px;
        }

        .level-separator.level-3 {
          margin-left: 48px;
        }

        .level-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, #d9d9d9, transparent);
        }

        .level-label {
          padding: 4px 12px;
          white-space: nowrap;
          background-color: #fafafa;
          border: 1px solid #d9d9d9;
          border-radius: 12px;
          font-weight: 500;
          margin: 0 8px;
          font-size: 11px;
        }

        .level-label.level-1 {
          color: #52c41a;
          border-color: #b7eb8f;
          background-color: #f6ffed;
        }

        .level-label.level-2 {
          color: #faad14;
          border-color: #ffd591;
          background-color: #fff7e6;
        }

        .level-label.level-3 {
          color: #722ed1;
          border-color: #d3adf7;
          background-color: #f9f0ff;
        }

        .task-tree-item {
          margin-bottom: 2px;
        }

        .task-tree-load-more {
          padding: 16px;
          text-align: center;
          border-top: 1px solid #f0f0f0;
          margin-top: 8px;
        }

        .load-more-button {
          background: none;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          color: #1890ff;
          transition: all 0.2s ease;
        }

        .load-more-button:hover:not(:disabled) {
          border-color: #1890ff;
          color: #40a9ff;
        }

        .load-more-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Custom scrollbar */
        .task-tree-list::-webkit-scrollbar {
          width: 6px;
        }

        .task-tree-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .task-tree-list::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .task-tree-list::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        @media (max-width: 768px) {
          .task-tree-list {
            max-height: 300px;
          }

          .task-tree-content {
            padding: 4px;
          }

          .level-label {
            font-size: 11px;
            padding: 3px 6px;
          }
        }
      `}</style>
    </div>
  );
};