import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Typography, Space, message, Spin, Tooltip, Switch } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined, WifiOutlined, DisconnectOutlined, SoundOutlined, NotificationOutlined, QuestionCircleOutlined, ProjectOutlined } from '@ant-design/icons';
import TimerService from '../services/timerService';
import NotificationService from '../services/notificationService';
import TimerPerformanceMonitor from '../utils/timerPerformance';
import MemoryManager from '../utils/memoryManager';
import TaskSelectionModal from './TaskSelectionModal';
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
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(NotificationService.isNotificationEnabled());
  const [lastMilestone, setLastMilestone] = useState<number>(0);

  // MEMORY OPTIMIZATION: Use refs for timers to prevent memory leaks
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // MEMORY OPTIMIZATION: Store callbacks in refs to prevent recreating dependencies
  const onTimerUpdateRef = useRef(onTimerUpdate);
  onTimerUpdateRef.current = onTimerUpdate;
  
  // Store milestone check function in ref to avoid dependency issues
  const checkTimerMilestonesRef = useRef<((elapsedSeconds: number) => void) | null>(null);

  // MEMORY OPTIMIZATION: Enhanced timer cleanup
  const stopLocalTimer = useCallback(() => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
      localTimerRef.current = null;
    }
  }, []);

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // MEMORY OPTIMIZATION: Start local timer with proper cleanup
  const startLocalTimer = useCallback((startTime: Date) => {
    stopLocalTimer(); // Always clear existing timer first
    
    localTimerRef.current = setInterval(() => {
      // CRITICAL: Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      const elapsed = TimerService.getElapsedSeconds(startTime);
      const formatted = TimerService.formatDuration(elapsed);
      
      setTimerState(prev => ({
        ...prev,
        elapsedSeconds: elapsed,
        formattedTime: formatted
      }));

      // Check for milestones (throttled to prevent excessive notifications)
      if (checkTimerMilestonesRef.current) {
        checkTimerMilestonesRef.current(elapsed);
      }
    }, 1000);
  }, [stopLocalTimer]);

  // MEMORY OPTIMIZATION: Simplified timer restoration with cleanup
  const restoreTimerFromLocalStorage = useCallback(() => {
    try {
      const savedState = localStorage.getItem('timerState');
      
      if (!savedState) return false;
      
      const parsed = JSON.parse(savedState);
      const lastSyncTime = new Date(parsed.lastSyncTime);
      const timeSinceSync = (Date.now() - lastSyncTime.getTime()) / 1000;
      
      // Reduced restoration window for memory efficiency
      if (timeSinceSync < 180 && parsed.isRunning && parsed.startTime) { // 3 minutes max
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
        if (onTimerUpdateRef.current) {
          onTimerUpdateRef.current(true, parsed.currentTask?.title);
        }
        
        message.success(`已恢复计时状态: ${parsed.currentTask?.title || '未知任务'}`);
        return true;
      } else if (parsed.isRunning) {
        // Clean up expired data immediately
        clearTimerStorage();
        message.warning('计时状态已过期，请重新开始计时');
      }
    } catch (error) {
      console.warn('Failed to restore timer state from localStorage:', error);
      clearTimerStorage();
    }
    return false;
  }, [startLocalTimer]);

  // Helper to clear timer storage
  const clearTimerStorage = useCallback(() => {
    try {
      localStorage.removeItem('timerState');
      localStorage.removeItem('timerAutoSaveVersion');
      localStorage.removeItem('lastTimerSave');
    } catch (error) {
      // Ignore cleanup errors
    }
  }, []);

  // MEMORY OPTIMIZATION: Load current timer with proper error handling
  const loadCurrentTimer = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setConnectionStatus('checking');
      const response = await TimerService.getCurrentTimer();
      
      if (!isMountedRef.current) return; // Check again after async call
      
      updateTimerFromResponse(response);
      setConnectionStatus('connected');
      setLastUpdateTime(new Date());
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Failed to load current timer:', error);
      setConnectionStatus('disconnected');
      
      // Try to restore from localStorage if API fails
      const restored = restoreTimerFromLocalStorage();
      if (!restored) {
        message.error('无法连接到计时器服务，请检查网络连接');
      }
    }
  }, [restoreTimerFromLocalStorage]);

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

  // MEMORY OPTIMIZATION: Update timer state with size limits and throttled saves
  const updateTimerFromResponse = useCallback((response: TimerCurrentResponse) => {
    if (!isMountedRef.current) return;
    
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
    
    // MEMORY OPTIMIZATION: Throttled auto-save with size limits
    const saveToStorage = () => {
      try {
        const timerData = {
          isRunning: newState.isRunning,
          currentTask: newState.currentTask,
          startTime: newState.startTime?.toISOString(),
          lastSyncTime: new Date().toISOString(),
          elapsedSeconds: newState.elapsedSeconds,
          formattedTime: newState.formattedTime,
          lastMilestone: lastMilestone
        };
        
        // Limit localStorage data size
        const dataString = JSON.stringify(timerData);
        if (dataString.length < 5000) { // Reduced to 5KB limit
          localStorage.setItem('timerState', dataString);
          localStorage.setItem('timerAutoSaveVersion', '2.2');
        } else {
          console.warn('Timer data too large for localStorage, skipping save');
        }
      } catch (error) {
        console.warn('Failed to save timer state to localStorage:', error);
        // Clear potentially corrupted data
        try {
          localStorage.removeItem('timerState');
          localStorage.removeItem('timerAutoSaveVersion');
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };

    // Throttle localStorage writes - only save every 5 seconds max
    const now = Date.now();
    const lastSave = parseInt(localStorage.getItem('lastTimerSave') || '0');
    if (now - lastSave > 5000) {
      saveToStorage();
      localStorage.setItem('lastTimerSave', now.toString());
    }
    
    // Notify parent component
    if (onTimerUpdateRef.current) {
      onTimerUpdateRef.current(newState.isRunning, newState.currentTask?.title);
    }

    // Start/stop local timer updates
    if (newState.isRunning && newState.startTime) {
      startLocalTimer(newState.startTime);
    } else {
      stopLocalTimer();
    }
  }, [startLocalTimer, stopLocalTimer]);

  // MEMORY OPTIMIZATION: Throttled milestone checking
  const checkTimerMilestones = useCallback((elapsedSeconds: number) => {
    if (!notificationsEnabled || !timerState.currentTask || !isMountedRef.current) {
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

  // Update the ref whenever the function changes
  checkTimerMilestonesRef.current = checkTimerMilestones;

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

    setLoading(true);
    try {
      const response = await TimerService.startTimer(selectedTaskId);
      
      if (!isMountedRef.current) return;
      
      message.success(`开始计时: ${response.task_title}`);
      
      // Send notification
      if (notificationsEnabled) {
        NotificationService.notifyTimerStart(response.task_title);
      }
      
      // Update timer state
      const currentTimer = await TimerService.getCurrentTimer();
      
      if (!isMountedRef.current) return;
      
      updateTimerFromResponse(currentTimer);
      
      // Reset milestone tracking
      setLastMilestone(0);
      
      // Reset task selection
      setSelectedTaskId(null);
      setSelectedTaskTitle('');
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Failed to start timer:', error);
      message.error('开始计时失败');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedTaskId, notificationsEnabled, updateTimerFromResponse]);

  // Handle stop timer
  const handleStopTimer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await TimerService.stopTimer();
      
      if (!isMountedRef.current) return;
      
      message.success(`计时结束: ${response.task_title} (${response.formatted_time})`);
      
      // Send notification
      if (notificationsEnabled) {
        NotificationService.notifyTimerStop(response.task_title, response.formatted_time);
      }
      
      // Update timer state
      const currentTimer = await TimerService.getCurrentTimer();
      
      if (!isMountedRef.current) return;
      
      updateTimerFromResponse(currentTimer);
      
      // Reset milestone tracking
      setLastMilestone(0);
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Failed to stop timer:', error);
      message.error('停止计时失败');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [notificationsEnabled, updateTimerFromResponse]);

  // MEMORY OPTIMIZATION: Initialize services with cleanup
  useEffect(() => {
    const initializeServices = async () => {
      if (!isMountedRef.current) return;
      
      try {
        // Start performance monitoring (with memory limits)
        TimerPerformanceMonitor.startMonitoring();
        
        // Start memory monitoring
        MemoryManager.startMonitoring();
        
        await NotificationService.initialize();
        
        if (!isMountedRef.current) return;
        
        await loadCurrentTimer();
      } catch (error) {
        console.error('Failed to initialize timer services:', error);
      }
    };
    
    initializeServices();

    // CRITICAL: Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopLocalTimer();
      stopRefreshTimer();
      TimerPerformanceMonitor.stopMonitoring();
      MemoryManager.stopMonitoring();
      // Force cleanup to prevent memory leaks
      TimerPerformanceMonitor.forceCleanup();
      MemoryManager.performManualCleanup();
      // Cleanup notification service
      NotificationService.cleanup();
    };
  }, [loadCurrentTimer, stopLocalTimer, stopRefreshTimer]);

  // MEMORY OPTIMIZATION: Periodic refresh with proper cleanup
  useEffect(() => {
    if (timerState.isRunning) {
      // Don't refresh while timer is running to avoid interruptions
      stopRefreshTimer();
      return;
    }

    // Refresh every 30 seconds when timer is not running
    refreshTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      loadCurrentTimer();
    }, 30000);

    return () => {
      stopRefreshTimer();
    };
  }, [timerState.isRunning, loadCurrentTimer, stopRefreshTimer]);

  // MEMORY OPTIMIZATION: Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return;
      
      if (document.hidden) {
        // Page is hidden, stop local updates to save resources
        stopLocalTimer();
      } else if (timerState.isRunning && timerState.startTime) {
        // Page is visible again, resume local updates and sync with server
        loadCurrentTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState.isRunning, timerState.startTime, loadCurrentTimer, stopLocalTimer]);

  // MEMORY OPTIMIZATION: Keyboard shortcuts with proper cleanup
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
  }, [timerState.isRunning, selectedTaskId, handleStopTimer, handleStartTimer, loadCurrentTimer, notificationsEnabled, handleNotificationToggle]);

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>任务计时器</span>
          <Tooltip 
            title={
              connectionStatus === 'connected' ? `已连接 - 最后更新: ${lastUpdateTime.toLocaleTimeString()}` :
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
                <Spin size="small" />
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
                size="small"
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
            <Button
              type={selectedTaskId ? 'default' : 'dashed'}
              size="large"
              onClick={handleOpenTaskModal}
              disabled={loading}
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
            onClick={loadCurrentTimer}
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

      {/* Task Selection Modal */}
      <TaskSelectionModal
        visible={taskModalVisible}
        onCancel={handleCloseTaskModal}
        onSelect={handleTaskSelect}
        loading={loading}
      />
    </Card>
  );
};

export default TimerCard;