import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Divider, Alert, Spin, message } from 'antd';
import { GoogleOutlined, DisconnectOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text, Paragraph } = Typography;

interface GoogleConnectionStatus {
  is_connected: boolean;
  calendar_count?: number;
  last_sync_time?: string;
  user_email?: string;
}

interface GoogleAuthResponse {
  success: boolean;
  data?: {
    auth_url: string;
    state: string;
  };
  message?: string;
  error?: string;
}

export const GoogleAuth: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInProgress, setAuthInProgress] = useState(false);

  // 获取Google连接状态
  const fetchConnectionStatus = async () => {
    try {
      setError(null);
      const response = await authService.getGoogleConnectionStatus();
      if (response.success) {
        setConnectionStatus(response.data);
      } else {
        setError(response.error || '获取连接状态失败');
      }
    } catch (error) {
      console.error('获取Google连接状态失败:', error);
      setError('获取连接状态失败');
    } finally {
      setInitialLoading(false);
    }
  };

  // 发起Google认证
  const initiateGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthInProgress(true);

      const response = await authService.initiateGoogleAuth();
      
      if (response.success && response.data?.auth_url) {
        // 打开新窗口进行Google认证
        const authWindow = window.open(
          response.data.auth_url,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // 监听认证完成事件
        const checkAuthComplete = setInterval(async () => {
          try {
            if (authWindow?.closed) {
              clearInterval(checkAuthComplete);
              setAuthInProgress(false);
              // 认证窗口关闭，检查认证状态
              await fetchConnectionStatus();
              
              // 检查是否连接成功
              const statusResponse = await authService.getGoogleConnectionStatus();
              if (statusResponse.success && statusResponse.data?.is_connected) {
                message.success('Google日历连接成功！');
              }
            }
          } catch (error) {
            console.error('检查认证状态失败:', error);
          }
        }, 1000);

        // 设置超时清理
        setTimeout(() => {
          clearInterval(checkAuthComplete);
          if (!authWindow?.closed) {
            authWindow?.close();
          }
          setAuthInProgress(false);
        }, 300000); // 5分钟超时

      } else {
        setError(response.error || '发起认证失败');
        setAuthInProgress(false);
      }
    } catch (error) {
      console.error('发起Google认证失败:', error);
      setError('发起认证失败');
      setAuthInProgress(false);
    } finally {
      setLoading(false);
    }
  };

  // 断开Google连接
  const disconnectGoogle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.disconnectGoogle();
      
      if (response.success) {
        message.success('Google日历连接已断开');
        await fetchConnectionStatus();
      } else {
        setError(response.error || '断开连接失败');
      }
    } catch (error) {
      console.error('断开Google连接失败:', error);
      setError('断开连接失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  if (initialLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>加载中...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <GoogleOutlined />
          Google日历集成
        </Space>
      }
      style={{ maxWidth: 600 }}
    >
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {authInProgress && (
        <Alert
          message="认证进行中"
          description="请在弹出的窗口中完成Google认证流程"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {connectionStatus?.is_connected ? (
        <div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
              <Text strong style={{ color: '#52c41a' }}>已连接到Google日历</Text>
            </div>

            <div>
              <Space direction="vertical" size={4}>
                {connectionStatus.user_email && (
                  <Text type="secondary">账户: {connectionStatus.user_email}</Text>
                )}
                {connectionStatus.calendar_count !== undefined && (
                  <Text type="secondary">
                    <CalendarOutlined /> 可同步日历数量: {connectionStatus.calendar_count}
                  </Text>
                )}
                {connectionStatus.last_sync_time && (
                  <Text type="secondary">
                    上次同步: {new Date(connectionStatus.last_sync_time).toLocaleString()}
                  </Text>
                )}
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={5}>功能说明</Title>
              <Paragraph>
                <ul>
                  <li>任务截止时间将自动同步到Google日历</li>
                  <li>在Google日历中创建的事件可以关联到任务</li>
                  <li>支持双向同步，保持数据一致性</li>
                </ul>
              </Paragraph>
            </div>

            <Button
              type="default"
              icon={<DisconnectOutlined />}
              onClick={disconnectGoogle}
              loading={loading}
              danger
            >
              断开连接
            </Button>
          </Space>
        </div>
      ) : (
        <div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Title level={4}>连接Google日历</Title>
              <Paragraph>
                连接Google日历后，您可以：
              </Paragraph>
              <Paragraph>
                <ul>
                  <li>将任务截止时间自动同步到Google日历</li>
                  <li>在日历中直接查看项目进度和任务安排</li>
                  <li>接收重要任务的日历提醒</li>
                  <li>实现任务管理和日程管理的完美结合</li>
                </ul>
              </Paragraph>
            </div>

            <Alert
              message="隐私说明"
              description="我们只会访问您的日历数据用于任务同步，不会收集其他个人信息。您可以随时断开连接。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Button
              type="primary"
              icon={<GoogleOutlined />}
              size="large"
              onClick={initiateGoogleAuth}
              loading={loading || authInProgress}
              disabled={authInProgress}
            >
              {authInProgress ? '认证中...' : '连接Google日历'}
            </Button>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default GoogleAuth;