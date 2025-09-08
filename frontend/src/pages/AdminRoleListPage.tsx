import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert,
  Modal,
  Form,
  message,
  Switch,
  Popconfirm,
  Tooltip,
  Badge,
  Avatar
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
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { permissionService } from '../services/permissionService';
import { getPermissionName, getPermissionDescription, getPermissionCategory } from '../utils/permissionMapping';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 角色接口定义
interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  roleDescription?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  permissionsCount?: number;
}

// 权限接口定义
interface Permission {
  id: number;
  permissionCode: string;
  permissionName: string;
  permissionDescription?: string;
  module: string;
  resource: string;
  action: string;
  isActive: boolean;
  isGranted?: boolean;
}

// 搜索和过滤状态
interface FilterState {
  searchText: string;
  roleType: 'all' | 'system' | 'custom';
  status: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'created' | 'users' | 'permissions';
  sortOrder: 'asc' | 'desc';
}

const AdminRoleListPage: React.FC = () => {
  const navigate = useNavigate();

  // 状态管理
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    roleType: 'all',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // 统计数据
  const [statistics, setStatistics] = useState({
    totalRoles: 0,
    systemRoles: 0,
    customRoles: 0,
    activeRoles: 0,
    totalUsers: 0
  });

  // 加载角色数据
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await permissionService.getRoles();
      const roleData: Role[] = (response as any).roles || [];
      setRoles(roleData);
      
      // 计算统计数据
      setStatistics({
        totalRoles: roleData.length,
        systemRoles: roleData.filter(role => role.isSystemRole).length,
        customRoles: roleData.filter(role => !role.isSystemRole).length,
        activeRoles: roleData.filter(role => role.isActive).length,
        totalUsers: roleData.reduce((sum, role) => sum + (role.userCount || 0), 0)
      });
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      message.error('获取角色列表失败：' + (error.message || '未知错误'));
      
      // 使用模拟数据作为fallback
      const mockRoles: Role[] = [
        {
          id: 1,
          roleCode: 'SYSTEM_ADMIN',
          roleName: '系统管理员',
          roleDescription: '拥有系统最高权限',
          isSystemRole: true,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          userCount: 2,
          permissionsCount: 45
        },
        {
          id: 2,
          roleCode: 'PROJECT_MANAGER',
          roleName: '项目经理',
          roleDescription: '负责项目管理和团队协调',
          isSystemRole: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          userCount: 8,
          permissionsCount: 25
        },
        {
          id: 3,
          roleCode: 'DEVELOPER',
          roleName: '开发工程师',
          roleDescription: '负责软件开发和维护',
          isSystemRole: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          userCount: 15,
          permissionsCount: 18
        }
      ];
      
      setRoles(mockRoles);
      setStatistics({
        totalRoles: mockRoles.length,
        systemRoles: mockRoles.filter(role => role.isSystemRole).length,
        customRoles: mockRoles.filter(role => !role.isSystemRole).length,
        activeRoles: mockRoles.filter(role => role.isActive).length,
        totalUsers: mockRoles.reduce((sum, role) => sum + (role.userCount || 0), 0)
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理创建角色
  const handleCreateRole = async (values: any) => {
    try {
      await permissionService.createRole({
        roleCode: values.roleCode,
        roleName: values.roleName,
        roleDescription: values.roleDescription,
        permissionCodes: []
      });
      message.success('角色创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadRoles();
    } catch (error: any) {
      message.error('创建失败：' + (error.message || '未知错误'));
    }
  };

  // 处理删除角色
  const handleDeleteRole = async (role: Role) => {
    try {
      await permissionService.deleteRole(role.id);
      message.success(`角色"${role.roleName}"已删除`);
      loadRoles();
    } catch (error: any) {
      message.error('删除失败：' + (error.message || '未知错误'));
    }
  };

  // 筛选后的角色列表
  const filteredRoles = useMemo(() => {
    return roles
      .filter(role => {
        const matchesSearch = !filters.searchText || 
          role.roleName.toLowerCase().includes(filters.searchText.toLowerCase()) ||
          role.roleCode.toLowerCase().includes(filters.searchText.toLowerCase()) ||
          (role.roleDescription || '').toLowerCase().includes(filters.searchText.toLowerCase());
        
        const matchesType = filters.roleType === 'all' || 
          (filters.roleType === 'system' && role.isSystemRole) ||
          (filters.roleType === 'custom' && !role.isSystemRole);
        
        const matchesStatus = filters.status === 'all' ||
          (filters.status === 'active' && role.isActive) ||
          (filters.status === 'inactive' && !role.isActive);
        
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        const { sortBy, sortOrder } = filters;
        let compareResult = 0;
        
        switch (sortBy) {
          case 'name':
            compareResult = a.roleName.localeCompare(b.roleName);
            break;
          case 'created':
            compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'users':
            compareResult = (a.userCount || 0) - (b.userCount || 0);
            break;
          case 'permissions':
            compareResult = (a.permissionsCount || 0) - (b.permissionsCount || 0);
            break;
        }
        
        return sortOrder === 'desc' ? -compareResult : compareResult;
      });
  }, [roles, filters]);

  // 更新过滤器
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 初始化数据
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // 表格列定义
  const columns = [
    {
      title: '角色信息',
      key: 'roleInfo',
      render: (record: Role) => (
        <Space>
          <Avatar 
            icon={record.isSystemRole ? <SafetyOutlined /> : <TeamOutlined />}
            style={{ 
              backgroundColor: record.isSystemRole ? '#52c41a' : '#1890ff' 
            }}
          />
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {record.roleName}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.roleCode}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'isSystemRole',
      key: 'isSystemRole',
      width: 100,
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'green' : 'blue'}>
          {isSystem ? '系统' : '自定义'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'default'} 
          text={isActive ? '启用' : '禁用'}
        />
      ),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 80,
      render: (count: number = 0) => (
        <Tooltip title="使用此角色的用户数量">
          <Badge count={count} showZero color="#1890ff" />
        </Tooltip>
      ),
    },
    {
      title: '权限数',
      dataIndex: 'permissionsCount',
      key: 'permissionsCount',
      width: 80,
      render: (count: number = 0) => (
        <Tooltip title="分配给此角色的权限数量">
          <Badge count={count} showZero color="#52c41a" />
        </Tooltip>
      ),
    },
    {
      title: '描述',
      dataIndex: 'roleDescription',
      key: 'roleDescription',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary">{text || '-'}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (record: Role) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              size="small" 
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/roles/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑角色">
            <Button 
              size="small" 
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/roles/${record.id}?mode=edit`)}
            />
          </Tooltip>
          {!record.isSystemRole && (
            <Popconfirm
              title={`确定要删除角色"${record.roleName}"吗？`}
              description={`此操作不可恢复${record.userCount ? `，当前有 ${record.userCount} 个用户使用此角色` : ''}。`}
              onConfirm={() => handleDeleteRole(record)}
              okText="确认删除"
              cancelText="取消"
              okType="danger"
            >
              <Tooltip title="删除角色">
                <Button 
                  size="small" 
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 面包屑导航 */}
      <div style={{ marginBottom: '16px' }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              首页
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span onClick={() => navigate('/admin/permissions')} style={{ cursor: 'pointer' }}>
              系统管理
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>角色管理</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined />
          角色管理
        </Title>
        <Text type="secondary">
          管理系统角色，分配权限，控制用户访问权限
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总角色数"
              value={statistics.totalRoles}
              prefix={<GroupOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="系统角色"
              value={statistics.systemRoles}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="自定义角色"
              value={statistics.customRoles}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
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
        {/* 搜索和过滤栏 */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Space size="middle">
                <Search
                  placeholder="搜索角色名称、代码或描述"
                  allowClear
                  style={{ width: 280 }}
                  value={filters.searchText}
                  onChange={(e) => updateFilter('searchText', e.target.value)}
                  prefix={<SearchOutlined />}
                />
                <Select
                  value={filters.roleType}
                  style={{ width: 120 }}
                  onChange={(value) => updateFilter('roleType', value)}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">全部类型</Option>
                  <Option value="system">系统角色</Option>
                  <Option value="custom">自定义角色</Option>
                </Select>
                <Select
                  value={filters.status}
                  style={{ width: 100 }}
                  onChange={(value) => updateFilter('status', value)}
                >
                  <Option value="all">全部状态</Option>
                  <Option value="active">启用</Option>
                  <Option value="inactive">禁用</Option>
                </Select>
                <Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  style={{ width: 140 }}
                  onChange={(value) => {
                    const [sortBy, sortOrder] = value.split('-');
                    updateFilter('sortBy', sortBy);
                    updateFilter('sortOrder', sortOrder);
                  }}
                >
                  <Option value="name-asc">名称 ↑</Option>
                  <Option value="name-desc">名称 ↓</Option>
                  <Option value="created-desc">创建时间 ↓</Option>
                  <Option value="created-asc">创建时间 ↑</Option>
                  <Option value="users-desc">用户数 ↓</Option>
                  <Option value="permissions-desc">权限数 ↓</Option>
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadRoles}
                  loading={loading}
                >
                  刷新
                </Button>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  创建角色
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 提示信息 */}
        <Alert
          message="角色管理说明"
          description="角色用于组织权限并分配给用户。系统角色是预定义的，自定义角色可以根据业务需要创建。点击角色名称可查看详细信息和权限配置。"
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
            total: filteredRoles.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `显示 ${range[0]}-${range[1]} 条，共 ${total} 条角色`,
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* 创建角色模态框 */}
      <Modal
        title="创建新角色"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRole}
          initialValues={{
            isSystemRole: false,
            isActive: true
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="角色代码"
                name="roleCode"
                rules={[
                  { required: true, message: '请输入角色代码' },
                  { pattern: /^[A-Z_][A-Z0-9_]*$/, message: '角色代码只能包含大写字母、数字和下划线，且以字母或下划线开头' },
                  { max: 50, message: '角色代码不能超过50个字符' }
                ]}
              >
                <Input placeholder="如：PROJECT_MANAGER" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="角色名称"
                name="roleName"
                rules={[
                  { required: true, message: '请输入角色名称' },
                  { max: 100, message: '角色名称不能超过100个字符' }
                ]}
              >
                <Input placeholder="如：项目经理" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="角色描述"
            name="roleDescription"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请描述这个角色的职责和用途"
              maxLength={500}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建并配置权限
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminRoleListPage;