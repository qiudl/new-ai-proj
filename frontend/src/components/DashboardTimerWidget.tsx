import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Tag, 
  Divider, 
  Typography, 
  Space, 
  Select, 
  message, 
  Modal, 
  Empty,
  Spin,
  Tooltip
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BarChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import { personalTimerService, PersonalTimerTodayStats } from '../services/personalTimerService';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

// 个人计时任务接口
interface UserTimerTaskResponse {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  color: string;
  is_favorite: boolean;
  total_time_seconds: number;
  target_time_seconds: number;
  formatted_total_time: string;
  formatted_target_time: string;
  completion_percent: number;
  created_at: string;
  updated_at: string;
}

// 组件Props接口
interface DashboardTimerWidgetProps {
  style?: React.CSSProperties;
  height?: string | number;
  showTaskCreation?: boolean;
  showQuickStats?: boolean;
  maxRecentTasks?: number;
  onTaskStart?: (taskId: number, taskTitle: string) => void;
  onTaskComplete?: (taskId: number, duration: number) => void;
  onTaskCreate?: () => void;
}

const DashboardTimerWidget: React.FC<DashboardTimerWidgetProps> = ({
  style,
  height = "100%",
  showTaskCreation = true,
  showQuickStats = true,
  maxRecentTasks = 5,
  onTaskStart,
  onTaskComplete,
  onTaskCreate
}) => {
  const navigate = useNavigate();
  const { timerState, isLoading, startTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();

  // 组件状态
  const [personalTasks, setPersonalTasks] = useState<UserTimerTaskResponse[]>([]);
  const [todayStats, setTodayStats] = useState<PersonalTimerTodayStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 格式化时间显示
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 加载个人计时任务数据
  const loadPersonalTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await personalTimerService.getUserTimerTasks({ 
        limit: maxRecentTasks,
        status: 'active' 
      });
      
      setPersonalTasks(response.tasks || []);
      } catch (error) {
      console.error('Failed to load personal tasks:', error);
      setError('加载个人任务失败');
    } finally {
      setLoading(false);
    }
  }, [maxRecentTasks]);

  // 加载今日统计数据
  const loadTodayStats = useCallback(async () => {
    if (!showQuickStats) return;
    
    try {
      const dashboard = await personalTimerService.getDashboard();
      setTodayStats(dashboard.today_stats);
      } catch (error) {
      console.error('Failed to load today stats:', error);
    }
  }, [showQuickStats]);

  // 启动个人任务计时
  const handleStartPersonalTask = useCallback(async (taskId?: number, taskTitle?: string) => {
    const targetTaskId = taskId || selectedTaskId;
    const task = personalTasks.find(t => t.id === targetTaskId);
    
    if (!targetTaskId || !task) {
      message.warning('请选择一个任务开始计时');
      return;
    }

    try {
      const success = await startTimer(targetTaskId, taskTitle || task.title);
      if (success) {
        message.success(`开始计时: ${task.title}`);
        onTaskStart?.(targetTaskId, task.title);
        await loadTodayStats(); // 重新加载统计数据
      }
      } catch (error) {
      console.error('Failed to start personal timer:', error);
      message.error('启动计时失败');
    }
  }, [selectedTaskId, personalTasks, startTimer, onTaskStart, loadTodayStats]);

  // 停止计时
  const handleStopTimer = useCallback(async () => {
    if (!timerState.isRunning) return;

    Modal.confirm({
      title: '确认停止计时',
      content: `确定要停止当前计时吗？已用时：${timerState.formattedTime}`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const success = await stopTimer();
          if (success) {
            message.success(`计时结束: ${timerState.taskTitle} (${timerState.formattedTime})`);
            onTaskComplete?.(timerState.taskId!, timerState.elapsedSeconds);
            await loadTodayStats(); // 重新加载统计数据
          }
      } catch (error) {
          console.error('Failed to stop timer:', error);
          message.error('停止计时失败');
        }
      }
    });
  }, [timerState, stopTimer, onTaskComplete, loadTodayStats]);

  // 暂停/恢复计时
  const handlePauseResume = useCallback(async () => {
    if (!timerState.isRunning) return;

    try {
      if (timerState.isPaused) {
        const success = await resumeTimer();
        if (success) {
          message.success('计时已恢复');
        }
      } else {
        const success = await pauseTimer();
        if (success) {
          message.success('计时已暂停');
        }
      }
      } catch (error) {
      console.error('Failed to pause/resume timer:', error);
      message.error('操作失败');
    }
  }, [timerState.isRunning, timerState.isPaused, pauseTimer, resumeTimer]);

  // 创建新任务
  const handleCreateTask = useCallback(() => {
    if (onTaskCreate) {
      onTaskCreate();
    } else {
      navigate('/personal-timer?action=create');
    }
  }, [onTaskCreate, navigate]);

  // 查看详情
  const handleViewDetails = useCallback(() => {
    navigate('/personal-timer');
  }, [navigate]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadPersonalTasks();
    loadTodayStats();
  }, [loadPersonalTasks, loadTodayStats]);

  // 渲染当前计时显示
  const renderTimerDisplay = useMemo(() => {
    if (timerState.isRunning && timerState.taskTitle) {
      return (
        <div style={{ textAlign: 'center', padding: '16px 12px' }}>
          <Text strong style={{ 
            fontSize: '14px',
            color: timerState.isPaused ? '#faad14' : '#1890ff',
            display: 'block',
            marginBottom: '8px'
}}>
            🎯 {timerState.taskTitle}
          </Text>
          <Title level={2} style={{ 
            fontSize: '32px', 
            fontFamily: 'monospace', 
            margin: '8px 0',
            color: timerState.isPaused ? '#faad14' : '#52c41a',
            fontWeight: 600
}}>
            {timerState.formattedTime}
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <ClockCircleOutlined style={{ marginRight: '4px' }} />
            {timerState.isPaused ? '已暂停' : '计时中'}
            {timerState.isPaused && (
              <div 
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#faad14',
                  marginLeft: '8px',
                  animation: 'pulse 2s infinite'
}}
              />
            )}
          </Text>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '16px 12px' }}>
        <Text type="secondary" style={{
          fontSize: '14px',
          display: 'block',
          marginBottom: '8px'
}}>
          暂无正在进行的任务
        </Text>
        <Title level={2} style={{ 
          fontSize: '32px', 
          fontFamily: 'monospace', 
          margin: '8px 0',
          color: '#d9d9d9',
          fontWeight: 600
}}>
          00:00:00
        </Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          选择任务开始计时
        </Text>
      </div>
    );
  }, [timerState]);

  // 渲染控制按钮
  const renderControls = useMemo(() => {
    if (timerState.isRunning && timerState.taskTitle) {
      return (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          <Space size="small">
            <Button
              type={timerState.isPaused ? "primary" : "default"}
              size="small"
              icon={timerState.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={handlePauseResume}
              loading={isLoading}
              style={{ minWidth: '70px' }}
            >
              {timerState.isPaused ? '继续' : '暂停'}
            </Button>
            
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={handleStopTimer}
              loading={isLoading}
              style={{
                minWidth: '70px',
                backgroundColor: '#52c41a',
                borderColor: '#52c41a'
}}
            >
              完成
            </Button>
          </Space>
        </div>
      );
    }

    return (
      <div style={{ padding: '12px' }}>
        <div style={{ marginBottom: '12px' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择个人计时任务"
            value={selectedTaskId}
            onChange={setSelectedTaskId}
            showSearch
            filterOption={(input, option) =>
              option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
}
            loading={loading}
            size="small"
          >
            {personalTasks.map(task => (
              <Option key={task.id} value={task.id}>
                <Space>
                  <div 
                    style={{
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: task.color || '#1890ff'
}}
                  />
                  <span>{task.title}</span>
                  {task.is_favorite && <span style={{ color: '#faad14' }}>⭐</span>}
                </Space>
              </Option>
            ))}
          </Select>
        </div>
        
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartPersonalTask()}
            disabled={!selectedTaskId}
            loading={isLoading}
            style={{ minWidth: '70px' }}
          >
            开始
          </Button>
          
          {showTaskCreation && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreateTask}
              style={{ minWidth: '70px' }}
            >
              新任务
            </Button>
          )}
        </Space>
      </div>
    );
  }, [timerState, selectedTaskId, personalTasks, loading, isLoading, showTaskCreation, handlePauseResume, handleStopTimer, handleStartPersonalTask, handleCreateTask]);

  // 渲染快速任务列表
  const renderQuickTaskList = useMemo(() => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <Spin size="small" />
        </div>
      );
    }

    if (personalTasks.length === 0) {
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无个人任务"
          style={{ padding: '12px 0' }}
        >
          {showTaskCreation && (
            <Button size="small" type="primary" onClick={handleCreateTask}>
              创建任务
            </Button>
          )}
        </Empty>
      );
    }

    return (
      <List
        size="small"
        dataSource={personalTasks.slice(0, 3)} // 只显示前3个任务
        renderItem={(task) => (
          <List.Item
            style={{
              cursor: 'pointer',
              padding: '6px 0',
              borderBottom: '1px solid #f0f0f0'
}}
            onClick={() => handleStartPersonalTask(task.id, task.title)}
          >
            <List.Item.Meta
              avatar={
                <div 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: task.color || '#1890ff',
                    marginTop: '6px'
}}
                />
              }
              title={
                <Text ellipsis style={{ fontSize: '13px' }}>
                  {task.title}
                  {task.is_favorite && <span style={{ color: '#faad14', marginLeft: '4px' }}>⭐</span>}
                </Text>
              }
              description={
                <div>
                  <Tag 
                    color={
                      task.priority === 'high' ? 'red' :
                      task.priority === 'medium' ? 'orange' : 'default'
} 
                    size="small"
                  >
                    {task.priority === 'high' ? '高' :
                     task.priority === 'medium' ? '中' : '低'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                    {task.formatted_total_time}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  }, [personalTasks, loading, showTaskCreation, handleStartPersonalTask, handleCreateTask]);

  // 渲染今日统计
  const renderTodayStats = useMemo(() => {
    if (!showQuickStats || !todayStats) return null;

    return (
      <div style={{ padding: '12px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          textAlign: 'center'
}}>
          <div>
            <ClockCircleOutlined style={{ fontSize: '14px', color: '#1890ff', marginBottom: '4px' }} />
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              {todayStats.formatted_time}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>今日计时</div>
          </div>
          
          <div>
            <TrophyOutlined style={{ fontSize: '14px', color: '#52c41a', marginBottom: '4px' }} />
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
              {todayStats.sessions_count}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>完成会话</div>
          </div>
          
          <div>
            <BarChartOutlined style={{ fontSize: '14px', color: '#fa8c16', marginBottom: '4px' }} />
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>
              {Math.round(todayStats.efficiency_score)}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>效率评分</div>
          </div>
        </div>
      </div>
    );
  }, [showQuickStats, todayStats]);

  // 错误状态处理
  if (error) {
    return (
      <Card
        title="🎯 个人计时器"
        style={{
          height,
          background: 'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)',
          border: '1px solid #ffccc7',
          ...style
}}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="danger">{error}</Text>
          <div style={{ marginTop: '12px' }}>
            <Button size="small" onClick={loadPersonalTasks}>
              重试
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <span>🎯 个人计时器</span>
          {timerState.isRunning && (
            <Tooltip title="计时器运行中">
              <div 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: timerState.isPaused ? '#faad14' : '#52c41a',
                  animation: timerState.isPaused ? 'none' : 'pulse 2s infinite'
}}
              />
            </Tooltip>
          )}
        </Space>
      }
      extra={
        <Button 
          type="text"
          size="small" 
          onClick={handleViewDetails}
          style={{ fontSize: '12px' }}
        >
          详情
        </Button>
      }
      style={{
        height,
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
        border: '1px solid #91d5ff',
        borderRadius: '12px',
        ...style
}}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 57px)' // 减去header高度
        }
      }}
    >
      {/* 计时器显示区 */}
      {renderTimerDisplay}
      
      <Divider style={{ margin: '8px 0' }} />
      
      {/* 控制区 */}
      {renderControls}
      
      {/* 快速任务列表 */}
      {!timerState.isRunning && personalTasks.length > 0 && (
        <>
          <Divider style={{ margin: '8px 16px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>快速开始</Text>
          </Divider>
          <div style={{ padding: '0 16px', flex: 1, overflow: 'auto' }}>
            {renderQuickTaskList}
          </div>
        </>
      )}
      
      {/* 今日统计 */}
      {renderTodayStats && (
        <>
          <Divider style={{ margin: '8px 16px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>今日统计</Text>
          </Divider>
          {renderTodayStats}
        </>
      )}

      {/* CSS动画 */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Card>
  );
};

export default DashboardTimerWidget;