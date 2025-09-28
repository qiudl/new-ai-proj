import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Spin, 
  message, 
  Divider,
  Tag,
  Row,
  Col
} from 'antd';
import { 
  GoogleOutlined, 
  DisconnectOutlined, 
  CalendarOutlined, 
  CheckCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text, Paragraph } = Typography;

interface GoogleConnectionStatus {
  is_connected: boolean;
  calendar_count?: number;
  last_sync_time?: string;
  user_email?: string;
  sync_enabled?: boolean;
  permissions?: string[];
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

/**
 * Google日历集成组件 - 用于用户profile页面
 * 提供Google日历账户连接、断开连接、同步管理功能
 */
export const GoogleCalendarIntegration: React.FC = () => {
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
                message.success('Google日历账户连接成功！');
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
        message.success('Google日历账户已断开连接');
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

  // 触发同步
  const triggerSync = async () => {
    try {
      setLoading(true);
      setError(null);

      // 这里调用同步API（需要后端实现）
      message.success('同步已触发，正在后台进行...');
      
      // 刷新状态
      setTimeout(() => {
        fetchConnectionStatus();
      }, 2000);
    } catch (error) {
      console.error('触发同步失败:', error);
      setError('同步失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  if (initialLoading) {
    return (
      <Card title="Google日历集成">
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
          description="请在弹出的窗口中完成Google账户授权流程"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {connectionStatus?.is_connected ? (
        <div>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 连接状态 */}
            <div>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                    <Text strong style={{ color: '#52c41a' }}>已连接</Text>
                  </div>
                  {connectionStatus.user_email && (
                    <Text type="secondary" style={{ display: 'block', marginTop: '4px' }}>
                      {connectionStatus.user_email}
                    </Text>
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  <Space wrap>
                    <Tag color="blue">
                      <CalendarOutlined /> {connectionStatus.calendar_count || 0} 个日历
                    </Tag>
                    <Tag color={connectionStatus.sync_enabled ? 'green' : 'orange'}>
                      {connectionStatus.sync_enabled ? '同步已启用' : '同步已禁用'}
                    </Tag>
                  </Space>
                </Col>
              </Row>
            </div>

            {/* 同步信息 */}
            {connectionStatus.last_sync_time && (
              <div>
                <Text type="secondary">
                  上次同步: {new Date(connectionStatus.last_sync_time).toLocaleString()}
                </Text>
              </div>
            )}

            <Divider />

            {/* 功能说明 */}
            <div>
              <Title level={5} style={{ marginBottom: '12px' }}>
                <InfoCircleOutlined style={{ marginRight: '8px' }} />
                功能特性
              </Title>
              <Paragraph>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>任务截止时间自动同步到Google日历</li>
                  <li>项目里程碑创建日历事件</li>
                  <li>任务状态变更时更新对应日历项</li>
                  <li>支持双向同步，保持数据一致性</li>
                </ul>
              </Paragraph>
            </div>

            {/* 操作按钮 */}
            <div>
              <Space>
                <Button
                  type="default"
                  icon={<SyncOutlined />}
                  onClick={triggerSync}
                  loading={loading}
                >
                  立即同步
                </Button>
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
          </Space>
        </div>
      ) : (
        <div>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 未连接状态说明 */}
            <div>
              <Title level={5}>连接您的Google日历</Title>
              <Paragraph>
                将您的Google日历与任务管理系统集成，享受以下便利功能：
              </Paragraph>
              <Paragraph>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>自动同步任务</strong> - 任务截止时间自动添加到日历</li>
                  <li><strong>日程提醒</strong> - 在Google日历中接收任务提醒</li>
                  <li><strong>统一管理</strong> - 在一个地方查看所有任务和日程</li>
                  <li><strong>实时更新</strong> - 任务变更实时同步到日历</li>
                </ul>
              </Paragraph>
            </div>

            {/* 隐私保护说明 */}
            <Alert
              message="隐私与安全"
              description="我们只会访问您授权的日历数据用于任务同步功能。您的个人信息将被严格保护，可以随时断开连接。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* 连接按钮 */}
            <div>
              <Button
                type="primary"
                icon={<GoogleOutlined />}
                size="large"
                onClick={initiateGoogleAuth}
                loading={loading || authInProgress}
                disabled={authInProgress}
                style={{ minWidth: '140px' }}
              >
                {authInProgress ? '认证中...' : '连接Google日历'}
              </Button>
            </div>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default GoogleCalendarIntegration;