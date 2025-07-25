import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Space, Typography, Tooltip, message } from 'antd';
import { 
  ClockCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined, 
  DragOutlined,
  MinusOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { useTimer } from '../../contexts/TimerContext';
import './FloatingTimer.css';

const { Text } = Typography;

interface FloatingTimerProps {
  defaultPosition?: { x: number; y: number };
  className?: string;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ 
  defaultPosition = { x: 20, y: 80 },
  className = ''
}) => {
  const { timerState, isLoading, stopTimer } = useTimer();
  const [position, setPosition] = useState(defaultPosition);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 如果没有正在运行的定时器，不显示组件
  if (!timerState.isRunning) {
    return null;
  }

  // 从localStorage恢复位置
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('floatingTimerPosition');
      const savedMinimized = localStorage.getItem('floatingTimerMinimized');
      
      if (savedPosition) {
        setPosition(JSON.parse(savedPosition));
      }
      
      if (savedMinimized) {
        setIsMinimized(JSON.parse(savedMinimized));
      }
    } catch (error) {
      console.warn('Failed to restore floating timer settings:', error);
    }
  }, []);

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

  // 停止定时器
  const handleStopTimer = useCallback(async () => {
    const success = await stopTimer();
    if (success) {
      message.success('定时器已停止');
    }
  }, [stopTimer]);

  // 获取运行状态类名
  const getStatusClass = () => {
    if (timerState.elapsedSeconds > 7200) { // 2小时以上
      return 'floating-timer--warning';
    }
    return 'floating-timer--running';
  };

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
              <Tooltip title="展开">
                <Button
                  type="text"
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={toggleMinimized}
                />
              </Tooltip>
            </Space>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
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
                    maxWidth: '200px'
                  }}
                  title={timerState.taskTitle}
                >
                  {timerState.taskTitle || '未知任务'}
                </Text>
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