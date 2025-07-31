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
  onTaskSelect?: (taskId: number) => void;
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

  // 加载历史任务数据
  const loadHistoryTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsResponse = await TimerService.getTimerStats();
      
      if (statsResponse && statsResponse.recent_tasks && statsResponse.recent_tasks.length > 0) {
        // 按最后计时时间倒序排列，限制显示数量
        const sortedTasks = statsResponse.recent_tasks
          .sort((a: any, b: any) => {
            return dayjs(b.last_timed_at).valueOf() - dayjs(a.last_timed_at).valueOf();
          })
          .slice(0, 8); // 只显示最近8个任务
        
        setTasks(sortedTasks);
        console.log('✅ 加载了', sortedTasks.length, '个历史任务');
      } else {
        // 如果API没有数据，使用演示数据（开发环境）
        if (isDevelopment) {
          console.log('🔄 API无数据，使用演示数据');
          setTasks(mockHistoryTasks);
        } else {
          setTasks([]);
        }
      }
    } catch (error: any) {
      console.error('加载历史任务失败:', error);
      
      // 在开发环境下，API失败时使用演示数据
      if (isDevelopment) {
        console.log('🔄 API失败，使用演示数据');
        setTasks(mockHistoryTasks);
        setError(null); // 清除错误，因为我们有演示数据
      } else {
        setError(error.message || '加载失败');
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadHistoryTasks();
  }, [loadHistoryTasks]);

  // 处理任务点击
  const handleTaskClick = useCallback((task: any) => {
    if (onTaskSelect) {
      onTaskSelect(task.task_id);
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
              renderItem={(task: any) => (
                <List.Item 
                  className="compact-task-item"
                  onMouseEnter={(e) => {
                    if (onTaskSelect) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => handleTaskClick(task)}
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
                        <Tag 
                          size="small" 
                          color={getStatusColor(task.status)}
                          className="compact-task-status"
                        >
                          {getStatusText(task.status)}
                        </Tag>
                        
                        {onTaskSelect && (
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
                        
                        <Text type="secondary" className="compact-task-time">
                          {task.last_timed_at ? dayjs(task.last_timed_at).fromNow() : ''}
                        </Text>
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
      
      {/* 底部信息 */}
      {tasks.length > 0 && (
        <div className="compact-history-footer">
          <Text type="secondary" className="compact-history-footer-text">
            显示最近 {tasks.length} 个任务
          </Text>
        </div>
      )}
    </div>
  );
};

export default CompactHistoryTasks;