import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Breadcrumb,
  Badge,
  Tooltip,
  Popconfirm,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  HomeOutlined,
  BankOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import enterpriseService from '../services/enterpriseService';
import {
  Enterprise,
  EnterpriseUser,
  EnterpriseUserRequest,
  EnterpriseDepartment,
  ACCESS_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS
} from '../types/enterprise';

const { Title, Text } = Typography;
const { Option } = Select;

interface RouteParams {
  enterpriseId: string;
}

const EnterpriseUserManagementPage: React.FC = () => {
  const { enterpriseId } = useParams<RouteParams>();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [users, setUsers] = useState<EnterpriseUser[]>([]);
  const [departments, setDepartments] = useState<EnterpriseDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<EnterpriseUser | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [form] = Form.useForm();

  const enterpriseIdNum = enterpriseId ? parseInt(enterpriseId, 10) : 0;

  // 加载企业信息
  const loadEnterprise = async () => {
    if (!enterpriseIdNum) return;
    try {
      const result = await enterpriseService.getEnterprise(enterpriseIdNum);
      setEnterprise(result);
    } catch (error) {
      console.error('加载企业信息失败:', error);
      message.error('加载企业信息失败');
    }
  };

  // 加载用户数据
  const loadUsers = async (page = 1, pageSize = 20) => {
    if (!enterpriseIdNum) return;
    setLoading(true);
    try {
      const result = await enterpriseService.getEnterpriseUsers(enterpriseIdNum, page, pageSize);
      setUsers(result?.data || []);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: result?.pagination?.total || 0,
      });
    } catch (error) {
      console.error('加载用户数据失败:', error);
      message.error('加载用户数据失败');
      setUsers([]); // 确保错误时也设置为空数组
      setPagination({
        current: 1,
        pageSize: 20,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载部门数据
  const loadDepartments = async () => {
    if (!enterpriseIdNum) return;
    try {
      console.log('🔍 开始加载企业部门，企业ID:', enterpriseIdNum);
      const result = await enterpriseService.getEnterpriseDepartments(enterpriseIdNum, 1, 100);
      console.log('✅ 部门API返回结果:', result);
      console.log('📋 部门数据:', result?.data);
      console.log('📊 部门数量:', result?.data?.length);
      setDepartments(result?.data || []);
    } catch (error) {
      console.error('❌ 加载部门数据失败:', error);
      setDepartments([]); // 确保错误时也设置为空数组
    }
  };

  useEffect(() => {
    if (!enterpriseIdNum) {
      message.error('无效的企业ID');
      navigate('/enterprises');
      return;
    }
    loadEnterprise();
    loadUsers();
    loadDepartments();
  }, [enterpriseIdNum]);

  // 处理表格分页变化
  const handleTableChange = (pagination: any) => {
    loadUsers(pagination.current, pagination.pageSize);
  };

  // 打开创建/编辑对话框
  const openModal = (user?: EnterpriseUser) => {
    setEditingUser(user || null);
    if (user) {
      form.setFieldsValue(user);
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'active',
        access_level: 2,
        is_primary_contact: false,
      });
    }
    setModalVisible(true);
  };

  // 关闭对话框
  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  // 保存用户
  const saveUser = async (values: any) => {
    try {
      if (editingUser) {
        // TODO: Update user - need update endpoint
        message.info('更新用户功能开发中...');
      } else {
        // 创建用户
        const createData: EnterpriseUserRequest = values;
        const result = await enterpriseService.createEnterpriseUser(enterpriseIdNum, createData);
        
        if (result.generated_password) {
          Modal.info({
            title: '用户创建成功',
            content: (
              <div>
                <p>用户已成功创建！</p>
                <p><strong>生成的密码：</strong> <code>{result.generated_password}</code></p>
                <p style={{ color: '#fa8c16' }}>请将密码告知用户，并建议用户首次登录后修改密码。</p>
              </div>
            ),
            width: 500,
          });
        } else {
          message.success('创建用户成功');
        }
      }
      closeModal();
      loadUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('保存用户失败:', error);
      message.error(editingUser ? '更新用户失败' : '创建用户失败');
    }
  };

  // 获取访问级别文本
  const getAccessLevelText = (level: number): string => {
    const option = ACCESS_LEVEL_OPTIONS.find(opt => opt.value === level);
    return option ? option.label as string : `级别 ${level}`;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'suspended': return 'red';
      default: return 'default';
    }
  };

  // 表格列定义
  const columns: ColumnsType<EnterpriseUser> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户信息',
      key: 'user_info',
      render: (_, record: EnterpriseUser) => (
        <div>
          <div>
            <Text strong>{record.name}</Text>
            {record.is_primary_contact && (
              <Tag color="gold" style={{ marginLeft: 8 }}>主要联系人</Tag>
            )}
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              @{record.username}
            </Text>
          </div>
          {record.email && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <MailOutlined /> {record.email}
              </Text>
            </div>
          )}
          {record.phone && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <PhoneOutlined /> {record.phone}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      render: (text: string) => text || <Text type="secondary">未设置</Text>,
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      key: 'department',
      render: (text: string) => text || <Text type="secondary">未分配</Text>,
    },
    {
      title: '访问级别',
      dataIndex: 'access_level',
      key: 'access_level',
      render: (level: number) => (
        <Tag color="blue">{getAccessLevelText(level)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text: string, record: EnterpriseUser) => (
        <Tag color={getStatusColor(text)}>
          {record.status_text}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (text: string) => text ? new Date(text).toLocaleString() : <Text type="secondary">从未登录</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record: EnterpriseUser) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => navigate(`/users/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗?"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => {
              message.info('删除用户功能开发中...');
            }}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!enterprise) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message="企业信息加载中..."
          type="info"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <BankOutlined />
          <span 
            style={{ cursor: 'pointer' }} 
            onClick={() => navigate('/enterprises')}
          >
            企业管理
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          {enterprise.name}
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <UserOutlined />
          用户管理
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题和返回按钮 */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/enterprises')}
            style={{ marginRight: '16px' }}
          >
            返回
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <UserOutlined /> {enterprise.name} - 用户管理
            </Title>
            <Text type="secondary">管理企业内部用户账户</Text>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={enterprise.user_count || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={users.filter(u => u.status === 'active').length}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="主要联系人"
              value={users.filter(u => u.is_primary_contact).length}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="部门数"
              value={enterprise.department_count || 0}
              prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              添加用户
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadUsers(pagination.current, pagination.pageSize);
                loadDepartments();
              }}
            >
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑用户对话框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={closeModal}
        width={600}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveUser}
          initialValues={{
            status: 'active',
            access_level: 2,
            is_primary_contact: false,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 50, message: '用户名长度为3-50个字符' }
                ]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入姓名' }
                ]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入正确的邮箱格式' }
                ]}
              >
                <Input placeholder="请输入邮箱（必填）" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="电话"
                name="phone"
              >
                <Input placeholder="请输入电话" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="职位"
                name="position"
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="部门"
                name="department_id"
              >
                <Select 
                  placeholder={
                    !departments || departments.length === 0 
                      ? "暂无部门，请先创建部门" 
                      : "请选择部门"
                  }
                  allowClear
                  disabled={!departments || departments.length === 0}
                  notFoundContent={
                    !departments || departments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '12px' }}>
                        <div>暂无部门数据</div>
                        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                          请先在组织管理中创建部门
                        </div>
                      </div>
                    ) : "暂无数据"
                  }
                >
                  {departments && departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
                {(!departments || departments.length === 0) && (
                  <div style={{ 
                    color: '#fa8c16', 
                    fontSize: '12px', 
                    marginTop: '4px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}>
                    <span>💡 提示：此企业暂无部门，</span>
                    <a 
                      href={`/enterprises/${enterpriseId}/organization`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#1890ff' }}
                    >
                      点击此处创建部门
                    </a>
                  </div>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="访问级别"
                name="access_level"
                rules={[{ required: true, message: '请选择访问级别' }]}
              >
                <Select placeholder="请选择访问级别">
                  {ACCESS_LEVEL_OPTIONS && ACCESS_LEVEL_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {USER_STATUS_OPTIONS && USER_STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_primary_contact"
            valuePropName="checked"
          >
            <input type="checkbox" style={{ marginRight: 8 }} />
            设为主要联系人
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={closeModal}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseUserManagementPage;