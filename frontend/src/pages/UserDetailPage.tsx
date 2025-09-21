import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Spin,
  Alert,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Tag,
  Avatar,
  Descriptions,
  Tabs,
  Table,
  Statistic,
  Badge,
  Divider,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  StopOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  HistoryOutlined,
  TeamOutlined,
  BankOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  User,
  UserUpdateRequest,
  PasswordResetRequest,
  USER_TYPE_CONFIG,
  USER_ROLE_CONFIG,
  USER_STATUS_CONFIG 
} from '../types/user';
import { userService } from '../services/userService';
import userManagementService from '../services/userManagementService';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface UserActivityLog {
  id: string;
  action: string;
  description: string;
  ip_address?: string;
  created_at: string;
}

interface UserProjects {
  id: number;
  name: string;
  role: string;
  status: string;
  last_access?: string;
}

const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [userProjects, setUserProjects] = useState<UserProjects[]>([]);
  
  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  
  // Forms
  const [editForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();

  useEffect(() => {
    if (userId) {
      loadUserDetail();
      loadUserActivity();
      loadUserProjects();
    }
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      setLoading(true);
      const response = await userManagementService.getUserById(Number(userId));
      setUser(response.data);
      
      // Set form values for editing
      editForm.setFieldsValue({
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        status: response.data.status,
        contact_person_name: response.data.contact_person_name,
        contact_phone: response.data.contact_phone,
        department_title: response.data.department_title,
        notes: response.data.notes
      });
    } catch (error) {
      message.error('加载用户详情失败');
      console.error('Error loading user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async () => {
    try {
      if (!userId) return;
      
      const response = await userManagementService.getUserActivityLog(Number(userId), {
        page: 1,
        page_size: 10
      });
      setActivityLogs(response.data);
    } catch (error) {
      console.error('Error loading user activity:', error);
      message.error('加载用户活动日志失败');
    }
  };

  const loadUserProjects = async () => {
    try {
      if (!userId) return;
      
      const response = await userManagementService.getUserProjects(Number(userId));
      setUserProjects(response.data);
    } catch (error) {
      console.error('Error loading user projects:', error);
      message.error('加载用户项目失败');
    }
  };

  const handleEditUser = async (values: UserUpdateRequest) => {
    try {
      setEditLoading(true);
      console.log('🐛 [UserDetailPage] Form values before submit:', values);
      console.log('🐛 [UserDetailPage] User type:', user?.user_type);
      await userManagementService.updateUser(Number(userId), values);
      message.success('用户信息更新成功');
      setEditModalVisible(false);
      loadUserDetail();
    } catch (error) {
      message.error('更新用户信息失败');
      console.error('Error updating user:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async (values: { new_password: string }) => {
    try {
      setEditLoading(true);
      const resetRequest: PasswordResetRequest = {
        new_password: values.new_password
      };
      await userManagementService.resetUserPassword(Number(userId), resetRequest);
      message.success('密码重置成功');
      setResetPasswordModalVisible(false);
      resetPasswordForm.resetFields();
    } catch (error) {
      message.error('密码重置失败');
      console.error('Error resetting password:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await userManagementService.updateUser(Number(userId), { status: newStatus });
      message.success(`用户已${newStatus === 'active' ? '激活' : '停用'}`);
      loadUserDetail();
    } catch (error) {
      message.error('状态更新失败');
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await userManagementService.deleteUser(Number(userId));
      message.success('用户删除成功');
      navigate('/user-management');
    } catch (error) {
      message.error('删除用户失败');
      console.error('Error deleting user:', error);
    }
  };

  const activityColumns = [
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const actionMap: Record<string, { text: string; color: string }> = {
          login: { text: '登录', color: 'green' },
          logout: { text: '登出', color: 'blue' },
          profile_update: { text: '资料更新', color: 'orange' },
          password_change: { text: '密码修改', color: 'purple' }
        };
        const config = actionMap[action] || { text: action, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address'
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: zhCN 
      })
    }
  ];

  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag>{role}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === '进行中' ? 'processing' : 'success';
        return <Badge status={color} text={status} />;
      }
    },
    {
      title: '最后访问',
      dataIndex: 'last_access',
      key: 'last_access',
      render: (date: string) => date ? formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: zhCN 
      }) : '-'
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

  if (!user) {
    return (
      <Alert
        message="用户不存在"
        description="请检查用户ID是否正确"
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => navigate('/user-management')}>
            返回用户管理
          </Button>
        }
      />
    );
  }

  const userTypeConfig = USER_TYPE_CONFIG[user.user_type];
  const userRoleConfig = USER_ROLE_CONFIG[user.role as keyof typeof USER_ROLE_CONFIG];
  const userStatusConfig = USER_STATUS_CONFIG[user.status];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/user-management')}
          >
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>用户详情</Title>
        </Space>
        
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => setEditModalVisible(true)}
          >
            编辑
          </Button>
          <Button 
            icon={<KeyOutlined />} 
            onClick={() => setResetPasswordModalVisible(true)}
          >
            重置密码
          </Button>
          <Popconfirm
            title={`确定要${user.status === 'active' ? '停用' : '激活'}这个用户吗？`}
            onConfirm={handleToggleStatus}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              icon={user.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              danger={user.status === 'active'}
            >
              {user.status === 'active' ? '停用' : '激活'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除这个用户吗？此操作不可恢复。"
            onConfirm={handleDeleteUser}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Basic Info */}
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div style={{ marginTop: '16px' }}>
                <Title level={3} style={{ margin: '8px 0 4px 0' }}>
                  {user.username}
                </Title>
                <Text type="secondary">{user.email}</Text>
                
                <div style={{ marginTop: '12px' }}>
                  <Space direction="vertical" align="center">
                    <Tag color={userTypeConfig.color}>
                      {userTypeConfig.label}
                    </Tag>
                    <Tag color={userRoleConfig?.color}>
                      {userRoleConfig?.label}
                    </Tag>
                    <Tag color={userStatusConfig.color}>
                      {userStatusConfig.label}
                    </Tag>
                  </Space>
                </div>
              </div>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }}>
              {user.user_type === 'company' && (
                <>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic 
                        title="企业ID" 
                        value={user.enterprise_id || user.company_id || '-'} 
                        prefix={<BankOutlined />}
                      />
                    </Col>
                    <Col span={16}>
                      <Statistic 
                        title="部门" 
                        value={user.department_title || '-'} 
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                  </Row>
                  
                  {user.is_primary_contact && (
                    <Alert
                      message="主要联系人"
                      type="info"
                      showIcon
                      size="small"
                    />
                  )}
                </>
              )}

              <Text type="secondary" style={{ fontSize: '12px' }}>
                <div>注册时间：{new Date(user.created_at).toLocaleString()}</div>
                <div>最后更新：{new Date(user.updated_at).toLocaleString()}</div>
                {user.last_login_at && (
                  <div>最后登录：{new Date(user.last_login_at).toLocaleString()}</div>
                )}
              </Text>
            </Space>
          </Card>
        </Col>

        {/* Detailed Info & Tabs */}
        <Col xs={24} lg={16}>
          <Card>
            <Tabs defaultActiveKey="details">
              <TabPane tab="详细信息" key="details">
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
                  <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="用户类型">
                    <Tag color={userTypeConfig.color}>{userTypeConfig.label}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="角色">
                    <Tag color={userRoleConfig?.color}>{userRoleConfig?.label}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color={userStatusConfig.color}>{userStatusConfig.label}</Tag>
                  </Descriptions.Item>
                  {user.user_type === 'company' && (
                    <>
                      <Descriptions.Item label="联系人姓名">
                        {user.contact_person_name || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="联系电话">
                        {user.contact_phone || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="部门职位">
                        {user.department_title || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="主要联系人">
                        {user.is_primary_contact ? '是' : '否'}
                      </Descriptions.Item>
                      {user.account_expires_at && (
                        <Descriptions.Item label="账户到期时间">
                          {new Date(user.account_expires_at).toLocaleString()}
                        </Descriptions.Item>
                      )}
                      {user.notes && (
                        <Descriptions.Item label="备注" span={2}>
                          {user.notes}
                        </Descriptions.Item>
                      )}
                    </>
                  )}
                </Descriptions>
              </TabPane>

              <TabPane tab="项目参与" key="projects">
                <Table
                  columns={projectColumns}
                  dataSource={userProjects}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </TabPane>

              <TabPane tab="活动日志" key="activity">
                <Table
                  columns={activityColumns}
                  dataSource={activityLogs}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* Edit User Modal */}
      <Modal
        title="编辑用户"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose={true}
        maskClosable={false}
        wrapClassName="user-edit-modal"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '邮箱格式不正确' }
                ]}
              >
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select getPopupContainer={(triggerNode) => triggerNode.parentElement}>
                  {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      {config.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select getPopupContainer={(triggerNode) => triggerNode.parentElement}>
                  {Object.entries(USER_STATUS_CONFIG).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      {config.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="联系人姓名" name="contact_person_name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="联系电话" name="contact_phone">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="部门职位" name="department_title">
            <Input />
          </Form.Item>
          
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={editLoading}>
                保存
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title="重置密码"
        open={resetPasswordModalVisible}
        onCancel={() => setResetPasswordModalVisible(false)}
        footer={null}
        destroyOnClose={true}
        maskClosable={false}
        wrapClassName="user-reset-password-modal"
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirm_password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                }
              })
            ]}
          >
            <Input.Password prefix={<KeyOutlined />} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={editLoading}>
                重置密码
              </Button>
              <Button onClick={() => setResetPasswordModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserDetailPage;