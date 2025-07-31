// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Descriptions,
  Modal,
  Input,
  message,
  Alert,
  Collapse,
  Timeline,
  Divider,
  Badge
} from 'antd';
import {
  BugOutlined,
  ReloadOutlined,
  EyeOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  UserOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { jwtDebugger } from '../utils/jwtDebugger';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface JWTDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

const JWTDebugPanel: React.FC<JWTDebugPanelProps> = ({ visible, onClose }) => {
  const [jwtStatus, setJwtStatus] = useState<any>(null);
  const [debugHistory, setDebugHistory] = useState<any[]>([]);
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/users/profile');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 刷新JWT状态
  const refreshJWTStatus = () => {
    const status = jwtDebugger.checkJWTStatus();
    setJwtStatus(status);
    setDebugHistory(jwtDebugger.getDebugHistory());
  };

  // 测试JWT
  const testJWT = async () => {
    setLoading(true);
    try {
      const result = await jwtDebugger.testJWTWithAPI(testEndpoint);
      setTestResult(result);
      if (result.success) {
        message.success('JWT测试成功');
      } else {
        message.error(`JWT测试失败: ${result.message}`);
      }
    } catch (error) {
      message.error('测试过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 复制调试报告
  const copyDebugReport = () => {
    const report = jwtDebugger.generateDebugReport();
    navigator.clipboard.writeText(report).then(() => {
      message.success('调试报告已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 清除localStorage中的token
  const clearToken = () => {
    Modal.confirm({
      title: '确认清除Token',
      content: '这将清除localStorage中的认证token，您需要重新登录。',
      onOk: () => {
        localStorage.removeItem('token');
        refreshJWTStatus();
        message.success('Token已清除');
      }
    });
  };

  useEffect(() => {
    if (visible) {
      refreshJWTStatus();
    }
  }, [visible]);

  // 状态图标
  const getStatusIcon = (isValid: boolean, isExpired: boolean) => {
    if (!isValid) return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    if (isExpired) return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  };

  // 状态标签
  const getStatusTag = (isValid: boolean, isExpired: boolean) => {
    if (!isValid) return <Tag color="red">无效</Tag>;
    if (isExpired) return <Tag color="orange">已过期</Tag>;
    return <Tag color="green">有效</Tag>;
  };

  return (
    <Modal
      title={
        <Space>
          <BugOutlined />
          JWT调试面板
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={refreshJWTStatus}>
          刷新
        </Button>,
        <Button key="copy" icon={<EyeOutlined />} onClick={copyDebugReport}>
          复制报告
        </Button>,
        <Button key="clear" danger onClick={clearToken}>
          清除Token
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {jwtStatus && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* JWT基本状态 */}
            <Card size="small" title={<Space><KeyOutlined />JWT状态概览</Space>}>
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Token存在">
                  {jwtStatus.hasToken ? 
                    <Badge status="success" text="是" /> : 
                    <Badge status="error" text="否" />
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Token状态">
                  {getStatusIcon(jwtStatus.isValid, jwtStatus.isExpired)}
                  <span style={{ marginLeft: 8 }}>
                    {getStatusTag(jwtStatus.isValid, jwtStatus.isExpired)}
                  </span>
                </Descriptions.Item>
                {jwtStatus.expiresIn && (
                  <Descriptions.Item label="剩余时间" span={2}>
                    <Space>
                      <ClockCircleOutlined />
                      {Math.floor(jwtStatus.expiresIn / 3600)}小时
                      {Math.floor((jwtStatus.expiresIn % 3600) / 60)}分钟
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {jwtStatus.errors.length > 0 && (
                <Alert
                  message="发现问题"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {jwtStatus.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* 用户信息 */}
            {jwtStatus.payload && (
              <Card size="small" title={<Space><UserOutlined />用户信息</Space>}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="用户ID">{jwtStatus.payload.user_id}</Descriptions.Item>
                  <Descriptions.Item label="用户名">{jwtStatus.payload.username}</Descriptions.Item>
                  <Descriptions.Item label="角色">{jwtStatus.payload.role}</Descriptions.Item>
                  <Descriptions.Item label="用户类型">{jwtStatus.payload.user_type}</Descriptions.Item>
                  <Descriptions.Item label="签发时间">
                    {new Date(jwtStatus.payload.iat * 1000).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="过期时间">
                    {new Date(jwtStatus.payload.exp * 1000).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {/* API测试 */}
            <Card size="small" title={<Space><ApiOutlined />API测试</Space>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space style={{ width: '100%' }}>
                  <Input
                    placeholder="输入测试端点"
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button type="primary" loading={loading} onClick={testJWT}>
                    测试
                  </Button>
                </Space>

                {testResult && (
                  <Alert
                    message={`HTTP ${testResult.status} - ${testResult.success ? '成功' : '失败'}`}
                    description={
                      <div>
                        <Text>消息: {testResult.message}</Text>
                        {testResult.responseData && (
                          <div style={{ marginTop: 8 }}>
                            <Text code>{JSON.stringify(testResult.responseData, null, 2)}</Text>
                          </div>
                        )}
                      </div>
                    }
                    type={testResult.success ? 'success' : 'error'}
                    showIcon
                  />
                )}
              </Space>
            </Card>

            {/* Token详情 */}
            {jwtStatus.token && (
              <Collapse size="small">
                <Panel header="Token详情" key="token">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Token长度: </Text>
                      <Text>{jwtStatus.token.length} 字符</Text>
                    </div>
                    <div>
                      <Text strong>Token预览: </Text>
                      <Text code>{jwtStatus.token.substring(0, 50)}...</Text>
                    </div>
                    <div>
                      <Text strong>完整Token: </Text>
                      <Input.TextArea
                        value={jwtStatus.token}
                        readOnly
                        rows={4}
                        style={{ fontSize: '10px' }}
                      />
                    </div>
                  </Space>
                </Panel>
              </Collapse>
            )}

            {/* 调试历史 */}
            {debugHistory.length > 0 && (
              <Collapse size="small">
                <Panel header={`调试历史 (${debugHistory.length}条记录)`} key="history">
                  <Timeline
                    items={debugHistory.slice(-10).reverse().map((history, index) => ({
                      key: index,
                      color: history.status.isValid ? 'green' : 'red',
                      dot: getStatusIcon(history.status.isValid, history.status.isExpired),
                      children: (
                        <div>
                          <Text strong>{history.moduleName}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {new Date(history.timestamp).toLocaleString()}
                          </Text>
                          {history.status.errors.length > 0 && (
                            <div>
                              <Text type="danger" style={{ fontSize: '12px' }}>
                                {history.status.errors.join(', ')}
                              </Text>
                            </div>
                          )}
                        </div>
                      )
                    }))}
                  />
                </Panel>
              </Collapse>
            )}
          </Space>
        )}
      </div>
    </Modal>
  );
};

export default JWTDebugPanel;