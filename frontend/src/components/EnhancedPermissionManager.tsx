import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Tooltip,
  Badge,
  Progress,
  Row,
  Col,
  Statistic,
  Timeline,
  Alert,
  Descriptions,
  Popconfirm,
  Divider,
  Avatar,
  List
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ShareAltOutlined,
  BarChartOutlined,
  BulbOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  FireOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 接口定义
interface RoleTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  default_permissions: string[];
  required_permissions: string[];
  conflicting_roles: string[];
  recommended_for: string[];
  is_built_in: boolean;
  created_at: string;
  updated_at: string;
}

interface PermissionTemplate {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  use_cases: string[];
  is_built_in: boolean;
}

interface PermissionRequest {
  id: number;
  requester_id: number;
  requester_name: string;
  permission_code: string;
  resource_type: string;
  resource_id?: number;
  justification: string;
  requested_duration: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approver_id?: number;
  approver_name?: string;
  approved_at?: string;
  expires_at?: string;
  comments: string;
  created_at: string;
  updated_at: string;
}

interface PermissionDelegation {
  id: number;
  delegator_id: number;
  delegator_name: string;
  delegate_id: number;
  delegate_name: string;
  permission_codes: string[];
  resource_type: string;
  resource_id?: number;
  valid_from: string;
  valid_until: string;
  can_delegate: boolean;
  is_active: boolean;
  reason: string;
  created_at: string;
  revoked_at?: string;
  revoked_by?: number;
}

interface PermissionAnalysis {
  user_id: number;
  time_range: string;
  most_used_permissions: Array<{
    permission: string;
    count: number;
    last_used: string;
  }>;
  unused_permissions: string[];
  permission_requests: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  delegations: {
    given: number;
    received: number;
    active: number;
  };
  recommendations: string[];
}

interface OptimizationSuggestion {
  user_id: number;
  current_role: {
    id: number;
    name: string;
    permissions_count: number;
  };
  usage_analysis: {
    used_permissions: number;
    unused_permissions: number;
    usage_rate: string;
  };
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    benefits?: string[];
    permissions?: string[];
    new_role?: string;
  }>;
  security_score: number;
  optimization_potential: string;
}

interface EnhancedPermissionManagerProps {
  userId?: number;
  mode?: 'full' | 'user' | 'admin';
}

