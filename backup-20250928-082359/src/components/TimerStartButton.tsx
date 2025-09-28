import React, { useState, useCallback } from 'react';
import { Button, message, Tooltip } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import { Task } from '../types/task';

interface TimerStartButtonProps {
  task: Task;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'text' | 'link';
  showText?: boolean;
  className?: string;
  disabled?: boolean;
}

const TimerStartButton: React.FC<TimerStartButtonProps> = ({
  task,
  size = 'small',
  type = 'text',
  showText = false,
  className = '',
  disabled = false
}) => {
  const { timerState, isLoading, startTimer, stopTimer, isTaskTiming } = useTimer();
  const [localLoading, setLocalLoading] = useState(false);

  // 🎯 优化：检查是否当前任务正在计时 - 使用新的isTaskTiming函数
  const isCurrentTask = isTaskTiming(task.id, 'project_task');

  // Check if another task is running
  const isOtherTaskRunning = timerState.isRunning && !isCurrentTask;

  const handleTimerAction = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (disabled) return;

    setLocalLoading(true);
    
    try {
      if (isCurrentTask) {
        // Stop current timer
        const success = await stopTimer();
        if (success) {
          message.success(`停止计时: ${task.title}`);
        }
      } else if (isOtherTaskRunning) {
        // Show warning about stopping other task
        message.warning(`当前正在为其他任务计时，请先停止当前定时器`);
      } else {
        // Start timer for this task
        const success = await startTimer(task.id, task.title, 'project');
        if (success) {
          message.success(`开始计时: ${task.title}`);
        }
      }
    } catch (error) {
      console.error('Timer action failed:', error);
      message.error('定时器操作失败');
    } finally {
      setLocalLoading(false);
    }
  }, [task, isCurrentTask, isOtherTaskRunning, disabled, startTimer, stopTimer]);

  const getButtonContent = () => {
    if (isCurrentTask) {
      return {
        icon: <PauseCircleOutlined />,
        text: '停止计时',
        tooltip: `正在计时: ${timerState.formattedTime}`,
        danger: true
      };
    } else if (isOtherTaskRunning) {
      return {
        icon: <ClockCircleOutlined />,
        text: '其他任务计时中',
        tooltip: `当前正在为"${timerState.taskTitle}"计时`,
        disabled: true
      };
    } else {
      return {
        icon: <PlayCircleOutlined />,
        text: '开始计时',
        tooltip: `开始为"${task.title}"计时`,
        disabled: false
      };
    }
  };

  const content = getButtonContent();
  const buttonLoading = isLoading || localLoading;

  return (
    <Tooltip title={content.tooltip} mouseEnterDelay={0.5}>
      <Button
        icon={content.icon}
        size={size}
        type={isCurrentTask ? 'primary' : type}
        danger={content.danger}
        loading={buttonLoading}
        disabled={disabled || content.disabled}
        onClick={handleTimerAction}
        className={`timer-start-button ${className} ${isCurrentTask ? 'timer-running' : ''}`}
        style={{
          color: isCurrentTask ? undefined : (isOtherTaskRunning ? '#999' : '#52c41a'),
          borderColor: isCurrentTask ? undefined : (isOtherTaskRunning ? '#d9d9d9' : '#52c41a')
        }}
      >
        {showText && content.text}
      </Button>
    </Tooltip>
  );
};

export default TimerStartButton;