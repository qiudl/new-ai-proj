import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  message, 
  Modal,
  Statistic,
  Badge,
  Alert
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PauseCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Text } = Typography;

interface MVPTaskDetailTimerProps {
  taskId: number;
  taskTitle: string;
  taskStatus: string;
  projectId?: number; // Add optional projectId for navigation
  style?: React.CSSProperties;
  className?: string;
}

const MVPTaskDetailTimer: React.FC<MVPTaskDetailTimerProps> = ({
  taskId,
  taskTitle,
  taskStatus,
  style = {},
  className = ''
}) => {
  const { timerState, isLoading, startTimer, stopTimer } = useTimer();
  const navigate = useNavigate();
  
  // 本地计时状态 - 用于实时更新
  const [localElapsedSeconds, setLocalElapsedSeconds] = useState(0);
  const [localFormattedTime, setLocalFormattedTime] = useState('00:00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🎯 检查是否是当前任务正在计时
  const isCurrentTaskTiming = timerState.isRunning && timerState.taskId === taskId;
  
  // 🎯 检查是否有其他任务正在计时
  const isOtherTaskTiming = timerState.isRunning && timerState.taskId !== taskId;

  // 🎯 时间格式化函数
  const formatElapsedTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 🎯 启动本地计时器进行实时更新
  const startLocalTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isCurrentTaskTiming && timerState.startTime && !timerState.isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - timerState.startTime!.getTime()) / 1000);
        setLocalElapsedSeconds(elapsed);
        setLocalFormattedTime(formatElapsedTime(elapsed));
      }, 1000);
    }
  }, [isCurrentTaskTiming, timerState.startTime, timerState.isPaused, formatElapsedTime]);

  // 🎯 停止本地计时器
  const stopLocalTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 🎯 监听计时器状态变化，启动或停止本地计时器
  useEffect(() => {
    if (isCurrentTaskTiming && !timerState.isPaused) {
      startLocalTimer();
    } else {
      stopLocalTimer();
    }

    // 组件卸载时清理
    return () => {
      stopLocalTimer();
    };
  }, [isCurrentTaskTiming, timerState.isPaused, startLocalTimer, stopLocalTimer]);

  // 🎯 初始化本地时间状态
  useEffect(() => {
    if (isCurrentTaskTiming && timerState.startTime) {
      const now = Date.now();
      const elapsed = Math.floor((now - timerState.startTime.getTime()) / 1000);
      setLocalElapsedSeconds(elapsed);
      setLocalFormattedTime(formatElapsedTime(elapsed));
    } else if (!isCurrentTaskTiming) {
      setLocalElapsedSeconds(0);
      setLocalFormattedTime('00:00:00');
    }
  }, [isCurrentTaskTiming, timerState.startTime, formatElapsedTime]);


  // 🎯 简化的开始计时
  const handleStartTimer = useCallback(async () => {
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
            // 先停止当前计时，等待完成
            const stopSuccess = await stopTimer();
            if (!stopSuccess) {
              message.error('停止当前计时失败');
              return;
            }
            
            // 等待一小段时间确保状态同步
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 再开始新的计时
            const startSuccess = await startTimer(taskId, taskTitle);
            if (startSuccess) {
              message.success(`已切换到任务"${taskTitle}"计时`);
            } else {
              message.error('开始新计时失败');
            }
          } catch (error) {
            console.error('计时切换失败:', error);
            message.error('计时切换失败');
          }
        }
      });
    } else {
      try {
        const success = await startTimer(taskId, taskTitle);
        if (success) {
          message.success(`开始为任务"${taskTitle}"计时`);
        } else {
          message.error('启动计时失败');
        }
      } catch (error) {
        console.error('开始计时失败:', error);
        message.error('开始计时失败');
      }
    }
  }, [isOtherTaskTiming, timerState.taskTitle, stopTimer, startTimer, taskId, taskTitle]);

  // 🎯 简化的停止计时
  const handleStopTimer = useCallback(async () => {
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
          }
        } catch (error) {
          message.error('停止计时失败');
        }
      }
    });
  }, [stopTimer, taskTitle]);

  // 🎯 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在当前任务详情页且没有其他输入框聚焦时响应快捷键
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.target && (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      
      // Ctrl/Cmd + Space: 开始/停止计时
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        if (isCurrentTaskTiming) {
          handleStopTimer();
        } else {
          handleStartTimer();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCurrentTaskTiming, handleStartTimer, handleStopTimer]);

  // 🎯 获取计时状态显示
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

  // 🎯 获取按钮配置
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

  // 🎯 如果任务已完成，显示简化界面
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
        className={className}
      >
        <Alert
          message="任务已完成"
          description="已完成的任务无法开始新的计时"
          type="success"
          showIcon
        />
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
      className={className}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 🎯 当前计时显示 */}
        {isCurrentTaskTiming && (
          <div style={{ 
            padding: '16px',
            backgroundColor: '#f6ffed',
            borderRadius: '6px',
            border: '1px solid #b7eb8f'
          }}>
            {/* 实时计时显示 */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Statistic
                title="当前计时"
                value={localFormattedTime}
                valueStyle={{ 
                  color: '#52c41a', 
                  fontSize: '28px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
                prefix={<ClockCircleOutlined />}
              />
            </div>
            
            {/* 开始时间显示 */}
            {timerState.startTime && (
              <div style={{ 
                textAlign: 'center',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '4px',
                border: '1px solid #d9f7be'
              }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    开始时间
                  </Text>
                  <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
                    {dayjs(timerState.startTime).format('YYYY年MM月DD日 HH:mm:ss')}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    已计时 {Math.floor(localElapsedSeconds / 60)} 分钟 {localElapsedSeconds % 60} 秒
                  </Text>
                  <Text type="secondary" style={{ fontSize: '10px', color: '#8c8c8c' }}>
                    ⌨️ Ctrl/Cmd + 空格停止
                  </Text>
                </Space>
              </div>
            )}
          </div>
        )}

        {/* 🎯 其他任务计时提示 */}
        {isOtherTaskTiming && (
          <Alert
            message="其他任务正在计时"
            description={
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <Text>当前正在为以下任务计时：</Text>
                </div>
                <Button 
                  type="link" 
                  style={{ 
                    padding: 0, 
                    height: 'auto', 
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px'
                  }}
                  onClick={() => {
                    // Navigation disabled - project ID not available in timer state
                    message.info('计时任务导航功能暂不可用');
                  }}
                >
                  <Text strong style={{ color: '#1890ff' }}>
                    {timerState.taskTitle}
                  </Text>
                </Button>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    计时时长：{timerState.formattedTime}
                  </Text>
                  {timerState.startTime && (
                    <>
                      <br />
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        开始时间：{dayjs(timerState.startTime).format('MM月DD日 HH:mm:ss')}
                      </Text>
                    </>
                  )}
                </div>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* 🎯 操作按钮 */}
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

        {/* 🎯 简化的帮助提示 */}
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
            <br />
            <Text type="secondary" style={{ fontSize: '11px', color: '#8c8c8c' }}>
              ⌨️ 快捷键：Ctrl/Cmd + 空格 开始/停止计时
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default MVPTaskDetailTimer;