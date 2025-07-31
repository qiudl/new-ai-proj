// @ts-nocheck
// 任务详情页定时器组件
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Tooltip, 
  message, 
  Modal,
  Statistic,
  Badge,
  Alert
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import TimerService from '../services/timerService';
import './TaskDetailTimer.css';

const { Text } = Typography;

interface TaskDetailTimerProps {
  taskId: number;
  taskTitle: string;
  taskStatus: string;
  style?: React.CSSProperties;
  className?: string;
}

const TaskDetailTimer: React.FC<TaskDetailTimerProps> = ({
  taskId,
  taskTitle,
  taskStatus,
  style = {},
  className = ''
}) => {
  const { timerState, isLoading, startTimer, stopTimer } = useTimer();
  const [localStats, setLocalStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 检查是否是当前任务正在计时
  const isCurrentTaskTiming = timerState.isRunning && timerState.taskId === taskId;
  
  // 检查是否有其他任务正在计时
  const isOtherTaskTiming = timerState.isRunning && timerState.taskId !== taskId;

  // 加载当前任务的计时统计
  const loadTaskStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const stats = await TimerService.getTimerStats();
      // TODO: 这里需要根据实际API返回的数据结构调整
      setLocalStats(stats);
    } catch (error) {
      console.error('Failed to load timer stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [taskId]);

  // 页面加载时获取统计信息
  useEffect(() => {
    loadTaskStats();
  }, [loadTaskStats]);

  // 开始计时
  const handleStartTimer = async () => {
    if (isOtherTaskTiming) {
      Modal.confirm({
        title: '切换计时任务',
        content: (
          <div>
            <p>当前正在为其他任务计时：</p>
            <p><strong>{timerState.taskTitle}</strong></p>
            <p>是否停止当前计时并开始为本任务计时？</p>
          </div>
        ),
        okText: '确认切换',
        cancelText: '取消',
        onOk: async () => {
          try {
            // 先停止当前计时
            await stopTimer();
            // 再开始新的计时
            const success = await startTimer(taskId, taskTitle);
            if (success) {
              message.success(`开始为任务"${taskTitle}"计时`);
              loadTaskStats();
            }
          } catch (error) {
            message.error('计时切换失败');
          }
        }
      });
    } else {
      try {
        const success = await startTimer(taskId, taskTitle);
        if (success) {
          message.success(`开始为任务"${taskTitle}"计时`);
          loadTaskStats();
        }
      } catch (error) {
        message.error('开始计时失败');
      }
    }
  };

  // 停止计时
  const handleStopTimer = async () => {
    Modal.confirm({
      title: '停止计时',
      content: `确定要停止为任务"${taskTitle}"计时吗？`,
      okText: '确认停止',
      cancelText: '取消',
      onOk: async () => {
        try {
          const success = await stopTimer();
          if (success) {
            message.success('计时已停止');
            loadTaskStats();
          }
        } catch (error) {
          message.error('停止计时失败');
        }
      }
    });
  };

  // 获取计时状态显示
  const getTimerStatus = () => {
    if (isCurrentTaskTiming) {
      return {
        status: 'processing' as const,
        text: '计时中',
        color: '#52c41a',
        icon: <ClockCircleOutlined style={{ color: '#52c41a' }} />
      };
    } else if (isOtherTaskTiming) {
      return {
        status: 'warning' as const,
        text: '其他任务计时中',
        color: '#faad14',
        icon: <WarningOutlined style={{ color: '#faad14' }} />
      };
    } else {
      return {
        status: 'default' as const,
        text: '未计时',
        color: '#8c8c8c',
        icon: <PauseCircleOutlined style={{ color: '#8c8c8c' }} />
      };
    }
  };

  // 获取按钮配置
  const getButtonConfig = () => {
    if (isCurrentTaskTiming) {
      return {
        type: 'primary' as const,
        danger: true,
        icon: <StopOutlined />,
        text: '停止计时',
        onClick: handleStopTimer,
        disabled: isLoading
      };
    } else {
      return {
        type: 'primary' as const,
        danger: false,
        icon: <PlayCircleOutlined />,
        text: isOtherTaskTiming ? '切换计时' : '开始计时',
        onClick: handleStartTimer,
        disabled: isLoading || taskStatus === 'completed'
      };
    }
  };

  const timerStatus = getTimerStatus();
  const buttonConfig = getButtonConfig();

  // 如果任务已完成，显示不同的界面
  if (taskStatus === 'completed') {
    return (
      <Card 
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>任务计时</span>
          </Space>
        }
        size="small"
        style={style}
        className={`task-detail-timer ${className}`}
      >
        <Alert
          message="任务已完成"
          description="已完成的任务无法开始新的计时"
          type="success"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        {localStats && (
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="总计时时长"
              value={localStats.totalTime || '00:00:00'}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: '16px' }}
            />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          {timerStatus.icon}
          <span>任务计时</span>
          <Badge 
            status={timerStatus.status} 
            text={timerStatus.text}
          />
        </Space>
      }
      size="small"
      style={style}
      className={`task-detail-timer ${isCurrentTaskTiming ? 'timer-running' : isOtherTaskTiming ? 'timer-warning' : ''} ${className}`}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 当前计时显示 */}
        {isCurrentTaskTiming && (
          <div 
            className="timer-pulse"
            style={{ 
              textAlign: 'center', 
              padding: '16px',
              backgroundColor: '#f6ffed',
              borderRadius: '6px',
              border: '1px solid #b7eb8f'
            }}>
            <Statistic
              title="当前计时"
              value={timerState.formattedTime}
              valueStyle={{ 
                color: '#52c41a', 
                fontSize: '24px',
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}
              prefix={<ClockCircleOutlined />}
            />
          </div>
        )}

        {/* 其他任务计时提示 */}
        {isOtherTaskTiming && (
          <Alert
            message="其他任务正在计时"
            description={
              <div>
                <Text>当前正在为以下任务计时：</Text>
                <br />
                <Text strong style={{ color: '#1890ff' }}>
                  {timerState.taskTitle}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  计时时长：{timerState.formattedTime}
                </Text>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 操作按钮 */}
        <div style={{ textAlign: 'center' }}>
          <Button
            type={buttonConfig.type}
            danger={buttonConfig.danger}
            icon={buttonConfig.icon}
            onClick={buttonConfig.onClick}
            loading={isLoading}
            disabled={buttonConfig.disabled}
            size="large"
            style={{ width: '100%', height: '40px' }}
          >
            {buttonConfig.text}
          </Button>
        </div>

        {/* 任务计时统计 */}
        {localStats && (
          <div style={{ 
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fafafa',
            borderRadius: '6px',
            border: '1px solid #e8e8e8'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <Text strong>历史统计</Text>
              <Tooltip title="点击刷新统计数据">
                <Button 
                  type="text" 
                  size="small"
                  icon={<InfoCircleOutlined />}
                  onClick={loadTaskStats}
                  loading={statsLoading}
                />
              </Tooltip>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                  {localStats.totalSessions || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  计时次数
                </div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                  {localStats.totalTime || '00:00:00'}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  总时长
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 帮助提示 */}
        {!isCurrentTaskTiming && !isOtherTaskTiming && (
          <div style={{ 
            padding: '8px 12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #bae7ff'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 点击"开始计时"为此任务记录工作时间
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default TaskDetailTimer;