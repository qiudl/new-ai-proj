import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Breadcrumb,
  Tabs,
  Alert,
  Modal,
  Form,
  message,
  Switch,
  Popconfirm
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
  TeamOutlined,
  SettingOutlined,
  GroupOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PermissionMatrix from '../components/PermissionMatrix';
import UserRoleAssignment from '../components/UserRoleAssignment';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 角色接口定义
interface Role {
  id: number;
  role_code: string;
  role_name: string;
  role_description?: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
  permissions_count?: number;
}

// 权限接口定义
interface Permission {
  id: number;
  permission_code: string;
  permission_name: string;
  permission_description?: string;
  module: string;
  resource: string;
  action: string;
  is_active: boolean;
  is_granted?: boolean;
}

// 角色表单数据
interface RoleFormData {
  role_code: string;
  role_name: string;
  role_description?: string;
  is_system_role: boolean;
  is_active: boolean;
}

const RoleManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // 状态管理
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'enterprise'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix'>('roles');
  
  // 统计数据
  const [statistics, setStatistics] = useState({
    totalRoles: 0,
    systemRoles: 0,
    enterpriseRoles: 0,
    activeRoles: 0,
    totalUsers: 0
  });

  // 加载角色数据
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/roles', {
        params: { 
          include_inactive: true, 
          include_stats: true 
        }
      });
      
      if (response.data.success) {
        const roleData = response.data.data || [];
        setRoles(roleData);
        
        // 计算统计数据
        setStatistics({
          totalRoles: roleData.length,
          systemRoles: roleData.filter((role: Role) => role.is_system_role).length,
          enterpriseRoles: roleData.filter((role: Role) => !role.is_system_role).length,
          activeRoles: roleData.filter((role: Role) => role.is_active).length,
          totalUsers: roleData.reduce((sum: number, role: Role) => sum + (role.user_count || 0), 0)
        });
      } else {
        message.error('获取角色列表失败');
      }
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      message.error('获取角色列表失败：' + (error.response?.data?.message || error.message));
      
      // 如果API失败，使用模拟数据进行展示
      const mockRoles: Role[] = [
        {
          id: 1,
          role_code: 'SYSTEM_SUPER_ADMIN',
          role_name: '超级管理员',
          role_description: '系统最高权限用户',
          is_system_role: true,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          user_count: 2,
          permissions_count: 25
        },
        {
          id: 2,
          role_code: 'SYSTEM_DEVELOPER',
          role_name: '开发工程师',
          role_description: '系统开发人员',
          is_system_role: true,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          user_count: 5,
          permissions_count: 15
        },
        {
          id: 3,
          role_code: 'ENTERPRISE_ADMIN',
          role_name: '企业管理员',
          role_description: '企业最高权限用户',
          is_system_role: false,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          user_count: 12,
          permissions_count: 18
        },
        {
          id: 4,
          role_code: 'ENTERPRISE_USER',
          role_name: '普通用户',
          role_description: '企业普通用户',
          is_system_role: false,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          user_count: 45,
          permissions_count: 8
        }
      ];
      
      setRoles(mockRoles);
      setStatistics({
        totalRoles: mockRoles.length,
        systemRoles: mockRoles.filter(role => role.is_system_role).length,
        enterpriseRoles: mockRoles.filter(role => !role.is_system_role).length,
        activeRoles: mockRoles.filter(role => role.is_active).length,
        totalUsers: mockRoles.reduce((sum, role) => sum + (role.user_count || 0), 0)
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理角色提交（创建或更新）
  const handleRoleSubmit = async (values: RoleFormData) => {
    try {
      if (editingRole) {
        // 更新角色
        const response = await api.put(`/api/v1/roles/${editingRole.id}`, values);
        if (response.data.success) {
          message.success('角色更新成功');
          loadRoles();
          setModalVisible(false);
          setEditingRole(null);
          form.resetFields();
        } else {
          message.error('角色更新失败：' + (response.data.message || '未知错误'));
        }
      } else {
        // 创建角色
        const response = await api.post('/api/v1/roles', values);
        if (response.data.success) {
          message.success('角色创建成功');
          loadRoles();
          setModalVisible(false);
          form.resetFields();
        } else {
          message.error('角色创建失败：' + (response.data.message || '未知错误'));
        }
      }
    } catch (error: any) {
      console.error('Failed to save role:', error);
      message.error('操作失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理删除角色
  const handleDeleteRole = async (role: Role) => {
    try {
      const response = await api.delete(`/api/v1/roles/${role.id}`);
      if (response.data.success) {
        message.success('角色删除成功');
        loadRoles();
      } else {
        message.error('角色删除失败：' + (response.data.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('Failed to delete role:', error);
      message.error('删除失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 处理角色状态切换
  const handleToggleRoleStatus = async (role: Role) => {
    try {
      const response = await api.patch(`/api/v1/roles/${role.id}/status`, {
        is_active: !role.is_active
      });
      if (response.data.success) {
        message.success(`角色${!role.is_active ? '启用' : '禁用'}成功`);
        loadRoles();
      } else {
        message.error('状态更新失败：' + (response.data.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('Failed to toggle role status:', error);
      message.error('状态更新失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 打开新建角色模态框
  const handleCreateRole = () => {
    setEditingRole(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      is_system_role: false,
      is_active: true
    });
  };

  // 打开编辑角色模态框
  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setModalVisible(true);
    form.setFieldsValue({
      role_code: role.role_code,
      role_name: role.role_name,
      role_description: role.role_description || '',
      is_system_role: role.is_system_role,
      is_active: role.is_active
    });
  };

  // 初始化数据
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // 筛选后的角色列表
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.role_name.toLowerCase().includes(searchText.toLowerCase()) ||
                         role.role_code.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = filterType === 'all' || 
                       (filterType === 'system' && role.is_system_role) ||
                       (filterType === 'enterprise' && !role.is_system_role);
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && role.is_active) ||
                         (filterStatus === 'inactive' && !role.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // 表格列定义
  const columns = [
    {
      title: '角色名称',
      dataIndex: 'role_name',
      key: 'role_name',
      render: (text: string, record: Role) => (
        <Space>
          {record.is_system_role ? (
            <SafetyOutlined style={{ color: '#52c41a' }} />
          ) : (
            <TeamOutlined style={{ color: '#1890ff' }} />
          )}
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.role_code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'is_system_role',
      key: 'is_system_role',
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'green' : 'blue'}>
          {isSystem ? '系统角色' : '企业角色'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '用户数量',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count: number = 0) => (
        <Text>{count}</Text>
      ),
    },
    {
      title: '权限数量',
      dataIndex: 'permissions_count',
      key: 'permissions_count',
      render: (count: number = 0) => (
        <Text>{count}</Text>
      ),
    },
    {
      title: '描述',
      dataIndex: 'role_description',
      key: 'role_description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: Role) => (
        <Space size="small">
          <Button 
            size="small" 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/role-management/${record.id}`)}
          >
            查看
          </Button>
          <Button 
            size="small" 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEditRole(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title={`确定要${record.is_active ? '禁用' : '启用'}这个角色吗？`}
            onConfirm={() => handleToggleRoleStatus(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              size="small" 
              type="link"
              style={{ color: record.is_active ? '#faad14' : '#52c41a' }}
            >
              {record.is_active ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除这个角色吗？此操作不可恢复！"
            onConfirm={() => handleDeleteRole(record)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button 
              size="small" 
              type="link" 
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_system_role} // 系统角色不能删除
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <SafetyOutlined />
          <span>系统管理</span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>角色管理</Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          角色管理
        </Title>
        <Text type="secondary">
          管理系统角色和企业角色，配置权限体系
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总角色数"
              value={statistics.totalRoles}
              prefix={<GroupOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="系统角色"
              value={statistics.systemRoles}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="企业角色"
              value={statistics.enterpriseRoles}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="关联用户"
              value={statistics.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容卡片 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as 'roles' | 'matrix')}
          items={[
            {
              key: 'roles',
              label: (
                <span>
                  <TeamOutlined />
                  角色列表
                </span>
              ),
              children: (
                <>
                  {/* 顶部操作栏 */}
                  <div style={{ marginBottom: '16px' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space size="middle">
                          <Search
                            placeholder="搜索角色名称或代码"
                            allowClear
                            style={{ width: 300 }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                          />
                          <Select
                            value={filterType}
                            style={{ width: 120 }}
                            onChange={setFilterType}
                          >
                            <Option value="all">全部类型</Option>
                            <Option value="system">系统角色</Option>
                            <Option value="enterprise">企业角色</Option>
                          </Select>
                          <Select
                            value={filterStatus}
                            style={{ width: 120 }}
                            onChange={setFilterStatus}
                          >
                            <Option value="all">全部状态</Option>
                            <Option value="active">启用</Option>
                            <Option value="inactive">禁用</Option>
                          </Select>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          <Button 
                            icon={<ReloadOutlined />} 
                            onClick={loadRoles}
                          >
                            刷新
                          </Button>
                          <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={handleCreateRole}
                          >
                            新建角色
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </div>

                  {/* 提示信息 */}
                  <Alert
                    message="角色管理说明"
                    description="系统预定义了12种角色（6个系统角色 + 6个企业角色），支持灵活的权限分配和用户管理。"
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />

                  {/* 角色表格 */}
                  <Table
                    columns={columns}
                    dataSource={filteredRoles}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                    }}
                    scroll={{ x: 800 }}
                  />
                </>
              )
            },
            {
              key: 'matrix',
              label: (
                <span>
                  <SafetyOutlined />
                  权限矩阵
                </span>
              ),
              children: (
                <PermissionMatrix
                  height={600}
                  onPermissionChange={(roleId, permissionId, granted) => {
                    console.log(`Role ${roleId} permission ${permissionId} ${granted ? 'granted' : 'revoked'}`);
                    message.info(`权限${granted ? '已授予' : '已撤销'}`);
                  }}
                />
              )
            },
            {
              key: 'users',
              label: (
                <span>
                  <UserOutlined />
                  用户分配
                </span>
              ),
              children: (
                <UserRoleAssignment
                  onRoleChange={(userId, roles) => {
                    console.log(`User ${userId} roles updated:`, roles);
                    // 可以在这里刷新相关数据或显示通知
                    message.success(`用户角色已更新，共分配 ${roles.length} 个角色`);
                  }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* 创建/编辑角色模态框 */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRole(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRoleSubmit}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="角色代码"
                name="role_code"
                rules={[
                  { required: true, message: '请输入角色代码' },
                  { pattern: /^[A-Z_]+$/, message: '角色代码只能包含大写字母和下划线' },
                  { max: 50, message: '角色代码长度不能超过50个字符' }
                ]}
              >
                <Input placeholder="如：ENTERPRISE_MANAGER" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="角色名称"
                name="role_name"
                rules={[
                  { required: true, message: '请输入角色名称' },
                  { max: 100, message: '角色名称长度不能超过100个字符' }
                ]}
              >
                <Input placeholder="如：企业经理" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="角色描述"
            name="role_description"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请描述这个角色的职责和权限范围"
              maxLength={500}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="角色类型"
                name="is_system_role"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="系统角色" 
                  unCheckedChildren="企业角色"
                  disabled={!!editingRole} // 编辑时不能修改角色类型
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="启用状态"
                name="is_active"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="启用" 
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingRole(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagementPage;