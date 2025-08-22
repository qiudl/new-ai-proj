import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select, Tag, Tooltip, Alert, Spin, Modal, Space, Typography } from 'antd';
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
  const [isValidating, setIsValidating] = useState(false);

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
    try {
      setIsValidating(true);
      setValidationError(null);

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
      // Don't close modal immediately in modal mode - let user confirm with OK button
      // setIsOpen(false);

    } catch (error) {
      console.error('Error selecting parent task:', error);
      setValidationError('选择父任务时发生错误，请重试');
    } finally {
      setIsValidating(false);
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

  const renderModal = () => {
    return (
      <Modal
        title="选择父任务"
        open={isOpen}
        onOk={() => {
          if (selectedTask && !validationError && !isValidating) {
            setIsOpen(false);
            if (onChange) {
              onChange(selectedTask.id, selectedTask);
            }
          } else if (!selectedTask && allowClear) {
            // Allow clearing selection
            setIsOpen(false);
            if (onChange) {
              onChange(null, null);
            }
          }
        }}
        onCancel={() => {
          setIsOpen(false);
          setValidationError(null);
        }}
        okText={selectedTask ? "确定选择" : (allowClear ? "清除父任务" : "确定")}
        cancelText="取消"
        width={600}
        bodyStyle={{ maxHeight: '450px', overflow: 'hidden' }}
        okButtonProps={{
          disabled: validationError !== null || isValidating || (!selectedTask && !allowClear),
          loading: isValidating,
          }}
          destroyOnHidden={false}
        >
        <div className="parent-selector-modal-content">
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

          {/* Selected task info */}
          {selectedTask && (
            <div className="selected-section">
              <div className="selected-task-info-inline">
                <FolderOutlined />
                <Typography.Text strong>已选择：</Typography.Text>
                <span className={`task-level-badge level-${selectedTask.task_level}`}>
                  {selectedTask.task_level === 0 ? '根任务' : `L${selectedTask.task_level + 1}`}
                </span>
                <Typography.Text className="selected-task-title">{selectedTask.title}</Typography.Text>
                {allowClear && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setSelectedTask(null);
                      setValidationError(null);
                    }}
                    style={{ marginLeft: 'auto', padding: '0 4px' }}
                  >
                    清除
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <Alert
              message="选择验证失败"
              description={validationError}
              type="error"
              showIcon
              className="validation-error"
            />
          )}

          {/* Help text with improved UX */}
          <div className="help-text">
            <InfoCircleOutlined />
            <span>只能选择前3级任务作为父任务，选择后将创建层级关系</span>
          </div>

          {/* Validation loading */}
          {isValidating && (
            <div className="validation-loading">
              <Spin size="small" />
              <span>正在验证选择...</span>
            </div>
          )}

          {/* Task list */}
          <div className="task-list-container">
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
              className="modal-task-list"
            />
          </div>
        </div>
      </Modal>
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

      {renderModal()}

      <style dangerouslySetInnerHTML={{
        __html: `
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

        .parent-selector-modal-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .search-section {
          flex-shrink: 0;
        }

        .parent-search {
          margin-bottom: 8px;
        }

        .selected-section {
          flex-shrink: 0;
          padding: 12px;
          background-color: #fafafa;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
        }

        .selected-task-info-inline {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .selected-task-title {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        .validation-error {
          flex-shrink: 0;
        }

        .help-text {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: #f6ffed;
          border: 1px solid #b7eb8f;
          border-radius: 6px;
          font-size: 12px;
          color: #52c41a;
          flex-shrink: 0;
        }

        .validation-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: #f0f9ff;
          border: 1px solid #91d5ff;
          border-radius: 6px;
          font-size: 12px;
          color: #1890ff;
          flex-shrink: 0;
        }

        .task-list-container {
          flex: 1;
          min-height: 0;
        }

        .modal-task-list {
          height: 280px;
          border: 1px solid #f0f0f0;
        }

        .modal-task-list .task-tree-list {
          height: 100%;
        }
        `
      }} />
    </div>
  );
};