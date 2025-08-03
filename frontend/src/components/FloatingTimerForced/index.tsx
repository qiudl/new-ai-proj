// 强制显示版本的FloatingTimer - 用于调试
import React, { useState } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { 
  ClockCircleOutlined, 
  StopOutlined, 
  DragOutlined,
  MinusOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const FloatingTimerForced = () => {
  const [position, setPosition] = useState({ x: 20, y: 80 });
  
  // 强制显示的测试数据
  const testState = {
    isRunning: true,
    taskTitle: "测试任务 - 强制显示",
    formattedTime: "00:05:23",
    taskId: 999
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        background: 'rgba(255, 255, 255, 0.95)',
        border: '3px solid #52c41a',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '250px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <Card
        size="small"
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ color: '#52c41a' }}>强制显示定时器</Text>
          </Space>
        }
        styles={{
          body: { padding: '12px' }
        }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Text strong>任务: </Text>
            <Text>{testState.taskTitle}</Text>
          </div>
          
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <Text
              style={{
                fontSize: '20px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#52c41a'
              }}
            >
              {testState.formattedTime}
            </Text>
          </div>
          
          <Space size="small" style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              type="primary"
              danger
              size="small"
              icon={<StopOutlined />}
              onClick={() => alert('这是测试按钮，点击了停止')}
            >
              停止
            </Button>
            <Button
              size="small"
              onClick={() => alert('这是测试按钮，点击了详情')}
            >
              详情
            </Button>
          </Space>
          
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              这是强制显示的测试版本
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default FloatingTimerForced;