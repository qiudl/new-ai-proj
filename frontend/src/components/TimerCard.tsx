import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, Button, Typography, Space, message, Spin, Tooltip, Switch } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined, WifiOutlined, DisconnectOutlined, SoundOutlined, NotificationOutlined, QuestionCircleOutlined, ProjectOutlined } from '@ant-design/icons';
import NotificationService from '../services/notificationService';
import TaskSelectionModal from './TaskSelectionModal';
import { useTimer } from '../contexts/TimerContext';
import { TaskOption } from '../types/timer';
import { Task } from '../types/task';

const { Title, Text } = Typography;

interface TimerCardProps {
  // No props needed - using global timer context
}

const TimerCard: React.FC<TimerCardProps> = () => {
  // Use global timer context
  const { timerState, isLoading, connectionStatus, startTimer, stopTimer, refreshTimer } = useTimer();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(NotificationService.isNotificationEnabled());

  // Use refs for component mounted state
  const isMountedRef = useRef(true);




  // Handle task selection from modal
  const handleTaskSelect = useCallback((taskId: number, task: Task | TaskOption) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(task.title);
    setTaskModalVisible(false);
  }, []);

  // Handle opening task selection modal
  const handleOpenTaskModal = useCallback(() => {
    setTaskModalVisible(true);
  }, []);

  // Handle closing task selection modal
  const handleCloseTaskModal = useCallback(() => {
    setTaskModalVisible(false);
  }, []);



  // Handle notification settings toggle
  const handleNotificationToggle = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    NotificationService.setEnabled(enabled);
    
    if (enabled && NotificationService.getPermissionStatus() === 'default') {
      NotificationService.requestPermission().then(permission => {
        if (permission !== 'granted') {
          message.warning('浏览器通知权限被拒绝，无法发送通知提醒');
          setNotificationsEnabled(false);
          NotificationService.setEnabled(false);
        }
      });
    }
  }, []);

  // Handle start timer
  const handleStartTimer = useCallback(async () => {
    if (!selectedTaskId) {
      message.warning('请先选择一个任务');
      return;
    }

    const success = await startTimer(selectedTaskId, selectedTaskTitle);
    
    if (success && isMountedRef.current) {
      // Send notification
      if (notificationsEnabled) {
        NotificationService.notifyTimerStart(selectedTaskTitle);
      }
      
      // Reset task selection
      setSelectedTaskId(null);
      setSelectedTaskTitle('');
    }
  }, [selectedTaskId, selectedTaskTitle, startTimer, notificationsEnabled]);

  // Handle stop timer
  const handleStopTimer = useCallback(async () => {
    if (!timerState.isRunning) return;
    
    const success = await stopTimer();
    
    if (success && isMountedRef.current && notificationsEnabled) {
      // Send notification - timer details should be in timerState
      NotificationService.notifyTimerStop(
        timerState.taskTitle || '未知任务', 
        timerState.formattedTime
      );
    }
  }, [stopTimer, notificationsEnabled, timerState]);

  // Initialize notification service
  useEffect(() => {
    const initializeServices = async () => {
      if (!isMountedRef.current) return;
      
      try {
        await NotificationService.initialize();
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    };
    
    initializeServices();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      NotificationService.cleanup();
    };
  }, []);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isMountedRef.current) return;
      
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + Shift + S: Start/Stop timer
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        if (timerState.isRunning) {
          handleStopTimer();
        } else if (selectedTaskId) {
          handleStartTimer();
        } else {
          message.info('请先选择一个任务 (快捷键: Ctrl/Cmd + Shift + S)');
        }
      }
      
      // Ctrl/Cmd + Shift + R: Refresh timer status
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        refreshTimer();
      }

      // Ctrl/Cmd + Shift + N: Toggle notifications
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        handleNotificationToggle(!notificationsEnabled);
      }

      // Ctrl/Cmd + Shift + T: Test notification (when enabled)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        if (notificationsEnabled) {
          NotificationService.testNotification();
        } else {
          message.info('请先开启通知功能');
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [timerState.isRunning, selectedTaskId, handleStopTimer, handleStartTimer, refreshTimer, notificationsEnabled, handleNotificationToggle]);

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>任务计时器</span>
          <Tooltip 
            title={
              connectionStatus === 'connected' ? '已连接' :
              connectionStatus === 'disconnected' ? '连接失败 - 点击刷新重试' :
              '正在连接...'
            }
            mouseEnterDelay={0.5}
            mouseLeaveDelay={0}
          >
            <span>
              {connectionStatus === 'connected' ? (
                <WifiOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
              ) : connectionStatus === 'disconnected' ? (
                <DisconnectOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
              ) : (
                <Spin  />
              )}
            </span>
          </Tooltip>
          <Tooltip 
            title={notificationsEnabled ? '通知已开启' : '通知已关闭'}
            mouseEnterDelay={0.5}
            mouseLeaveDelay={0}
          >
            <span>
              <Switch
                
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
                checkedChildren={<SoundOutlined />}
                unCheckedChildren={<NotificationOutlined style={{ opacity: 0.5 }} />}
              />
            </span>
          </Tooltip>
          <Tooltip 
            title={
              <div style={{ fontSize: '12px' }}>
                <div><strong>快捷键:</strong></div>
                <div>Ctrl/Cmd + Shift + S: 开始/停止计时</div>
                <div>Ctrl/Cmd + Shift + R: 刷新状态</div>
                <div>Ctrl/Cmd + Shift + N: 切换通知</div>
                <div>Ctrl/Cmd + Shift + T: 测试通知</div>
              </div>
            }
            placement="bottomRight"
            mouseEnterDelay={0.5}
            mouseLeaveDelay={0}
          >
            <span>
              <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: '14px', cursor: 'help' }} />
            </span>
          </Tooltip>
        </Space>
      }
      style={{ textAlign: 'center' }}
      styles={{ body: { textAlign: 'center', padding: '24px' } }}
      className="timer-card"
    >
      {/* Timer Display */}
      <div style={{ marginBottom: '24px' }}>
        {timerState.isRunning && timerState.taskTitle ? (
          <div>
            <Title level={4} style={{ marginBottom: '8px', color: '#1890ff' }}>
              {timerState.taskTitle}
            </Title>
            <Title level={1} style={{ 
              fontSize: '48px', 
              fontFamily: 'monospace', 
              margin: '16px 0',
              color: '#52c41a'
            }}>
              {timerState.formattedTime}
            </Title>
            <Text type="secondary">计时进行中...</Text>
          </div>
        ) : (
          <div>
            <Title level={3} style={{ marginBottom: '16px' }}>
              选择任务开始计时
            </Title>
            <Title level={1} style={{ 
              fontSize: '48px', 
              fontFamily: 'monospace', 
              margin: '16px 0',
              color: '#8c8c8c'
            }}>
              00:00:00
            </Title>
            <Text type="secondary">暂未开始计时</Text>
          </div>
        )}
      </div>

      {/* Controls */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {!timerState.isRunning ? (
          // Start timer controls
          <div>
            <Button
              type={selectedTaskId ? 'default' : 'dashed'}
              size="large"
              onClick={handleOpenTaskModal}
              disabled={isLoading}
              style={{ width: '100%', marginBottom: '16px', minHeight: '48px' }}
            >
              {selectedTaskId ? (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, color: '#1890ff' }}>
                    已选择: {selectedTaskTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                    点击重新选择任务
                  </div>
                </div>
              ) : (
                <div>
                  <ProjectOutlined style={{ marginRight: '8px' }} />
                  选择要计时的任务
                </div>
              )}
            </Button>
            
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartTimer}
              loading={isLoading}
              disabled={!selectedTaskId}
              style={{ width: '200px' }}
            >
              开始计时
            </Button>
          </div>
        ) : (
          // Stop timer controls
          <Button
            type="primary"
            danger
            size="large"
            icon={<PauseCircleOutlined />}
            onClick={handleStopTimer}
            loading={isLoading}
            style={{ width: '200px' }}
          >
            停止计时
          </Button>
        )}

        {/* Control buttons */}
        <Space>
          <Button
            type="default"
            onClick={refreshTimer}
            loading={connectionStatus === 'checking'}
            disabled={isLoading}
            style={{
              borderColor: connectionStatus === 'disconnected' ? '#ff4d4f' : undefined,
              color: connectionStatus === 'disconnected' ? '#ff4d4f' : undefined
            }}
          >
            {connectionStatus === 'disconnected' ? '重新连接' : '刷新状态'}
          </Button>
          
          {notificationsEnabled && (
            <Button
              type="default"
              
              onClick={() => NotificationService.testNotification()}
              disabled={isLoading}
              icon={<SoundOutlined />}
            >
              测试通知
            </Button>
          )}
        </Space>
      </Space>

      {/* Task Selection Modal */}
      <TaskSelectionModal
        visible={taskModalVisible}
        onCancel={handleCloseTaskModal}
        onSelect={handleTaskSelect}
        loading={isLoading}
      />
    </Card>
  );
};

export default TimerCard;