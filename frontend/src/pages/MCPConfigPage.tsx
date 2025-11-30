/**
 * MCP 配置管理页面
 * 用于管理 MCP (Model Context Protocol) 服务的 API Key
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Breadcrumb,
  Tabs,
  Alert,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Descriptions,
  Progress,
  Badge,
  Empty,
  Spin,
  Switch,
} from 'antd';
import {
  ApiOutlined,
  PlusOutlined,
  ReloadOutlined,
  KeyOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  HistoryOutlined,
  SafetyOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import MCPAPIKeyService, {
  MCPAPIKey,
  MCPAPIKeyStatus,
  MCPAPIKeyStats,
  MCPAPIKeyLog,
  CreateMCPAPIKeyRequest,
} from '../services/mcpApiKeyService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 状态颜色映射
const statusColorMap: Record<MCPAPIKeyStatus, string> = {
  active: 'success',
  revoked: 'error',
  expired: 'warning',
};

// 状态文本映射
const statusTextMap: Record<MCPAPIKeyStatus, string> = {
  active: '活跃',
  revoked: '已撤销',
  expired: '已过期',
};

const MCPConfigPage: React.FC = () => {
  // 状态管理
  const [apiKeys, setApiKeys] = useState<MCPAPIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'stats' | 'logs'>('keys');

  // 管理员相关状态
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewAllUsers, setViewAllUsers] = useState(false);

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState<MCPAPIKey | null>(null);
  const [newKeyResult, setNewKeyResult] = useState<{ keyId: string; plainKey: string } | null>(null);
  const [form] = Form.useForm();

  // 统计和日志
  const [keyStats, setKeyStats] = useState<MCPAPIKeyStats | null>(null);
  const [keyLogs, setKeyLogs] = useState<MCPAPIKeyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // 健康状态
  const [healthStatus, setHealthStatus] = useState<{
    healthy: boolean;
    message: string;
    version?: string;
  } | null>(null);

  // 统计数据
  const [statistics, setStatistics] = useState({
    totalKeys: 0,
    activeKeys: 0,
    totalRequests: 0,
    errorRate: 0,
  });

  // 加载 API Keys
  const loadAPIKeys = useCallback(async (viewAll?: boolean) => {
    setLoading(true);
    try {
      const response = await MCPAPIKeyService.listAPIKeys({
        include_revoked: true,
        all: viewAll ?? viewAllUsers,
      });
      const keys = response.data || [];
      setApiKeys(keys);

      // 更新管理员状态
      if (response.is_admin !== undefined) {
        setIsAdmin(response.is_admin);
      }

      // 计算统计
      const activeKeys = keys.filter((k) => k.status === 'active');
      const totalRequests = keys.reduce((sum, k) => sum + (k.total_requests || 0), 0);
      const totalErrors = keys.reduce((sum, k) => sum + (k.total_errors || k.error_requests || 0), 0);

      setStatistics({
        totalKeys: keys.length,
        activeKeys: activeKeys.length,
        totalRequests,
        errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0,
      });
    } catch (error: any) {
      console.error('Failed to load MCP API keys:', error);
      message.error('获取 API Key 列表失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [viewAllUsers]);

  // 检查健康状态
  const checkHealth = useCallback(async () => {
    try {
      const response = await MCPAPIKeyService.checkHealth();
      setHealthStatus({
        healthy: response.success,
        message: response.message,
        version: response.data?.version,
      });
    } catch (error: any) {
      setHealthStatus({
        healthy: false,
        message: error.message || 'MCP 服务不可用',
      });
    }
  }, []);

  // 创建 API Key
  const handleCreateKey = async (values: CreateMCPAPIKeyRequest) => {
    try {
      const result = await MCPAPIKeyService.createAPIKey({
        name: values.name,
        description: values.description,
        expires_at: values.expires_at,
      });

      message.success('API Key 创建成功');
      setNewKeyResult({
        keyId: result.key_id,
        plainKey: result.plain_key,
      });
      loadAPIKeys();
      form.resetFields();
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      message.error('创建失败: ' + (error.message || '未知错误'));
    }
  };

  // 撤销 API Key
  const handleRevokeKey = async (keyId: string) => {
    try {
      await MCPAPIKeyService.revokeAPIKey(keyId);
      message.success('API Key 已撤销');
      loadAPIKeys();
    } catch (error: any) {
      console.error('Failed to revoke API key:', error);
      message.error('撤销失败: ' + (error.message || '未知错误'));
    }
  };

  // 查看 Key 详情
  const handleViewDetail = async (key: MCPAPIKey) => {
    setSelectedKey(key);
    setDetailModalVisible(true);
    setStatsLoading(true);
    setLogsLoading(true);

    try {
      const [stats, logs] = await Promise.all([
        MCPAPIKeyService.getAPIKeyStats(key.key_id),
        MCPAPIKeyService.getAPIKeyLogs(key.key_id, { limit: 20 }),
      ]);
      setKeyStats(stats);
      setKeyLogs(logs.data || []);
    } catch (error) {
      console.error('Failed to load key details:', error);
    } finally {
      setStatsLoading(false);
      setLogsLoading(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => message.success(`${label} 已复制到剪贴板`),
      () => message.error('复制失败')
    );
  };

  // 初始化
  useEffect(() => {
    loadAPIKeys();
    checkHealth();
  }, [loadAPIKeys, checkHealth]);

  // 基础表格列定义
  const baseColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MCPAPIKey) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.key_prefix}...
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: MCPAPIKeyStatus) => (
        <Tag color={statusColorMap[status]}>{statusTextMap[status]}</Tag>
      ),
    },
    {
      title: '请求次数',
      dataIndex: 'total_requests',
      key: 'total_requests',
      render: (count: number, record: MCPAPIKey) => {
        const errors = record.total_errors || record.error_requests || 0;
        return (
          <Space direction="vertical" size={0}>
            <Text>{count || 0}</Text>
            {errors > 0 && (
              <Text type="danger" style={{ fontSize: '12px' }}>
                {errors} 错误
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <Text type="secondary">从未使用</Text>,
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string) => {
        if (!date) return <Text type="secondary">永不过期</Text>;
        const expDate = dayjs(date);
        const isExpired = expDate.isBefore(dayjs());
        return (
          <Text type={isExpired ? 'danger' : undefined}>
            {expDate.format('YYYY-MM-DD')}
            {isExpired && ' (已过期)'}
          </Text>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: MCPAPIKey) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
              详情
            </Button>
          </Tooltip>
          {record.status === 'active' && (
            <Popconfirm
              title="确定要撤销这个 API Key 吗？"
              description="撤销后该 Key 将无法再用于 MCP 认证"
              onConfirm={() => handleRevokeKey(record.key_id)}
              okText="确认撤销"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                撤销
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 用户列（仅在管理员查看所有用户时显示）
  const userColumn = {
    title: '所属用户',
    key: 'user',
    render: (record: MCPAPIKey) => {
      if (record.user) {
        return (
          <Space direction="vertical" size={0}>
            <Space size={4}>
              <UserOutlined style={{ color: '#1890ff' }} />
              <Text strong>{record.user.username}</Text>
            </Space>
            {record.user.nickname && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.user.nickname}
              </Text>
            )}
            {record.enterprise && (
              <Tag color="blue" style={{ marginTop: 4 }}>
                {record.enterprise.name}
              </Tag>
            )}
          </Space>
        );
      }
      return <Text type="secondary">用户 #{record.user_id}</Text>;
    },
  };

  // 根据是否显示所有用户来组合列
  const columns = viewAllUsers
    ? [baseColumns[0], userColumn, ...baseColumns.slice(1)]
    : baseColumns;

  // 日志表格列
  const logColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '工具',
      dataIndex: 'tool_name',
      key: 'tool_name',
    },
    {
      title: '状态',
      dataIndex: 'response_status',
      key: 'response_status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : status === 'timeout' ? 'warning' : 'error'}>
          {status === 'success' ? '成功' : status === 'timeout' ? '超时' : '错误'}
        </Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      render: (ms: number) => `${ms}ms`,
    },
    {
      title: '客户端 IP',
      dataIndex: 'client_ip',
      key: 'client_ip',
      render: (ip: string) => ip || '-',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb
        style={{ marginBottom: '24px' }}
        items={[
          {
            title: (
              <span>
                <SafetyOutlined /> <span>系统管理</span>
              </span>
            ),
          },
          { title: 'MCP 配置' },
        ]}
      />

      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ApiOutlined style={{ marginRight: '8px' }} />
          MCP 配置管理
        </Title>
        <Text type="secondary">管理 MCP (Model Context Protocol) 服务的 API Key 和访问权限</Text>
      </div>

      {/* 健康状态 */}
      {healthStatus && (
        <Alert
          message={
            <Space>
              <Badge status={healthStatus.healthy ? 'success' : 'error'} />
              <span>MCP 服务状态: {healthStatus.healthy ? '正常运行' : '不可用'}</span>
              {healthStatus.version && <Tag>v{healthStatus.version}</Tag>}
            </Space>
          }
          type={healthStatus.healthy ? 'success' : 'error'}
          showIcon
          icon={healthStatus.healthy ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          style={{ marginBottom: '24px' }}
          action={
            <Button size="small" onClick={checkHealth}>
              刷新状态
            </Button>
          }
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="API Key 总数"
              value={statistics.totalKeys}
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃 Key"
              value={statistics.activeKeys}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总请求次数"
              value={statistics.totalRequests}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="错误率"
              value={statistics.errorRate}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: statistics.errorRate > 5 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'keys' | 'stats' | 'logs')}
          items={[
            {
              key: 'keys',
              label: (
                <span>
                  <KeyOutlined />
                  API Key 管理
                </span>
              ),
              children: (
                <>
                  {/* 操作栏 */}
                  <div style={{ marginBottom: '16px' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          <Button icon={<ReloadOutlined />} onClick={() => loadAPIKeys()}>
                            刷新
                          </Button>
                          {/* 管理员切换：查看所有用户的 Keys */}
                          {isAdmin && (
                            <Tooltip title="开启后可查看所有用户的 API Key">
                              <Space>
                                <TeamOutlined style={{ color: viewAllUsers ? '#1890ff' : undefined }} />
                                <Switch
                                  checked={viewAllUsers}
                                  onChange={(checked) => {
                                    setViewAllUsers(checked);
                                    loadAPIKeys(checked);
                                  }}
                                  checkedChildren="全部用户"
                                  unCheckedChildren="仅我的"
                                />
                              </Space>
                            </Tooltip>
                          )}
                        </Space>
                      </Col>
                      <Col>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setCreateModalVisible(true);
                            setNewKeyResult(null);
                          }}
                        >
                          创建 API Key
                        </Button>
                      </Col>
                    </Row>
                  </div>

                  {/* 使用说明 */}
                  <Alert
                    message="MCP API Key 使用说明"
                    description={
                      <div>
                        <Paragraph style={{ marginBottom: '8px' }}>
                          MCP API Key 用于第三方应用通过 MCP 协议访问系统服务。支持以下认证方式：
                        </Paragraph>
                        <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                          <li>
                            <code>X-API-Key: aiproj_pk_xxxxx</code> - 通过请求头传递
                          </li>
                          <li>
                            <code>Authorization: Bearer aiproj_pk_xxxxx</code> - Bearer Token 格式
                          </li>
                          <li>
                            <code>?api_key=aiproj_pk_xxxxx</code> - URL 参数（仅用于 SSE 连接）
                          </li>
                        </ul>
                      </div>
                    }
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: '16px' }}
                  />

                  {/* API Key 表格 */}
                  <Table
                    columns={columns}
                    dataSource={apiKeys}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'docs',
              label: (
                <span>
                  <BarChartOutlined />
                  连接指南
                </span>
              ),
              children: (
                <div style={{ maxWidth: '800px' }}>
                  <Title level={4}>MCP 服务连接指南</Title>

                  <Card title="1. 服务端点" style={{ marginBottom: '16px' }}>
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="SSE 端点">
                        <code>/api/v1/mcp/sse</code>
                        <Button
                          type="link"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard('/api/v1/mcp/sse', 'SSE 端点')}
                        />
                      </Descriptions.Item>
                      <Descriptions.Item label="健康检查">
                        <code>/api/v1/mcp/health</code>
                      </Descriptions.Item>
                      <Descriptions.Item label="传输协议">Streamable HTTP (SSE)</Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card title="2. 认证方式" style={{ marginBottom: '16px' }}>
                    <Paragraph>使用创建的 API Key 进行认证：</Paragraph>
                    <pre
                      style={{
                        background: '#f5f5f5',
                        padding: '12px',
                        borderRadius: '4px',
                        overflow: 'auto',
                      }}
                    >
                      {`# 方式1: X-API-Key 头
curl -H "X-API-Key: aiproj_pk_your_key_here" \\
     http://your-server/api/v1/mcp/sse

# 方式2: Bearer Token
curl -H "Authorization: Bearer aiproj_pk_your_key_here" \\
     http://your-server/api/v1/mcp/sse

# 方式3: URL 参数 (SSE 连接)
curl "http://your-server/api/v1/mcp/sse?api_key=aiproj_pk_your_key_here"`}
                    </pre>
                  </Card>

                  <Card title="3. 可用工具" style={{ marginBottom: '16px' }}>
                    <Paragraph>MCP 服务提供以下任务管理工具：</Paragraph>
                    <ul>
                      <li>
                        <code>list_tasks</code> - 获取任务列表
                      </li>
                      <li>
                        <code>get_task</code> - 获取任务详情
                      </li>
                      <li>
                        <code>create_task</code> - 创建新任务
                      </li>
                      <li>
                        <code>update_task</code> - 更新任务
                      </li>
                      <li>
                        <code>delete_task</code> - 删除任务
                      </li>
                      <li>
                        <code>start_task</code> - 开始任务
                      </li>
                      <li>
                        <code>complete_task</code> - 完成任务
                      </li>
                      <li>
                        <code>get_task_document</code> - 获取任务文档
                      </li>
                      <li>
                        <code>create_task_document</code> - 创建任务文档
                      </li>
                      <li>
                        <code>get_daily_focus</code> - 获取今日重点任务
                      </li>
                    </ul>
                  </Card>

                  <Card title="4. Claude Desktop 配置示例">
                    <Paragraph>
                      在 Claude Desktop 的配置文件中添加以下内容 (
                      <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>):
                    </Paragraph>
                    <pre
                      style={{
                        background: '#f5f5f5',
                        padding: '12px',
                        borderRadius: '4px',
                        overflow: 'auto',
                      }}
                    >
                      {`{
  "mcpServers": {
    "ai-project": {
      "command": "npx",
      "args": [
        "mcp-remote-client",
        "http://your-server/api/v1/mcp/sse"
      ],
      "env": {
        "MCP_API_KEY": "aiproj_pk_your_key_here"
      }
    }
  }
}`}
                    </pre>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 创建 API Key 模态框 */}
      <Modal
        title="创建 MCP API Key"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewKeyResult(null);
          form.resetFields();
        }}
        footer={
          newKeyResult
            ? [
                <Button
                  key="close"
                  type="primary"
                  onClick={() => {
                    setCreateModalVisible(false);
                    setNewKeyResult(null);
                    form.resetFields();
                  }}
                >
                  完成
                </Button>,
              ]
            : null  // 隐藏默认按钮，使用 Form 内的按钮
        }
        width={600}
      >
        {newKeyResult ? (
          <div>
            <Alert
              message="API Key 创建成功"
              description="请立即复制保存以下密钥，关闭此窗口后将无法再次查看完整密钥。"
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Descriptions bordered column={1}>
              <Descriptions.Item label="Key ID">
                <Space>
                  <code>{newKeyResult.keyId}</code>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(newKeyResult.keyId, 'Key ID')}
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="完整密钥">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.Password
                    value={newKeyResult.plainKey}
                    readOnly
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(newKeyResult.plainKey, '完整密钥')}
                    block
                  >
                    复制密钥
                  </Button>
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Alert
              message="安全提示"
              description="请将此密钥安全存储，不要在代码中硬编码或提交到版本控制系统。"
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleCreateKey}>
            <Form.Item
              label="名称"
              name="name"
              rules={[
                { required: true, message: '请输入 API Key 名称' },
                { max: 100, message: '名称最多 100 个字符' },
              ]}
            >
              <Input placeholder="例如：Claude Desktop 开发环境" />
            </Form.Item>

            <Form.Item label="描述" name="description">
              <TextArea rows={3} placeholder="描述此 API Key 的用途（可选）" maxLength={500} />
            </Form.Item>

            <Form.Item
              label="过期时间"
              name="expires_at"
              extra="留空表示永不过期"
            >
              <DatePicker
                style={{ width: '100%' }}
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                  }}
                >
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  创建
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* API Key 详情模态框 */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            API Key 详情
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedKey(null);
          setKeyStats(null);
          setKeyLogs([]);
        }}
        footer={null}
        width={800}
      >
        {selectedKey && (
          <div>
            {/* 基本信息 */}
            <Descriptions bordered column={2} size="small" style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="名称">{selectedKey.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[selectedKey.status]}>
                  {statusTextMap[selectedKey.status]}
                </Tag>
              </Descriptions.Item>
              {/* 用户信息 - 管理员查看所有时显示 */}
              {selectedKey.user && (
                <Descriptions.Item label="所属用户">
                  <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <span>{selectedKey.user.username}</span>
                    {selectedKey.user.nickname && (
                      <Text type="secondary">({selectedKey.user.nickname})</Text>
                    )}
                  </Space>
                </Descriptions.Item>
              )}
              {selectedKey.enterprise && (
                <Descriptions.Item label="所属企业">
                  <Tag color="blue">{selectedKey.enterprise.name}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Key ID">
                <code>{selectedKey.key_id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Key 前缀">
                <code>{selectedKey.key_prefix}...</code>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedKey.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最后使用">
                {selectedKey.last_used_at
                  ? dayjs(selectedKey.last_used_at).format('YYYY-MM-DD HH:mm:ss')
                  : '从未使用'}
              </Descriptions.Item>
              <Descriptions.Item label="过期时间">
                {selectedKey.expires_at
                  ? dayjs(selectedKey.expires_at).format('YYYY-MM-DD HH:mm:ss')
                  : '永不过期'}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedKey.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 使用统计 */}
            <Title level={5}>
              <BarChartOutlined /> 使用统计
            </Title>
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            ) : keyStats ? (
              <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                  <Statistic title="总请求" value={keyStats.total_requests} />
                </Col>
                <Col span={6}>
                  <Statistic title="错误请求" value={keyStats.total_errors} valueStyle={{ color: '#ff4d4f' }} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="成功率"
                    value={keyStats.success_rate}
                    suffix="%"
                    valueStyle={{ color: keyStats.success_rate >= 95 ? '#52c41a' : '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic title="平均耗时" value={keyStats.avg_duration_ms} suffix="ms" />
                </Col>
              </Row>
            ) : (
              <Empty description="暂无统计数据" />
            )}

            {/* 调用日志 */}
            <Title level={5}>
              <HistoryOutlined /> 最近调用记录
            </Title>
            <Table
              columns={logColumns}
              dataSource={keyLogs}
              rowKey="id"
              loading={logsLoading}
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="暂无调用记录" /> }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MCPConfigPage;
