import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Space, Typography, Tooltip, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  ClockCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined, 
  DragOutlined,
  MinusOutlined,
  ExpandOutlined,
  CompressOutlined,
  EyeOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useTimer } from '../../contexts/TimerContext';
import api from '../../services/api';
import './FloatingTimer.css';

const { Text } = Typography;

interface FloatingTimerProps {
  defaultPosition?: { x: number; y: number };
  className?: string;
}

interface TaskDetailInfo {
  id: number;
  project_id: number;
  title: string;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ 
  defaultPosition = { x: 20, y: 80 },
  className = ''
}) => {
  const { timerState, isLoading, stopTimer } = useTimer();
  const navigate = useNavigate();
  const [position, setPosition] = useState(defaultPosition);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [taskDetailInfo, setTaskDetailInfo] = useState<TaskDetailInfo | null>(null);
  const [loadingTaskInfo, setLoadingTaskInfo] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // 从localStorage恢复位置
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('floatingTimerPosition');
      const savedMinimized = localStorage.getItem('floatingTimerMinimized');
      const savedHidden = localStorage.getItem('floatingTimerHidden');
      
      if (savedPosition) {
        setPosition(JSON.parse(savedPosition));
      }
      
      if (savedMinimized) {
        setIsMinimized(JSON.parse(savedMinimized));
      }
      
      if (savedHidden) {
        setIsHidden(JSON.parse(savedHidden));
      }
    } catch (error) {
      console.warn('Failed to restore floating timer settings:', error);
    }
  }, []);

  // 获取任务详细信息（包括project_id）- 使用真实API
  const fetchTaskInfo = useCallback(async (taskId: number) => {
    if (loadingTaskInfo) return;
    
    setLoadingTaskInfo(true);
    try {
      console.log('Fetching task info for taskId:', taskId);
      
      // 使用正确的API路径获取任务信息
      const response = await api.get(`tasks?limit=1000`);
      const tasks = response?.data?.data || response?.data || [];
      console.log('Tasks API response:', { total: tasks.length, tasks: tasks.slice(0, 3) });
      
      const task = tasks.find((t: any) => t.id === taskId);
      
      if (task && task.project_id) {
        console.log('Found task info:', task);
        setTaskDetailInfo({
          id: task.id,
          project_id: task.project_id,
          title: task.title
        });
      } else {
        console.warn('Task not found in tasks list. TaskId:', taskId, 'Available task IDs:', tasks.map((t: any) => t.id));
        
        // 如果没有找到任务，尝试从TimerService的方法获取
        try {
          const availableTasks = await api.get('tasks?status=todo,in_progress&limit=200');
          const timerTasks = availableTasks?.data?.data || availableTasks?.data || [];
          const timerTask = timerTasks.find((t: any) => t.id === taskId);
          
          if (timerTask && timerTask.project_id) {
            console.log('Found task in timer tasks:', timerTask);
            setTaskDetailInfo({
              id: timerTask.id,
              project_id: timerTask.project_id,
              title: timerTask.title
            });
          } else {
            console.warn('Task not found in any source. TaskId:', taskId);
            // 设置一个基本的任务信息，避免UI错误
            setTaskDetailInfo({
              id: taskId,
              project_id: 0, // 默认项目ID
              title: timerState.taskTitle || '未知任务'
            });
          }
        } catch (fallbackError) {
          console.error('Fallback task fetch failed:', fallbackError);
          // 设置基本任务信息
          setTaskDetailInfo({
            id: taskId,
            project_id: 0,
            title: timerState.taskTitle || '未知任务'
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch task info:', error);
      // 设置基本任务信息，确保UI不会崩溃
      setTaskDetailInfo({
        id: taskId,
        project_id: 0,
        title: timerState.taskTitle || '未知任务'
      });
    } finally {
      setLoadingTaskInfo(false);
    }
  }, [loadingTaskInfo, timerState.taskTitle]);

  // 当任务ID变化时获取任务信息
  useEffect(() => {
    if (timerState.isRunning && timerState.taskId && !taskDetailInfo) {
      fetchTaskInfo(timerState.taskId);
    } else if (!timerState.isRunning) {
      setTaskDetailInfo(null);
      // 重置隐藏状态，下次开始定时器时自动显示
      if (isHidden) {
        setIsHidden(false);
        try {
          localStorage.setItem('floatingTimerHidden', JSON.stringify(false));
        } catch (error) {
          console.warn('Failed to save floating timer hidden state:', error);
        }
      }
    }
  }, [timerState.isRunning, timerState.taskId, taskDetailInfo, fetchTaskInfo, isHidden]);

  // 保存位置到localStorage
  const savePosition = useCallback((newPosition: { x: number; y: number }) => {
    try {
      localStorage.setItem('floatingTimerPosition', JSON.stringify(newPosition));
    } catch (error) {
      console.warn('Failed to save floating timer position:', error);
    }
  }, []);

  // 保存最小化状态
  const saveMinimizedState = useCallback((minimized: boolean) => {
    try {
      localStorage.setItem('floatingTimerMinimized', JSON.stringify(minimized));
    } catch (error) {
      console.warn('Failed to save floating timer minimized state:', error);
    }
  }, []);

  // 保存隐藏状态
  const saveHiddenState = useCallback((hidden: boolean) => {
    try {
      localStorage.setItem('floatingTimerHidden', JSON.stringify(hidden));
    } catch (error) {
      console.warn('Failed to save floating timer hidden state:', error);
    }
  }, []);

  // 拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // 只有点击拖拽手柄才能拖拽
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, []);

  // 拖拽过程
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };

      // 边界检查
      const maxX = window.innerWidth - 300; // 假设组件最大宽度300px
      const maxY = window.innerHeight - 200; // 假设组件最大高度200px
      
      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));

      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      savePosition(position);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position, savePosition]);

  // 切换最小化状态
  const toggleMinimized = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    saveMinimizedState(newMinimized);
  }, [isMinimized, saveMinimizedState]);

  // 关闭浮窗
  const handleCloseTimer = useCallback(() => {
    setIsHidden(true);
    saveHiddenState(true);
    message.info('浮窗已隐藏，定时器仍在后台运行');
  }, [saveHiddenState]);

  // 停止定时器
  const handleStopTimer = useCallback(async () => {
    const success = await stopTimer();
    if (success) {
      message.success('定时器已停止');
    }
  }, [stopTimer]);

  // 跳转到任务详情页
  const handleViewTaskDetail = useCallback(() => {
    if (!timerState.taskId) {
      message.warning('无法获取任务信息');
      return;
    }

    if (taskDetailInfo && taskDetailInfo.project_id && taskDetailInfo.project_id > 0) {
      // 有project_id，使用项目任务页面路由
      console.log('Navigating to project task detail:', taskDetailInfo);
      navigate(`/projects/${taskDetailInfo.project_id}`, { 
        state: { highlightTaskId: timerState.taskId }
      });
    } else {
      // 没有project_id或project_id为0，跳转到全局任务页面
      console.log('Navigating to global tasks page with highlight:', timerState.taskId);
      message.info('正在跳转到任务管理页面...');
      navigate(`/tasks?highlight=${timerState.taskId}`);
    }
  }, [timerState.taskId, taskDetailInfo, navigate]);

  // 获取运行状态类名
  const getStatusClass = () => {
    if (timerState.elapsedSeconds > 7200) { // 2小时以上
      return 'floating-timer--warning';
    }
    return 'floating-timer--running';
  };

  // 如果没有正在运行的定时器，不显示组件
  if (!timerState.isRunning) {
    return null;
  }

  // 如果已隐藏，显示小的重新显示按钮
  if (isHidden) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999
        }}
      >
        <Tooltip title="显示定时器浮窗">
          <Button
            type="primary"
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => {
              setIsHidden(false);
              saveHiddenState(false);
            }}
            style={{
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className={`floating-timer ${getStatusClass()} ${isMinimized ? 'floating-timer--minimized' : ''} ${className}`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <Card
        size="small"
        styles={{
          body: { 
            padding: isMinimized ? '8px 12px' : '12px 16px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }
        }}
        className="floating-timer-card"
      >
        {/* 拖拽手柄 */}
        <div
          className="floating-timer-handle"
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            cursor: 'grab',
            background: 'transparent'
          }}
        />

        {isMinimized ? (
          // 最小化状态
          <div className="floating-timer-minimized">
            <Space size="small" align="center">
              <ClockCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                {timerState.formattedTime}
              </Text>
              <Tooltip title="查看任务详情">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={handleViewTaskDetail}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>
              <Tooltip title="展开">
                <Button
                  type="text"
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={toggleMinimized}
                />
              </Tooltip>
              <Tooltip title="关闭浮窗">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCloseTimer}
                  style={{ color: '#ff4d4f' }}
                />
              </Tooltip>
            </Space>
            <div 
              style={{ fontSize: '12px', color: '#666', marginTop: '2px', cursor: 'pointer' }}
              onClick={handleViewTaskDetail}
              title="点击查看任务详情"
            >
              {timerState.taskTitle && timerState.taskTitle.length > 20 
                ? timerState.taskTitle.substring(0, 20) + '...' 
                : timerState.taskTitle}
            </div>
          </div>
        ) : (
          // 展开状态
          <div className="floating-timer-expanded">
            {/* 标题栏 */}
            <div className="floating-timer-header">
              <Space size="small" align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size="small">
                  <ClockCircleOutlined style={{ color: '#52c41a' }} />
                  <Text strong style={{ fontSize: '12px' }}>计时中</Text>
                </Space>
                <Space size={0}>
                  <Tooltip title="最小化">
                    <Button
                      type="text"
                      size="small"
                      icon={<CompressOutlined />}
                      onClick={toggleMinimized}
                    />
                  </Tooltip>
                  <Tooltip title="关闭浮窗">
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={handleCloseTimer}
                      style={{ color: '#ff4d4f' }}
                    />
                  </Tooltip>
                </Space>
              </Space>
            </div>

            {/* 任务信息 */}
            <div className="floating-timer-content" style={{ marginTop: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <Text 
                  strong 
                  style={{ 
                    fontSize: '14px',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px',
                    cursor: 'pointer',
                    color: '#1890ff'
                  }}
                  title={`${timerState.taskTitle} - 点击查看详情`}
                  onClick={handleViewTaskDetail}
                >
                  {timerState.taskTitle || '未知任务'}
                </Text>
                {taskDetailInfo && (
                  <Text 
                    type="secondary" 
                    style={{ fontSize: '11px', display: 'block' }}
                  >
                    项目ID: {taskDetailInfo.project_id}
                  </Text>
                )}
              </div>

              {/* 时间显示 */}
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <Text
                  style={{
                    fontSize: '20px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: '#52c41a'
                  }}
                >
                  {timerState.formattedTime}
                </Text>
              </div>

              {/* 控制按钮 */}
              <Space size="small" style={{ width: '100%', justifyContent: 'center' }}>
                <Tooltip title="查看任务详情">
                  <Button
                    type="default"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={handleViewTaskDetail}
                    loading={loadingTaskInfo}
                  >
                    详情
                  </Button>
                </Tooltip>
                <Tooltip title="停止计时">
                  <Button
                    type="primary"
                    danger
                    size="small"
                    icon={<StopOutlined />}
                    onClick={handleStopTimer}
                    loading={isLoading}
                  >
                    停止
                  </Button>
                </Tooltip>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FloatingTimer;