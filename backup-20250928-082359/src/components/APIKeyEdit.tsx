import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Button,
  Row,
  Col,
  DatePicker,
  Alert,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  KeyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title } = Typography;
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
  expiresAt?: dayjs.Dayjs;
  usageLimit?: number;
  rateLimitCount: number;
  rateLimitWindow: string;
  isActive: boolean;
}

const APIKeyEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<APIKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // 加载API Key详情
  const loadAPIKey = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/system/api-keys/${id}`);
      const data = response.data || response;
      setApiKey(data);
      
      // 设置表单初始值
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        expiresAt: data.expires_at ? dayjs(data.expires_at) : undefined,
        usageLimit: data.usage_limit,
        rateLimitCount: data.rate_limit_count,
        rateLimitWindow: data.rate_limit_window,
        isActive: data.is_active
      });
      
    } catch (error) {
      console.error('Failed to load API key:', error);
      message.error('加载API Key失败');
      navigate('/api-keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAPIKey();
  }, [id]);

  // 保存更改
  const handleSubmit = async (values: APIKeyFormData) => {
    if (!apiKey) return;
    
    try {
      setSaving(true);
      
      const payload = {
        name: values.name,
        description: values.description,
        permissions: values.permissions,
        expires_at: values.expiresAt ? dayjs(values.expiresAt).toISOString() : null,
        usage_limit: values.usageLimit,
        rate_limit_count: values.rateLimitCount,
        rate_limit_window: values.rateLimitWindow,
        is_active: values.isActive
      };

      await api.put(`/system/api-keys/${apiKey.id}`, payload);
      message.success('API Key更新成功');
      navigate(`/api-keys/${apiKey.id}`);
      
    } catch (error) {
      console.error('Failed to update API key:', error);
      message.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

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
          <Typography.Text type="secondary">API Key不存在</Typography.Text>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(`/api-keys/${apiKey.id}`)}
          >
            返回详情
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            编辑API Key
          </Title>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card 
            title={
              <Space>
                <KeyOutlined style={{ color: '#1890ff' }} />
                编辑API Key信息
              </Space>
            }
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
                    <Input placeholder="请输入API Key名称" />
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
                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                              {option.description}
                            </Typography.Text>
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

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="isActive"
                    label="状态"
                    valuePropName="checked"
                  >
                    <Select defaultValue={true}>
                      <Option value={true}>启用</Option>
                      <Option value={false}>禁用</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ textAlign: 'right', marginTop: '24px' }}>
                <Space>
                  <Button 
                    onClick={() => navigate(`/api-keys/${apiKey.id}`)}
                  >
                    取消
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={saving}
                    icon={<SaveOutlined />}
                  >
                    保存更改
                  </Button>
                </Space>
              </div>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="基本信息">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>API Key前缀:</Typography.Text>
                <div style={{ marginTop: '4px' }}>
                  <Typography.Text code>
                    {apiKey.key_prefix}***
                  </Typography.Text>
                </div>
              </div>
              
              <div>
                <Typography.Text strong>创建时间:</Typography.Text>
                <div style={{ marginTop: '4px' }}>
                  <Typography.Text>
                    {dayjs(apiKey.created_at).format('YYYY-MM-DD HH:mm')}
                  </Typography.Text>
                </div>
              </div>
              
              <div>
                <Typography.Text strong>最后更新:</Typography.Text>
                <div style={{ marginTop: '4px' }}>
                  <Typography.Text>
                    {dayjs(apiKey.updated_at).format('YYYY-MM-DD HH:mm')}
                  </Typography.Text>
                </div>
              </div>
            </Space>
          </Card>

          <Alert 
            message="注意事项" 
            description="修改权限和限制设置后会立即生效。如需更换密钥，请使用重新生成功能。"
            type="info" 
            showIcon 
            style={{ marginTop: '16px' }}
          />
        </Col>
      </Row>
    </div>
  );
};

export default APIKeyEdit;