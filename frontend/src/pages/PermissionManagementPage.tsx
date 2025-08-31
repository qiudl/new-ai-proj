import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Divider, 
  Space, 
  Tag, 
  message, 
  Popconfirm,
  Row,
  Col,
  Typography,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SafetyOutlined, 
  TeamOutlined,
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons';
import { permissionService } from '../services/permissionService';
import companyService from '../services/companyService';

const { Title } = Typography;
const { Option } = Select;

interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  roleDescription: string;
  isSystemRole: boolean;
  isActive: boolean;
}

interface Permission {
  id: number;
  permissionCode: string;
  permissionName: string;
  permissionDescription: string;
  module: string;
  resource: string;
  action: string;
  isActive: boolean;
  isGranted?: boolean;
}

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  roleId?: number;
  roleName?: string;
  status: string;
}

const PermissionManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [userPermissionModalVisible, setUserPermissionModalVisible] = useState(false);
  
  // Forms
  const [roleForm] = Form.useForm();
  const [userPermissionForm] = Form.useForm();
  
  // Selected items
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<Permission[]>([]);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadCompanyUsers();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await permissionService.getRoles();
      setRoles((response as any).roles || []);
    } catch (error) {
      message.error('加载角色失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await permissionService.getPermissions();
      setPermissions(response.permissions || []);
    } catch (error) {
      message.error('加载权限失败');
    }
  };

  const loadCompanyUsers = async () => {
    try {
      // Get users from the first company for demo
      const companiesResponse = await companyService.getCompanies();
      if (companiesResponse.data && companiesResponse.data.length > 0) {
        const firstCompany = companiesResponse.data[0];
        const usersResponse = await companyService.getCompanyUsers(firstCompany.id);
        // For now, set mock data to avoid API issues
        setCompanyUsers([
          { id: 1, name: '张三', email: 'zhangsan@company.com', status: 'active', roleName: '项目经理' },
          { id: 2, name: '李四', email: 'lisi@company.com', status: 'active', roleName: '开发工程师' }
        ]);
      }
    } catch (error) {
      message.error('加载企业用户失败');
      // Set mock data on error
      setCompanyUsers([
        { id: 1, name: '张三', email: 'zhangsan@company.com', status: 'active', roleName: '项目经理' },
        { id: 2, name: '李四', email: 'lisi@company.com', status: 'active', roleName: '开发工程师' }
      ]);
    }
  };

  const handleCreateRole = async (values: unknown) => {
    try {
      const roleData = {
        roleCode: values.roleCode,
        roleName: values.roleName,
        roleDescription: values.roleDescription,
        permissionCodes: values.permissions || []
      };
      
      await permissionService.createRole(roleData);
      message.success('角色创建成功');
      setRoleModalVisible(false);
      roleForm.resetFields();
      loadRoles();
    } catch (error) {
      message.error('创建角色失败');
    }
  };

  const handleUpdateRole = async (values: unknown) => {
    if (!selectedRole) return;
    
    try {
      const roleData = {
        roleName: values.roleName,
        roleDescription: values.roleDescription,
        permissionCodes: values.permissions || []
      };
      
      await permissionService.updateRole(selectedRole.id, roleData);
      message.success('角色更新成功');
      setRoleModalVisible(false);
      roleForm.resetFields();
      setSelectedRole(null);
      loadRoles();
    } catch (error) {
      message.error('更新角色失败');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await permissionService.deleteRole(roleId);
      message.success('角色删除成功');
      loadRoles();
    } catch (error) {
      message.error('删除角色失败');
    }
  };

  const handleViewRolePermissions = async (role: Role) => {
    try {
      setLoading(true);
      const response = await permissionService.getRolePermissions(role.id);
      setSelectedRolePermissions(response.permissions || []);
      setSelectedRole(role);
      setPermissionModalVisible(true);
    } catch (error) {
      message.error('加载角色权限失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserPermissions = async (user: CompanyUser) => {
    try {
      setLoading(true);
      const response = await permissionService.getUserPermissions(user.id);
      setSelectedUserPermissions(response.permissions);
      setSelectedUser(user);
      setUserPermissionModalVisible(true);
    } catch (error) {
      message.error('加载用户权限失败');
    } finally {
      setLoading(false);
    }
  };

  const roleColumns = [
    {
      title: '角色代码',
      dataIndex: 'roleCode',
      key: 'roleCode',
    },
    {
      title: '角色名称', 
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: '描述',
      dataIndex: 'roleDescription',
      key: 'roleDescription',
    },
    {
      title: '类型',
      dataIndex: 'isSystemRole',
      key: 'isSystemRole',
      render: (isSystemRole: boolean) => (
        <Tag color={isSystemRole ? 'red' : 'blue'}>
          {isSystemRole ? '系统角色' : '自定义角色'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? '激活' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: unknown, record: Role) => (
        <Space>
          <Button
            type="link"
            icon={<SafetyOutlined />}
            onClick={() => handleViewRolePermissions(record)}
          >
            权限
          </Button>
          {!record.isSystemRole && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedRole(record);
                  roleForm.setFieldsValue(record);
                  setRoleModalVisible(true);
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认要删除这个角色吗？"
                onConfirm={() => handleDeleteRole(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const permissionColumns = [
    {
      title: '权限代码',
      dataIndex: 'permissionCode',
      key: 'permissionCode',
    },
    {
      title: '名称',
      dataIndex: 'permissionName',
      key: 'permissionName',
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      render: (module: string) => <Tag color="geekblue">{module}</Tag>,
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => <Tag color="green">{action}</Tag>,
    },
    {
      title: '是否授权',
      dataIndex: 'isGranted',
      key: 'isGranted',
      render: (isGranted: boolean) => (
        isGranted !== undefined ? (
          <Tag color={isGranted ? 'green' : 'red'}>
            {isGranted ? '是' : '否'}
          </Tag>
        ) : <span style={{ color: '#ccc' }}>-</span>
      ),
    },
  ];

  const userColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (roleName: string) => roleName ? <Tag color="blue">{roleName}</Tag> : <Tag>无角色</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '激活' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: unknown, record: CompanyUser) => (
        <Space>
          <Button
            type="link"
            icon={<UserOutlined />}
            onClick={() => handleViewUserPermissions(record)}
          >
            权限
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined /> 权限管理
      </Title>
      
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'roles',
              label: <span><TeamOutlined />角色</span>,
              children: (
                <>
                  <Row justify="space-between" style={{ marginBottom: 16 }}>
                    <Col>
                      <Title level={4}>角色管理</Title>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setSelectedRole(null);
                          roleForm.resetFields();
                          setRoleModalVisible(true);
                        }}
                      >
                        创建角色
                      </Button>
                    </Col>
                  </Row>
                  
                  <Table
                    columns={roleColumns}
                    dataSource={roles}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              ),
            },
            {
              key: 'permissions',
              label: <span><SafetyOutlined />权限</span>,
              children: (
                <>
                  <Row justify="space-between" style={{ marginBottom: 16 }}>
                    <Col>
                      <Title level={4}>系统权限</Title>
                    </Col>
                  </Row>
                  
                  <Alert
                    message="系统权限"
                    description="这些是内置权限，不可修改。可以分配给角色。"
                    type="info"
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Table
                    columns={permissionColumns.filter(col => col.key !== 'isGranted')}
                    dataSource={permissions}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              ),
            },
            {
              key: 'users',
              label: <span><UserOutlined />用户</span>,
              children: (
                <>
                  <Row justify="space-between" style={{ marginBottom: 16 }}>
                    <Col>
                      <Title level={4}>用户权限</Title>
                    </Col>
                  </Row>
                  
                  <Table
                    columns={userColumns}
                    dataSource={companyUsers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Role Modal */}
      <Modal
        title={selectedRole ? '编辑角色' : '创建角色'}
        open={roleModalVisible}
        onCancel={() => {
          setRoleModalVisible(false);
          setSelectedRole(null);
          roleForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={selectedRole ? handleUpdateRole : handleCreateRole}
        >
          {!selectedRole && (
            <Form.Item
              label="角色代码"
              name="roleCode"
              rules={[{ required: true, message: '请输入角色代码' }]}
            >
              <Input placeholder="例：PROJECT_MANAGER" />
            </Form.Item>
          )}
          
          <Form.Item
            label="角色名称"
            name="roleName"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="例：项目经理" />
          </Form.Item>
          
          <Form.Item
            label="描述"
            name="roleDescription"
          >
            <Input.TextArea rows={3} placeholder="角色描述" />
          </Form.Item>
          
          <Form.Item label="权限" name="permissions">
            <Select
              mode="multiple"
              placeholder="选择权限"
              style={{ width: '100%' }}
            >
              {permissions.map(permission => (
                <Option key={permission.permissionCode} value={permission.permissionCode}>
                  {permission.permissionName} ({permission.module}.{permission.action})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedRole ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setRoleModalVisible(false);
                setSelectedRole(null);
                roleForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Role Permissions Modal */}
      <Modal
        title={`${selectedRole?.roleName} 的权限`}
        open={permissionModalVisible}
        onCancel={() => {
          setPermissionModalVisible(false);
          setSelectedRole(null);
          setSelectedRolePermissions([]);
        }}
        footer={null}
        width={800}
      >
        <Table
          columns={permissionColumns}
          dataSource={selectedRolePermissions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      {/* User Permissions Modal */}
      <Modal
        title={`${selectedUser?.name} 的权限`}
        open={userPermissionModalVisible}
        onCancel={() => {
          setUserPermissionModalVisible(false);
          setSelectedUser(null);
          setSelectedUserPermissions(null);
        }}
        footer={null}
        width={900}
      >
        {selectedUserPermissions && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>用户角色：{selectedUserPermissions.role?.roleName || '无角色'}</Title>
              <Title level={5}>有效权限：</Title>
            </div>
            
            <Table
              columns={permissionColumns}
              dataSource={selectedUserPermissions.effectivePermissions || []}
              rowKey="permissionCode"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PermissionManagementPage;