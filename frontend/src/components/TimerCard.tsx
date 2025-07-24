import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, message, Spin, Tooltip, Switch } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined, WifiOutlined, DisconnectOutlined, SoundOutlined, NotificationOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import NotificationService from '../services/notificationService';
import TimerPerformanceMonitor from '../utils/timerPerformance';
import TaskSelector from './TaskSelector';
import { TimerState, TaskOption, TimerCurrentResponse } from '../types/timer';
import { Task } from '../types/task';

const { Title, Text } = Typography;

interface TimerCardProps {
  onTimerUpdate?: (isRunning: boolean, taskTitle?: string) => void;
}

const TimerCard: React.FC<TimerCardProps> = ({ onTimerUpdate }) => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    elapsedSeconds: 0,
    formattedTime: '00:00:00'
  });

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(NotificationService.isNotificationEnabled());
  const [lastMilestone, setLastMilestone] = useState<number>(0);

  // Enhanced timer restoration with better error handling and versioning
  const restoreTimerFromLocalStorage = useCallback(() => {
    try {
      const savedState = localStorage.getItem('timerState');
      const savedVersion = localStorage.getItem('timerAutoSaveVersion');
      
      if (savedState) {
        const parsed = JSON.parse(savedState);
        const lastSyncTime = new Date(parsed.lastSyncTime);
        const timeSinceSync = (Date.now() - lastSyncTime.getTime()) / 1000;
        
        // Extended restoration window based on version and connection status
        const maxRestoreTime = savedVersion === '2.0' ? 600 : 300; // 10 minutes for v2.0, 5 for older
        
        if (timeSinceSync < maxRestoreTime && parsed.isRunning && parsed.startTime) {
          const startTime = new Date(parsed.startTime);
          const currentElapsed = TimerService.getElapsedSeconds(startTime);
          
          setTimerState({
            isRunning: true,
            currentTask: parsed.currentTask,
            startTime,
            elapsedSeconds: currentElapsed,
            formattedTime: TimerService.formatDuration(currentElapsed)
          });
          
          // Restore milestone tracking
          if (parsed.lastMilestone) {
            setLastMilestone(parsed.lastMilestone);
          }
          
          // Start local timer updates
          startLocalTimer(startTime);
          
          // Notify parent component
          if (onTimerUpdate) {
            onTimerUpdate(true, parsed.currentTask?.title);
          }
          
          message.success(`已恢复计时状态: ${parsed.currentTask?.title || '未知任务'}`);
          return true; // Successfully restored
        } else if (parsed.isRunning) {
          // Timer was running but too much time has passed
          message.warning('计时状态已过期，请重新开始计时');
          localStorage.removeItem('timerState');
        }
      }
    } catch (error) {
      console.warn('Failed to restore timer state from localStorage:', error);
      // Clean up corrupted data
      localStorage.removeItem('timerState');
      localStorage.removeItem('timerAutoSaveVersion');
    }
    return false; // No restoration
  }, [onTimerUpdate]);

  // Load current timer status on component mount
  const loadCurrentTimer = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      const response = await TimerService.getCurrentTimer();
      updateTimerFromResponse(response);
      setConnectionStatus('connected');
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to load current timer:', error);
      setConnectionStatus('disconnected');
      
      // Try to restore from localStorage if API fails
      const restored = restoreTimerFromLocalStorage();
      if (!restored) {
        message.error('无法连接到计时器服务，请检查网络连接');
      } else {
        message.warning('从本地存储恢复了计时器状态，请检查网络连接以同步最新数据');
      }
    }
  }, [restoreTimerFromLocalStorage]);

  // Handle task selection
  const handleTaskSelect = (taskId: number | undefined, task?: Task | TaskOption) => {
    setSelectedTaskId(taskId || null);
  };

  // Update timer state from API response
  const updateTimerFromResponse = (response: TimerCurrentResponse) => {
    const newState: TimerState = {
      isRunning: response.is_running,
      currentTask: response.task_id && response.task_title ? {
        id: response.task_id,
        title: response.task_title
      } : undefined,
      startTime: response.start_time ? new Date(response.start_time) : undefined,
      elapsedSeconds: response.elapsed_seconds,
      formattedTime: response.formatted_time
    };

    setTimerState(newState);
    
    // Enhanced auto-save to localStorage with sync status
    try {
      const timerData = {
        isRunning: newState.isRunning,
        currentTask: newState.currentTask,
        startTime: newState.startTime?.toISOString(),
        lastSyncTime: new Date().toISOString(),
        elapsedSeconds: newState.elapsedSeconds,
        formattedTime: newState.formattedTime,
        connectionStatus: connectionStatus,
        lastMilestone: lastMilestone
      };
      
      // Measure storage performance
      TimerPerformanceMonitor.measureStorageWrite(() => {
        localStorage.setItem('timerState', JSON.stringify(timerData));
        localStorage.setItem('timerAutoSaveVersion', '2.0'); // Version for compatibility
      }, JSON.stringify(timerData).length);
    } catch (error) {
      console.warn('Failed to save timer state to localStorage:', error);
    }
    
    // Notify parent component
    if (onTimerUpdate) {
      onTimerUpdate(newState.isRunning, newState.currentTask?.title);
    }

    // Start/stop local timer updates
    if (newState.isRunning && newState.startTime) {
      startLocalTimer(newState.startTime);
    } else {
      stopLocalTimer();
    }
  };

  // Start local timer updates (every second)
  const startLocalTimer = (startTime: Date) => {
    stopLocalTimer(); // Clear any existing timer
    
    const id = setInterval(() => {
      const elapsed = TimerService.getElapsedSeconds(startTime);
      const formatted = TimerService.formatDuration(elapsed);
      
      setTimerState(prev => ({
        ...prev,
        elapsedSeconds: elapsed,
        formattedTime: formatted
      }));

      // Check for milestones and notifications
      checkTimerMilestones(elapsed);
    }, 1000);
    
    setIntervalId(id);
  };

  // Stop local timer updates
  const stopLocalTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  // Check for timer milestones and send notifications
  const checkTimerMilestones = useCallback((elapsedSeconds: number) => {
    if (!notificationsEnabled || !timerState.currentTask) {
      return;
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Milestone notifications every 15 minutes
    if (elapsedMinutes > 0 && elapsedMinutes % 15 === 0 && elapsedMinutes !== lastMilestone) {
      setLastMilestone(elapsedMinutes);
      NotificationService.notifyMilestone(
        timerState.currentTask.title,
        TimerService.formatDuration(elapsedSeconds),
        elapsedMinutes
      );
    }

    // Long running timer warning after 2 hours
    if (elapsedMinutes === 120 && lastMilestone !== 120) {
      setLastMilestone(120);
      NotificationService.notifyLongRunning(
        timerState.currentTask.title,
        TimerService.formatDuration(elapsedSeconds)
      );
    }
  }, [notificationsEnabled, timerState.currentTask, lastMilestone]);

  // Handle notification settings toggle
  const handleNotificationToggle = (enabled: boolean) => {
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
  };

  // Handle start timer
  const handleStartTimer = async () => {
    if (!selectedTaskId) {
      message.warning('请先选择一个任务');
      return;
    }

    setLoading(true);
    try {
      const response = await TimerPerformanceMonitor.measureApiCall(
        () => TimerService.startTimer(selectedTaskId),
        'start_timer'
      );
      message.success(`开始计时: ${response.task_title}`);
      
      // Send notification
      if (notificationsEnabled) {
        await TimerPerformanceMonitor.measureNotification(
          () => NotificationService.notifyTimerStart(response.task_title)
        );
      }
      
      // Update timer state
      const currentTimer = await TimerPerformanceMonitor.measureApiCall(
        () => TimerService.getCurrentTimer(),
        'get_current_after_start'
      );
      updateTimerFromResponse(currentTimer);
      
      // Reset milestone tracking
      setLastMilestone(0);
      
      // Reset task selection
      setSelectedTaskId(null);
    } catch (error) {
      console.error('Failed to start timer:', error);
      message.error('开始计时失败');
    } finally {
      setLoading(false);
    }
  };

  // Handle stop timer
  const handleStopTimer = async () => {
    setLoading(true);
    try {
      const response = await TimerPerformanceMonitor.measureApiCall(
        () => TimerService.stopTimer(),
        'stop_timer'
      );
      message.success(`计时结束: ${response.task_title} (${response.formatted_time})`);
      
      // Send notification
      if (notificationsEnabled) {
        await TimerPerformanceMonitor.measureNotification(
          () => NotificationService.notifyTimerStop(response.task_title, response.formatted_time)
        );
      }
      
      // Update timer state
      const currentTimer = await TimerPerformanceMonitor.measureApiCall(
        () => TimerService.getCurrentTimer(),
        'get_current_after_stop'
      );
      updateTimerFromResponse(currentTimer);
      
      // Reset milestone tracking
      setLastMilestone(0);
    } catch (error) {
      console.error('Failed to stop timer:', error);
      message.error('停止计时失败');
    } finally {
      setLoading(false);
    }
  };

  // Initialize services and load data on component mount
  useEffect(() => {
    const initializeServices = async () => {
      // Start performance monitoring
      TimerPerformanceMonitor.startMonitoring();
      
      await NotificationService.initialize();
      await TimerPerformanceMonitor.measureApiCall(
        loadCurrentTimer,
        'initial_load'
      );
    };
    
    initializeServices();

    // Cleanup on unmount
    return () => {
      TimerPerformanceMonitor.stopMonitoring();
    };
  }, [loadCurrentTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopLocalTimer();
    };
  }, [intervalId]);

  // Periodic refresh of current timer (every 30 seconds)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!timerState.isRunning) {
        loadCurrentTimer();
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [timerState.isRunning, loadCurrentTimer]);

  // Handle page visibility changes for better performance
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause local updates but keep API syncing
        stopLocalTimer();
      } else if (timerState.isRunning && timerState.startTime) {
        // Page is visible again, resume local updates and sync with server
        loadCurrentTimer();
        startLocalTimer(timerState.startTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState.isRunning, timerState.startTime, loadCurrentTimer]);

  // Keyboard shortcuts for timer control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
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
        loadCurrentTimer();
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
  }, [timerState.isRunning, selectedTaskId, handleStopTimer, loadCurrentTimer, notificationsEnabled, handleNotificationToggle]);

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>任务计时器</span>
          <Tooltip title={
            connectionStatus === 'connected' ? `已连接 - 最后更新: ${lastUpdateTime.toLocaleTimeString()}` :
            connectionStatus === 'disconnected' ? '连接失败 - 点击刷新重试' :
            '正在连接...'
          }>
            {connectionStatus === 'connected' ? (
              <WifiOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
            ) : connectionStatus === 'disconnected' ? (
              <DisconnectOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
            ) : (
              <Spin size="small" />
            )}
          </Tooltip>
          <Tooltip title={notificationsEnabled ? '通知已开启' : '通知已关闭'}>
            <Switch
              size="small"
              checked={notificationsEnabled}
              onChange={handleNotificationToggle}
              checkedChildren={<SoundOutlined />}
              unCheckedChildren={<NotificationOutlined style={{ opacity: 0.5 }} />}
            />
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
          >
            <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: '14px', cursor: 'help' }} />
          </Tooltip>
        </Space>
      }
      styles={{ body: { textAlign: 'center', padding: '24px' } }}
      className="timer-card"
    >
      {/* Timer Display */}
      <div style={{ marginBottom: '24px' }}>
        {timerState.isRunning && timerState.currentTask ? (
          <div>
            <Title level={4} style={{ marginBottom: '8px', color: '#1890ff' }}>
              {timerState.currentTask.title}
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
            <TaskSelector
              timerMode={true}
              showProjectNames={true}
              placeholder="选择要计时的任务"
              style={{ width: '100%', marginBottom: '16px' }}
              value={selectedTaskId || undefined}
              onChange={handleTaskSelect}
              allowClear={true}
            />
            
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartTimer}
              loading={loading}
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
            loading={loading}
            style={{ width: '200px' }}
          >
            停止计时
          </Button>
        )}

        {/* Control buttons */}
        <Space>
          <Button
            type="default"
            onClick={() => {
              loadCurrentTimer();
            }}
            loading={connectionStatus === 'checking'}
            disabled={loading}
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
              size="small"
              onClick={() => NotificationService.testNotification()}
              disabled={loading}
              icon={<SoundOutlined />}
            >
              测试通知
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
};

export default TimerCard;