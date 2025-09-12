import React, { useState, useEffect } from 'react';
import { 
  Alert, 
  Button, 
  Space, 
  Typography, 
  Progress, 
  Tag, 
  Tooltip,
  Popconfirm,
  Badge
} from 'antd';
import { 
  ExclamationTriangleOutlined,
  ClockCircleOutlined,
  UserSwitchOutlined,
  LogoutOutlined,
  EyeOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useImpersonationState } from '../../hooks/useImpersonationState';
import './ImpersonationWarningBanner.css';

const { Text } = Typography;

/**
 * 模拟状态警告横幅组件
 * 在用户进行企业模拟时显示醒目的警告提示
 */
const ImpersonationWarningBanner: React.FC = () => {
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

  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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

  // 获取进度条颜色
  const getProgressColor = () => {
    if (isExpired) return '#ff4d4f';
    if (isExpiringSoon) return '#fa8c16';
    return '#52c41a';
  };

  // 计算进度百分比
  const getProgressPercent = () => {
    if (!sessionInfo || sessionTimeLeft === null) return 0;
    const totalDuration = sessionInfo.duration * 60; // 转换为秒
    const elapsed = totalDuration - sessionTimeLeft;
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  // 处理退出模拟
  const handleExitImpersonation = async () => {
    try {
      await exitImpersonation();
    } catch (error) {
      console.error('退出模拟失败:', error);
    }
  };

  // 处理最小化/展开
  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // 处理完全隐藏
  const handleHide = () => {
    setIsVisible(false);
    // 10秒后重新显示
    setTimeout(() => {
      if (isImpersonating) {
        setIsVisible(true);
      }
    }, 10000);
  };

  // 监听模拟状态变化
  useEffect(() => {
    setIsVisible(isImpersonating);
    if (isImpersonating) {
      setIsMinimized(false);
    }
  }, [isImpersonating]);

  if (!isVisible || !isImpersonating) {
    return null;
  }

  // 最小化视图
  if (isMinimized) {
    return (
      <div className="impersonation-banner impersonation-banner-minimized">
        <div className="banner-minimized-content" onClick={handleToggleMinimize}>
          <Badge dot color="red">
            <UserSwitchOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
          </Badge>
          <Text strong style={{ marginLeft: '8px', color: '#ff4d4f' }}>
            模拟中: {enterpriseInfo?.name}
          </Text>
          {sessionTimeLeft !== null && (
            <Text style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              {formatTime(sessionTimeLeft)}
            </Text>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`impersonation-banner ${isExpired ? 'expired' : isExpiringSoon ? 'expiring' : 'active'}`}>
      <Alert
        message={
          <div className="banner-content">
            <div className="banner-main">
              <div className="banner-icon">
                <Badge dot color="red">
                  <UserSwitchOutlined style={{ fontSize: '20px' }} />
                </Badge>
              </div>
              
              <div className="banner-info">
                <div className="banner-title">
                  <Text strong style={{ fontSize: '14px' }}>
                    <ExclamationTriangleOutlined style={{ marginRight: '4px', color: '#ff4d4f' }} />
                    您正在模拟企业账户
                  </Text>
                  {isExpired && (
                    <Tag color="red" size="small" style={{ marginLeft: '8px' }}>
                      <WarningOutlined /> 会话已过期
                    </Tag>
                  )}
                  {isExpiringSoon && !isExpired && (
                    <Tag color="orange" size="small" style={{ marginLeft: '8px' }}>
                      <ClockCircleOutlined /> 即将过期
                    </Tag>
                  )}
                </div>
                
                <div className="banner-details">
                  <Space size="middle" wrap>
                    <Text type="secondary">
                      <strong>模拟企业:</strong> {enterpriseInfo?.name} ({enterpriseInfo?.code})
                    </Text>
                    <Text type="secondary">
                      <strong>原用户:</strong> {originalUserInfo?.username}
                    </Text>
                    <Text type="secondary">
                      <strong>模拟原因:</strong> {sessionInfo?.reason}
                    </Text>
                  </Space>
                </div>
              </div>
            </div>

            {/* 时间进度条 */}
            {sessionTimeLeft !== null && sessionInfo && (
              <div className="banner-progress">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    剩余时间: <strong>{formatTime(sessionTimeLeft)}</strong>
                  </Text>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    总时长: {sessionInfo.duration} 分钟
                  </Text>
                </div>
                <Progress 
                  percent={getProgressPercent()} 
                  strokeColor={getProgressColor()}
                  size="small"
                  showInfo={false}
                  trailColor="#f0f0f0"
                />
              </div>
            )}

            {/* 警告提示 */}
            <div className="banner-warning">
              <Text type="warning" style={{ fontSize: '12px' }}>
                <EyeOutlined style={{ marginRight: '4px' }} />
                模拟期间的所有操作将被审计记录，请谨慎操作并在完成后及时退出模拟状态
              </Text>
            </div>
          </div>
        }
        type={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'info'}
        showIcon={false}
        closable={false}
        action={
          <Space size="small">
            <Tooltip title="最小化横幅">
              <Button 
                size="small" 
                type="text" 
                onClick={handleToggleMinimize}
                style={{ color: 'inherit' }}
              >
                —
              </Button>
            </Tooltip>
            
            <Tooltip title="隐藏横幅10秒">
              <Button 
                size="small" 
                type="text" 
                onClick={handleHide}
                style={{ color: 'inherit' }}
              >
                ×
              </Button>
            </Tooltip>
            
            <Popconfirm
              title="确认退出模拟"
              description="确定要退出企业模拟状态吗？"
              onConfirm={handleExitImpersonation}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button 
                size="small" 
                type="primary" 
                danger 
                icon={<LogoutOutlined />}
                loading={loading}
              >
                退出模拟
              </Button>
            </Popconfirm>
          </Space>
        }
        className="impersonation-alert"
      />
    </div>
  );
};

export default ImpersonationWarningBanner;