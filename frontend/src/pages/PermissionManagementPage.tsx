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

const { TabPane } = Tabs;
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
      setRoles(response.roles || []);
    } catch (error) {
      message.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await permissionService.getPermissions();
      setPermissions(response.permissions || []);
    } catch (error) {
      message.error('Failed to load permissions');
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
      message.error('Failed to load company users');
      // Set mock data on error
      setCompanyUsers([
        { id: 1, name: '张三', email: 'zhangsan@company.com', status: 'active', roleName: '项目经理' },
        { id: 2, name: '李四', email: 'lisi@company.com', status: 'active', roleName: '开发工程师' }
      ]);
    }
  };

  const handleCreateRole = async (values: any) => {
    try {
      const roleData = {
        roleCode: values.roleCode,
        roleName: values.roleName,
        roleDescription: values.roleDescription,
        permissionCodes: values.permissions || []
      };
      
      await permissionService.createRole(roleData);
      message.success('Role created successfully');
      setRoleModalVisible(false);
      roleForm.resetFields();
      loadRoles();
    } catch (error) {
      message.error('Failed to create role');
    }
  };

  const handleUpdateRole = async (values: any) => {
    if (!selectedRole) return;
    
    try {
      const roleData = {
        roleName: values.roleName,
        roleDescription: values.roleDescription,
        permissionCodes: values.permissions || []
      };
      
      await permissionService.updateRole(selectedRole.id, roleData);
      message.success('Role updated successfully');
      setRoleModalVisible(false);
      roleForm.resetFields();
      setSelectedRole(null);
      loadRoles();
    } catch (error) {
      message.error('Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      await permissionService.deleteRole(roleId);
      message.success('Role deleted successfully');
      loadRoles();
    } catch (error) {
      message.error('Failed to delete role');
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
      message.error('Failed to load role permissions');
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
      message.error('Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  const roleColumns = [
    {
      title: 'Role Code',
      dataIndex: 'roleCode',
      key: 'roleCode',
    },
    {
      title: 'Role Name', 
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: 'Description',
      dataIndex: 'roleDescription',
      key: 'roleDescription',
    },
    {
      title: 'Type',
      dataIndex: 'isSystemRole',
      key: 'isSystemRole',
      render: (isSystemRole: boolean) => (
        <Tag color={isSystemRole ? 'red' : 'blue'}>
          {isSystemRole ? 'System' : 'Custom'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: Role) => (
        <Space>
          <Button
            type="link"
            icon={<SafetyOutlined />}
            onClick={() => handleViewRolePermissions(record)}
          >
            Permissions
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
                Edit
              </Button>
              <Popconfirm
                title="Are you sure to delete this role?"
                onConfirm={() => handleDeleteRole(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  Delete
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
      title: 'Permission Code',
      dataIndex: 'permissionCode',
      key: 'permissionCode',
    },
    {
      title: 'Name',
      dataIndex: 'permissionName',
      key: 'permissionName',
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (module: string) => <Tag color="geekblue">{module}</Tag>,
    },
    {
      title: 'Resource',
      dataIndex: 'resource',
      key: 'resource',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => <Tag color="green">{action}</Tag>,
    },
    {
      title: 'Granted',
      dataIndex: 'isGranted',
      key: 'isGranted',
      render: (isGranted: boolean) => (
        isGranted !== undefined ? (
          <Tag color={isGranted ? 'green' : 'red'}>
            {isGranted ? 'Yes' : 'No'}
          </Tag>
        ) : null
      ),
    },
  ];

  const userColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (roleName: string) => roleName ? <Tag color="blue">{roleName}</Tag> : <Tag>No Role</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: CompanyUser) => (
        <Space>
          <Button
            type="link"
            icon={<UserOutlined />}
            onClick={() => handleViewUserPermissions(record)}
          >
            Permissions
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined /> Permission Management
      </Title>
      
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><TeamOutlined />Roles</span>} key="roles">
            <Row justify="space-between" style={{ marginBottom: 16 }}>
              <Col>
                <Title level={4}>Role Management</Title>
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
                  Create Role
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
          </TabPane>

          <TabPane tab={<span><SafetyOutlined />Permissions</span>} key="permissions">
            <Row justify="space-between" style={{ marginBottom: 16 }}>
              <Col>
                <Title level={4}>System Permissions</Title>
              </Col>
            </Row>
            
            <Alert
              message="System Permissions"
              description="These are built-in permissions that cannot be modified. They can be assigned to roles."
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
          </TabPane>

          <TabPane tab={<span><UserOutlined />Users</span>} key="users">
            <Row justify="space-between" style={{ marginBottom: 16 }}>
              <Col>
                <Title level={4}>User Permissions</Title>
              </Col>
            </Row>
            
            <Table
              columns={userColumns}
              dataSource={companyUsers}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Role Modal */}
      <Modal
        title={selectedRole ? 'Edit Role' : 'Create Role'}
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
              label="Role Code"
              name="roleCode"
              rules={[{ required: true, message: 'Please enter role code' }]}
            >
              <Input placeholder="e.g., PROJECT_MANAGER" />
            </Form.Item>
          )}
          
          <Form.Item
            label="Role Name"
            name="roleName"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input placeholder="e.g., Project Manager" />
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="roleDescription"
          >
            <Input.TextArea rows={3} placeholder="Role description" />
          </Form.Item>
          
          <Form.Item label="Permissions" name="permissions">
            <Select
              mode="multiple"
              placeholder="Select permissions"
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
                {selectedRole ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setRoleModalVisible(false);
                setSelectedRole(null);
                roleForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Role Permissions Modal */}
      <Modal
        title={`Permissions for ${selectedRole?.roleName}`}
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
        title={`Permissions for ${selectedUser?.name}`}
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
              <Title level={5}>User Role: {selectedUserPermissions.role?.roleName || 'No Role'}</Title>
              <Title level={5}>Effective Permissions:</Title>
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