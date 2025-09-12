import React, { useState } from 'react';
import { 
  Badge, 
  Tooltip, 
  Button, 
  Popover, 
  Space, 
  Typography, 
  Divider,
  Tag,
  Progress
} from 'antd';
import { 
  UserSwitchOutlined, 
  ClockCircleOutlined,
  BuildOutlined,
  LogoutOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useImpersonationState } from '../../hooks/useImpersonationState';
import './ImpersonationIndicator.css';

const { Text } = Typography;

interface ImpersonationIndicatorProps {
  size?: 'small' | 'default' | 'large';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showText?: boolean;
}

/**
 * 模拟状态指示器组件
 * 在页面其他位置显示轻量的模拟状态提示
 */
const ImpersonationIndicator: React.FC<ImpersonationIndicatorProps> = ({
  size = 'default',
  placement = 'bottom',
  showText = false
}) => {
  const {
    isImpersonating,
    enterpriseInfo,
    sessionInfo,
    originalUserInfo,
    sessionTimeLeft,
    isExpired,
    isExpiringSoon,
    exitImpersonation,
    loading
  } = useImpersonationState();

  const [popoverVisible, setPopoverVisible] = useState(false);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (isExpired) return '#ff4d4f';
    if (isExpiringSoon) return '#fa8c16';
    return '#1890ff';
  };

  // 获取状态文本
  const getStatusText = () => {
    if (isExpired) return '已过期';
    if (isExpiringSoon) return '即将过期';
    return '正常';
  };

  // 计算进度百分比
  const getProgressPercent = () => {
    if (!sessionInfo || sessionTimeLeft === null) return 0;
    const totalDuration = sessionInfo.duration * 60;
    const elapsed = totalDuration - sessionTimeLeft;
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  // 处理退出模拟
  const handleExitImpersonation = async () => {
    try {
      await exitImpersonation();
      setPopoverVisible(false);
    } catch (error) {
      console.error('退出模拟失败:', error);
    }
  };

  if (!isImpersonating) {
    return null;
  }

  // Popover内容
  const popoverContent = (
    <div style={{ width: '300px', padding: '8px' }}>
      <div style={{ marginBottom: '12px' }}>
        <Space align="center">
          <UserSwitchOutlined style={{ color: getStatusColor() }} />
          <Text strong>企业模拟状态</Text>
          <Tag color={isExpired ? 'red' : isExpiringSoon ? 'orange' : 'blue'} size="small">
            {getStatusText()}
          </Tag>
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>当前模拟企业</Text>
          <div>
            <BuildOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
            <Text strong>{enterpriseInfo?.name}</Text>
            <Text type="secondary" style={{ marginLeft: '8px' }}>({enterpriseInfo?.code})</Text>
          </div>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>原始用户</Text>
          <div>
            <Text>{originalUserInfo?.username}</Text>
          </div>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>模拟原因</Text>
          <div>
            <Text ellipsis={{ tooltip: sessionInfo?.reason }} style={{ maxWidth: '250px' }}>
              {sessionInfo?.reason}
            </Text>
          </div>
        </div>

        {sessionTimeLeft !== null && sessionInfo && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>剩余时间</Text>
              <Text style={{ fontSize: '12px' }}>{formatTime(sessionTimeLeft)}</Text>
            </div>
            <Progress 
              percent={getProgressPercent()} 
              strokeColor={getStatusColor()}
              size="small"
              showInfo={false}
            />
          </div>
        )}
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      <div style={{ textAlign: 'center' }}>
        <Button 
          type="primary" 
          danger 
          size="small"
          icon={<LogoutOutlined />}
          onClick={handleExitImpersonation}
          loading={loading}
          block
        >
          退出模拟
        </Button>
      </div>

      {(isExpired || isExpiringSoon) && (
        <div style={{ marginTop: '8px' }}>
          <Text type="warning" style={{ fontSize: '11px' }}>
            <WarningOutlined style={{ marginRight: '4px' }} />
            {isExpired ? '会话已过期，请尽快退出模拟状态' : '会话即将过期，请注意时间'}
          </Text>
        </div>
      )}
    </div>
  );

  const indicator = (
    <Badge 
      dot 
      color={getStatusColor()} 
      className={`impersonation-indicator-badge ${isExpired ? 'expired' : isExpiringSoon ? 'expiring' : 'active'}`}
    >
      <Button
        type="text"
        size={size}
        icon={<UserSwitchOutlined />}
        className={`impersonation-indicator-button ${size}`}
        style={{ 
          color: getStatusColor(),
          border: `1px solid ${getStatusColor()}`,
          borderRadius: '4px'
        }}
      >
        {showText && (
          <span style={{ marginLeft: '4px', fontSize: size === 'small' ? '12px' : '14px' }}>
            模拟中
          </span>
        )}
      </Button>
    </Badge>
  );

  return (
    <div className="impersonation-indicator">
      <Popover
        content={popoverContent}
        title={null}
        trigger="click"
        placement={placement}
        open={popoverVisible}
        onOpenChange={setPopoverVisible}
        overlayClassName="impersonation-indicator-popover"
      >
        <Tooltip
          title={`正在模拟企业: ${enterpriseInfo?.name} (${getStatusText()})`}
          placement={placement}
        >
          {indicator}
        </Tooltip>
      </Popover>
    </div>
  );
};

export default ImpersonationIndicator;