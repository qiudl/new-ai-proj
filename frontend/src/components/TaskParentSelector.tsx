import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select, Tag, Tooltip, Alert } from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { Task } from '../types/task';
import { TaskTreeList } from './TaskTreeList';
import { useTaskParentSearch } from '../hooks/useTaskParentSearch';
import { useParentValidation } from '../hooks/useParentValidation';
import { debounce } from 'lodash';

const { Search } = Input;

export interface TaskParentSelectorProps {
  projectId: number;
  currentTaskId?: number;
  currentParentId?: number | null;
  value?: number | null;
  onChange?: (parentId: number | null, parentTask?: Task | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  showValidation?: boolean;
  className?: string;
}

/**
 * Core parent task selector component
 * Provides search, selection, and validation for parent tasks
 */
export const TaskParentSelector: React.FC<TaskParentSelectorProps> = ({
  projectId,
  currentTaskId,
  currentParentId,
  value,
  onChange,
  disabled = false,
  placeholder = '搜索并选择父任务...',
  allowClear = true,
  showValidation = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { searchResults, searchParentTasks, clearResults, loadMore } = useTaskParentSearch();
  const { validateParentSelection, validateTaskLevel } = useParentValidation();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (keyword: string) => {
      if (!projectId) return;

      await searchParentTasks({
        projectId,
        keyword,
        excludeTaskId: currentTaskId,
        maxLevel: 2, // Allow up to level 2 tasks as parents (to create level 3 children)
        limit: 20,
        offset: 0,
      });
    }, 300),
    [projectId, currentTaskId, searchParentTasks]
  );

  // Handle search input change
  const handleSearchChange = (keyword: string) => {
    setSearchKeyword(keyword);
    debouncedSearch(keyword);
  };

  // Handle task selection
  const handleTaskSelect = async (task: Task) => {
    // Validate selection
    if (showValidation) {
      const validation = await validateParentSelection(currentTaskId, task.id);
      if (!validation.isValid) {
        setValidationError(validation.error || '选择无效');
        return;
      }

      const levelValidation = validateTaskLevel(task.task_level);
      if (!levelValidation.isValid) {
        setValidationError(levelValidation.error || '层级无效');
        return;
      }
    }

    setSelectedTask(task);
    setValidationError(null);
    setIsOpen(false);

    if (onChange) {
      onChange(task.id, task);
    }
  };

  // Handle clear selection
  const handleClear = () => {
    setSelectedTask(null);
    setValidationError(null);
    if (onChange) {
      onChange(null, null);
    }
  };

  // Handle open/close dropdown
  const handleToggleOpen = () => {
    if (disabled) return;

    if (!isOpen) {
      setIsOpen(true);
      // Initial search when opening
      if (!searchResults.tasks.length && !searchResults.loading) {
        debouncedSearch('');
      }
    } else {
      setIsOpen(false);
    }
  };

  // Find current parent task info
  useEffect(() => {
    const parentId = value ?? currentParentId;
    if (parentId && searchResults.tasks.length > 0) {
      const parentTask = searchResults.tasks.find(task => task.id === parentId);
      if (parentTask) {
        setSelectedTask(parentTask);
      }
    } else if (!parentId) {
      setSelectedTask(null);
    }
  }, [value, currentParentId, searchResults.tasks]);

  // Clear validation error when selection changes
  useEffect(() => {
    if (validationError) {
      setValidationError(null);
    }
  }, [value, currentParentId]);

  const renderCurrentSelection = () => {
    if (!selectedTask) {
      return (
        <div className="parent-selector-placeholder">
          <FolderOutlined />
          <span>{placeholder}</span>
        </div>
      );
    }

    return (
      <div className="parent-selector-current">
        <div className="current-task-info">
          <FolderOutlined />
          <span className="current-task-title">{selectedTask.title}</span>
          <Tag color="blue">
            L{selectedTask.task_level + 1}
          </Tag>
        </div>
        {allowClear && (
          <Tooltip title="清除选择">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="clear-button"
            />
          </Tooltip>
        )}
      </div>
    );
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return (
      <div className="parent-selector-dropdown">
        {/* Search input */}
        <div className="search-section">
          <Search
            placeholder="搜索父任务..."
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
            className="parent-search"
            autoFocus
          />
        </div>

        {/* Validation error */}
        {validationError && (
          <Alert
            message={validationError}
            type="error"
            showIcon
            className="validation-error"
          />
        )}

        {/* Help text */}
        <div className="help-text">
          <InfoCircleOutlined />
          <span>只能选择前3级任务作为父任务</span>
        </div>

        {/* Task list */}
        <TaskTreeList
          tasks={searchResults.tasks}
          loading={searchResults.loading}
          error={searchResults.error}
          selectedTaskId={selectedTask?.id}
          disabledTaskIds={currentTaskId ? [currentTaskId] : []}
          onTaskSelect={handleTaskSelect}
          onLoadMore={loadMore}
          hasMore={searchResults.hasMore}
          showLevelFilter={true}
          maxDisplayLevel={2}
          emptyText={searchKeyword ? '未找到匹配的任务' : '请输入关键词搜索任务'}
        />
      </div>
    );
  };

  return (
    <div className={`task-parent-selector ${className}`}>
      <div
        className={`parent-selector-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggleOpen}
      >
        {renderCurrentSelection()}
        <EditOutlined className="edit-icon" />
      </div>

      {renderDropdown()}

      <style jsx global>{`
        .task-parent-selector {
          position: relative;
          width: 100%;
        }

        .parent-selector-trigger {
          min-height: 32px;
          padding: 4px 11px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        }

        .parent-selector-trigger:hover:not(.disabled) {
          border-color: #40a9ff;
        }

        .parent-selector-trigger.open {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }

        .parent-selector-trigger.disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .parent-selector-placeholder {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #bfbfbf;
        }

        .parent-selector-current {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 8px;
        }

        .current-task-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .current-task-title {
          color: #262626;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .edit-icon {
          color: #8c8c8c;
          font-size: 14px;
          flex-shrink: 0;
        }

        .clear-button {
          color: #8c8c8c !important;
        }

        .parent-selector-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1050;
          background: #fff;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
                      0 3px 6px -4px rgba(0, 0, 0, 0.12),
                      0 9px 28px 8px rgba(0, 0, 0, 0.05);
          margin-top: 4px;
          max-height: 400px;
          overflow: hidden;
        }

        .search-section {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .validation-error {
          margin: 8px 12px;
        }

        .help-text {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: #f6ffed;
          border-bottom: 1px solid #f0f0f0;
          font-size: 12px;
          color: #52c41a;
        }

        @media (max-width: 768px) {
          .parent-selector-dropdown {
            position: fixed;
            top: 50%;
            left: 10px;
            right: 10px;
            transform: translateY(-50%);
            max-height: 80vh;
          }
        }
      `}</style>
    </div>
  );
};