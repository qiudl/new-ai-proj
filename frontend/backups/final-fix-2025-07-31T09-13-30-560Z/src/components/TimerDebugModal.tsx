// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Modal, Card, Typography, Tag, Space, Button, Divider } from 'antd';
import { BugOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';

const { Text, Paragraph } = Typography;

interface TimerDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

const TimerDebugModal: React.FC<TimerDebugModalProps> = ({ visible, onClose }) => {
  const { getDebugInfo } = useTimer();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // 🎯 获取调试信息
  const refreshDebugInfo = () => {
    const info = getDebugInfo();
    setDebugInfo(info);
  };

  useEffect(() => {
    if (visible) {
      refreshDebugInfo();
      // 每2秒刷新一次
      const interval = setInterval(refreshDebugInfo, 2000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const renderStatus = (value: boolean) => (
    <Tag color={value ? 'green' : 'red'}>
      {value ? '正常' : '异常'}
    </Tag>
  );

  const renderTimerState = () => {
    if (!debugInfo?.timerState) return null;

    
    
    return (
      <Card size="small" title="定时器状态" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>运行状态:</Text>
            {renderStatus(timerState.isRunning)}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>暂停状态:</Text>
            {renderStatus(!timerState.isPaused)}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>当前时间:</Text>
            <Text code>{timerState.formattedTime}</Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>经过秒数:</Text>
            <Text>{timerState.elapsedSeconds}</Text>
          </div>
          
          {timerState.taskId && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>任务ID:</Text>
              <Text>{timerState.taskId}</Text>
            </div>
          )}
          
          {timerState.taskTitle && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>任务标题:</Text>
              <Text ellipsis={{ tooltip: timerState.taskTitle }} style={{ maxWidth: '200px' }}>
                {timerState.taskTitle}
              </Text>
            </div>
          )}
          
          {timerState.startTime && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>开始时间:</Text>
              <Text>{new Date(timerState.startTime).toLocaleTimeString()}</Text>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  const renderSystemInfo = () => {
    if (!debugInfo) return null;

    return (
      <Card size="small" title="系统信息">
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>组件挂载:</Text>
            {renderStatus(debugInfo.isMounted)}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>本地计时器:</Text>
            {renderStatus(debugInfo.hasLocalTimer)}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>加载状态:</Text>
            {renderStatus(!debugInfo.isLoading)}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>调试时间:</Text>
            <Text>{new Date(debugInfo.timestamp).toLocaleTimeString()}</Text>
          </div>
        </Space>
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <BugOutlined />
          <span>定时器调试信息</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={refreshDebugInfo}>
          刷新
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={600}
    >
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {/* 说明信息 */}
        <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f6ffed' }}>
          <Space>
            <InfoCircleOutlined style={{ color: '#52c41a' }} />
            <Text type="secondary">
              此页面显示MVP版定时器的实时状态，用于调试和监控
            </Text>
          </Space>
        </Card>

        {/* 定时器状态 */}
        {renderTimerState()}

        {/* 系统信息 */}
        {renderSystemInfo()}

        <Divider />

        {/* 技术说明 */}
        <Card size="small" title="MVP版功能说明">
          <Paragraph style={{ fontSize: '12px', marginBottom: 0 }}>
            <Text strong>简化内容：</Text>
            <br />
            • 移除了复杂的离线恢复机制
            <br />
            • 移除了跨页面localStorage同步
            <br />
            • 移除了网络状态检测
            <br />
            • 保留了核心的启动、暂停、停止功能
            <br />
            • 保留了状态同步到组件间通信
          </Paragraph>
        </Card>
      </div>
    </Modal>
  );
};

export default TimerDebugModal;