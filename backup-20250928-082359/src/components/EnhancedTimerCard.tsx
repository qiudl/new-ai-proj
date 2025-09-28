import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, Typography, Space, Divider, Tooltip } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import CompactHistoryTasks from './CompactHistoryTasks';

const { Title, Text } = Typography;

interface EnhancedTimerCardProps {
  // 可选的样式覆盖
  style?: React.CSSProperties;
  // 是否显示历史任务
  showHistory?: boolean;
}

const EnhancedTimerCard: React.FC<EnhancedTimerCardProps> = ({ 
  style,
  showHistory = true 
}) => {
  const { timerState, isLoading, pauseTimer, resumeTimer, stopTimer, startTimer } = useTimer();

  // 🎯 处理暂停/恢复
  const handlePauseResume = useCallback(async () => {
    if (!timerState.isRunning) return;
    
    if (timerState.isPaused) {
      await resumeTimer();
    } else {
      await pauseTimer();
    }
  }, [timerState.isRunning, timerState.isPaused, pauseTimer, resumeTimer]);

  // 🎯 处理完成任务
  const handleCompleteTask = useCallback(async () => {
    if (!timerState.isRunning) return;
    await stopTimer();
  }, [timerState.isRunning, stopTimer]);

  // 🎯 处理历史任务选择
  const handleHistoryTaskSelect = useCallback(async (taskId: number, taskTitle: string) => {
    try {
      await startTimer(taskId, taskTitle);
    } catch (error) {
      console.error('开始历史任务计时失败:', error);
    }
  }, [startTimer]);

  // 🎯 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // 只在没有聚焦输入框时响应快捷键
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: 暂停/继续
      if (event.code === 'Space' && timerState.isRunning) {
        event.preventDefault();
        handlePauseResume();
      }
      
      // Enter: 完成任务
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

  // 🎯 渲染定时器显示
  const renderTimerDisplay = () => {
    if (timerState.isRunning && timerState.taskTitle) {
      return (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <Title level={4} style={{ 
            marginBottom: '8px', 
            color: timerState.isPaused ? '#faad14' : '#1890ff',
            fontSize: '16px'
          }}>
            {timerState.taskTitle}
          </Title>
          <Title level={1} style={{ 
            fontSize: '42px', 
            fontFamily: 'monospace', 
            margin: '20px 0',
            color: timerState.isPaused ? '#faad14' : '#52c41a',
            fontWeight: 600,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {timerState.formattedTime}
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            <ClockCircleOutlined style={{ marginRight: '4px' }} />
            {timerState.isPaused ? '计时已暂停' : '计时进行中'}
          </Text>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '24px 16px' }}>
        <Title level={4} style={{ 
          marginBottom: '16px', 
          color: '#8c8c8c',
          fontSize: '16px'
        }}>
          暂无正在进行的任务
        </Title>
        <Title level={1} style={{ 
          fontSize: '42px', 
          fontFamily: 'monospace', 
          margin: '20px 0',
          color: '#d9d9d9',
          fontWeight: 600
        }}>
          00:00:00
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          休息中
        </Text>
      </div>
    );
  };

  // 🎯 渲染控制按钮
  const renderControls = () => {
    if (!timerState.isRunning || !timerState.taskTitle) {
      return (
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            在"我的任务"或下方历史任务中选择任务开始计时
          </Text>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Space size="large">
          <Button
            type={timerState.isPaused ? "primary" : "default"}
            size="large"
            icon={timerState.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            onClick={handlePauseResume}
            loading={isLoading}
            style={{ 
              minWidth: '110px',
              height: '44px',
              fontSize: '15px'
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
            style={{ 
              minWidth: '110px',
              height: '44px',
              fontSize: '15px',
              backgroundColor: '#52c41a',
              borderColor: '#52c41a'
            }}
          >
            完成
          </Button>
        </Space>
      </div>
    );
  };


  // 🎯 渲染历史任务区域
  const renderHistoryTasks = () => {
    if (!showHistory) return null;
    
    return (
      <div style={{ 
        margin: '0 16px 16px 16px'
      }}>
        <Divider style={{ margin: '16px 0 12px 0' }} />
        <CompactHistoryTasks 
          maxHeight="300px"
          onTaskSelect={handleHistoryTaskSelect}
          compact={true}
        />
      </div>
    );
  };

  return (
    <Card
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      styles={{ 
        body: { 
          padding: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        } 
      }}
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>任务计时</span>
          {timerState.isRunning && (
            <Tooltip title="定时器运行中">
              <div 
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: timerState.isPaused ? '#faad14' : '#52c41a',
                  animation: timerState.isPaused ? 'none' : 'pulse 2s infinite'
                }}
              />
            </Tooltip>
          )}
        </Space>
      }
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 定时器显示 */}
        {renderTimerDisplay()}
        
        {/* 分隔线 */}
        <Divider style={{ margin: '0 0 16px 0' }} />
        
        {/* 控制按钮 */}
        {renderControls()}
        

        
        {/* 历史任务 */}
        {renderHistoryTasks()}
      </div>

      {/* CSS-in-JS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Card>
  );
};

export default EnhancedTimerCard;