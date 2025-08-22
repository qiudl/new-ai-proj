import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  open: boolean;
  projectId: number;
  currentTaskId?: number;
  excludeTaskIds?: number[]; // 批量操作时排除的任务ID列表
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
  open,
  projectId,
  currentTaskId,
  excludeTaskIds = [],
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
  const [recommendations, setRecommendations] = useState<Task[]>([]);

  const { searchResults, searchParentTasks, clearResults, loadMore } = useTaskParentSearch();
  const { validateParentSelection, validateTaskLevel } = useParentValidation();

  // Intelligent task recommendation algorithm
  const generateRecommendations = React.useCallback((currentTaskId?: number, tasks: Task[] = []) => {
    if (!currentTaskId || tasks.length === 0) {
      setRecommendations([]);
      return;
    }

    // Get current task from results if available
    const currentTask = tasks.find(t => t.id === currentTaskId);
    if (!currentTask) {
      setRecommendations([]);
      return;
    }

    // Score tasks based on multiple factors
    const scoredTasks = tasks
      .filter(task => 
        task.id !== currentTaskId && 
        task.task_level <= 3 && // Only allow up to level 3 as parent
        task.status !== 'cancelled'
      )
      .map(task => {
        let score = 0;
        
        // 1. Prefer tasks with similar naming patterns
        const currentTitle = currentTask.title.toLowerCase();
        const taskTitle = task.title.toLowerCase();
        
        // Check for common keywords
        const currentWords = currentTitle.split(/[\s-_]+/);
        const taskWords = taskTitle.split(/[\s-_]+/);
        const commonWords = currentWords.filter(word => 
          word.length > 2 && taskWords.includes(word)
        );
        score += commonWords.length * 15;

        // Check for similar prefixes (like "31-01", "31-02")
        const currentPrefix = currentTitle.match(/^\d+-\d+/);
        const taskPrefix = taskTitle.match(/^\d+-\d+/);
        if (currentPrefix && taskPrefix) {
          const currentWeek = currentPrefix[0].split('-')[0];
          const taskWeek = taskPrefix[0].split('-')[0];
          if (currentWeek === taskWeek) {
            score += 25; // Same week tasks are highly related
          }
        }

        // 2. Prefer active tasks (in_progress > todo > completed)
        if (task.status === 'in_progress') score += 10;
        else if (task.status === 'todo') score += 5;
        else if (task.status === 'completed') score -= 5;

        // 3. Prefer higher level tasks (better parent candidates)
        score += (2 - task.task_level) * 8; // Level 0 gets +16, Level 1 gets +8, Level 2 gets 0

        // 4. Prefer recently updated tasks
        const taskUpdateTime = new Date(task.updated_at).getTime();
        const daysSinceUpdate = (Date.now() - taskUpdateTime) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) score += 5;
        else if (daysSinceUpdate < 30) score += 2;

        // 5. Prefer tasks with similar custom fields
        if (currentTask.custom_fields && task.custom_fields) {
          const currentPriority = currentTask.custom_fields.priority;
          const taskPriority = task.custom_fields.priority;
          if (currentPriority && taskPriority && currentPriority === taskPriority) {
            score += 5;
          }
        }

        return { task, score };
      })
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 3) // Take top 3 recommendations
      .map(item => item.task);

    setRecommendations(scoredTasks);
  }, []);

  // Generate recommendations when search results change
  useEffect(() => {
    if (open && searchResults.tasks.length > 0 && !searchKeyword) {
      generateRecommendations(currentTaskId, searchResults.tasks);
    } else {
      setRecommendations([]);
    }
  }, [open, searchResults.tasks, currentTaskId, searchKeyword]); // Remove generateRecommendations from deps to prevent infinite loop

  // Stabilize exclude IDs to prevent infinite re-renders
  const stableExcludeIds = useMemo(() => {
    const allExcludeIds = [...excludeTaskIds];
    if (currentTaskId && !allExcludeIds.includes(currentTaskId)) {
      allExcludeIds.push(currentTaskId);
    }
    return allExcludeIds;
  }, [currentTaskId, excludeTaskIds]);

  // Initialize search when modal opens
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (open && projectId && !hasInitialized.current) {
      hasInitialized.current = true;
      
      // Initial search
      searchParentTasks({
        projectId,
        keyword: '',
        excludeTaskIds: stableExcludeIds,
        maxLevel: 3,
        limit: 20,
        offset: 0,
      });
    }
    
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open, projectId, stableExcludeIds, searchParentTasks]);

  // Set current parent as selected when search results are available
  useEffect(() => {
    if (open && currentParentId && searchResults.tasks.length > 0 && !selectedTask) {
      const currentParent = searchResults.tasks.find(task => task.id === currentParentId);
      if (currentParent) {
        setSelectedTask(currentParent);
      }
    }
  }, [open, currentParentId, searchResults.tasks]); // Remove selectedTask from deps to prevent loop

  // Clear state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchKeyword('');
      setSelectedTask(null);
      setValidationError(null);
      clearResults();
    }
  }, [open, clearResults]);

  // Debounced search
  const debouncedSearch = React.useCallback(
    debounce(async (keyword: string) => {
      if (!projectId || !open) return;

      // 合并单个任务ID和批量任务IDs
      const allExcludeIds = [...excludeTaskIds];
      if (currentTaskId && !allExcludeIds.includes(currentTaskId)) {
        allExcludeIds.push(currentTaskId);
      }

      await searchParentTasks({
        projectId,
        keyword,
        excludeTaskIds: allExcludeIds,
        maxLevel: 3,
        limit: 20,
        offset: 0,
      });
    }, 300),
    [projectId, currentTaskId, excludeTaskIds, open, searchParentTasks]
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
        // Client-side validations only for now (skip server-side validation)
        
        // 1. Prevent self-reference and batch task reference
        const allExcludeIds = [...excludeTaskIds];
        if (currentTaskId && !allExcludeIds.includes(currentTaskId)) {
          allExcludeIds.push(currentTaskId);
        }
        
        if (allExcludeIds.includes(task.id)) {
          if (excludeTaskIds.length > 1) {
            setValidationError('不能选择被操作的任务作为父任务');
          } else {
            setValidationError('任务不能将自己设为父任务');
          }
          return;
        }

        // 2. Level validation
        const levelValidation = validateTaskLevel(task.task_level);
        if (!levelValidation.isValid) {
          setValidationError(levelValidation.error || '层级无效');
          return;
        }

        } catch (error) {
        console.error('❌ [TaskParentSelectorModal] Validation error:', error);
        setValidationError('验证过程中发生错误');
      } finally {
        setIsValidating(false);
      }
    } else {
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
    } else {
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
      <div className="selected-task-info-inline">
        <FolderOutlined />
        <Text strong>已选择：</Text>
        <span className={`task-level-badge level-${selectedTask.task_level}`}>
          {selectedTask.task_level === 0 ? '根任务' : `L${selectedTask.task_level + 1}`}
        </span>
        <Text className="selected-task-title">{selectedTask.title}</Text>
        {allowClear && (
          <Button
            type="link"
            size="small"
            onClick={handleClear}
            style={{ marginLeft: 'auto', padding: '0 4px' }}
          >
            清除
          </Button>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      width={800}
      styles={{ body: { maxHeight: '70vh', overflow: 'hidden' } }}
      okButtonProps={{
        disabled: validationError !== null || isValidating,
        loading: isValidating,
      }}
      destroyOnHidden={false}
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
          
          {searchKeyword && (
            <div className="search-info">
              <Text type="secondary" style={{ fontSize: '13px' }}>
                找到 {searchResults.total} 个匹配的任务
              </Text>
            </div>
          )}

          {/* Smart recommendations */}
          {!searchKeyword && recommendations.length > 0 && (
            <div className="recommendations-section">
              <div className="recommendations-header">
                <Text strong style={{ color: '#1890ff', fontSize: '13px' }}>
                  🎯 智能推荐父任务
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  基于相似性和关联度推荐
                </Text>
              </div>
              <div className="recommendations-list">
                {recommendations.map((task, index) => (
                  <div 
                    key={task.id} 
                    className={`recommendation-item ${selectedTask?.id === task.id ? 'selected' : ''}`}
                    onClick={() => handleTaskSelect(task)}
                  >
                    <div className="recommendation-rank">#{index + 1}</div>
                    <div className="recommendation-content">
                      <span className={`task-level-badge level-${task.task_level}`}>
                        {task.task_level === 0 ? '根任务' : `L${task.task_level + 1}`}
                      </span>
                      <span className="recommendation-title">{task.title}</span>
                      <span className={`recommendation-status status-${task.status}`}>
                        {task.status === 'in_progress' ? '进行中' : 
                         task.status === 'todo' ? '待办' : 
                         task.status === 'completed' ? '已完成' : task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            {(() => {
              return (
                <TaskTreeList
                  tasks={searchResults.tasks}
                  loading={searchResults.loading}
                  error={searchResults.error}
                  selectedTaskId={selectedTask?.id}
                  disabledTaskIds={(() => {
                    const allExcludeIds = [...excludeTaskIds];
                    if (currentTaskId && !allExcludeIds.includes(currentTaskId)) {
                      allExcludeIds.push(currentTaskId);
                    }
                    return allExcludeIds;
                  })()}
                  onTaskSelect={handleTaskSelect}
                  onLoadMore={loadMore}
                  hasMore={searchResults.hasMore}
                  showLevelFilter={true}
                  maxDisplayLevel={3}
                  emptyText={searchKeyword ? '未找到匹配的任务' : '暂无可选的父任务'}
                  className="modal-task-list"
                  searchKeyword={searchKeyword}
                />
              );
            })()}
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

        .search-info {
          margin-top: 8px;
          padding: 6px 12px;
          text-align: center;
        }

        .recommendations-section {
          margin-top: 8px;
          padding: 12px;
          background-color: #f6ffed;
          border: 1px solid #b7eb8f;
          border-radius: 6px;
        }

        .recommendations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }


        .recommendation-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .recommendation-item:hover {
          border-color: #40a9ff;
          box-shadow: 0 2px 4px rgba(64, 169, 255, 0.1);
        }

        .recommendation-item.selected {
          border-color: #1890ff;
          background-color: #e6f7ff;
        }

        .recommendation-rank {
          width: 24px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #1890ff;
          color: white;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .recommendation-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .recommendation-title {
          flex: 1;
          font-size: 12px;
          font-weight: 500;
          color: #262626;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .recommendation-status {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .recommendation-status.status-in_progress {
          background-color: #e6f7ff;
          color: #1890ff;
        }

        .recommendation-status.status-todo {
          background-color: #f6ffed;
          color: #52c41a;
        }

        .recommendation-status.status-completed {
          background-color: #f0f0f0;
          color: #8c8c8c;
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
          height: 350px;
          border: 1px solid #f0f0f0;
        }

        .modal-task-list .task-tree-list {
          height: 100%;
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