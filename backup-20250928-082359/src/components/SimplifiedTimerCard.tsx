import React, { useCallback, useRef, useEffect, memo } from 'react';
import { Card, Button, Typography, Space, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import '../styles/SimplifiedTimer.css';

const { Title, Text } = Typography;

interface SimplifiedTimerCardProps {
  // No props needed - using global timer context
}

const SimplifiedTimerCard: React.FC<SimplifiedTimerCardProps> = memo(() => {
  // Use global timer context
  const { timerState, isLoading, startTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();

  // Use refs for component mounted state
  const isMountedRef = useRef(true);

  // Handle pause/resume timer
  const handlePauseResume = useCallback(async () => {
    if (!timerState.isRunning) return;
    
    try {
      if (timerState.isPaused) {
        const success = await resumeTimer();
        if (success && isMountedRef.current) {
          message.success('计时已恢复');
        }
      } else {
        const success = await pauseTimer();
        if (success && isMountedRef.current) {
          message.success('计时已暂停');
        }
      }
    } catch (error) {
      console.error('暂停/恢复计时失败:', error);
      message.error('操作失败，请重试');
    }
  }, [timerState.isRunning, timerState.isPaused, pauseTimer, resumeTimer]);

  // Handle complete task (stop timer)
  const handleCompleteTask = useCallback(async () => {
    if (!timerState.isRunning) return;
    
    try {
      const success = await stopTimer();
      if (success && isMountedRef.current) {
        message.success(`任务已完成！耗时: ${timerState.formattedTime}`);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
      message.error('操作失败，请重试');
    }
  }, [stopTimer, timerState.formattedTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keyboard shortcuts for timer control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isMountedRef.current) return;
      
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space bar: Pause/Resume timer
      if (event.code === 'Space' && timerState.isRunning) {
        event.preventDefault();
        handlePauseResume();
      }
      
      // Enter: Complete task
      if (event.code === 'Enter' && timerState.isRunning) {
        event.preventDefault();
        handleCompleteTask();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [timerState.isRunning, handlePauseResume, handleCompleteTask]);

  // Render timer display
  const renderTimerDisplay = () => {
    if (timerState.isRunning && timerState.taskTitle) {
      return (
        <div className={`timer-display ${timerState.isPaused ? 'paused' : 'running'}`}>
          <Title level={4} style={{ 
            marginBottom: '8px', 
            color: timerState.isPaused ? '#faad14' : '#1890ff',
            fontSize: '18px'
          }}>
{timerState.taskId ? `#${timerState.taskId} ` : ''}{timerState.taskTitle}
          </Title>
          <Title level={1} style={{ 
            fontSize: '42px', 
            fontFamily: 'monospace', 
            margin: '16px 0',
            color: timerState.isPaused ? '#faad14' : '#52c41a',
            fontWeight: 600,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'color 0.3s ease-in-out'
          }}>
            {timerState.formattedTime}
          </Title>
          <Text type="secondary" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className={`status-indicator ${timerState.isPaused ? 'paused' : 'running'}`}></span>
            {timerState.isPaused ? '计时已暂停' : '计时进行中'}
          </Text>
        </div>
      );
    }

    return (
      <div className="timer-display stopped">
        <Title level={4} style={{ 
          marginBottom: '16px', 
          color: '#8c8c8c',
          fontSize: '18px'
        }}>
          暂无正在进行的任务
        </Title>
        <Title level={1} style={{ 
          fontSize: '42px', 
          fontFamily: 'monospace', 
          margin: '16px 0',
          color: '#d9d9d9',
          fontWeight: 600,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'color 0.3s ease-in-out'
        }}>
          00:00:00
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="status-indicator stopped"></span>
          休息中
        </Text>
      </div>
    );
  };

  // Render control buttons
  const renderControls = () => {
    if (!timerState.isRunning || !timerState.taskTitle) {
      return (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          在其他页面选择任务开始计时
        </Text>
      );
    }

    return (
      <Space size="middle">
        <Button
          type={timerState.isPaused ? "primary" : "default"}
          size="large"
          icon={timerState.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          onClick={handlePauseResume}
          loading={isLoading}
          className="timer-control-button"
          style={{ 
            minWidth: '120px',
            height: '44px'
          }}
        >
          {timerState.isPaused ? '继续' : '暂停'}
        </Button>
        
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleCompleteTask}
          loading={isLoading}
          className="timer-control-button"
          style={{ 
            minWidth: '120px',
            height: '44px',
            backgroundColor: '#52c41a',
            borderColor: '#52c41a'
          }}
        >
          完成
        </Button>
      </Space>
    );
  };

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>任务计时</span>
        </Space>
      }
      style={{ 
        textAlign: 'center',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      styles={{ 
        body: { 
          textAlign: 'center', 
          padding: '32px 24px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        } 
      }}
      className="simplified-timer-card"
    >
      {/* Timer Display */}
      <div style={{ marginBottom: '32px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {renderTimerDisplay()}
      </div>

      {/* Controls */}
      <div style={{ marginTop: 'auto' }}>
        {renderControls()}
      </div>

      {/* Keyboard shortcuts hint */}
      {timerState.isRunning && (
        <div className="keyboard-hint">
          Space: 暂停/继续 | Enter: 完成
        </div>
      )}
    </Card>
  );
});

SimplifiedTimerCard.displayName = 'SimplifiedTimerCard';

export default SimplifiedTimerCard;