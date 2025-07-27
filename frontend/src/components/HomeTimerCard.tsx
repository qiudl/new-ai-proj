import React, { useCallback } from 'react';
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
  Tooltip
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../contexts/TimerContext';

const { Text, Title } = Typography;

interface HomeTimerCardProps {
  style?: React.CSSProperties;
  className?: string;
}

const HomeTimerCard: React.FC<HomeTimerCardProps> = ({
  style = {},
  className = ''
}) => {
  const { timerState, isLoading, stopTimer } = useTimer();
  const navigate = useNavigate();

  // 🎯 检查是否有任务正在计时
  const isTimerRunning = timerState.isRunning;

  // 🎯 停止计时
  const handleStopTimer = useCallback(async () => {
    Modal.confirm({
      title: '停止计时',
      content: `确定要停止为任务"${timerState.taskTitle}"计时吗？`,
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
  }, [stopTimer, timerState.taskTitle]);

  // 🎯 跳转到任务详情页
  const handleViewTaskDetail = useCallback(() => {
    if (!timerState.taskId) {
      message.warning('无法获取任务信息');
      return;
    }

    // 跳转到任务页面，高亮当前计时任务
    navigate(`/tasks?highlight=${timerState.taskId}`);
  }, [timerState.taskId, navigate]);

  // 🎯 快速开始计时
  const handleQuickStart = useCallback(() => {
    // 跳转到任务页面开始选择任务
    navigate('/tasks');
    message.info('请在任务列表中选择要计时的任务');
  }, [navigate]);

  // 🎯 如果没有计时器运行，显示快速开始界面
  if (!isTimerRunning) {
    return (
      <Card 
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <span>任务计时器</span>
            <Badge status="default" text="空闲中" />
          </Space>
        }
        size="small"
        style={style}
        className={className}
        extra={
          <Tooltip title="开始计时">
            <Button 
              type="primary" 
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={handleQuickStart}
            >
              开始计时
            </Button>
          </Tooltip>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ 
            fontSize: '48px', 
            color: '#d9d9d9', 
            marginBottom: '16px' 
          }}>
            <ClockCircleOutlined />
          </div>
          <Title level={4} style={{ color: '#8c8c8c', margin: 0 }}>
            暂无任务计时
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            点击"开始计时"选择任务开始工作
          </Text>
        </div>
      </Card>
    );
  }

  // 🎯 有计时器运行时的界面
  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#52c41a' }} />
          <span>任务计时器</span>
          <Badge status="processing" text="计时中" />
        </Space>
      }
      size="small"
      style={{
        ...style,
        background: '#f6ffed',
        border: '1px solid #b7eb8f'
      }}
      className={className}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 🎯 任务信息 */}
        <div style={{ 
          padding: '12px',
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '1px solid #d9f7be'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <Text strong style={{ fontSize: '14px' }}>
              正在计时任务
            </Text>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleViewTaskDetail}
              style={{ padding: 0 }}
            >
              查看详情
            </Button>
          </div>
          <Text 
            style={{ 
              fontSize: '13px',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#1890ff',
              cursor: 'pointer'
            }}
            title={timerState.taskTitle}
            onClick={handleViewTaskDetail}
          >
            {timerState.taskTitle || '未知任务'}
          </Text>
        </div>

        {/* 🎯 当前计时显示 */}
        <div style={{ 
          textAlign: 'center', 
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '1px solid #d9f7be'
        }}>
          <Statistic
            title="已计时时长"
            value={timerState.formattedTime}
            valueStyle={{ 
              color: '#52c41a', 
              fontSize: '28px',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
            prefix={<ClockCircleOutlined />}
          />
        </div>

        {/* 🎯 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          justifyContent: 'center'
        }}>
          <Button
            type="default"
            icon={<EyeOutlined />}
            onClick={handleViewTaskDetail}
            style={{ flex: 1 }}
          >
            查看任务
          </Button>
          <Button
            type="primary"
            danger
            icon={<StopOutlined />}
            onClick={handleStopTimer}
            loading={isLoading}
            style={{ flex: 1 }}
          >
            停止计时
          </Button>
        </div>

        {/* 🎯 计时提示 */}
        {timerState.elapsedSeconds > 7200 && ( // 超过2小时
          <Alert
            message="长时间计时提醒"
            description="已连续工作超过2小时，建议适当休息"
            type="warning"
            showIcon
            style={{ marginTop: '8px' }}
          />
        )}
      </Space>
    </Card>
  );
};

export default HomeTimerCard;
