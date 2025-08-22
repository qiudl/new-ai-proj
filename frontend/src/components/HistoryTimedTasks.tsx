import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, List, Typography, Spin, Empty, Button, Tag, Space, Tooltip } from 'antd';
import { ClockCircleOutlined, ReloadOutlined, ProjectOutlined, PlayCircleOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import { useTimer } from '../contexts/TimerContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import '../styles/HistoryTimedTasks.css';
interface RecentTimedTask {
  task_id: number;
  task_title: string;
  project_name: string;
  last_timed_at: string; // 来自后端的日期字符串
  total_seconds: number;
  formatted_time: string;
  status: string;
}

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

interface HistoryTimedTasksProps {
  onTaskSelect?: (taskId: number) => void;
  maxHeight?: string;
  showHeader?: boolean;
}

const HistoryTimedTasks: React.FC<HistoryTimedTasksProps> = ({
  onTaskSelect,
  maxHeight = '400px',
  showHeader = true
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<RecentTimedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const { startTimer } = useTimer();

  // 加载历史任务数据
  const loadHistoryTasks = useCallback(async (scrollTopAfter?: boolean) => {
    try {
      setLoading(true);
      const statsResponse = await TimerService.getTimerStats();
      // 获取最近的计时任务，按最后计时时间倒序
      const recentTasks = statsResponse.recent_tasks || [];
      // 按最后计时时间倒序排列（健壮性：缺失/无效时间放到末尾）
      const sortedTasks = recentTasks.sort((a, b) => {
        const tA = a && a.last_timed_at ? dayjs(a.last_timed_at) : null;
        const tB = b && b.last_timed_at ? dayjs(b.last_timed_at) : null;
        const vA = tA && tA.isValid() ? tA.valueOf() : 0;
        const vB = tB && tB.isValid() ? tB.valueOf() : 0;
        return vB - vA;
      });
      
      setTasks(sortedTasks);
      setLastUpdated(new Date());
      if (scrollTopAfter && scrollRef.current) {
        // 等待渲染后再滚动
        requestAnimationFrame(() => {
          try {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }
        });
      }
    } catch (error) {
      console.error('加载历史任务失败:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadHistoryTasks(false);
  }, [loadHistoryTasks]);

  // 处理任务选择/开始计时
  const handleTaskAction = useCallback(async (task: RecentTimedTask) => {
    try {
      if (onTaskSelect) {
        onTaskSelect(task.task_id);
      } else {
        // 如果没有传递选择回调，直接开始计时
        await startTimer(task.task_id);
      }
    } catch (error) {
      console.error('开始任务计时失败:', error);
    }
  }, [onTaskSelect, startTimer]);

  // 格式化持续时间显示
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  // 获取状态标签颜色
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
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'todo': return '待办';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const renderHeader = () => {
    if (!showHeader) return null;
    
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <Title level={5} style={{ margin: 0, color: '#262626' }}>
            <ClockCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            历史任务
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            按最后更新时间倒序显示
          </Text>
        </div>
        
        <Tooltip title="刷新数据">
          <Button 
            type="text" 
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => loadHistoryTasks(true)}
            loading={loading}
          />
        </Tooltip>
      </div>
    );
  };

const renderTaskItem = (task: RecentTimedTask) => {
    const ts = task && task.last_timed_at ? dayjs(task.last_timed_at) : null;
    return (
    <List.Item
      key={task.task_id}
      style={{ 
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#fafafa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      onClick={() => handleTaskAction(task)}
    >
      <div style={{ width: '100%' }}>
        {/* 任务标题和项目 */}
        <div style={{ marginBottom: '8px' }}>
          <Text 
            strong 
            style={{ 
              fontSize: '14px',
              color: '#262626',
              display: 'block',
              marginBottom: '4px'
            }}
            ellipsis={{ tooltip: task.task_title }}
          >
            {task.task_title}
          </Text>
          
          <Space size="small">
            <Text 
              type="secondary" 
              style={{ fontSize: '12px' }}
            >
              <ProjectOutlined style={{ marginRight: '2px' }} />
              {task.project_name}
            </Text>
            
            <Tag 
              size="small" 
              color={getStatusColor(task.status)}
            >
              {getStatusText(task.status)}
            </Tag>
          </Space>
        </div>

        {/* 时间信息 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <Text style={{ fontSize: '13px', color: '#52c41a', fontWeight: 600 }}>
              {formatDuration(task.total_seconds)}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
              总计时长
            </Text>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <Tooltip title={(ts && ts.isValid()) ? ts.format('YYYY-MM-DD HH:mm:ss') : '-'}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {(ts && ts.isValid()) ? ts.fromNow() : '-'}
              </Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
              {(ts && ts.isValid()) ? ts.format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Text>
            <Tooltip title="开始计时">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined />}
                style={{ 
                  marginLeft: '4px',
                  color: '#1890ff'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskAction(task);
                }}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </List.Item>
  );
};

  return (
    <div>
      {renderHeader()}
      
      <div 
        ref={scrollRef}
        style={{ 
          maxHeight,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <Spin spinning={loading}>
          {tasks.length > 0 ? (
            <List
              dataSource={tasks}
              renderItem={renderTaskItem}
              style={{ background: 'transparent' }}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
                  暂无历史计时任务
                </span>
              }
              style={{ padding: '20px 0' }}
            />
          )}
        </Spin>
      </div>
      
      {lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          padding: '8px 0', 
          borderTop: '1px solid #f0f0f0',
          marginTop: '8px'
        }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            最后更新: {dayjs(lastUpdated).format('HH:mm:ss')}
          </Text>
        </div>
      )}
    </div>
  );
};

export default HistoryTimedTasks;