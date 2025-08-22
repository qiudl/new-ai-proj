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

const UnifiedDebugPanel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('timer');
  
  // Timer debug state
  const { timerState, isLoading, connectionStatus, getDebugInfo, mode, setMode } = useTimer();
  const [timerDebugInfo, setTimerDebugInfo] = useState<any>(null);
  const [timerHistory, setTimerHistory] = useState<any[]>([]);
  
  // JWT debug state
  const [jwtStatus, setJwtStatus] = useState<any>(null);
  const [debugHistory, setDebugHistory] = useState<any[]>([]);
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/users/profile');
  const [testResult, setTestResult] = useState<any>(null);
  const [jwtLoading, setJwtLoading] = useState(false);

  // 刷新状态
  const refreshJWTStatus = () => {
    const status = jwtDebugger.checkJWTStatus();
    setJwtStatus(status);
    setDebugHistory(jwtDebugger.getDebugHistory());
  };

  // 刷新定时器调试信息
  const refreshTimerDebug = () => {
    if (getDebugInfo) {
      const debugInfo = getDebugInfo();
      setTimerDebugInfo(debugInfo);
      
      // 添加到历史记录
      const historyEntry = {
        timestamp: new Date().toISOString(),
        state: { ...timerState },
        debugInfo: debugInfo,
        connectionStatus
      };
      
      setTimerHistory(prev => {
        const newHistory = [...prev, historyEntry];
        // 只保留最近20条记录
        return newHistory.slice(-20);
      });
    }
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
暂停状态: ${timerState.isPaused ? '已暂停' : '正常'}
工作模式: ${mode === 'full' ? '完整模式' : '简化模式'}
任务ID: ${timerState.taskId || '无'}
任务标题: ${timerState.taskTitle || '无'}
计时时间: ${timerState.formattedTime} (${timerState.elapsedSeconds}秒)
开始时间: ${timerState.startTime ? new Date(timerState.startTime).toLocaleString() : '无'}
加载状态: ${isLoading ? '加载中' : '空闲'}
连接状态: ${connectionStatus}
${timerDebugInfo ? `
=== 高级调试信息 ===
LocalStorage: ${timerDebugInfo.hasLocalStorage ? '正常' : '异常'}
定时器间隔: ${timerDebugInfo.intervalId ? '活跃' : '未设置'}
上次同步: ${timerDebugInfo.lastSync ? new Date(timerDebugInfo.lastSync).toLocaleString() : '无'}
错误计数: ${timerDebugInfo.errorCount || 0}
` : ''}
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
      refreshTimerDebug();
    }
  }, [visible]);

  // 监听定时器状态变化，自动刷新调试信息
  useEffect(() => {
    if (visible && activeTab === 'timer') {
      refreshTimerDebug();
    }
  }, [timerState, connectionStatus, isLoading, visible, activeTab]);

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
      {/* 基本状态信息 */}
      <Card size="small" title={<Space><ClockCircleOutlined />定时器状态</Space>}>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="运行状态">
            <Badge 
              status={timerState.isRunning ? 'processing' : 'default'} 
              text={timerState.isRunning ? '运行中' : '已停止'}
            />
          </Descriptions.Item>
          <Descriptions.Item label="暂停状态">
            <Badge 
              status={timerState.isPaused ? 'warning' : 'default'} 
              text={timerState.isPaused ? '已暂停' : '正常'}
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
          <Descriptions.Item label="工作模式">
            <Tag color={mode === 'full' ? 'blue' : 'green'}>{mode === 'full' ? '完整模式' : '简化模式'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="任务ID">
            {timerState.taskId || '无'}
          </Descriptions.Item>
          <Descriptions.Item label="加载状态">
            <Badge status={isLoading ? 'processing' : 'success'} text={isLoading ? '加载中' : '空闲'} />
          </Descriptions.Item>
          <Descriptions.Item label="计时时间" span={2}>
            <Text strong style={{ fontFamily: 'monospace', fontSize: '16px' }}>
              {timerState.formattedTime}
            </Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>({timerState.elapsedSeconds}秒)</Text>
          </Descriptions.Item>
        </Descriptions>
        
        {timerState.taskTitle && (
          <div style={{ marginTop: 16, padding: 8, background: '#f6f8fa', borderRadius: 4 }}>
            <Text strong>当前任务: </Text>
            <Text>{timerState.taskTitle}</Text>
          </div>
        )}

        {timerState.startTime && (
          <div style={{ marginTop: 8 }}>
            <Text strong>开始时间: </Text>
            <Text>{new Date(timerState.startTime).toLocaleString()}</Text>
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

      {/* 高级调试信息 */}
      {timerDebugInfo && (
        <Card size="small" title={<Space><BugOutlined />高级调试信息</Space>}>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="LocalStorage状态">
              <Badge status={timerDebugInfo.hasLocalStorage ? 'success' : 'error'} 
                     text={timerDebugInfo.hasLocalStorage ? '正常' : '异常'} />
            </Descriptions.Item>
            <Descriptions.Item label="定时器间隔">
              {timerDebugInfo.intervalId ? '活跃' : '未设置'}
            </Descriptions.Item>
            <Descriptions.Item label="上次同步">
              {timerDebugInfo.lastSync ? new Date(timerDebugInfo.lastSync).toLocaleTimeString() : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="错误计数">
              <Badge count={timerDebugInfo.errorCount || 0} showZero color="red" />
            </Descriptions.Item>
          </Descriptions>
          
          {timerDebugInfo.errors && timerDebugInfo.errors.length > 0 && (
            <Alert
              message="发现错误"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {timerDebugInfo.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {timerDebugInfo.localStorageSync && (
            <div style={{ marginTop: 16, padding: 8, background: '#f0f2f5', borderRadius: 4 }}>
              <Text strong>LocalStorage同步状态:</Text>
              <br />
              <Text style={{ fontSize: '12px' }}>
                有效性: {timerDebugInfo.localStorageSync.isValid ? '✅ 有效' : '❌ 过期'} | 
                上次同步: {timerDebugInfo.localStorageSync.lastSync ? 
                  new Date(timerDebugInfo.localStorageSync.lastSync).toLocaleTimeString() : '无'}
              </Text>
            </div>
          )}
        </Card>
      )}

      {/* 性能监控 */}
      {timerDebugInfo && timerState.isRunning && (
        <Card size="small" title={<Space><CheckCircleOutlined />性能监控</Space>}>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="运行时长">
              {timerDebugInfo.uptime ? Math.floor(timerDebugInfo.uptime / 1000) + '秒' : '0秒'}
            </Descriptions.Item>
            <Descriptions.Item label="内存状态">
              <Badge status="success" text="正常" />
            </Descriptions.Item>
            <Descriptions.Item label="更新频率">
              1秒/次
            </Descriptions.Item>
            <Descriptions.Item label="组件状态">
              <Badge status={timerDebugInfo.isMounted ? 'success' : 'error'} 
                     text={timerDebugInfo.isMounted ? '已挂载' : '未挂载'} />
            </Descriptions.Item>
          </Descriptions>
          
          {timerDebugInfo.uptime > 3600000 && ( // 1小时
            <Alert
              message="长时间运行提醒"
              description="定时器已运行超过1小时，建议适当休息"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {/* 控制面板 */}
      <Card size="small" title={<Space><ApiOutlined />调试操作</Space>}>
        <Space wrap>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={refreshTimerDebug}
            size="small"
          >
            刷新调试信息
          </Button>
          <Button 
            icon={<ClockCircleOutlined />} 
            onClick={() => setMode(mode === 'full' ? 'simplified' : 'full')}
            size="small"
          >
            切换到{mode === 'full' ? '简化' : '完整'}模式
          </Button>
          <Button 
            danger 
            onClick={() => {
              localStorage.removeItem('globalTimerState');
              message.success('定时器状态已清除');
              refreshTimerDebug();
            }}
            size="small"
          >
            清除本地状态
          </Button>
          <Button 
            icon={<ExclamationCircleOutlined />}
            onClick={() => {
              const debugInfo = getDebugInfo ? getDebugInfo() : {};
              Modal.info({
                title: '实时调试信息',
                width: 600,
                content: (
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <pre style={{ fontSize: '11px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </div>
                )
              });
            }}
            size="small"
          >
            查看原始数据
          </Button>
        </Space>
      </Card>

      {/* 快速测试 */}
      <Card size="small" title={<Space><CheckCircleOutlined />快速测试</Space>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>连通性测试：</Text>
          <Space wrap>
            <Button 
              size="small"
              onClick={async () => {
                try {
                  const response = await fetch('/api/v1/timer/current', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  if (response.ok) {
                    message.success('API连接正常');
                  } else {
                    message.error(`API响应错误: ${response.status}`);
                  }
                } catch (error) {
                  message.error('API连接失败');
                }
              }}
            >
              测试API连接
            </Button>
            <Button 
              size="small"
              onClick={() => {
                try {
                  localStorage.setItem('timer_test', 'test');
                  localStorage.removeItem('timer_test');
                  message.success('LocalStorage正常');
                } catch (error) {
                  message.error('LocalStorage访问失败');
                }
              }}
            >
              测试本地存储
            </Button>
            <Button 
              size="small"
              onClick={() => {
                if ('Notification' in window) {
                  if (Notification.permission === 'granted') {
                    new Notification('定时器调试', { body: '通知功能正常' });
                    message.success('通知功能正常');
                  } else {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        new Notification('定时器调试', { body: '通知权限已获取' });
                        message.success('通知权限已获取');
                      } else {
                        message.warning('通知权限被拒绝');
                      }
                    });
                  }
                } else {
                  message.error('浏览器不支持通知');
                }
              }}
            >
              测试通知
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 状态历史 */}
      {timerHistory.length > 0 && (
        <Card 
          size="small" 
          title={<Space><EyeOutlined />状态历史 ({timerHistory.length}条)</Space>}
          extra={
            <Button 
              size="small" 
              onClick={() => setTimerHistory([])}
              type="text"
            >
              清空历史
            </Button>
          }
        >
          <Timeline>
            {timerHistory.slice(-5).reverse().map((history, index) => (
              <Timeline.Item
                key={index}
                color={history.state.isRunning ? 'green' : 'gray'}
                dot={history.state.isRunning ? <ClockCircleOutlined /> : <CloseCircleOutlined />}
              >
                <div>
                  <Space>
                    <Text strong>
                      {history.state.isRunning ? '运行中' : '已停止'}
                      {history.state.isPaused && ' (暂停)'}
                    </Text>
                    <Badge 
                      status={history.connectionStatus === 'connected' ? 'success' : 'error'} 
                      text={history.connectionStatus} 
                    />
                  </Space>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(history.timestamp).toLocaleString()}
                  </Text>
                  <br />
                  <Text style={{ fontSize: '12px' }}>
                    任务: {history.state.taskTitle || '无'} | 时长: {history.state.formattedTime}
                  </Text>
                  {history.debugInfo?.errorCount > 0 && (
                    <>
                      <br />
                      <Text type="danger" style={{ fontSize: '11px' }}>
                        {history.debugInfo.errorCount} 个错误
                      </Text>
                    </>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
          
          {timerHistory.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                显示最近5条记录，共{timerHistory.length}条
              </Text>
            </div>
          )}
        </Card>
      )}

      {/* 实时监控 */}
      <Card size="small" title={<Space><ReloadOutlined />实时监控</Space>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>自动刷新:</Text>
            <Space>
              <Button 
                size="small" 
                type={visible && activeTab === 'timer' ? 'primary' : 'default'}
                onClick={() => {
                  // 触发定期刷新
                  const interval = setInterval(() => {
                    if (visible && activeTab === 'timer') {
                      refreshTimerDebug();
                    } else {
                      clearInterval(interval);
                    }
                  }, 5000); // 每5秒刷新一次
                }}
              >
                启动监控
              </Button>
              <Text style={{ fontSize: '12px', color: '#666' }}>
                每5秒更新一次
              </Text>
            </Space>
          </div>
          
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            最后更新: {new Date().toLocaleTimeString()}
          </div>
        </Space>
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
          <Button 
            key="refresh" 
            icon={<ReloadOutlined />} 
            onClick={() => {
              refreshJWTStatus();
              refreshTimerDebug();
            }}
          >
            刷新全部
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
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'timer',
                label: (
                  <Space>
                    <ClockCircleOutlined />
                    定时器调试
                    {hasTimerIssues && <Badge dot />}
                  </Space>
                ),
                children: renderTimerDebug()
              },
              {
                key: 'jwt',
                label: (
                  <Space>
                    <KeyOutlined />
                    JWT调试
                    {hasJWTIssues && <Badge dot />}
                  </Space>
                ),
                children: renderJWTDebug()
              }
            ]}
          />
        </div>
      </Modal>
    </>
  );
};

export default UnifiedDebugPanel;