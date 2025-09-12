import React from 'react';
import { Card, Button, Space, Tag, Descriptions, Alert, Spin } from 'antd';
import { PlayCircleOutlined, StopOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { useImpersonationState } from '../hooks/useImpersonationState';

/**
 * 模拟状态测试组件
 * 用于验证模拟状态Context和服务的工作情况
 */
const ImpersonationStateTest: React.FC = () => {
  const {
    isImpersonating,
    impersonationStatus,
    loading,
    error,
    startImpersonation,
    exitImpersonation,
    refreshStatus,
    getImpersonationHistory,
    sessionInfo,
    enterpriseInfo,
    originalUserInfo,
    warnings,
    permissions,
    sessionTimeLeft,
    isExpired,
    isExpiringSoon,
    canPerformSensitiveActions
  } = useImpersonationState();

  const handleStartTest = async () => {
    try {
      await startImpersonation(1, '测试模拟状态管理功能');
    } catch (error) {
      console.error('测试开始模拟失败:', error);
    }
  };

  const handleExitTest = async () => {
    try {
      await exitImpersonation();
    } catch (error) {
      console.error('测试退出模拟失败:', error);
    }
  };

  const handleGetHistory = async () => {
    try {
      const history = await getImpersonationHistory(1, 5);
      console.log('模拟历史:', history);
    } catch (error) {
      console.error('获取历史失败:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px' }}>
      <h2>模拟状态管理测试</h2>
      
      {/* 错误提示 */}
      {error && (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          closable 
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 警告提示 */}
      {warnings.map((warning, index) => (
        <Alert
          key={index}
          message={warning.message}
          type={warning.type === 'session_expired' ? 'error' : 'warning'}
          action={
            warning.actions && (
              <Space>
                {warning.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    size="small"
                    type={action.type === 'primary' ? 'primary' : action.type === 'danger' ? 'default' : 'default'}
                    danger={action.type === 'danger'}
                    onClick={action.action}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            )
          }
          style={{ marginBottom: '16px' }}
        />
      ))}

      {/* 操作按钮 */}
      <Card title="操作控制" style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartTest}
            loading={loading}
            disabled={isImpersonating || !permissions.canStartImpersonation}
          >
            开始模拟测试
          </Button>
          
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleExitTest}
            loading={loading}
            disabled={!isImpersonating || !permissions.canExitImpersonation}
          >
            退出模拟
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshStatus}
            loading={loading}
          >
            刷新状态
          </Button>
          
          <Button
            icon={<HistoryOutlined />}
            onClick={handleGetHistory}
            disabled={!permissions.canViewHistory}
          >
            获取历史
          </Button>
        </Space>
      </Card>

      {/* 基础状态 */}
      <Card title="基础状态" style={{ marginBottom: '16px' }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="模拟状态">
            {loading ? <Spin size="small" /> : (
              <Tag color={isImpersonating ? 'red' : 'green'}>
                {isImpersonating ? '正在模拟' : '正常状态'}
              </Tag>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="敏感操作权限">
            <Tag color={canPerformSensitiveActions ? 'green' : 'red'}>
              {canPerformSensitiveActions ? '允许' : '受限'}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="会话过期">
            {sessionTimeLeft !== null ? (
              <Tag color={isExpired ? 'red' : isExpiringSoon ? 'orange' : 'green'}>
                {isExpired ? '已过期' : isExpiringSoon ? '即将过期' : '正常'}
              </Tag>
            ) : (
              <Tag color="default">无会话</Tag>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label="剩余时间">
            {sessionTimeLeft !== null ? formatTime(sessionTimeLeft) : '无'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 企业信息 */}
      {enterpriseInfo && (
        <Card title="当前模拟企业" style={{ marginBottom: '16px' }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="企业ID">{enterpriseInfo.id}</Descriptions.Item>
            <Descriptions.Item label="企业名称">{enterpriseInfo.name}</Descriptions.Item>
            <Descriptions.Item label="企业代码">{enterpriseInfo.code}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 会话信息 */}
      {sessionInfo && (
        <Card title="会话信息" style={{ marginBottom: '16px' }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="会话ID">{sessionInfo.sessionId}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{sessionInfo.startedAt}</Descriptions.Item>
            <Descriptions.Item label="过期时间">{sessionInfo.expiresAt}</Descriptions.Item>
            <Descriptions.Item label="持续时间">{sessionInfo.duration} 分钟</Descriptions.Item>
            <Descriptions.Item label="模拟原因" span={2}>{sessionInfo.reason}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 原始用户信息 */}
      {originalUserInfo && (
        <Card title="原始用户信息" style={{ marginBottom: '16px' }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="用户ID">{originalUserInfo.id}</Descriptions.Item>
            <Descriptions.Item label="用户名">{originalUserInfo.username}</Descriptions.Item>
            <Descriptions.Item label="角色">{originalUserInfo.role}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 权限信息 */}
      <Card title="权限信息">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="可开始模拟">
            <Tag color={permissions.canStartImpersonation ? 'green' : 'red'}>
              {permissions.canStartImpersonation ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="可退出模拟">
            <Tag color={permissions.canExitImpersonation ? 'green' : 'red'}>
              {permissions.canExitImpersonation ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="可查看历史">
            <Tag color={permissions.canViewHistory ? 'green' : 'red'}>
              {permissions.canViewHistory ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="受限操作">
            {permissions.restrictedActions.length > 0 ? (
              <Space wrap>
                {permissions.restrictedActions.map((action, index) => (
                  <Tag key={index} color="red">{action}</Tag>
                ))}
              </Space>
            ) : (
              <Tag color="green">无限制</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 调试信息 */}
      <Card title="调试信息" style={{ marginTop: '16px' }}>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify({
            isImpersonating,
            loading,
            error,
            warnings: warnings.map(w => ({ type: w.type, message: w.message })),
            sessionTimeLeft,
            isExpired,
            isExpiringSoon,
            canPerformSensitiveActions
          }, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default ImpersonationStateTest;