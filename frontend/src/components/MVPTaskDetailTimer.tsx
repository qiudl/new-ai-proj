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
  Alert,
  Dropdown,
  Tooltip
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PauseCircleOutlined,
  PauseOutlined
} from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import { useUnifiedTimer } from '../hooks/useUnifiedTimer';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Text } = Typography;

interface MVPTaskDetailTimerProps {
  taskId: number;
  taskTitle: string;
  taskStatus: string;
  projectId?: number; // Add optional projectId for navigation
  taskType?: 'personal' | 'project'; // Add task type
  style?: React.CSSProperties;
  className?: string;
}

const MVPTaskDetailTimer: React.FC<MVPTaskDetailTimerProps> = ({
  taskId,
  taskTitle,
  taskStatus,
  projectId,
  taskType = projectId ? 'project' : 'personal', // 如果有projectId则为项目任务，否则为个人任务
  style = {},
  className = ''
}) => {
  const { timerState, isLoading, startTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();
  const navigate = useNavigate();

  // 统一计时器：用于读取所有活动计时器列表
  const { 
    activeTimers, 
    refreshActiveTimers,
    pauseTimerById,
    resumeTimerById,
    stopTimerById,
    pauseAll,
    resumeAll,
    stopAll
  } = useUnifiedTimer();

  // 触发每秒重渲染以刷新显示用时
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // 初始刷新一次活动计时器列表
  useEffect(() => {
    refreshActiveTimers();
  }, [refreshActiveTimers]);
  
  // 本地计时状态 - 用于实时更新
  const [localElapsedSeconds, setLocalElapsedSeconds] = useState(0);
  const [localFormattedTime, setLocalFormattedTime] = useState('00:00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 悬停控制显示的计时器行ID
  const [hoveredTimerId, setHoveredTimerId] = useState<number | null>(null);

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


  // 🎯 开始计时（带选项）
  const handleStartWithOption = useCallback(async (autoStopOthers: boolean) => {
    try {
      const success = await startTimer(taskId, taskTitle, taskType, { autoStopOthers });
      if (success) {
        message.success(`开始为任务"${taskTitle}"计时${autoStopOthers ? '（并停止其他）' : ''}`);
      } else {
        message.error('启动计时失败');
      }
    } catch (error) {
      console.error('❌ MVPTaskDetailTimer 开始计时失败:', error);
      message.error('开始计时失败');
    }
  }, [startTimer, taskId, taskTitle, taskType]);

  // 🎯 默认策略：尊重用户偏好（不显式传递 autoStopOthers，交由后端读取用户偏好），若无偏好则后端默认为并行
  const handleStartDefault = useCallback(async () => {
    try {
      const success = await startTimer(taskId, taskTitle, taskType);
      if (success) {
        message.success(`开始为任务"${taskTitle}"计时（默认设置）`);
      } else {
        message.error('启动计时失败');
      }
    } catch (error) {
      console.error('❌ MVPTaskDetailTimer 默认开始计时失败:', error);
      message.error('开始计时失败');
    }
  }, [startTimer, taskId, taskTitle, taskType]);

  // 🎯 暂停/继续当前计时
  const handlePause = useCallback(async () => {
    try {
      const ok = await pauseTimer();
      if (ok) message.info('计时已暂停');
    } catch (e) {
      message.error('暂停失败');
    }
  }, [pauseTimer]);

  const handleResume = useCallback(async () => {
    try {
      const ok = await resumeTimer();
      if (ok) message.success('计时已恢复');
    } catch (e) {
      message.error('恢复失败');
    }
  }, [resumeTimer]);

  // 🎯 停止当前计时
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
      
      // Ctrl/Cmd + Space: 开始/暂停/继续（未在当前任务计时时为开始-默认并行）
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        if (isCurrentTaskTiming) {
          if (timerState.isPaused) {
            handleResume();
          } else {
            handlePause();
          }
        } else {
          handleStartDefault();
        }
      }

      // Ctrl/Cmd + E: 停止当前计时
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleStopTimer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCurrentTaskTiming, handleStartDefault, handleStopTimer, handlePause, handleResume, timerState.isPaused]);

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

  const timerStatus = getTimerStatus();

  // 🎯 渲染操作控制区
  const renderControls = () => {
    if (taskStatus === 'completed') return null;

    if (isCurrentTaskTiming) {
      return (
        <Space>
          <Button
            type={timerState.isPaused ? 'primary' : 'default'}
            icon={timerState.isPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
            onClick={timerState.isPaused ? handleResume : handlePause}
            loading={isLoading}
          >
            {timerState.isPaused ? '继续' : '暂停'}
          </Button>
          <Button
            danger
            type="primary"
            icon={<StopOutlined />}
            onClick={handleStopTimer}
            loading={isLoading}
          >
            完成
          </Button>
        </Space>
      );
    }

    // 未在当前任务计时时：提供开始（默认=并行）+ 下拉选项
    const menuItems = [
      { key: 'start-default', label: '按默认设置启动（并行）' },
      { key: 'start-parallel', label: '并行启动（不停止其他）' },
      { key: 'start-stop-others', label: '启动并自动停止其他' }
    ];

    return (
      <Dropdown
        menu={{
          items: menuItems,
          onClick: async ({ key }) => {
            if (key === 'start-default') return handleStartDefault();
            if (key === 'start-parallel') return handleStartWithOption(false);
            if (key === 'start-stop-others') return handleStartWithOption(true);
          }
        }}
      >
        <Button type="primary" icon={<PlayCircleOutlined />} loading={isLoading}>
          开始
        </Button>
      </Dropdown>
    );
  };

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
          {renderControls()}
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

        {/* 🎯 正在计时的任务列表（并行计时） */}
        {activeTimers && activeTimers.filter(t => t.status === 'running').length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>
                ⏱️ 正在计时的任务（{activeTimers.filter(t => t.status === 'running').length}）
              </Text>
              <Space size="small">
                <Button size="small" onClick={pauseAll}>全部暂停</Button>
                <Button size="small" type="primary" onClick={resumeAll}>全部继续</Button>
                <Button size="small" danger onClick={stopAll}>全部完成</Button>
                <Button type="link" size="small" onClick={refreshActiveTimers} style={{ padding: 0 }}>
                  刷新
                </Button>
              </Space>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeTimers.filter(t => t.status === 'running').map((t) => {
                const projectId = (t as any).project_id;
                const taskId = (t as any).target_id;
                const startText = t.start_time ? dayjs(t.start_time).format('YYYY-MM-DD HH:mm') : '';
                const elapsedText = (() => {
                  try {
                    const start = t.start_time ? new Date(t.start_time).getTime() : Date.now();
                    const raw = Math.max(0, Math.floor((Date.now() - start) / 1000) - (((t as any).pause_total_seconds) || 0));
                    const hours = Math.floor(raw / 3600);
                    const minutes = Math.floor((raw % 3600) / 60);
                    const secs = raw % 60;
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                  } catch {
                    return '00:00:00';
                  }
                })();

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      padding: '8px 10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge color="#52c41a" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {projectId && taskId ? (
                          <a
                            href={`/projects/${projectId}/tasks/${taskId}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/projects/${projectId}/tasks/${taskId}`);
                            }}
                            style={{ fontSize: 13, fontWeight: 500, color: '#1890ff', textDecoration: 'none' }}
                          >
                            {t.target_title}
                          </a>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>{t.target_title}</span>
                        )}
                        {/* 悬停时显示的图标按钮 */}
                        <span
                          onMouseEnter={() => setHoveredTimerId(t.id)}
                          onMouseLeave={() => setHoveredTimerId(null)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          {hoveredTimerId === t.id && (
                            <>
                              <Tooltip title={t.status === 'running' ? '暂停' : '继续'}>
                                <Button 
                                  size="small" 
                                  type={t.status === 'running' ? 'default' : 'primary'} 
                                  icon={t.status === 'running' ? <PauseOutlined /> : <PlayCircleOutlined />} 
                                  onClick={() => (t.status === 'running' ? pauseTimerById(t.id) : resumeTimerById(t.id))}
                                />
                              </Tooltip>
                              <Tooltip title="完成">
                                <Button size="small" danger icon={<StopOutlined />} onClick={() => stopTimerById(t.id)} />
                              </Tooltip>
                            </>
                          )}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {startText && <span style={{ marginRight: 6 }}>{startText}</span>}已用时 {elapsedText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default MVPTaskDetailTimer;