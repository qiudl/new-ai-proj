// 统一调试面板 - 合并定时器调试和JWT调试功能
import React, { useState, useEffect } from 'react';
import { 
  FloatButton, 
  Modal, 
  Card, 
  Typography, 
  Space, 
  Tag, 
  Descriptions, 
  Button,
  Input,
  Alert,
  Collapse,
  Timeline,
  Badge,
  Tabs,
  message
} from 'antd';
import {
  BugOutlined,
  ClockCircleOutlined,
  KeyOutlined,
  ReloadOutlined,
  EyeOutlined,
  ApiOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useTimer } from '../contexts/TimerContext';
import { jwtDebugger } from '../utils/jwtDebugger';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const UnifiedDebugPanel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('timer');
  
  // Timer debug state
  const { timerState, isLoading, connectionStatus } = useTimer();
  
  // JWT debug state
  const [jwtStatus, setJwtStatus] = useState<any>(null);
  const [debugHistory, setDebugHistory] = useState<any[]>([]);
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/users/profile');
  const [testResult, setTestResult] = useState<any>(null);
  const [jwtLoading, setJwtLoading] = useState(false);

  // 刷新JWT状态
  const refreshJWTStatus = () => {
    const status = jwtDebugger.checkJWTStatus();
    setJwtStatus(status);
    setDebugHistory(jwtDebugger.getDebugHistory());
  };

  // 测试JWT
  const testJWT = async () => {
    setJwtLoading(true);
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
      setJwtLoading(false);
    }
  };

  // 复制调试报告
  const copyDebugReport = () => {
    const jwtReport = jwtDebugger.generateDebugReport();
    const timerReport = `
=== 定时器调试信息 ===
运行状态: ${timerState.isRunning ? '运行中' : '已停止'}
任务ID: ${timerState.taskId || '无'}
任务标题: ${timerState.taskTitle || '无'}
计时时间: ${timerState.formattedTime}
加载状态: ${isLoading ? '加载中' : '空闲'}
连接状态: ${connectionStatus}
    `;
    
    const fullReport = `${timerReport}\n${jwtReport}`;
    navigator.clipboard.writeText(fullReport).then(() => {
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

  const handleClick = () => {
    jwtDebugger.logModuleJWTStatus('UnifiedDebugPanel');
    refreshJWTStatus();
    setVisible(true);
  };

  useEffect(() => {
    if (visible) {
      refreshJWTStatus();
    }
  }, [visible]);

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // 检查是否有调试问题
  const hasTimerIssues = !timerState.isRunning && connectionStatus !== 'connected';
  const hasJWTIssues = jwtStatus && (!jwtStatus.isValid || jwtStatus.isExpired || jwtStatus.errors.length > 0);
  const hasIssues = hasTimerIssues || hasJWTIssues;

  // 状态图标和标签
  const getStatusIcon = (isValid: boolean, isExpired: boolean) => {
    if (!isValid) return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    if (isExpired) return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  };

  const getStatusTag = (isValid: boolean, isExpired: boolean) => {
    if (!isValid) return <Tag color="red">无效</Tag>;
    if (isExpired) return <Tag color="orange">已过期</Tag>;
    return <Tag color="green">有效</Tag>;
  };

  // 定时器调试内容
  const renderTimerDebug = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card size="small" title={<Space><ClockCircleOutlined />定时器状态</Space>}>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="运行状态">
            <Badge 
              status={timerState.isRunning ? 'processing' : 'default'} 
              text={timerState.isRunning ? '运行中' : '已停止'}
            />
          </Descriptions.Item>
          <Descriptions.Item label="连接状态">
            <Badge 
              status={
                connectionStatus === 'connected' ? 'success' : 
                connectionStatus === 'disconnected' ? 'error' : 'warning'
              }
              text={connectionStatus}
            />
          </Descriptions.Item>
          <Descriptions.Item label="任务ID">
            {timerState.taskId || '无'}
          </Descriptions.Item>
          <Descriptions.Item label="加载状态">
            {isLoading ? '加载中' : '空闲'}
          </Descriptions.Item>
          <Descriptions.Item label="计时时间" span={2}>
            <Text strong style={{ fontFamily: 'monospace' }}>
              {timerState.formattedTime}
            </Text>
          </Descriptions.Item>
        </Descriptions>
        
        {timerState.taskTitle && (
          <div style={{ marginTop: 16 }}>
            <Text strong>当前任务: </Text>
            <Text>{timerState.taskTitle}</Text>
          </div>
        )}

        {!timerState.isRunning && (
          <Alert
            message="定时器未运行"
            description="定时器当前处于停止状态，FloatingTimer组件被隐藏"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </Space>
  );

  // JWT调试内容
  const renderJWTDebug = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {jwtStatus && (
        <>
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
                <Button type="primary" loading={jwtLoading} onClick={testJWT}>
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
                <Timeline>
                  {debugHistory.slice(-10).reverse().map((history, index) => (
                    <Timeline.Item
                      key={index}
                      color={history.status.isValid ? 'green' : 'red'}
                      dot={getStatusIcon(history.status.isValid, history.status.isExpired)}
                    >
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
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Panel>
            </Collapse>
          )}
        </>
      )}
    </Space>
  );

  return (
    <>
      <Badge dot={hasIssues} color="red">
        <FloatButton
          icon={<BugOutlined />}
          tooltip="调试面板"
          onClick={handleClick}
          style={{
            right: 24,
            bottom: 80,
          }}
        />
      </Badge>
      
      <Modal
        title={
          <Space>
            <BugOutlined />
            统一调试面板
          </Space>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        width={900}
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
          <Button key="close" type="primary" onClick={() => setVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane 
              tab={
                <Space>
                  <ClockCircleOutlined />
                  定时器调试
                  {hasTimerIssues && <Badge dot />}
                </Space>
              } 
              key="timer"
            >
              {renderTimerDebug()}
            </TabPane>
            <TabPane 
              tab={
                <Space>
                  <KeyOutlined />
                  JWT调试
                  {hasJWTIssues && <Badge dot />}
                </Space>
              } 
              key="jwt"
            >
              {renderJWTDebug()}
            </TabPane>
          </Tabs>
        </div>
      </Modal>
    </>
  );
};

export default UnifiedDebugPanel;