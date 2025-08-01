import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Alert, Empty, Typography, Spin } from 'antd';
import ErrorBoundary from './ErrorBoundary';
import {
  SearchOutlined,
  InfoCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { Task } from '../types/task';
import { TaskTreeList } from './TaskTreeList';
import { useTaskParentSearch } from '../hooks/useTaskParentSearch';
import { useParentValidation } from '../hooks/useParentValidation';
import { debounce } from 'lodash';

const { Search } = Input;
const { Text } = Typography;

export interface TaskParentSelectorModalProps {
  visible: boolean;
  projectId: number;
  currentTaskId?: number;
  currentParentId?: number | null;
  onOk?: (parentId: number | null, parentTask?: Task | null) => void;
  onCancel?: () => void;
  title?: string;
  okText?: string;
  cancelText?: string;
  showValidation?: boolean;
  allowClear?: boolean;
}

/**
 * Modal version of parent task selector
 * Provides full-screen interface for complex parent selection
 */
export const TaskParentSelectorModal: React.FC<TaskParentSelectorModalProps> = ({
  visible,
  projectId,
  currentTaskId,
  currentParentId,
  onOk,
  onCancel,
  title = '选择父任务',
  okText = '确定',
  cancelText = '取消',
  showValidation = true,
  allowClear = true,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { searchResults, searchParentTasks, clearResults, loadMore } = useTaskParentSearch();
  const { validateParentSelection, validateTaskLevel } = useParentValidation();

  // Initialize search when modal opens
  useEffect(() => {
    if (visible && projectId) {
      // Initial search
      searchParentTasks({
        projectId,
        keyword: '',
        excludeTaskId: currentTaskId,
        maxLevel: 2,
        limit: 20,
        offset: 0,
      });
    }
  }, [visible, projectId, currentTaskId]);

  // Set current parent as selected when search results are available
  useEffect(() => {
    if (visible && currentParentId && searchResults.tasks.length > 0 && !selectedTask) {
      const currentParent = searchResults.tasks.find(task => task.id === currentParentId);
      if (currentParent) {
        setSelectedTask(currentParent);
      }
    }
  }, [visible, currentParentId, searchResults.tasks, selectedTask]);

  // Clear state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchKeyword('');
      setSelectedTask(null);
      setValidationError(null);
      clearResults();
    }
  }, [visible, clearResults]);

  // Debounced search
  const debouncedSearch = React.useCallback(
    debounce(async (keyword: string) => {
      if (!projectId || !visible) return;

      await searchParentTasks({
        projectId,
        keyword,
        excludeTaskId: currentTaskId,
        maxLevel: 2,
        limit: 20,
        offset: 0,
      });
    }, 300),
    [projectId, currentTaskId, visible, searchParentTasks]
  );

  // Handle search input change
  const handleSearchChange = (keyword: string) => {
    setSearchKeyword(keyword);
    debouncedSearch(keyword);
  };

  // Handle task selection
  const handleTaskSelect = async (task: Task) => {
    setSelectedTask(task);
    setValidationError(null);

    // Perform validation if enabled
    if (showValidation) {
      setIsValidating(true);
      try {
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
      } finally {
        setIsValidating(false);
      }
    }
  };

  // Handle clear selection
  const handleClear = () => {
    setSelectedTask(null);
    setValidationError(null);
  };

  // Handle OK button click
  const handleOk = () => {
    if (validationError) {
      return;
    }

    if (onOk) {
      onOk(selectedTask?.id || null, selectedTask);
    }
  };

  // Handle Cancel button click
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const renderSelectedTaskInfo = () => {
    if (!selectedTask) {
      return (
        <div className="selected-task-placeholder">
          <FolderOutlined />
          <Text type="secondary">未选择父任务</Text>
        </div>
      );
    }

    return (
      <div className="selected-task-info">
        <div className="selected-task-header">
          <FolderOutlined />
          <Text strong>已选择父任务</Text>
          {allowClear && (
            <Button
              type="link"
              size="small"
              onClick={handleClear}
            >
              清除选择
            </Button>
          )}
        </div>
        <div className="selected-task-details">
          <Text className="task-title">{selectedTask.title}</Text>
          <Text type="secondary" className="task-level">
            第{selectedTask.task_level + 1}级任务
          </Text>
          {selectedTask.description && (
            <Text type="secondary" className="task-description">
              {selectedTask.description}
            </Text>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={title}
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      width={800}
      bodyStyle={{ maxHeight: '70vh', overflow: 'hidden' }}
      okButtonProps={{
        disabled: validationError !== null || isValidating,
        loading: isValidating,
      }}
      destroyOnClose
    >
      <ErrorBoundary>
        <div className="parent-selector-modal-content">
        {/* Search section */}
        <div className="search-section">
          <Search
            placeholder="搜索父任务..."
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
            size="large"
            className="parent-search"
          />
          
          <div className="help-info">
            <InfoCircleOutlined />
            <Text type="secondary">
              只能选择前3级任务作为父任务。选择父任务后，当前任务将成为其子任务。
            </Text>
          </div>
        </div>

        {/* Selected task info */}
        <div className="selected-section">
          {renderSelectedTaskInfo()}
        </div>

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

        {/* Task list */}
        <div className="task-list-section">
          <div className="section-title">
            <Text strong>可选父任务列表</Text>
          </div>
          
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
              emptyText={searchKeyword ? '未找到匹配的任务' : '暂无可选的父任务'}
              className="modal-task-list"
            />
          </div>
        </div>
        </div>
      </ErrorBoundary>

      <style dangerouslySetInnerHTML={{
        __html: `
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

        .help-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: #f6ffed;
          border: 1px solid #b7eb8f;
          border-radius: 6px;
        }

        .selected-section {
          flex-shrink: 0;
          padding: 12px;
          background-color: #fafafa;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
        }

        .selected-task-placeholder {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8c8c8c;
        }

        .selected-task-info {
          
        }

        .selected-task-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 8px;
        }

        .selected-task-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .task-title {
          font-size: 14px;
          font-weight: 500;
        }

        .task-level {
          font-size: 12px;
        }

        .task-description {
          font-size: 12px;
          line-height: 1.4;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .validation-error {
          flex-shrink: 0;
        }

        .task-list-section {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .section-title {
          margin-bottom: 8px;
        }

        .task-list-container {
          flex: 1;
          min-height: 0;
        }

        .modal-task-list {
          height: 300px;
          border: 1px solid #f0f0f0;
        }

        @media (max-width: 768px) {
          .parent-selector-modal-content {
            gap: 12px;
          }

          .help-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .selected-task-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .modal-task-list {
            height: 250px;
          }
        }
        `
      }} />
    </Modal>
  );
};