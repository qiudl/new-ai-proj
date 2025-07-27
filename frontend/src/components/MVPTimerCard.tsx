import React, { useCallback, useEffect } from 'react';
import { Card, Button, Typography, Space } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useSimplifiedTimer } from '../contexts/SimplifiedTimerContext';

const { Title, Text } = Typography;

interface MVPTimerCardProps {
  // 可选的样式覆盖
  style?: React.CSSProperties;
}

const MVPTimerCard: React.FC<MVPTimerCardProps> = ({ style }) => {
  const { timerState, isLoading, pauseTimer, resumeTimer, stopTimer } = useSimplifiedTimer();

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
        <div style={{ textAlign: 'center' }}>
          <Title level={4} style={{ 
            marginBottom: '8px', 
            color: timerState.isPaused ? '#faad14' : '#1890ff',
            fontSize: '16px'
          }}>
            {timerState.taskTitle}
          </Title>
          <Title level={1} style={{ 
            fontSize: '36px', 
            fontFamily: 'monospace', 
            margin: '16px 0',
            color: timerState.isPaused ? '#faad14' : '#52c41a',
            fontWeight: 600
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
      <div style={{ textAlign: 'center' }}>
        <Title level={4} style={{ 
          marginBottom: '16px', 
          color: '#8c8c8c',
          fontSize: '16px'
        }}>
          暂无正在进行的任务
        </Title>
        <Title level={1} style={{ 
          fontSize: '36px', 
          fontFamily: 'monospace', 
          margin: '16px 0',
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
        <Text type="secondary" style={{ fontSize: '13px', textAlign: 'center', display: 'block' }}>
          在"我的任务"中选择任务开始计时
        </Text>
      );
    }

    return (
      <Space size="middle" style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          type={timerState.isPaused ? "primary" : "default"}
          size="large"
          icon={timerState.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          onClick={handlePauseResume}
          loading={isLoading}
          style={{ minWidth: '100px' }}
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
            minWidth: '100px',
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
        height: '100%',
        ...style
      }}
      styles={{ 
        body: { 
          textAlign: 'center', 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 'calc(100% - 57px)'
        } 
      }}
    >
      {/* 定时器显示 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderTimerDisplay()}
      </div>

      {/* 控制按钮 */}
      <div style={{ marginTop: '24px' }}>
        {renderControls()}
      </div>

      {/* 🎯 键盘快捷键提示 */}
      {timerState.isRunning && (
        <div style={{ 
          marginTop: '16px', 
          padding: '8px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '4px',
          border: '1px solid #bae7ff'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ⌨️ 快捷键: Space 暂停/继续 | Enter 完成
          </Text>
        </div>
      )}
    </Card>
  );
};

export default MVPTimerCard;