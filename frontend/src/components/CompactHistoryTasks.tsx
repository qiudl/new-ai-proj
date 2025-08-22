import React, { useState, useEffect, useCallback } from 'react';
import { List, Typography, Spin, Empty, Button, Tag, Tooltip } from 'antd';
import { ClockCircleOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import { mockHistoryTasks, isDevelopment } from '../utils/mockData';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import '../styles/CompactHistoryTasks.css';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

interface CompactHistoryTasksProps {
  maxHeight?: string;
  onTaskSelect?: (taskId: number, taskTitle: string) => void | Promise<void>;
  compact?: boolean;
}

const CompactHistoryTasks: React.FC<CompactHistoryTasksProps> = ({
  maxHeight = '300px',
  onTaskSelect,
  compact = true
}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 加载历史任务数据（初始加载）
  const loadHistoryTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOffset(0);
      
      // 使用新的分页API
      const response = await fetch('/api/v1/timer/recent-tasks?limit=8&offset=0', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          setHasMore(data.tasks.length === 8); // 如果返回满8条，可能还有更多
          } else {
          setTasks([]);
          setHasMore(false);
        }
      } else {
        throw new Error(`API请求失败: ${response.status}`);
      }
    } catch (error: Error | unknown) {
      console.error('加载历史任务失败:', error);
      
      // 在开发环境下，API失败时使用演示数据
      if (isDevelopment) {
        setTasks(mockHistoryTasks);
        setError(null);
        setHasMore(false);
      } else {
        setError(error.message || '加载失败');
        setTasks([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载更多数据
  const loadMoreTasks = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const newOffset = offset + 8;
      
      const response = await fetch(`/api/v1/timer/recent-tasks?limit=8&offset=${newOffset}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(prevTasks => [...prevTasks, ...data.tasks]);
          setOffset(newOffset);
          setHasMore(data.tasks.length === 8); // 如果返回不足8条，说明没有更多了
          } else {
          setHasMore(false);
        }
      } else {
        throw new Error(`API请求失败: ${response.status}`);
      }
    } catch (error: Error | unknown) {
      console.error('加载更多历史任务失败:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore, hasMore]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadHistoryTasks();
  }, [loadHistoryTasks]);

  // 处理任务点击
  const handleTaskClick = useCallback(async (task: unknown) => {
    if (onTaskSelect && !task.is_deleted) {
      try {
        const result = onTaskSelect(task.task_id, task.task_title);
        // 如果返回Promise，等待完成
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        console.error('任务选择失败:', error);
        // 这里可以添加用户提示，比如 message.error
      }
    }
  }, [onTaskSelect]);

  // 格式化时长显示
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in_progress': return 'processing';
      case 'todo': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return '完成';
      case 'in_progress': return '进行中';
      case 'todo': return '待办';
      case 'cancelled': return '取消';
      default: return status;
    }
  };

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '12px' }}>
        <Text type="danger" style={{ fontSize: '12px' }}>
          {error}
        </Text>
      </div>
    );
  }

  return (
    <div className="compact-history-tasks">
      {/* 标题和刷新按钮 */}
      <div className="compact-history-header">
        <div className="compact-history-title">
          <ClockCircleOutlined className="compact-history-title-icon" />
          <Text className="compact-history-title-text">
            历史任务
          </Text>
        </div>
        
        <Button 
          type="text" 
          size="small"
          icon={<ReloadOutlined />}
          onClick={loadHistoryTasks}
          loading={loading}
          className="compact-history-refresh-btn"
        />
      </div>
      
      {/* 任务列表 */}
      <div style={{ 
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <Spin spinning={loading}>
          {tasks.length > 0 ? (
            <List
              dataSource={tasks}
              renderItem={(task: unknown) => (
                <List.Item 
                  className={`compact-task-item ${task.is_deleted ? 'task-deleted' : ''}`}
                  onMouseEnter={(e) => {
                    if (onTaskSelect && !task.is_deleted) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => handleTaskClick(task)}
                  style={{ 
                    cursor: task.is_deleted ? 'default' : 'pointer',
                    opacity: task.is_deleted ? 0.7 : 1
                  }}
                >
                  <div style={{ width: '100%' }}>
                    {/* 第一行：任务标题 + 状态 + 操作按钮 */}
                    <div className="compact-task-row1">
                      <Text 
                        className="compact-task-title"
                        ellipsis={{ tooltip: task.task_title }}
                      >
                        {task.task_title}
                      </Text>
                      
                      <div className="compact-task-actions">
                        {task.is_deleted && (
                          <Tag 
                            size="small" 
                            color="red"
                            className="compact-task-status"
                          >
                            已删除
                          </Tag>
                        )}
                        <Tag 
                          size="small" 
                          color={getStatusColor(task.status)}
                          className="compact-task-status"
                        >
                          {getStatusText(task.status)}
                        </Tag>
                        
                        {onTaskSelect && !task.is_deleted && (
                          <Tooltip title="开始计时">
                            <Button
                              type="text"
                              size="small"
                              icon={<PlayCircleOutlined />}
                              className="compact-task-play-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(task);
                              }}
                            />
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* 第二行：项目名称 + 计时时长 + 时间 */}
                    <div className="compact-task-row2">
                      <Text 
                        type="secondary" 
                        className="compact-task-project"
                        ellipsis={{ tooltip: task.project_name }}
                      >
                        📁 {task.project_name}
                      </Text>
                      
                      <div className="compact-task-meta">
                        <Text className="compact-task-duration">
                          {formatDuration(task.total_seconds)}
                        </Text>
                        
                        <Tooltip title={task.last_timed_at ? dayjs(task.last_timed_at).format('YYYY-MM-DD HH:mm:ss') : ''}>
                          <Text type="secondary" className="compact-task-time">
                            {task.last_timed_at ? dayjs(task.last_timed_at).fromNow() : ''}
                          </Text>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary" className="compact-history-empty">
                  暂无历史计时任务
                </Text>
              }
              style={{ padding: '20px 0' }}
            />
          )}
        </Spin>
      </div>
      
      {/* 底部信息和查看更多按钮 */}
      {tasks.length > 0 && (
        <div className="compact-history-footer">
          <Text type="secondary" className="compact-history-footer-text">
            显示最近 {tasks.length} 个任务
          </Text>
          {hasMore && (
            <Button
              type="link"
              size="small"
              loading={loadingMore}
              onClick={loadMoreTasks}
              style={{ padding: '0 4px', height: 'auto', fontSize: '12px' }}
            >
              查看更多
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactHistoryTasks;