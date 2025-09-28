import React, { useState, useEffect, useCallback } from 'react';
import { Button, Tooltip, message } from 'antd';
import { StarOutlined, StarFilled, LoadingOutlined } from '@ant-design/icons';
import { useDailyFocusTasks } from '../hooks/useDailyFocusTasks';
import { DailyFocusTaskPriority } from '../types/dailyFocusTask';

interface DailyFocusTaskToggleProps {
  taskId: number;
  taskTitle?: string;
  initialPriority?: DailyFocusTaskPriority;
  onToggleComplete?: (isInFocus: boolean) => void;
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'dashed' | 'link' | 'text';
  className?: string;
  style?: React.CSSProperties;
}

const DailyFocusTaskToggle: React.FC<DailyFocusTaskToggleProps> = ({
  taskId,
  taskTitle = '',
  initialPriority = 'medium',
  onToggleComplete,
  size = 'middle',
  type = 'default',
  className,
  style
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    focusTasks,
    addFocusTask,
    removeFocusTask,
    refreshFocusTasks,
    loading: hookLoading
  } = useDailyFocusTasks({ autoRefresh: false });

  // Check if current task is in daily focus tasks
  const dailyFocusTask = focusTasks?.find(task => task.task_id === taskId);
  const isInDailyFocus = !!dailyFocusTask;

  // Load daily focus tasks on mount to check current state
  useEffect(() => {
    refreshFocusTasks();
  }, [taskId]); // Re-check when taskId changes

  const handleToggleDailyFocus = useCallback(async () => {
    if (isLoading || hookLoading) return;

    setIsLoading(true);
    try {
      if (isInDailyFocus) {
        // Remove from daily focus
        if (dailyFocusTask) {
          await removeFocusTask(dailyFocusTask.id);
          message.success(`已从今日主要任务中移除"${taskTitle}"`);
          onToggleComplete?.(false);
        }
      } else {
        // Add to daily focus
        await addFocusTask({
          task_id: taskId,
          priority: initialPriority,
          notes: `从任务详情页添加`,
          sort_order: (focusTasks?.length || 0) + 1 // Add at the end
        });
        message.success(`已将"${taskTitle}"设为今日主要任务`);
        onToggleComplete?.(true);
      }
    } catch (error: any) {
      console.error('Toggle daily focus task failed:', error);
      const errorMessage = error?.message || error?.response?.data?.error?.message || 
                          (isInDailyFocus ? '移除主要任务失败' : '设为主要任务失败');
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading, 
    hookLoading, 
    isInDailyFocus, 
    dailyFocusTask, 
    taskId, 
    taskTitle, 
    initialPriority, 
    focusTasks?.length,
    addFocusTask, 
    removeFocusTask, 
    onToggleComplete
  ]);

  const getButtonProps = () => {
    if (isInDailyFocus) {
      return {
        icon: isLoading ? <LoadingOutlined /> : <StarFilled />,
        children: '移除主要任务',
        tooltip: '从今日主要任务中移除',
        danger: true
      };
    } else {
      return {
        icon: isLoading ? <LoadingOutlined /> : <StarOutlined />,
        children: '设为主要任务',
        tooltip: '设为今日主要任务',
        type: 'primary' as const
      };
    }
  };

  const buttonProps = getButtonProps();
  const finalType = isInDailyFocus ? 'default' : (buttonProps.type || type);

  return (
    <Tooltip title={buttonProps.tooltip}>
      <Button
        size={size}
        type={finalType}
        danger={buttonProps.danger}
        icon={buttonProps.icon}
        loading={isLoading}
        disabled={hookLoading}
        onClick={handleToggleDailyFocus}
        className={className}
        style={{
          ...style,
          color: isInDailyFocus ? '#fa8c16' : undefined,
          borderColor: isInDailyFocus ? '#fa8c16' : undefined
        }}
      >
        {buttonProps.children}
      </Button>
    </Tooltip>
  );
};

export default DailyFocusTaskToggle;