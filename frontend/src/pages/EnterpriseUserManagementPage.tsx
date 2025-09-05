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
  Avatar,
  Tabs,
  Badge,
  Dropdown,
  Alert,
  Switch,
  Tooltip,
  Progress,
  Timeline,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  SendOutlined,
  KeyOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  ReloadOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons';
import enterpriseUserService, {
  EnterpriseUser,
  UserInvitation,
  UserActivity,
  CreateUserRequest,
  UpdateUserRequest,
  InviteUserRequest
} from '../services/enterpriseUserService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 从 enterpriseUserService 导入类型定义，无需重复定义

const EnterpriseUserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<EnterpriseUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<EnterpriseUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('users');
  const [departments, setDepartments] = useState<{id: number; name: string}[]>([]);
  const [roles, setRoles] = useState<{id: number; name: string}[]>([]);
  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();

  // 加载用户数据
  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await enterpriseUserService.getUsers(1, 20);
      setUsers(result.data);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      message.error('加载用户数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载邀请数据
  const loadInvitations = async () => {
    try {
      const result = await enterpriseUserService.getInvitations();
      setInvitations(result);
    } catch (error) {
      console.error('加载邀请数据失败:', error);
      message.error('加载邀请数据失败');
    }
  };

  // 加载活动日志
  const loadActivities = async () => {
    try {
      const result = await enterpriseUserService.getUserActivities();
      setActivities(result);
    } catch (error) {
      console.error('加载活动日志失败:', error);
      message.error('加载活动日志失败');
    }
  };

  // 加载部门列表
  const loadDepartments = async () => {
    try {
      const result = await enterpriseUserService.getAvailableDepartments();
      setDepartments(result);
    } catch (error) {
      console.error('加载部门列表失败:', error);
    }
  };

  // 加载角色列表
  const loadRoles = async () => {
    try {
      const result = await enterpriseUserService.getAvailableRoles();
      setRoles(result);
    } catch (error) {
      console.error('加载角色列表失败:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadInvitations();
    loadActivities();
    loadDepartments();
    loadRoles();
  }, []);

  // 显示添加/编辑用户弹窗
  const showUserModal = (user?: EnterpriseUser) => {
    setEditingUser(user || null);
    setModalVisible(true);
    
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: user.phone,
        position: user.position,
        department_id: user.department_id,
        role_id: user.role_id,
        status: user.status,
        is_primary_contact: user.is_primary_contact,
        can_make_decisions: user.can_make_decisions,
        access_level: user.access_level
      });
    } else {
      form.resetFields();
    }
  };

  // 显示邀请用户弹窗
  const showInviteModal = () => {
    setInviteModalVisible(true);
    inviteForm.resetFields();
  };

  // 处理用户保存
  const handleUserSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        await enterpriseUserService.updateUser(editingUser.id, values as UpdateUserRequest);
        message.success('用户信息更新成功');
      } else {
        await enterpriseUserService.createUser(values as CreateUserRequest);
        message.success('用户创建成功');
      }
      
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      console.error('保存用户失败:', error);
      message.error('保存用户失败');
    }
  };

  // 处理用户邀请
  const handleUserInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      await enterpriseUserService.inviteUser(values as InviteUserRequest);
      
      message.success('邀请邮件已发送');
      setInviteModalVisible(false);
      loadInvitations();
    } catch (error) {
      console.error('发送邀请失败:', error);
      message.error('发送邀请失败');
    }
  };

  // 重新发送邀请
  const handleResendInvitation = async (invitation: UserInvitation) => {
    try {
      await enterpriseUserService.resendInvitation(invitation.id);
      message.success('邀请邮件已重新发送');
      loadInvitations();
    } catch (error) {
      console.error('重新发送邀请失败:', error);
      message.error('重新发送邀请失败');
    }
  };

  // 取消邀请
  const handleCancelInvitation = (invitation: UserInvitation) => {
    Modal.confirm({
      title: '确认取消',
      content: `确定要取消对 "${invitation.email}" 的邀请吗？`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await enterpriseUserService.cancelInvitation(invitation.id);
          message.success('邀请已取消');
          loadInvitations();
        } catch (error) {
          console.error('取消邀请失败:', error);
          message.error('取消邀请失败');
        }
      }
    });
  };

  // 用户状态切换
  const handleStatusToggle = async (user: EnterpriseUser, newStatus: string) => {
    try {
      await enterpriseUserService.updateUser(user.id, { status: newStatus as any });
      message.success(`用户状态已更新为${newStatus === 'active' ? '激活' : '停用'}`);
      loadUsers();
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败');
    }
  };

  // 重置用户密码
  const handleResetPassword = (user: EnterpriseUser) => {
    Modal.confirm({
      title: '重置密码',
      content: `确定要重置用户 "${user.name}" 的密码吗？新密码将通过邮件发送给用户。`,
      okText: '确认重置',
      cancelText: '取消',
      onOk: async () => {
        try {
          await enterpriseUserService.resetUserPassword(user.id);
          message.success('密码重置邮件已发送');
        } catch (error) {
          console.error('重置密码失败:', error);
          message.error('重置密码失败');
        }
      }
    });
  };

  // 批量操作
  const handleBatchOperation = async (operation: string) => {
    if (selectedUsers.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }

    Modal.confirm({
      title: `批量${operation}`,
      content: `确定要对选中的 ${selectedUsers.length} 个用户执行 ${operation} 操作吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const actionMap: Record<string, string> = {
            '激活': 'activate',
            '停用': 'deactivate',
            '锁定': 'lock',
            '解锁': 'unlock',
            '删除': 'delete'
          };
          const action = actionMap[operation] as any;
          await enterpriseUserService.batchUserOperation({ user_ids: selectedUsers, action });
          message.success(`批量${operation}成功`);
          setSelectedUsers([]);
          loadUsers();
        } catch (error) {
          console.error(`批量${operation}失败:`, error);
          message.error(`批量${operation}失败`);
        }
      }
    });
  };

  // 用户状态渲染
  const renderUserStatus = (status: string) => {
    const statusMap = {
      active: { color: 'green', text: '激活', icon: <CheckOutlined /> },
      inactive: { color: 'red', text: '停用', icon: <CloseOutlined /> },
      pending: { color: 'orange', text: '待激活', icon: <ExclamationCircleOutlined /> },
      locked: { color: 'volcano', text: '锁定', icon: <CloseOutlined /> }
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status, icon: null };
    return (
      <Badge status={config.color as any} text={
        <Space>
          {config.icon}
          {config.text}
        </Space>
      } />
    );
  };

  // 用户列表列定义
  const userColumns = [
    {
      title: '用户信息',
      key: 'user_info',
      render: (record: EnterpriseUser) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.name}
              {record.is_primary_contact && <Tag color="blue" style={{ marginLeft: 8 }}>主联系人</Tag>}
              {record.can_make_decisions && <Tag color="green" style={{ marginLeft: 4 }}>决策人</Tag>}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.email}
            </div>
            {record.phone && (
              <div style={{ color: '#666', fontSize: '12px' }}>
                <PhoneOutlined style={{ marginRight: 4 }} />
                {record.phone}
              </div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: '职位信息',
      key: 'position_info',
      render: (record: EnterpriseUser) => (
        <div>
          <div>{record.position || '未设置'}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {record.department_name || '未分配部门'}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            访问级别：L{record.access_level}
          </div>
        </div>
      )
    },
    {
      title: '角色',
      dataIndex: 'role_name',
      key: 'role_name',
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '未分配'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderUserStatus
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '从未登录'
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: EnterpriseUser) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                label: '编辑信息',
                icon: <EditOutlined />,
                onClick: () => showUserModal(record)
              },
              {
                key: 'reset',
                label: '重置密码',
                icon: <KeyOutlined />,
                onClick: () => handleResetPassword(record)
              },
              {
                key: 'toggle',
                label: record.status === 'active' ? '停用用户' : '激活用户',
                icon: record.status === 'active' ? <CloseOutlined /> : <CheckOutlined />,
                onClick: () => handleStatusToggle(record, record.status === 'active' ? 'inactive' : 'active')
              },
              {
                type: 'divider'
              },
              {
                key: 'delete',
                label: '删除用户',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除用户 "${record.name}" 吗？此操作不可恢复。`,
                    okText: '确认',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: async () => {
                      try {
                        await enterpriseUserService.deleteUser(record.id);
                        message.success('用户删除成功');
                        loadUsers();
                      } catch (error) {
                        console.error('删除用户失败:', error);
                        message.error('删除用户失败');
                      }
                    }
                  });
                }
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" size="small">
            操作 <DownOutlined />
          </Button>
        </Dropdown>
      )
    }
  ];

  // 邀请列表列定义
  const invitationColumns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Space>
          <MailOutlined />
          {email}
        </Space>
      )
    },
    {
      title: '邀请人',
      dataIndex: 'invited_by',
      key: 'invited_by'
    },
    {
      title: '角色',
      dataIndex: 'role_name',
      key: 'role_name',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      key: 'department_name',
      render: (text: string) => text || '未指定'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          pending: { color: 'processing', text: '待接受' },
          accepted: { color: 'success', text: '已接受' },
          expired: { color: 'error', text: '已过期' },
          cancelled: { color: 'default', text: '已取消' }
        };
        const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
        return <Badge status={config.color as any} text={config.text} />;
      }
    },
    {
      title: '发送时间',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: UserInvitation) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleResendInvitation(record)}
            >
              重发
            </Button>
          )}
          {['pending', 'expired'].includes(record.status) && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleCancelInvitation(record)}
            >
              取消
            </Button>
          )}
        </Space>
      )
    }
  ];

  const tabItems = [
    {
      key: 'users',
      label: '用户管理',
      children: (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Input.Search
                placeholder="搜索用户姓名或邮箱..."
                style={{ width: 300 }}
                onSearch={value => console.log('搜索:', value)}
              />
              <Select
                placeholder="筛选部门"
                style={{ width: 200 }}
                allowClear
              >
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                ))}
              </Select>
              <Select
                placeholder="筛选状态"
                style={{ width: 120 }}
                allowClear
              >
                <Option value="active">激活</Option>
                <Option value="inactive">停用</Option>
                <Option value="pending">待激活</Option>
                <Option value="locked">锁定</Option>
              </Select>
            </Space>
            <Space>
              {selectedUsers.length > 0 && (
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'activate',
                        label: '批量激活',
                        onClick: () => handleBatchOperation('激活')
                      },
                      {
                        key: 'deactivate',
                        label: '批量停用',
                        onClick: () => handleBatchOperation('停用')
                      },
                      {
                        key: 'delete',
                        label: '批量删除',
                        danger: true,
                        onClick: () => handleBatchOperation('删除')
                      }
                    ]
                  }}
                >
                  <Button>
                    批量操作 ({selectedUsers.length}) <DownOutlined />
                  </Button>
                </Dropdown>
              )}
              <Button icon={<ImportOutlined />}>导入用户</Button>
              <Button icon={<ExportOutlined />}>导出用户</Button>
              <Button type="primary" icon={<SendOutlined />} onClick={showInviteModal}>
                邀请用户
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showUserModal()}>
                添加用户
              </Button>
            </Space>
          </div>
          
          <Table
            columns={userColumns}
            dataSource={users || []}
            rowKey="id"
            loading={loading}
            rowSelection={{
              selectedRowKeys: selectedUsers,
              onChange: (selectedRowKeys) => setSelectedUsers(selectedRowKeys as number[])
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </Card>
      )
    },
    {
      key: 'invitations',
      label: '邀请管理',
      children: (
        <Card
          title="用户邀请"
          extra={
            <Button type="primary" icon={<SendOutlined />} onClick={showInviteModal}>
              发送邀请
            </Button>
          }
        >
          <Table
            columns={invitationColumns}
            dataSource={invitations || []}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </Card>
      )
    },
    {
      key: 'activities',
      label: '活动日志',
      children: (
        <Card title="用户活动日志">
          <Timeline
            items={activities.map(activity => ({
              children: (
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {activity.user_name} - {activity.action}
                  </div>
                  <div style={{ color: '#666', margin: '4px 0' }}>
                    {activity.description}
                  </div>
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    {new Date(activity.created_at).toLocaleString()}
                    {activity.ip_address && ` • IP: ${activity.ip_address}`}
                  </div>
                </div>
              )
            }))}
          />
        </Card>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <UserOutlined /> 企业用户管理
      </Title>
      
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={users.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={users.filter(u => u.status === 'active').length}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待激活用户"
              value={users.filter(u => u.status === 'pending').length}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理邀请"
              value={invitations.filter(i => i.status === 'pending').length}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Alert
        message="企业用户管理说明"
        description="管理企业内部用户账号，包括用户创建、邀请、权限分配等。主联系人和决策人在企业合作中具有特殊权限。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* 添加/编辑用户弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleUserSave}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
            access_level: 1,
            is_primary_contact: false,
            can_make_decisions: false
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入用户姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="手机号"
                name="phone"
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="职位"
                name="position"
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="所属部门"
                name="department_id"
              >
                <Select placeholder="请选择所属部门" allowClear>
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="用户角色"
                name="role_id"
              >
                <Select placeholder="请选择用户角色">
                  {roles.map(role => (
                    <Option key={role.id} value={role.id}>{role.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="访问级别"
                name="access_level"
                tooltip="数字越高权限越大，1-5级"
              >
                <Select>
                  <Option value={1}>L1 - 基础权限</Option>
                  <Option value={2}>L2 - 标准权限</Option>
                  <Option value={3}>L3 - 扩展权限</Option>
                  <Option value={4}>L4 - 管理权限</Option>
                  <Option value={5}>L5 - 完全权限</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="用户状态"
                name="status"
              >
                <Select>
                  <Option value="active">激活</Option>
                  <Option value="inactive">停用</Option>
                  <Option value="pending">待激活</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <div style={{ paddingTop: 30 }}>
                <Form.Item
                  name="is_primary_contact"
                  valuePropName="checked"
                  style={{ marginBottom: 8 }}
                >
                  <Checkbox>设为主联系人</Checkbox>
                </Form.Item>
                <Form.Item
                  name="can_make_decisions"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Checkbox>具有决策权</Checkbox>
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 邀请用户弹窗 */}
      <Modal
        title="邀请用户"
        open={inviteModalVisible}
        onOk={handleUserInvite}
        onCancel={() => setInviteModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Alert
          message="邀请说明"
          description="系统将向被邀请人发送邮件，包含激活链接和临时密码。邀请有效期为7天。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={inviteForm}
          layout="vertical"
        >
          <Form.Item
            label="邮箱地址"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入被邀请人的邮箱地址" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="分配角色"
                name="role_id"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  {roles.filter(role => role.id !== 1).map(role => (
                    <Option key={role.id} value={role.id}>{role.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="分配部门"
                name="department_id"
              >
                <Select placeholder="请选择部门" allowClear>
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="邀请消息"
            name="message"
          >
            <TextArea
              rows={3}
              placeholder="可选：添加个性化的邀请消息..."
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseUserManagementPage;