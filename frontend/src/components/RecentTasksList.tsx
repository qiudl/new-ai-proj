import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Empty, Typography, Space, Avatar, Tooltip } from 'antd';
import { EyeOutlined, PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import TimerService from '../services/timerService';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Text } = Typography;

interface RecentTasksListProps {
  limit?: number;
  showTimer?: boolean;
  title?: string;
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

const RecentTasksList: React.FC<RecentTasksListProps> = ({ 
  limit = 5, 
  showTimer = true, 
  title = "最近任务",
  onTimerUpdate 
}) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTimerTask, setCurrentTimerTask] = useState<number | null>(null);
  const [timerLoading, setTimerLoading] = useState<Set<number>>(new Set());

  // 加载最近任务
  const loadRecentTasks = async () => {
    setLoading(true);
    try {
      // 获取最近更新的任务（跨项目）
      const response = await TaskService.getAllTasks({
        page: 1,
        page_size: limit * 2, // 获取更多数据以便筛选
        sort_by: 'updated_at',
        sort_order: 'desc'
      });

      if (response && response.data && Array.isArray(response.data)) {
        // 筛选出非完成状态的任务，优先显示进行中和待办任务
        const validTasks = response.data.filter((task: any) => 
          task && 
          typeof task === 'object' && 
          typeof task.id === 'number' &&
          task.status !== 'cancelled' // 排除已取消的任务
        );

        // 按状态优先级排序：进行中 > 待办 > 已完成
        const sortedTasks = validTasks.sort((a: Task, b: Task) => {
          const statusPriority = {
            'in_progress': 3,
            'todo': 2,
            'completed': 1,
            'cancelled': 0
          };
          
          const priorityA = statusPriority[a.status] || 0;
          const priorityB = statusPriority[b.status] || 0;
          
          if (priorityA !== priorityB) {
            return priorityB - priorityA;
          }
          
          // 同优先级按更新时间排序
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        setTasks(sortedTasks.slice(0, limit));
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Failed to load recent tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载当前计时器状态
  const loadCurrentTimer = async () => {
    if (!showTimer) return;
    
    try {
      const response = await TimerService.getCurrentTimer();
      if (response.is_running && response.task_id) {
        setCurrentTimerTask(response.task_id);
        onTimerUpdate?.(true, response.task_title);
      } else {
        setCurrentTimerTask(null);
        onTimerUpdate?.(false);
      }
    } catch (error) {
      console.error('Failed to load current timer:', error);
    }
  };

  // 处理开始计时
  const handleStartTimer = async (task: Task) => {
    if (currentTimerTask) {
      return;
    }

    const taskId = task.id;
    setTimerLoading(prev => new Set(prev).add(taskId));
    
    try {
      await TimerService.startTimer(taskId);
      setCurrentTimerTask(taskId);
      onTimerUpdate?.(true, task.title);
    } catch (error: any) {
      console.error('Failed to start timer:', error);
    } finally {
      setTimerLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // 处理停止计时
  const handleStopTimer = async (task: Task) => {
    const taskId = task.id;
    setTimerLoading(prev => new Set(prev).add(taskId));
    
    try {
      await TimerService.stopTimer();
      setCurrentTimerTask(null);
      onTimerUpdate?.(false);
      
      // 刷新任务列表以显示更新的时间
      setTimeout(loadRecentTasks, 500);
    } catch (error: any) {
      console.error('Failed to stop timer:', error);
    } finally {
      setTimerLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // 获取状态标签配置
  const getStatusConfig = (status: string) => {
    const statusMap = {
      'todo': { color: 'default', text: '待办' },
      'in_progress': { color: 'processing', text: '进行中' },
      'completed': { color: 'success', text: '已完成' },
      'cancelled': { color: 'error', text: '已取消' }
    };
    return statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
  };

  // 格式化时间显示
  const formatTimeAgo = (dateString: string) => {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffHours = now.diff(date, 'hour');
    const diffDays = now.diff(date, 'day');
    
    if (diffHours < 1) {
      return '刚刚更新';
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.format('MM-DD');
    }
  };

  useEffect(() => {
    loadRecentTasks();
    loadCurrentTimer();
  }, []);

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>{title}</span>
          <Button 
            type="text" 
            size="small" 
            icon={<ClockCircleOutlined />}
            onClick={() => {
              loadRecentTasks();
              loadCurrentTimer();
            }}
            title="刷新"
          />
        </Space>
      }
      extra={
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate('/tasks')}
        >
          查看全部
        </Button>
      }
      styles={{ body: { padding: tasks.length === 0 ? '24px' : '0' } }}
    >
      {tasks.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无最近任务"
          style={{ margin: '16px 0' }}
        >
          <Button type="primary" onClick={() => navigate('/tasks')}>
            去创建任务
          </Button>
        </Empty>
      ) : (
        <List
          loading={loading}
          dataSource={tasks}
          renderItem={(task) => {
            const statusConfig = getStatusConfig(task.status);
            const isTimerRunning = currentTimerTask === task.id;
            const isTimerLoadingForTask = timerLoading.has(task.id);
            const canStartTimer = task.status !== 'completed' && task.status !== 'cancelled';
            
            return (
              <List.Item
                style={{ 
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0'
                }}
                actions={[
                  // 计时器按钮
                  ...(showTimer && canStartTimer ? [
                    isTimerRunning ? (
                      <Tooltip title="停止计时">
                        <Button
                          type="text"
                          size="small"
                          icon={<PauseCircleOutlined />}
                          onClick={() => handleStopTimer(task)}
                          loading={isTimerLoadingForTask}
                          style={{ color: '#52c41a' }}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title={currentTimerTask ? "已有任务在计时中" : "开始计时"}>
                        <Button
                          type="text"
                          size="small"
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleStartTimer(task)}
                          loading={isTimerLoadingForTask}
                          disabled={!!currentTimerTask && !isTimerRunning}
                          style={{ 
                            color: currentTimerTask && !isTimerRunning ? '#d9d9d9' : '#1890ff' 
                          }}
                        />
                      </Tooltip>
                    )
                  ] : []),
                  
                  // 查看详情按钮
                  <Tooltip title="查看详情">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      size="small" 
                      style={{ 
                        backgroundColor: `hsl(${(task.id * 137.5) % 360}, 70%, 60%)`,
                        fontSize: '12px'
                      }}
                    >
                      {task.title.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                        style={{ 
                          padding: 0, 
                          height: 'auto',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        {task.title}
                      </Button>
                      {isTimerRunning && (
                        <Tag color="green" style={{ fontSize: '12px' }}>
                          计时中
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <Space size="small" style={{ fontSize: '12px' }}>
                      <Tag color={statusConfig.color} style={{ fontSize: '12px' }}>
                        {statusConfig.text}
                      </Tag>
                      <Text type="secondary">
                        {(task as any).project_name || '未知项目'}
                      </Text>
                      <Text type="secondary">
                        {formatTimeAgo(task.updated_at)}
                      </Text>
                      {(task.total_time_seconds || 0) > 0 && (
                        <Text type="secondary">
                          ⏱ {Math.round((task.total_time_seconds || 0) / 3600 * 10) / 10}h
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default RecentTasksList;