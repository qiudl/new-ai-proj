import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Row, Col, Select, message, Modal } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { personalTimerService } from '../services/personalTimerService';

const { Text, Title } = Typography;
const { Option } = Select;

interface PersonalTimerCurrent {
  is_running: boolean;
  task_type?: string;
  task_id?: number;
  task_title?: string;
  task_color?: string;
  task_category?: string;
  start_time?: string;
  elapsed_seconds: number;
  formatted_time: string;
}

interface UserTimerTaskResponse {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  color: string;
  is_favorite: boolean;
  total_time_seconds: number;
  target_time_seconds: number;
  formatted_total_time: string;
  formatted_target_time: string;
  completion_percent: number;
  created_at: string;
  updated_at: string;
}

interface PersonalTimerControlProps {
  currentTimer?: PersonalTimerCurrent;
  availableTasks: UserTimerTaskResponse[];
  onRefresh?: () => void;
}

const PersonalTimerControl: React.FC<PersonalTimerControlProps> = ({
  currentTimer,
  availableTasks,
  onRefresh
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [realTimeTimer, setRealTimeTimer] = useState<NodeJS.Timeout | null>(null);

  // 实时更新计时器显示
  useEffect(() => {
    if (currentTimer?.is_running) {
      setElapsedTime(currentTimer.elapsed_seconds);
      
      // 每秒更新一次显示
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setRealTimeTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    } else {
      if (realTimeTimer) {
        clearInterval(realTimeTimer);
        setRealTimeTimer(null);
      }
      setElapsedTime(currentTimer?.elapsed_seconds || 0);
    }
  }, [currentTimer?.is_running, currentTimer?.elapsed_seconds]);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 开始计时
  const handleStartTimer = async () => {
    if (!selectedTaskId) {
      message.warning('请选择一个任务开始计时');
      return;
    }

    try {
      setLoading(true);
      await personalTimerService.startPersonalTimer({
        task_type: 'personal',
        task_id: selectedTaskId,
        auto_stop_others: true
      });
      message.success('计时已开始');
      onRefresh?.();
    } catch (error) {
      message.error('启动计时失败');
      console.error('Failed to start timer:', error);
    } finally {
      setLoading(false);
    }
  };

  // 停止计时
  const handleStopTimer = async () => {
    Modal.confirm({
      title: '确认停止计时',
      content: `确定要停止当前计时吗？已用时：${formatTime(elapsedTime)}`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await personalTimerService.stopTimer();
          message.success('计时已停止');
          onRefresh?.();
        } catch (error) {
          message.error('停止计时失败');
          console.error('Failed to stop timer:', error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined />
          <span>计时器控制</span>
        </Space>
      }
      styles={{
        body: {
          background: currentTimer?.is_running 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : '#f9f9f9',
          color: currentTimer?.is_running ? 'white' : 'inherit',
          borderRadius: '8px'
        }
      }}
    >
      {currentTimer?.is_running ? (
        // 正在计时状态
        <div>
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Space direction="vertical" size="small">
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  正在进行
                </Text>
                <Text style={{ color: 'white', fontSize: '16px' }}>
                  📝 {currentTimer.task_title}
                </Text>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}>
                  <div 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: currentTimer.task_color || '#1890ff'
                    }}
                  />
                  <Text style={{ color: 'white', fontSize: '12px' }}>
                    {currentTimer.task_category}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                {formatTime(elapsedTime)}
              </Title>
            </Col>
          </Row>
          
          <Row justify="center">
            <Button 
              type="primary" 
              danger 
              size="large"
              icon={<StopOutlined />}
              onClick={handleStopTimer}
              loading={loading}
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white'
              }}
            >
              停止计时
            </Button>
          </Row>
        </div>
      ) : (
        // 未计时状态
        <div>
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col flex="auto">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary">选择任务开始计时</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择一个个人计时任务"
                  value={selectedTaskId}
                  onChange={setSelectedTaskId}
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  {availableTasks.map(task => (
                    <Option key={task.id} value={task.id}>
                      <Space>
                        <div 
                          style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: task.color
                          }}
                        />
                        <span>{task.title}</span>
                        {task.is_favorite && <span style={{ color: '#faad14' }}>⭐</span>}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col>
              <Title level={2} style={{ color: '#666', margin: 0 }}>
                00:00:00
              </Title>
            </Col>
          </Row>
          
          <Row justify="center">
            <Button 
              type="primary" 
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartTimer}
              disabled={!selectedTaskId}
              loading={loading}
            >
              开始计时
            </Button>
          </Row>
        </div>
      )}
    </Card>
  );
};

export default PersonalTimerControl;