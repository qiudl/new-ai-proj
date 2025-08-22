import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Typography,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  Modal,
  Table,
  Statistic,
  Row,
  Col,
  Alert,
  Badge,
  Progress,
  Input,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CopyOutlined,
  EyeOutlined,
  SettingOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

interface APIKey {
  id: string;
  name: string;
  description?: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  usage_count: number;
  usage_limit?: number;
  rate_limit_count: number;
  rate_limit_window: string;
  created_at: string;
  updated_at: string;
  created_by: number;
}

interface UsageLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  response_status: number;
  ip_address: string;
  user_agent: string;
}

interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  requests_by_day: Array<{
    date: string;
    count: number;
  }>;
  endpoints_usage: Array<{
    endpoint: string;
    count: number;
  }>;
}

const APIKeyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<APIKey | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // 权限选项映射
  const permissionOptions = [
    { label: 'API读取', value: 'api.read', description: '读取API访问权限' },
    { label: 'API写入', value: 'api.write', description: '写入API访问权限' },
    { label: 'API管理', value: 'api.admin', description: 'API管理员权限' },
    { label: '任务读取', value: 'tasks.read', description: '读取任务信息' },
    { label: '任务写入', value: 'tasks.write', description: '创建和编辑任务' },
    { label: '项目读取', value: 'projects.read', description: '读取项目信息' },
    { label: '项目写入', value: 'projects.write', description: '创建和编辑项目' },
    { label: '用户读取', value: 'users.read', description: '读取用户信息' },
    { label: '用户写入', value: 'users.write', description: '创建和编辑用户' },
    { label: '分析读取', value: 'analytics.read', description: '读取分析数据' },
    { label: '分析写入', value: 'analytics.write', description: '创建分析数据' },
    { label: '系统监控', value: 'system.monitor', description: '系统监控权限' }
  ];

  // 加载API Key详情
  const loadAPIKeyDetail = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/system/api-keys/${id}`);
      setApiKey(response.data || response);
    } catch (err: any) {
      const error = err as any;
      console.error('Failed to load API key detail:', error);
      if (error?.message?.includes('UNAUTHORIZED') || error?.message?.includes('401')) {
        message.error('未授权访问，请先登录');
      } else if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        message.error('API Key不存在');
      } else {
        message.error(`加载API Key详情失败: ${error?.message || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 加载使用统计
  const loadUsageStats = async () => {
    if (!id) return;
    
    try {
      setStatsLoading(true);
      const response = await api.get(`/system/api-keys/${id}/stats`);
      setUsageStats(response.data || response);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // 如果统计接口不存在或认证失败，使用模拟数据
      setUsageStats({
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        requests_by_day: [],
        endpoints_usage: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // 加载使用日志
  const loadUsageLogs = async () => {
    if (!id) return;
    
    try {
      setLogsLoading(true);
      const response = await api.get(`/system/api-keys/${id}/logs`);
      setUsageLogs(response.data || response || []);
    } catch (error) {
      console.error('Failed to load usage logs:', error);
      // 如果日志接口不存在或认证失败，设置为空数组
      setUsageLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadAPIKeyDetail();
    loadUsageStats();
    loadUsageLogs();
  }, [id]);

  // 删除API Key
  const handleDelete = async () => {
    if (!apiKey) return;
    
    try {
      await api.delete(`/system/api-keys/${apiKey.id}`);
      message.success('API Key已删除');
      navigate('/api-keys');
    } catch (error) {
      message.error('删除失败');
      console.error('Failed to delete API key:', error);
    }
  };

  // 重新生成API Key
  const handleRegenerate = async () => {
    if (!apiKey) return;
    
    try {
      const response = await api.post(`/system/api-keys/${apiKey.id}/regenerate`);
      
      // 兼容不同的响应格式
      const resp: any = response as any;
      const plainKey = resp.data?.plain_key || resp.plain_key;
      const plainSecret = resp.data?.plain_secret || resp.plain_secret;
      const newApiKey = resp.data?.api_key || resp.api_key;
      
      if (plainKey) {
        Modal.info({
          title: '🔑 重新生成的API Key',
          width: 600,
          content: (
            <div>
              <Alert 
                message="旧的API Key已失效，请使用新的API Key"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>完整API Key:</Text>
                <Input.Password 
                  value={plainKey} 
                  readOnly 
                  style={{ marginTop: 8 }}
                  addonAfter={
                    <Button 
                      type="text" 
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(plainKey);
                        message.success('API Key已复制到剪贴板');
                      }}
                    />
                  }
                />
              </div>

              {plainSecret && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong>密钥Secret:</Text>
                  <Input.Password 
                    value={plainSecret} 
                    readOnly 
                    style={{ marginTop: 8 }}
                    addonAfter={
                      <Button 
                        type="text" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(plainSecret);
                          message.success('Secret已复制到剪贴板');
                        }}
                      />
                    }
                  />
                </div>
              )}

              {newApiKey && (
                <div>
                  <Text strong>密钥信息:</Text>
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '6px', 
                    marginTop: '8px',
                    fontSize: '12px'
                  }}>
                    <div><strong>名称:</strong> {newApiKey.name}</div>
                    <div><strong>前缀:</strong> {newApiKey.key_prefix}</div>
                    <div><strong>权限:</strong> {newApiKey.permissions?.join(', ')}</div>
                    <div><strong>创建时间:</strong> {new Date(newApiKey.created_at).toLocaleString()}</div>
                  </div>
                </div>
              )}

              <Alert 
                message="重要提醒" 
                description="请立即复制并保存此密钥，它只会显示这一次！"
                type="info" 
                showIcon 
                style={{ marginTop: 16 }}
              />
            </div>
          ),
          okText: '我已保存'
        });
      } else {
        message.error('重新生成成功但未返回密钥内容');
      }

      message.success('API Key已重新生成');
      loadAPIKeyDetail();
      loadUsageStats();
    } catch (err: any) {
      const error = err as any;
      message.error('重新生成失败');
      console.error('Failed to regenerate API key:', error);
    }
  };

  // 切换API Key状态
  const toggleStatus = async () => {
    if (!apiKey) return;
    
    try {
      const newIsActive = !apiKey.is_active;
      await api.put(`/system/api-keys/${apiKey.id}`, { is_active: newIsActive });
      message.success(`API Key已${newIsActive ? '启用' : '禁用'}`);
      setApiKey({ ...apiKey, is_active: newIsActive });
    } catch (error) {
      message.error('状态切换失败');
      console.error('Failed to toggle API key status:', error);
    }
  };

  // 获取状态标签
  const getStatusTag = (isActive: boolean, expiresAt?: string) => {
    if (expiresAt && dayjs(expiresAt).isBefore(dayjs())) {
      return <Tag color="red" icon={<ExclamationCircleOutlined />}>已过期</Tag>;
    }
    
    if (isActive) {
      return <Tag color="green" icon={<CheckCircleOutlined />}>活跃</Tag>;
    } else {
      return <Tag color="orange" icon={<ClockCircleOutlined />}>已禁用</Tag>;
    }
  };

  // 获取权限显示名称
  const getPermissionLabel = (permission: string) => {
    const option = permissionOptions.find(opt => opt.value === permission);
    return option?.label || permission;
  };

  // 使用日志表格列
  const logColumns: ColumnsType<UsageLog> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: string) => (
        <Text style={{ fontSize: '12px' }}>
          {dayjs(timestamp).format('MM-DD HH:mm:ss')}
        </Text>
      )
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => (
        <Tag color={
          method === 'GET' ? 'blue' :
          method === 'POST' ? 'green' :
          method === 'PUT' ? 'orange' :
          method === 'DELETE' ? 'red' : 'default'
        }>
          {method}
        </Tag>
      )
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (endpoint: string) => (
        <Text code style={{ fontSize: '12px' }}>{endpoint}</Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'response_status',
      key: 'response_status',
      width: 80,
      render: (status: number) => (
        <Tag color={status >= 200 && status < 300 ? 'green' : 'red'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip: string) => (
        <Text style={{ fontSize: '12px', fontFamily: 'monospace' }}>{ip}</Text>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text type="secondary">API Key不存在</Text>
        </div>
      </Card>
    );
  }

  const usagePercent = apiKey.usage_limit 
    ? Math.round((apiKey.usage_count / apiKey.usage_limit) * 100)
    : 0;

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/api-keys')}
          >
            返回列表
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            API Key详情
          </Title>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* 基本信息 */}
          <Card 
            title={
              <Space>
                <ApiOutlined style={{ color: '#1890ff' }} />
                基本信息
              </Space>
            }
            style={{ marginBottom: '24px' }}
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/api-keys/${apiKey.id}/edit`)}
                >
                  编辑
                </Button>
                <Button
                  type={apiKey.is_active ? 'default' : 'primary'}
                  onClick={toggleStatus}
                >
                  {apiKey.is_active ? '禁用' : '启用'}
                </Button>
                <Popconfirm
                  title="确定要重新生成此API Key吗？"
                  description="旧的API Key将立即失效"
                  onConfirm={handleRegenerate}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button icon={<ReloadOutlined />}>
                    重新生成
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="确定要删除此API Key吗？"
                  description="此操作不可恢复"
                  onConfirm={handleDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Descriptions column={2} bordered>
              <Descriptions.Item label="名称" span={2}>
                <Text strong>{apiKey.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                <Text>{apiKey.description || '无描述'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="API Key前缀">
                <Space>
                  <Text code style={{ fontFamily: 'monospace' }}>
                    {apiKey.key_prefix}***
                  </Text>
                  <Button 
                    size="small" 
                    type="link" 
                    onClick={() => {
                      Modal.info({
                        title: '查看完整API Key',
                        content: (
                          <div>
                            <Alert 
                              message="安全提示" 
                              description="出于安全考虑，完整的API Key只在创建或重新生成时显示。如需查看完整密钥，请使用重新生成功能。"
                              type="warning" 
                              showIcon 
                              style={{ marginBottom: 16 }}
                            />
                            <Text strong>当前显示的前缀: </Text>
                            <Text code>{apiKey.key_prefix}***</Text>
                            <br /><br />
                            <Text>要查看完整密钥，请点击上方的"重新生成"按钮。</Text>
                          </div>
                        )
                      });
                    }}
                  >
                    查看说明
                  </Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(apiKey.is_active, apiKey.expires_at)}
              </Descriptions.Item>
              <Descriptions.Item label="权限" span={2}>
                <Space wrap>
                  {apiKey.permissions.map(permission => (
                    <Tooltip key={permission} title={
                      permissionOptions.find(opt => opt.value === permission)?.description
                    }>
                      <Tag color="blue">
                        {getPermissionLabel(permission)}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="速率限制">
                <Text>{apiKey.rate_limit_count} 次/{apiKey.rate_limit_window.replace('per_', '')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="使用限制">
                <Text>
                  {apiKey.usage_limit ? `${apiKey.usage_limit} 次` : '无限制'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="过期时间">
                <Text>
                  {apiKey.expires_at 
                    ? dayjs(apiKey.expires_at).format('YYYY-MM-DD HH:mm:ss')
                    : '永不过期'
                  }
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="最后使用时间">
                <Text>
                  {apiKey.last_used_at 
                    ? dayjs(apiKey.last_used_at).format('YYYY-MM-DD HH:mm:ss')
                    : '从未使用'
                  }
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                <Text>{dayjs(apiKey.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                <Text>{dayjs(apiKey.updated_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 使用日志 */}
          <Card 
            title={
              <Space>
                <EyeOutlined style={{ color: '#1890ff' }} />
                使用日志
              </Space>
            }
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadUsageLogs}
                loading={logsLoading}
              >
                刷新
              </Button>
            }
          >
            <Table
              dataSource={usageLogs}
              columns={logColumns}
              rowKey="id"
              loading={logsLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
              scroll={{ x: 800 }}
              locale={{
                emptyText: '暂无使用记录'
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* 使用统计 */}
          <Card 
            title={
              <Space>
                <BarChartOutlined style={{ color: '#1890ff' }} />
                使用统计
              </Space>
            }
            style={{ marginBottom: '24px' }}
            extra={
              <Button 
                size="small"
                icon={<ReloadOutlined />} 
                onClick={loadUsageStats}
                loading={statsLoading}
              />
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="总使用次数"
                  value={apiKey.usage_count}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="剩余次数"
                  value={apiKey.usage_limit ? apiKey.usage_limit - apiKey.usage_count : '无限制'}
                  valueStyle={{ 
                    color: apiKey.usage_limit && usagePercent >= 90 ? '#ff4d4f' : '#52c41a' 
                  }}
                />
              </Col>
            </Row>

            {apiKey.usage_limit && (
              <div style={{ marginTop: '16px' }}>
                <Text style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  使用进度
                </Text>
                <Progress 
                  percent={usagePercent} 
                  status={usagePercent >= 90 ? 'exception' : 'normal'}
                  format={(percent) => `${percent}%`}
                />
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <Text style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                今日请求统计
              </Text>
              <Row gutter={8}>
                <Col span={12}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="成功"
                      value={usageStats?.successful_requests || 0}
                      valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Statistic
                      title="失败"
                      value={usageStats?.failed_requests || 0}
                      valueStyle={{ color: '#ff4d4f', fontSize: '16px' }}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          </Card>

          {/* 安全信息 */}
          <Card 
            title={
              <Space>
                <SecurityScanOutlined style={{ color: '#1890ff' }} />
                安全信息
              </Space>
            }
            extra={
              <Space>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    Modal.confirm({
                      title: '🔑 重新生成并查看完整密钥',
                      width: 500,
                      content: (
                        <div>
                          <Alert 
                            message="注意：这将使当前密钥失效" 
                            description="重新生成后，旧的API Key将立即失效，您需要在所有使用的地方更新为新密钥。"
                            type="warning" 
                            showIcon 
                            style={{ marginBottom: 16 }}
                          />
                          <Text>确定要重新生成并查看新的完整API Key吗？</Text>
                        </div>
                      ),
                      onOk: handleRegenerate,
                      okText: '确定重新生成',
                      cancelText: '取消'
                    });
                  }}
                >
                  查看完整密钥
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    Modal.info({
                      title: '💡 密钥查看说明',
                      content: (
                        <div>
                          <Alert 
                            message="安全机制说明" 
                            description="出于安全考虑，API密钥在数据库中以加密哈希存储，无法逆向获取原始密钥。"
                            type="info" 
                            showIcon 
                            style={{ marginBottom: 16 }}
                          />
                          
                          <div style={{ marginBottom: 16 }}>
                            <Text strong>当前可见信息: </Text>
                            <Text code>{apiKey.key_prefix}***</Text>
                          </div>

                          <div>
                            <Text strong>获取完整密钥的方法：</Text>
                            <ul style={{ marginLeft: 20, marginTop: 8 }}>
                              <li>点击左侧的"查看完整密钥"按钮重新生成</li>
                              <li>如果您刚创建此密钥，请检查创建时的保存记录</li>
                            </ul>
                          </div>
                        </div>
                      ),
                      okText: '我知道了'
                    });
                  }}
                >
                  说明
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>安全状态:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Badge 
                    status={apiKey.is_active ? 'processing' : 'default'} 
                    text={apiKey.is_active ? '正常运行' : '已禁用'} 
                  />
                </div>
              </div>

              <div>
                <Text strong>权限级别:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color={
                    apiKey.permissions.includes('api.admin') ? 'red' :
                    apiKey.permissions.length > 5 ? 'orange' : 'green'
                  }>
                    {apiKey.permissions.includes('api.admin') ? '高权限' :
                     apiKey.permissions.length > 5 ? '中权限' : '低权限'}
                  </Tag>
                </div>
              </div>

              <div>
                <Text strong>过期检查:</Text>
                <div style={{ marginTop: '8px' }}>
                  {apiKey.expires_at ? (
                    dayjs(apiKey.expires_at).isBefore(dayjs()) ? (
                      <Badge status="error" text="已过期" />
                    ) : dayjs(apiKey.expires_at).isBefore(dayjs().add(30, 'day')) ? (
                      <Badge status="warning" text="即将过期" />
                    ) : (
                      <Badge status="success" text="正常" />
                    )
                  ) : (
                    <Badge status="success" text="永不过期" />
                  )}
                </div>
              </div>

              <div>
                <Text strong>使用限制:</Text>
                <div style={{ marginTop: '8px' }}>
                  {apiKey.usage_limit ? (
                    usagePercent >= 90 ? (
                      <Badge status="error" text="接近限制" />
                    ) : usagePercent >= 70 ? (
                      <Badge status="warning" text="使用较多" />
                    ) : (
                      <Badge status="success" text="正常使用" />
                    )
                  ) : (
                    <Badge status="success" text="无限制" />
                  )}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default APIKeyDetail;