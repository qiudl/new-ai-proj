// @ts-nocheck
// FloatingTimer调试组件 - 临时调试用
import React from 'react';
import { Card, Typography, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';

const { Text } = Typography;

const FloatingTimerDebug = () => {
  const { timerState, isLoading, connectionStatus } = useTimer();
  
  console.log('🔍 FloatingTimer Debug Info:', {
    isRunning: timerState.isRunning,
    taskId: timerState.taskId,
    taskTitle: timerState.taskTitle,
    formattedTime: timerState.formattedTime,
    isLoading,
    connectionStatus
  });

  // 强制显示调试信息（不管是否运行）
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        background: 'rgba(255, 255, 255, 0.95)',
        border: '2px solid #ff4d4f',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '250px',
        fontSize: '12px'
      }}
    >
      <Card size="small" title="定时器调试信息">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong style={{ color: '#ff4d4f' }}>
            🔍 Debug Mode
          </Text>
          
          <div>
            <Text strong>运行状态: </Text>
            <Text style={{ color: timerState.isRunning ? '#52c41a' : '#ff4d4f' }}>
              {timerState.isRunning ? '运行中' : '已停止'}
            </Text>
          </div>
          
          <div>
            <Text strong>任务ID: </Text>
            <Text>{timerState.taskId || '无'}</Text>
          </div>
          
          <div>
            <Text strong>任务标题: </Text>
            <Text>{timerState.taskTitle || '无'}</Text>
          </div>
          
          <div>
            <Text strong>计时时间: </Text>
            <Text>{timerState.formattedTime}</Text>
          </div>
          
          <div>
            <Text strong>加载状态: </Text>
            <Text>{isLoading ? '加载中' : '空闲'}</Text>
          </div>
          
          <div>
            <Text strong>连接状态: </Text>
            <Text style={{ 
              color: connectionStatus === 'connected' ? '#52c41a' : 
                     connectionStatus === 'disconnected' ? '#ff4d4f' : '#faad14'
            }}>
              {connectionStatus}
            </Text>
          </div>
          
          {!timerState.isRunning && (
            <Text type="warning" style={{ fontSize: '11px' }}>
              ⚠️ 原始FloatingTimer因为isRunning=false而隐藏
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default FloatingTimerDebug;