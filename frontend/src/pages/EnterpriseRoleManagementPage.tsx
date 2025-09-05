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
  Tree,
  Checkbox,
  Tabs,
  List,
  Avatar,
  Switch,
  Alert,
  Transfer
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import enterpriseRoleService, { EnterpriseRole, Permission, UserRole, CreateRoleRequest, UpdateRoleRequest } from '../services/enterpriseRoleService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const EnterpriseRoleManagementPage: React.FC = () => {
  const [roles, setRoles] = useState<EnterpriseRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{id: number; name: string; email: string}[]>([]);
  const [roleStats, setRoleStats] = useState({
    totalRoles: 0,
    systemRoles: 0,
    customRoles: 0,
    totalUsers: 0,
    roleDistribution: [] as { role_name: string; user_count: number }[]
  });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<EnterpriseRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<EnterpriseRole | null>(null);
  const [activeTab, setActiveTab] = useState('roles');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [permissionForm] = Form.useForm();

  // 加载企业角色数据
  const loadRoles = async () => {
    setLoading(true);
    try {
      const rolesData = await enterpriseRoleService.getRoles();
      setRoles(rolesData);
      
      // 默认展开顶级角色
      if (rolesData.length > 0) {
        const topLevelKeys = rolesData
          .filter(role => !role.parent_id)
          .map(role => role.id.toString());
        setExpandedKeys(topLevelKeys.slice(0, 3)); // 限制展开数量
      }
    } catch (error) {
      console.error('加载角色数据失败:', error);
      message.error('加载角色数据失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载权限数据
  const loadPermissions = async () => {
    try {
      const permissionsData = await enterpriseRoleService.getPermissions();
      setPermissions(permissionsData);
    } catch (error) {
      console.error('加载权限数据失败:', error);
      message.error('加载权限数据失败');
      setPermissions([]);
    }
  };

  // 加载用户角色分配数据
  const loadUserRoles = async (roleId?: number) => {
    try {
      const userRolesData = await enterpriseRoleService.getRoleUsers(roleId);
      setUserRoles(userRolesData);
    } catch (error) {
      console.error('加载用户角色数据失败:', error);
      message.error('加载用户角色数据失败');
      setUserRoles([]);
    }
  };

  // 加载可分配用户列表
  const loadAvailableUsers = async () => {
    try {
      const usersData = await enterpriseRoleService.getAvailableUsers();
      setAvailableUsers(usersData);
    } catch (error) {
      console.error('加载可分配用户列表失败:', error);
      setAvailableUsers([]);
    }
  };

  // 加载角色统计信息
  const loadRoleStats = async () => {
    try {
      const stats = await enterpriseRoleService.getRoleStats();
      setRoleStats(stats);
    } catch (error) {
      console.error('加载角色统计信息失败:', error);
    }
  };

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadUserRoles();
    loadAvailableUsers();
    loadRoleStats();
  }, []);

  // 显示添加/编辑角色弹窗
  const showRoleModal = (role?: EnterpriseRole) => {
    setEditingRole(role || null);
    setModalVisible(true);
    
    if (role) {
      form.setFieldsValue({
        name: role.name,
        code: role.code,
        description: role.description,
        level: role.level,
        parent_id: role.parent_id,
        status: role.status
      });
    } else {
      form.resetFields();
    }
  };

  // 显示权限配置弹窗
  const showPermissionModal = (role: EnterpriseRole) => {
    setSelectedRole(role);
    setPermissionModalVisible(true);
    
    // 设置已选权限
    permissionForm.setFieldsValue({
      permissions: role.permissions
    });
  };

  // 处理角色保存
  const handleRoleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingRole) {
        const updateData: UpdateRoleRequest = {
          name: values.name,
          code: values.code,
          description: values.description,
          level: values.level,
          parent_id: values.parent_id,
          status: values.status
        };
        await enterpriseRoleService.updateRole(editingRole.id, updateData);
        message.success('角色更新成功');
      } else {
        const createData: CreateRoleRequest = {
          name: values.name,
          code: values.code,
          description: values.description,
          level: values.level || 1,
          parent_id: values.parent_id,
          status: values.status || 'active'
        };
        await enterpriseRoleService.createRole(createData);
        message.success('角色创建成功');
      }
      
      setModalVisible(false);
      loadRoles();
      loadRoleStats();
    } catch (error) {
      console.error('保存角色失败:', error);
      message.error('保存角色失败，请检查输入信息');
    }
  };

  // 处理权限配置保存
  const handlePermissionSave = async () => {
    try {
      const values = await permissionForm.validateFields();
      
      if (selectedRole) {
        await enterpriseRoleService.updateRolePermissions({
          role_id: selectedRole.id,
          permissions: values.permissions || []
        });
        message.success('权限配置更新成功');
        setPermissionModalVisible(false);
        loadRoles();
        
        // 重新加载选中角色的用户列表
        loadUserRoles(selectedRole.id);
      }
    } catch (error) {
      console.error('保存权限配置失败:', error);
      message.error('保存权限配置失败');
    }
  };

  // 删除角色
  const handleRoleDelete = (role: EnterpriseRole) => {
    if (role.is_system) {
      message.warning('系统角色不能删除');
      return;
    }
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色 "${role.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await enterpriseRoleService.deleteRole(role.id);
          message.success('角色删除成功');
          loadRoles();
          loadRoleStats();
          
          // 如果删除的是当前选中的角色，清除选中状态
          if (selectedRole && selectedRole.id === role.id) {
            setSelectedRole(null);
            loadUserRoles(); // 加载所有用户角色分配
          }
        } catch (error) {
          console.error('删除角色失败:', error);
          message.error('删除角色失败，请检查是否存在关联数据');
        }
      }
    });
  };

  // 复制角色
  const handleRoleCopy = async (role: EnterpriseRole) => {
    try {
      const newName = `${role.name}_副本`;
      await enterpriseRoleService.copyRole(role.id, newName);
      message.success('角色复制成功');
      loadRoles();
      loadRoleStats();
    } catch (error) {
      console.error('复制角色失败:', error);
      message.error('复制角色失败');
    }
  };

  // 切换角色状态
  const handleStatusToggle = async (role: EnterpriseRole) => {
    try {
      const newStatus = role.status === 'active' ? 'inactive' : 'active';
      console.log('切换角色状态:', role.id, newStatus);
      
      message.success(`角色已${newStatus === 'active' ? '启用' : '停用'}`);
      loadRoles();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 转换为Tree组件数据格式
  const convertToTreeData = (roles: EnterpriseRole[]): any[] => {
    return roles.map(role => ({
      key: role.id.toString(),
      title: (
        <Space>
          <SafetyCertificateOutlined />
          <span>{role.name}</span>
          {role.is_system && <Tag color="blue">系统</Tag>}
          <Tag color={role.status === 'active' ? 'green' : 'red'}>
            {role.status === 'active' ? '启用' : '停用'}
          </Tag>
          <Text type="secondary">({role.user_count}人)</Text>
        </Space>
      ),
      children: role.children ? convertToTreeData(role.children) : undefined,
      isLeaf: !role.children || role.children.length === 0
    }));
  };

  // 角色列表列定义
  const roleColumns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: EnterpriseRole) => (
        <Space>
          <SafetyCertificateOutlined />
          <span style={{ fontWeight: 'bold' }}>{text}</span>
          {record.is_system && <Tag color="blue">系统</Tag>}
        </Space>
      )
    },
    {
      title: '角色代码',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text code>{text}</Text>
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: number) => `L${level}`
    },
    {
      title: '权限数量',
      key: 'permissions_count',
      render: (record: EnterpriseRole) => (
        <Space>
          <LockOutlined />
          {record.permissions.length}个
        </Space>
      )
    },
    {
      title: '用户数量',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count: number) => (
        <Space>
          <TeamOutlined />
          {count}人
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: EnterpriseRole) => (
        <Switch
          checked={status === 'active'}
          onChange={() => handleStatusToggle(record)}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          disabled={record.is_system}
        />
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: EnterpriseRole) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showRoleModal(record)}
            disabled={record.is_system}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => showPermissionModal(record)}
          >
            权限
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleRoleCopy(record)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRoleDelete(record)}
            disabled={record.is_system}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 用户角色分配列定义
  const userRoleColumns = [
    {
      title: '用户',
      key: 'user',
      render: (record: UserRole) => (
        <Space>
          <UserOutlined />
          <div>
            <div>{record.user_name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.user_email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role_name',
      key: 'role_name',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '分配时间',
      dataIndex: 'assigned_at',
      key: 'assigned_at',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: '分配人',
      dataIndex: 'assigned_by',
      key: 'assigned_by'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '有效' : '已撤销'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: UserRole) => (
        <Space>
          <Button type="link" size="small">修改</Button>
          <Button type="link" size="small" danger>撤销</Button>
        </Space>
      )
    }
  ];

  // 按类别分组权限
  const groupPermissionsByCategory = (permissions: Permission[]) => {
    return permissions.reduce((groups, permission) => {
      const category = permission.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
      return groups;
    }, {} as Record<string, Permission[]>);
  };

  const tabItems = [
    {
      key: 'roles',
      label: '角色管理',
      children: (
        <Row gutter={24}>
          <Col span={16}>
            <Card
              title="角色列表"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => showRoleModal()}
                >
                  新建角色
                </Button>
              }
            >
              <Table
                columns={roleColumns}
                dataSource={(roles || []).flatMap(role => [role, ...(role.children || [])])}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条记录`
                }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card>
                <Statistic
                  title="角色总数"
                  value={roles.reduce((count, role) => count + 1 + (role.children?.length || 0), 0)}
                  prefix={<SafetyCertificateOutlined />}
                />
              </Card>
              <Card>
                <Statistic
                  title="系统角色"
                  value={roles.filter(role => role.is_system || role.children?.some(child => child.is_system)).length}
                  prefix={<LockOutlined />}
                />
              </Card>
              <Card>
                <Statistic
                  title="自定义角色"
                  value={roles.filter(role => !role.is_system || role.children?.some(child => !child.is_system)).length}
                  prefix={<SettingOutlined />}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      )
    },
    {
      key: 'hierarchy',
      label: '角色层级',
      children: (
        <Card title="角色层级结构">
          {roles.length > 0 && (
            <Tree
              showLine
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              treeData={convertToTreeData(roles)}
            />
          )}
        </Card>
      )
    },
    {
      key: 'assignments',
      label: '用户分配',
      children: (
        <Card
          title="用户角色分配"
          extra={
            <Button type="primary" icon={<PlusOutlined />}>
              分配角色
            </Button>
          }
        >
          <Table
            columns={userRoleColumns}
            dataSource={userRoles || []}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </Card>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SafetyCertificateOutlined /> 企业角色管理
      </Title>
      
      <Alert
        message="企业角色管理说明"
        description="管理企业内部角色和权限分配。系统角色不可删除或修改基本信息，自定义角色可以根据需要灵活配置。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* 添加/编辑角色弹窗 */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onOk={handleRoleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
            level: 2
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色名称"
                name="name"
                rules={[{ required: true, message: '请输入角色名称' }]}
              >
                <Input placeholder="请输入角色名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="角色代码"
                name="code"
                rules={[{ required: true, message: '请输入角色代码' }]}
              >
                <Input placeholder="如：project_manager" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色级别"
                name="level"
                rules={[{ required: true, message: '请选择角色级别' }]}
              >
                <Select>
                  <Option value={1}>L1 - 高级管理</Option>
                  <Option value={2}>L2 - 中级管理</Option>
                  <Option value={3}>L3 - 基础员工</Option>
                  <Option value={4}>L4 - 临时访问</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="上级角色"
                name="parent_id"
                tooltip="选择此角色的上级角色，用于权限继承"
              >
                <Select placeholder="选择上级角色" allowClear>
                  {roles.map(role => (
                    <Option key={role.id} value={role.id}>
                      {role.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="角色描述"
            name="description"
            rules={[{ required: true, message: '请输入角色描述' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入角色职责和权限描述..."
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限配置弹窗 */}
      <Modal
        title={`权限配置 - ${selectedRole?.name}`}
        open={permissionModalVisible}
        onOk={handlePermissionSave}
        onCancel={() => setPermissionModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form form={permissionForm} layout="vertical">
          <Form.Item
            label="选择权限"
            name="permissions"
            rules={[{ required: true, message: '请至少选择一个权限' }]}
          >
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {Object.entries(groupPermissionsByCategory(permissions)).map(([category, perms]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <Title level={5}>{category}</Title>
                  <div style={{ marginLeft: 16 }}>
                    {perms.map(permission => (
                      <div key={permission.id} style={{ marginBottom: 8 }}>
                        <Checkbox value={permission.id}>
                          <Space>
                            <Text strong>{permission.name}</Text>
                            <Text code>{permission.code}</Text>
                            {permission.is_system && <Tag size="small" color="blue">系统</Tag>}
                          </Space>
                          <div style={{ marginLeft: 24, color: '#666', fontSize: '12px' }}>
                            {permission.description}
                          </div>
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseRoleManagementPage;