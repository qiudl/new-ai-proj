import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  Alert,
  Row,
  Col,
  DatePicker,
  Switch,
  Divider,
  Badge,
  Progress
} from 'antd';
import {
  KeyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  ReloadOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

interface APIKeyFormData {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: string | dayjs.Dayjs;
  usageLimit?: number;
  rateLimitCount: number;
  rateLimitWindow: string;
}

interface APIKeyManagementProps {
  title?: string;
  bordered?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const APIKeyManagement: React.FC<APIKeyManagementProps> = ({
  title = 'API Key管理',
  bordered = true,
  size = 'middle'
}) => {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [form] = Form.useForm<APIKeyFormData>();

  // 权限选项
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

  // 加载API Key列表
  const loadAPIKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/system/api-keys');
      setApiKeys(response.data || []);
    } catch (error) {
      message.error('加载API Key失败');
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAPIKeys();
  }, [loadAPIKeys]);

  // 创建/更新API Key
  const handleSubmit = async (values: APIKeyFormData) => {
    try {
      setLoading(true);
      
      const payload = {
        ...values,
        expiresAt: values.expiresAt ? dayjs(values.expiresAt).toISOString() : undefined,
        rate_limit_count: values.rateLimitCount,
        rate_limit_window: values.rateLimitWindow
      };

      if (editingKey) {
        await api.put(`/system/api-keys/${editingKey.id}`, payload);
        message.success('API Key更新成功');
      } else {
        const response = await api.post('/system/api-keys', payload);
        message.success('API Key创建成功');
        
        // 显示新创建的API Key（只显示一次）
        if (response.data?.plain_key) {
          Modal.info({
            title: '新的API Key',
            content: (
              <div>
                <Alert 
                  message="请妥善保存以下API Key，它将只显示这一次："
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Input.Password 
                  value={response.data.plain_key} 
                  readOnly 
                  addonAfter={
                    <Button 
                      type="text" 
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(response.data.plain_key);
                        message.success('已复制到剪贴板');
                      }}
                    />
                  }
                />
              </div>
            ),
            width: 500,
            okText: '我已保存'
          });
        }
      }

      setModalVisible(false);
      setEditingKey(null);
      form.resetFields();
      loadAPIKeys();
    } catch (error) {
      message.error(editingKey ? '更新失败' : '创建失败');
      console.error('API key operation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 删除API Key
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/system/api-keys/${id}`);
      message.success('API Key已删除');
      loadAPIKeys();
    } catch (error) {
      message.error('删除失败');
      console.error('Failed to delete API key:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换API Key状态
  const toggleStatus = async (id: string, currentIsActive: boolean) => {
    try {
      const newIsActive = !currentIsActive;
      await api.put(`/system/api-keys/${id}`, { is_active: newIsActive });
      message.success(`API Key已${newIsActive ? '启用' : '禁用'}`);
      loadAPIKeys();
    } catch (error) {
      message.error('状态切换失败');
      console.error('Failed to toggle API key status:', error);
    }
  };

  // 重新生成API Key
  const regenerateKey = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/system/api-keys/${id}/regenerate`);
      
      if (response.data?.plain_key) {
        Modal.info({
          title: '重新生成的API Key',
          content: (
            <div>
              <Alert 
                message="旧的API Key已失效，请使用新的API Key："
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Input.Password 
                value={response.data.plain_key} 
                readOnly 
                addonAfter={
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(response.data.plain_key);
                      message.success('已复制到剪贴板');
                    }}
                  />
                }
              />
            </div>
          ),
          width: 500,
          okText: '我已更新'
        });
      }

      message.success('API Key已重新生成');
      loadAPIKeys();
    } catch (error) {
      message.error('重新生成失败');
      console.error('Failed to regenerate API key:', error);
    } finally {
      setLoading(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
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

  // 表格列定义
  const columns: ColumnsType<APIKey> = [
    {
      title: 'API Key名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: APIKey) => (
        <div>
          <Text strong>{name}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'API Key前缀',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      width: 200,
      render: (keyPrefix: string) => (
        <Text code style={{ fontFamily: 'monospace' }}>
          {keyPrefix}***
        </Text>
      )
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 250,
      render: (permissions: string[]) => (
        <div>
          {permissions.slice(0, 3).map(permission => {
            const option = permissionOptions.find(opt => opt.value === permission);
            return (
              <Tag key={permission} color="blue" style={{ marginBottom: 4 }}>
                {option?.label || permission}
              </Tag>
            );
          })}
          {permissions.length > 3 && (
            <Tag color="default">+{permissions.length - 3}</Tag>
          )}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: APIKey) => getStatusTag(isActive, record.expires_at)
    },
    {
      title: '使用情况',
      key: 'usage',
      width: 120,
      render: (_, record: APIKey) => {
        const usagePercent = record.usage_limit 
          ? Math.round((record.usage_count / record.usage_limit) * 100)
          : 0;
        
        return (
          <div>
            <Text style={{ fontSize: '12px' }}>
              {record.usage_count}{record.usage_limit ? `/${record.usage_limit}` : ''}
            </Text>
            {record.usage_limit && (
              <Progress 
                percent={usagePercent} 
                 
                status={usagePercent >= 90 ? 'exception' : 'normal'}
                showInfo={false}
              />
            )}
          </div>
        );
      }
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      width: 150,
      render: (lastUsedAt: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {lastUsedAt ? dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm') : '从未使用'}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: APIKey) => (
        <Space >
          <Tooltip title="查看详情">
            <Button
              type="text"
              
              icon={<EyeOutlined />}
              onClick={() => navigate(`/api-keys/${record.id}`)}
            />
          </Tooltip>
          
          <Tooltip title="编辑">
            <Button
              type="text"
              
              icon={<EditOutlined />}
              onClick={() => {
                setEditingKey(record);
                form.setFieldsValue({
                  name: record.name,
                  description: record.description,
                  permissions: record.permissions,
                  expiresAt: record.expires_at ? dayjs(record.expires_at) : undefined,
                  usageLimit: record.usage_limit,
                  rateLimitCount: record.rate_limit_count,
                  rateLimitWindow: record.rate_limit_window
                });
                setModalVisible(true);
              }}
            />
          </Tooltip>
          
          <Tooltip title={record.is_active ? '禁用' : '启用'}>
            <Switch
              
              checked={record.is_active}
              onChange={() => toggleStatus(record.id, record.is_active)}
            />
          </Tooltip>

          <Tooltip title="重新生成">
            <Popconfirm
              title="确定要重新生成此API Key吗？"
              description="旧的API Key将立即失效"
              onConfirm={() => regenerateKey(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                
                icon={<ReloadOutlined />}
              />
            </Popconfirm>
          </Tooltip>

          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除此API Key吗？"
              description="此操作不可恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card
      title={
        <Space>
          <KeyOutlined style={{ color: '#1890ff' }} />
          {title}
        </Space>
      }
      variant={bordered ? "outlined" : undefined}
      size={size === 'small' ? 'small' : undefined}
      extra={
        <Space>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={loadAPIKeys}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingKey(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            创建API Key
          </Button>
        </Space>
      }
    >
      {/* 使用统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card >
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {apiKeys.length}
              </Title>
              <Text type="secondary">总数</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card >
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {apiKeys.filter(key => key.is_active).length}
              </Title>
              <Text type="secondary">活跃</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card >
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#faad14' }}>
                {apiKeys.filter(key => key.expires_at && dayjs(key.expires_at).isBefore(dayjs().add(7, 'day'))).length}
              </Title>
              <Text type="secondary">即将过期</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card >
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
                {apiKeys.filter(key => key.expires_at && dayjs(key.expires_at).isBefore(dayjs())).length}
              </Title>
              <Text type="secondary">已过期</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* API Key列表 */}
      <Table
        dataSource={apiKeys}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          total: apiKeys.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        scroll={{ x: 1200 }}
      />

      {/* 创建/编辑Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: '#1890ff' }} />
            {editingKey ? '编辑API Key' : '创建API Key'}
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingKey(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="API Key名称"
                rules={[
                  { required: true, message: '请输入API Key名称' },
                  { max: 50, message: '名称不能超过50个字符' }
                ]}
              >
                <Input placeholder="请输入API Key名称，如：前端应用、移动端应用等" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="描述"
              >
                <TextArea 
                  placeholder="描述此API Key的用途（可选）"
                  rows={3}
                  maxLength={200}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="permissions"
                label="权限"
                rules={[{ required: true, message: '请选择至少一个权限' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择API Key权限"
                  optionLabelProp="label"
                  style={{ width: '100%' }}
                >
                  {permissionOptions.map(option => (
                    <Option key={option.value} value={option.value} label={option.label}>
                      <div>
                        <div>{option.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {option.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="expiresAt"
                label="过期时间"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="选择过期时间（可选）"
                  disabledDate={(current) => current && current < dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="usageLimit"
                label="使用次数限制"
                tooltip="设置API Key的最大使用次数，留空表示无限制"
              >
                <Input
                  type="number"
                  placeholder="无限制"
                  min={1}
                  max={1000000}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rateLimitCount"
                label="速率限制次数"
                rules={[{ required: true, message: '请输入速率限制次数' }]}
                initialValue={100}
              >
                <Input
                  type="number"
                  placeholder="100"
                  min={1}
                  max={100000}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rateLimitWindow"
                label="速率限制时间窗口"
                rules={[{ required: true, message: '请选择速率限制时间窗口' }]}
                initialValue="per_hour"
              >
                <Select placeholder="选择时间窗口">
                  <Option value="per_minute">每分钟</Option>
                  <Option value="per_hour">每小时</Option>
                  <Option value="per_day">每天</Option>
                  <Option value="per_month">每月</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editingKey && (
            <Alert
              message="创建API Key后，密钥只会显示一次，请务必保存！"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default APIKeyManagement;