const EnhancedPermissionManager: React.FC<EnhancedPermissionManagerProps> = ({
  userId,
  mode = 'full'
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  
  // 数据状态
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [delegations, setDelegations] = useState<PermissionDelegation[]>([]);
  const [permissionAnalysis, setPermissionAnalysis] = useState<PermissionAnalysis | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion | null>(null);

  // 模态框状态
  const [createRoleVisible, setCreateRoleVisible] = useState(false);
  const [requestPermissionVisible, setRequestPermissionVisible] = useState(false);
  const [delegatePermissionVisible, setDelegatePermissionVisible] = useState(false);
  const [analysisVisible, setAnalysisVisible] = useState(false);

  // 表单状态
  const [createRoleForm] = Form.useForm();
  const [requestPermissionForm] = Form.useForm();
  const [delegatePermissionForm] = Form.useForm();

  // 加载数据
  useEffect(() => {
    loadRoleTemplates();
    loadPermissionTemplates();
    loadPermissionRequests();
    if (userId) {
      loadUserDelegations();
      loadPermissionAnalysis();
      loadOptimizationSuggestions();
    }
  }, [userId]);

  // API调用函数
  const loadRoleTemplates = async () => {
    try {
      const response = await fetch('/api/v1/permissions/role-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setRoleTemplates(data.data);
      }
    } catch (error) {
      console.error('加载角色模板失败:', error);
    }
  };

  const loadPermissionTemplates = async () => {
    try {
      const response = await fetch('/api/v1/permissions/permission-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPermissionTemplates(data.data);
      }
    } catch (error) {
      console.error('加载权限模板失败:', error);
    }
  };

  const loadPermissionRequests = async () => {
    try {
      const response = await fetch('/api/v1/permissions/requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPermissionRequests(data.data);
      }
    } catch (error) {
      console.error('加载权限请求失败:', error);
    }
  };

  const loadUserDelegations = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/v1/permissions/users/${userId}/delegations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setDelegations(data.data);
      }
    } catch (error) {
      console.error('加载权限委派失败:', error);
    }
  };

  const loadPermissionAnalysis = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/v1/permissions/users/${userId}/usage-analysis`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPermissionAnalysis(data.data);
      }
    } catch (error) {
      console.error('加载权限分析失败:', error);
    }
  };

  const loadOptimizationSuggestions = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/v1/permissions/users/${userId}/optimization-suggestions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setOptimizationSuggestions(data.data);
      }
    } catch (error) {
      console.error('加载优化建议失败:', error);
    }
  };

  // 创建角色从模板
  const handleCreateRoleFromTemplate = async (values: any) => {
    try {
      const response = await fetch('/api/v1/permissions/roles/from-template', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (data.success) {
        message.success('角色创建成功');
        setCreateRoleVisible(false);
        createRoleForm.resetFields();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      message.error('创建角色失败');
    }
  };

  // 请求权限
  const handleRequestPermission = async (values: any) => {
    try {
      const response = await fetch('/api/v1/permissions/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (data.success) {
        message.success('权限请求已提交');
        setRequestPermissionVisible(false);
        requestPermissionForm.resetFields();
        loadPermissionRequests();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('请求权限失败:', error);
      message.error('请求权限失败');
    }
  };

  // 委派权限
  const handleDelegatePermission = async (values: any) => {
    try {
      const response = await fetch('/api/v1/permissions/delegate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (data.success) {
        message.success('权限委派成功');
        setDelegatePermissionVisible(false);
        delegatePermissionForm.resetFields();
        loadUserDelegations();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('委派权限失败:', error);
      message.error('委派权限失败');
    }
  };

  // 批准权限请求
  const handleApproveRequest = async (requestId: number, comments: string) => {
    try {
      const response = await fetch(`/api/v1/permissions/requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments })
      });

      const data = await response.json();
      if (data.success) {
        message.success('权限请求已批准');
        loadPermissionRequests();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('批准请求失败:', error);
      message.error('批准请求失败');
    }
  };

  // 拒绝权限请求
  const handleRejectRequest = async (requestId: number, reason: string) => {
    try {
      const response = await fetch(`/api/v1/permissions/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        message.success('权限请求已拒绝');
        loadPermissionRequests();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('拒绝请求失败:', error);
      message.error('拒绝请求失败');
    }
  };

  // 撤销委派
  const handleRevokeDelegation = async (delegationId: number, reason: string) => {
    try {
      const response = await fetch(`/api/v1/permissions/delegations/${delegationId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        message.success('权限委派已撤销');
        loadUserDelegations();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('撤销委派失败:', error);
      message.error('撤销委派失败');
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'green';
      case 'pending': return 'orange';
      case 'rejected': return 'red';
      case 'expired': return 'gray';
      default: return 'default';
    }
  };

  // 获取类别图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'management': return <CrownOutlined style={{ color: '#722ed1' }} />;
      case 'development': return <ThunderboltOutlined style={{ color: '#1890ff' }} />;
      case 'product': return <BulbOutlined style={{ color: '#52c41a' }} />;
      case 'qa': return <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />;
      case 'viewer': return <EyeOutlined style={{ color: '#999' }} />;
      default: return <UserOutlined />;
    }
  };

  // 角色模板表格列
  const roleTemplateColumns: ColumnsType<RoleTemplate> = [
    {
      title: '角色模板',
      key: 'template',
      render: (_, record) => (
        <Space>
          {getCategoryIcon(record.category)}
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '权限数量',
      key: 'permissions',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text>默认: {record.default_permissions.length}</Text>
          <Text>必需: {record.required_permissions.length}</Text>
        </Space>
      ),
    },
    {
      title: '推荐场景',
      dataIndex: 'recommended_for',
      key: 'recommended_for',
      render: (recommended) => (
        <Space wrap>
          {recommended.map((item: string, index: number) => (
<Tag key={index}>{item}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              createRoleForm.setFieldsValue({ template_id: record.id });
              setCreateRoleVisible(true);
            }}
          >
            使用模板
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: `${record.name} - 详细信息`,
                width: 800,
                content: (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="描述">
                      {record.description}
                    </Descriptions.Item>
                    <Descriptions.Item label="默认权限">
                      <Space wrap>
                        {record.default_permissions.map((perm, index) => (
                          <Tag key={index} color="blue">{perm}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="必需权限">
                      <Space wrap>
                        {record.required_permissions.map((perm, index) => (
                          <Tag key={index} color="red">{perm}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    {record.conflicting_roles.length > 0 && (
                      <Descriptions.Item label="冲突角色">
                        <Space wrap>
                          {record.conflicting_roles.map((role, index) => (
                            <Tag key={index} color="orange">{role}</Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                ),
              });
            }}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  // 权限请求表格列
  const requestColumns: ColumnsType<PermissionRequest> = [
    {
      title: '请求者',
      key: 'requester',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <Text strong>{record.requester_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {moment(record.created_at).format('MM-DD HH:mm')}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '权限信息',
      key: 'permission',
      render: (_, record) => (
        <div>
          <Text strong>{record.permission_code}</Text>
          <br />
          <Text type="secondary">
            {record.resource_type}
            {record.resource_id && ` #${record.resource_id}`}
          </Text>
        </div>
      ),
    },
    {
      title: '理由',
      dataIndex: 'justification',
      key: 'justification',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status === 'pending' ? '待审批' :
           status === 'approved' ? '已批准' :
           status === 'rejected' ? '已拒绝' : '已过期'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="批准此权限请求？"
                onConfirm={() => handleApproveRequest(record.id, '')}
              >
                <Button type="link" icon={<CheckCircleOutlined />} size="small">
                  批准
                </Button>
              </Popconfirm>
              <Popconfirm
                title="拒绝此权限请求？"
                onConfirm={() => handleRejectRequest(record.id, '管理员拒绝')}
              >
                <Button type="link" danger icon={<CloseCircleOutlined />} size="small">
                  拒绝
                </Button>
              </Popconfirm>
            </>
          )}
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => {
              Modal.info({
                title: '权限请求详情',
                content: (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="请求者">{record.requester_name}</Descriptions.Item>
                    <Descriptions.Item label="权限代码">{record.permission_code}</Descriptions.Item>
                    <Descriptions.Item label="资源类型">{record.resource_type}</Descriptions.Item>
                    <Descriptions.Item label="理由">{record.justification}</Descriptions.Item>
                    <Descriptions.Item label="请求时长">{record.requested_duration}小时</Descriptions.Item>
                    {record.approver_name && (
                      <Descriptions.Item label="审批者">{record.approver_name}</Descriptions.Item>
                    )}
                    {record.comments && (
                      <Descriptions.Item label="备注">{record.comments}</Descriptions.Item>
                    )}
                  </Descriptions>
                ),
              });
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 委派表格列
  const delegationColumns: ColumnsType<PermissionDelegation> = [
    {
      title: '委派关系',
      key: 'delegation',
      render: (_, record) => (
        <div>
          <Space>
            <Avatar icon={<UserOutlined />} size="small" />
            <Text>{record.delegator_name}</Text>
            <Text type="secondary">→</Text>
            <Avatar icon={<UserOutlined />} size="small" />
            <Text>{record.delegate_name}</Text>
          </Space>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {moment(record.created_at).format('MM-DD HH:mm')}
          </Text>
        </div>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission_codes',
      key: 'permission_codes',
      render: (codes) => (
        <Space wrap>
          {codes.map((code: string, index: number) => (
<Tag key={index}>{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '有效期',
      key: 'validity',
      render: (_, record) => (
        <div>
          <Text type="secondary">
            {moment(record.valid_from).format('MM-DD')} - {moment(record.valid_until).format('MM-DD')}
          </Text>
          <br />
          {moment(record.valid_until).isAfter(moment()) ? (
            <Text type="success">有效</Text>
          ) : (
            <Text type="danger">已过期</Text>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.is_active ? 'green' : 'gray'}>
          {record.is_active ? '活跃' : '已撤销'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.is_active && moment(record.valid_until).isAfter(moment()) && (
            <Popconfirm
              title="确定要撤销此委派吗？"
              onConfirm={() => handleRevokeDelegation(record.id, '管理员撤销')}
            >
              <Button type="link" danger size="small">
                撤销
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => {
              Modal.info({
                title: '委派详情',
                content: (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="委派人">{record.delegator_name}</Descriptions.Item>
                    <Descriptions.Item label="被委派人">{record.delegate_name}</Descriptions.Item>
                    <Descriptions.Item label="权限代码">
                      <Space wrap>
                        {record.permission_codes.map((code, index) => (
                          <Tag key={index}>{code}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="资源类型">{record.resource_type}</Descriptions.Item>
                    <Descriptions.Item label="理由">{record.reason}</Descriptions.Item>
                    <Descriptions.Item label="有效期">
                      {moment(record.valid_from).format('YYYY-MM-DD HH:mm')} - {moment(record.valid_until).format('YYYY-MM-DD HH:mm')}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              });
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 渲染权限分析
  const renderPermissionAnalysis = () => {
    if (!permissionAnalysis) return null;

    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="权限使用统计" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="最常用权限"
                  value={permissionAnalysis.most_used_permissions[0]?.count || 0}
                  suffix="次"
                  prefix={<FireOutlined style={{ color: '#fa541c' }} />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="未使用权限"
                  value={permissionAnalysis.unused_permissions.length}
                  suffix="个"
                  prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="权限请求"
                  value={permissionAnalysis.permission_requests.total}
                  suffix="次"
                  prefix={<HistoryOutlined style={{ color: '#1890ff' }} />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="活跃委派"
                  value={permissionAnalysis.delegations.active}
                  suffix="个"
                  prefix={<ShareAltOutlined style={{ color: '#52c41a' }} />}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="常用权限" size="small">
            <List
              size="small"
              dataSource={permissionAnalysis.most_used_permissions}
              renderItem={(item, index) => (
                <List.Item>
                  <Space>
                    <Badge count={index + 1} style={{ backgroundColor: '#52c41a' }} />
                    <div>
                      <Text strong>{item.permission}</Text>
                      <br />
                      <Text type="secondary">使用 {item.count} 次</Text>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="系统建议" size="small">
            <List
              size="small"
              dataSource={permissionAnalysis.recommendations}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <BulbOutlined style={{ color: '#faad14' }} />
                    <Text>{item}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染优化建议
  const renderOptimizationSuggestions = () => {
    if (!optimizationSuggestions) return null;

    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="角色优化概览" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="当前角色"
                  value={optimizationSuggestions.current_role.name}
                  prefix={<UserOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="权限使用率"
                  value={optimizationSuggestions.usage_analysis.usage_rate}
                  prefix={<BarChartOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="安全评分"
                  value={optimizationSuggestions.security_score}
                  suffix="/100"
                  prefix={<SafetyCertificateOutlined />}
                  valueStyle={{ 
                    color: optimizationSuggestions.security_score >= 80 ? '#3f8600' : 
                           optimizationSuggestions.security_score >= 60 ? '#faad14' : '#cf1322' 
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="优化建议" size="small">
            <List
              dataSource={optimizationSuggestions.suggestions}
              renderItem={(suggestion) => (
                <List.Item>
                  <Card size="small" style={{ width: '100%' }}>
                    <Row align="middle">
                      <Col flex="auto">
                        <Space direction="vertical" size="small">
                          <div>
                            <Space>
                              <TrophyOutlined style={{ 
                                color: suggestion.type === 'role_change' ? '#722ed1' :
                                       suggestion.type === 'permission_removal' ? '#fa541c' : '#52c41a'
                              }} />
                              <Text strong>{suggestion.title}</Text>
                              <Progress
                                percent={suggestion.confidence}
                                size="small"
                                showInfo={false}
                                strokeColor={suggestion.confidence >= 80 ? '#52c41a' : '#faad14'}
                              />
                              <Text type="secondary">{suggestion.confidence}% 置信度</Text>
                            </Space>
                          </div>
                          <Text type="secondary">{suggestion.description}</Text>
                          {suggestion.benefits && (
                            <div>
                              <Text strong>好处:</Text>
                              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                {suggestion.benefits.map((benefit, index) => (
                                  <li key={index}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {suggestion.permissions && (
                            <Space wrap>
                              <Text strong>相关权限:</Text>
                              {suggestion.permissions.map((perm, index) => (
<Tag key={index}>{perm}</Tag>
                              ))}
                            </Space>
                          )}
                        </Space>
                      </Col>
                      <Col>
                        <Button type="primary" size="small">
                          应用建议
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>
            <SafetyCertificateOutlined style={{ marginRight: 8 }} />
            增强权限管理
          </Title>
          <Text type="secondary">
            高级权限管理工具，包括角色模板、权限请求、委派管理和智能优化建议
          </Text>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <CrownOutlined />
                角色模板
              </span>
            }
            key="templates"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card
                title="角色模板"
                size="small"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateRoleVisible(true)}
                  >
                    创建角色
                  </Button>
                }
              >
                <Table
                  columns={roleTemplateColumns}
                  dataSource={roleTemplates}
                  rowKey="id"
                  size="small"
                  loading={loading}
                />
              </Card>

              <Card title="权限模板" size="small">
                <Row gutter={[16, 16]}>
                  {permissionTemplates.map((template) => (
                    <Col span={8} key={template.id}>
                      <Card
                        size="small"
                        title={template.name}
                        extra={
                          <Button size="small" type="link">
                            使用
                          </Button>
                        }
                      >
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Text type="secondary">{template.description}</Text>
                          <div>
                            <Text strong>权限数量:</Text>
                            <Badge
                              count={Object.keys(template.permissions).length}
                              style={{ marginLeft: 8 }}
                            />
                          </div>
                          <div>
                            <Text strong>适用场景:</Text>
                            <br />
                            {template.use_cases.map((useCase, index) => (
<Tag key={index} style={{ marginTop: 4 }}>
                                {useCase}
                              </Tag>
                            ))}
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Space>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                权限请求
                <Badge count={permissionRequests.filter(r => r.status === 'pending').length} />
              </span>
            }
            key="requests"
          >
            <Card
              title="权限请求管理"
              size="small"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setRequestPermissionVisible(true)}
                >
                  申请权限
                </Button>
              }
            >
              <Table
                columns={requestColumns}
                dataSource={permissionRequests}
                rowKey="id"
                size="small"
                loading={loading}
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ShareAltOutlined />
                权限委派
              </span>
            }
            key="delegations"
          >
            <Card
              title="权限委派管理"
              size="small"
              extra={
                <Button
                  type="primary"
                  icon={<ShareAltOutlined />}
                  onClick={() => setDelegatePermissionVisible(true)}
                >
                  委派权限
                </Button>
              }
            >
              <Table
                columns={delegationColumns}
                dataSource={delegations}
                rowKey="id"
                size="small"
                loading={loading}
              />
            </Card>
          </TabPane>

          {userId && (
            <TabPane
              tab={
                <span>
                  <BarChartOutlined />
                  分析报告
                </span>
              }
              key="analysis"
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {renderPermissionAnalysis()}
                {renderOptimizationSuggestions()}
              </Space>
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* 创建角色模态框 */}
      <Modal
        title="从模板创建角色"
        open={createRoleVisible}
        onCancel={() => setCreateRoleVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={createRoleForm}
          onFinish={handleCreateRoleFromTemplate}
          layout="vertical"
        >
          <Form.Item
            name="template_id"
            label="选择模板"
            rules={[{ required: true, message: '请选择角色模板' }]}
          >
            <Select placeholder="选择角色模板">
              {roleTemplates.map(template => (
                <Option key={template.id} value={template.id}>
                  <Space>
                    {getCategoryIcon(template.category)}
                    {template.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="role_name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="输入新角色名称" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建角色
              </Button>
              <Button onClick={() => setCreateRoleVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 申请权限模态框 */}
      <Modal
        title="申请临时权限"
        open={requestPermissionVisible}
        onCancel={() => setRequestPermissionVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={requestPermissionForm}
          onFinish={handleRequestPermission}
          layout="vertical"
        >
          <Form.Item
            name="permission_code"
            label="权限代码"
            rules={[{ required: true, message: '请输入权限代码' }]}
          >
            <Input placeholder="如: project.delete" />
          </Form.Item>

          <Form.Item
            name="resource_type"
            label="资源类型"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select placeholder="选择资源类型">
              <Option value="project">项目</Option>
              <Option value="task">任务</Option>
              <Option value="document">文档</Option>
              <Option value="user">用户</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="resource_id"
            label="资源ID"
          >
            <InputNumber placeholder="可选，特定资源的ID" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="duration_hours"
            label="申请时长（小时）"
            rules={[{ required: true, message: '请输入申请时长' }]}
          >
            <InputNumber min={1} max={168} placeholder="1-168小时" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="justification"
            label="申请理由"
            rules={[{ required: true, message: '请输入申请理由' }]}
          >
            <TextArea rows={3} placeholder="请详细说明申请此权限的理由" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交申请
              </Button>
              <Button onClick={() => setRequestPermissionVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 委派权限模态框 */}
      <Modal
        title="委派权限"
        open={delegatePermissionVisible}
        onCancel={() => setDelegatePermissionVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={delegatePermissionForm}
          onFinish={handleDelegatePermission}
          layout="vertical"
        >
          <Form.Item
            name="delegate_id"
            label="被委派人ID"
            rules={[{ required: true, message: '请输入被委派人ID' }]}
          >
            <InputNumber placeholder="用户ID" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="permission_codes"
            label="权限代码"
            rules={[{ required: true, message: '请选择要委派的权限' }]}
          >
            <Select mode="tags" placeholder="输入权限代码">
              <Option value="project.read">project.read</Option>
              <Option value="project.update">project.update</Option>
              <Option value="task.create">task.create</Option>
              <Option value="task.assign">task.assign</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="resource_type"
            label="资源类型"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select placeholder="选择资源类型">
              <Option value="project">项目</Option>
              <Option value="task">任务</Option>
              <Option value="document">文档</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="valid_hours"
            label="有效时长（小时）"
            rules={[{ required: true, message: '请输入有效时长' }]}
          >
            <InputNumber min={1} max={720} placeholder="1-720小时" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="委派理由"
            rules={[{ required: true, message: '请输入委派理由' }]}
          >
            <TextArea rows={3} placeholder="请说明委派权限的理由" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认委派
              </Button>
              <Button onClick={() => setDelegatePermissionVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnhancedPermissionManager;