import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Avatar,
  Tooltip,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Badge,
  Dropdown,
  Typography,
  Radio,
  Breadcrumb
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownOutlined,
  ExportOutlined,
  KeyOutlined,
  StopOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BuildOutlined,
  BankOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
// import { useNavigate } from 'react-router-dom';
import { 
  User, 
  UserType,
  UserRole, 
  UserStatus, 
  UserCreateRequest, 
  UserUpdateRequest,
  UserListParams,
  USER_TYPE_CONFIG,
  USER_ROLE_CONFIG,
  USER_STATUS_CONFIG,
  getRoleConfigByType,
  getValidRolesForUserType,
  validateUserRole 
} from '../types/user';
import { UserManagementService } from '../services/userManagementService';
import CompanyService from '../services/companyService';
import enterpriseService from '../services/enterpriseService';
import EnterpriseSelector from '../components/EnterpriseSelector';
import { Enterprise } from '../types/enterprise';
import PermissionWrapper from '../components/PermissionWrapper';
import { USER_PERMISSIONS } from '../constants/permissions';
// import { useAsyncData } from '../hooks/useAsyncData';
import { formatTimeAgo } from '../utils/formatters';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const UserManagementPage: React.FC = () => {
  // const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchParams, setSearchParams] = useState<UserListParams>({
    page: 1,
    page_size: 20
  });

  // 用户类型相关状态
  const [selectedUserType, setSelectedUserType] = useState<UserType>('system');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [companies, setCompanies] = useState<any[]>([]); // 企业列表（向后兼容）
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]); // 新企业列表
  const [companiesLoading, setCompaniesLoading] = useState(false); // 企业加载状态
  const [companySearchKeyword, setCompanySearchKeyword] = useState<string>(''); // 企业搜索关键字

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 处理用户类型变更
  const handleUserTypeChange = useCallback((userType: UserType) => {
    setSelectedUserType(userType);
    const roles = getValidRolesForUserType(userType);
    setAvailableRoles(roles);
    
    // 重置角色字段
    if (createForm && createModalVisible) {
      createForm.setFieldValue('role', undefined);
      // 强制更新表单以触发重新渲染
      createForm.validateFields(['role']).catch(() => {});
    }
    if (editForm && editModalVisible) {
      editForm.setFieldValue('role', undefined);
      // 强制更新表单以触发重新渲染
      editForm.validateFields(['role']).catch(() => {});
    }
  }, [createForm, editForm, createModalVisible, editModalVisible]);

  // 初始化可用角色
  useEffect(() => {
    const roles = getValidRolesForUserType(selectedUserType);
    setAvailableRoles(roles);
  }, [selectedUserType]);

  // 获取企业列表（支持新旧两套系统）
  const fetchCompanies = useCallback(async () => {
    try {
      setCompaniesLoading(true);
      
      // 尝试使用新的企业系统API
      try {
        console.log('🏢 尝试加载新企业系统数据...');
        const enterpriseResponse = await enterpriseService.getEnterprises(1, 100, { status: 'active' });
        const enterprisesList = enterpriseResponse.data;
        setEnterprises(enterprisesList);
        
        // 转换为向后兼容格式
        const compatibleCompanies = enterprisesList.map(enterprise => ({
          id: enterprise.id,
          name: enterprise.name,
          companyName: enterprise.name,
          originalData: enterprise
        }));
        setCompanies(compatibleCompanies);
        console.log('✅ 新企业系统数据加载成功:', enterprisesList.length, '个企业');
        return;
      } catch (enterpriseError) {
        console.warn('⚠️ 新企业系统不可用，回退到旧系统:', enterpriseError);
      }
      
      // 回退到旧的公司系统API
      const response = await CompanyService.getCompanies(
        { page: 1, pageSize: 100 }, // 获取前100个企业，足够用于选择器
        { status: 'active' } // 只获取活跃企业
      );
      
      // 转换为前端期望的格式
      const companiesList = response.data.map(company => ({
        id: company.id,
        name: company.companyName,
        companyName: company.companyName,
        // 保留原始数据以备将来使用
        originalData: company
      }));
      
      setCompanies(companiesList);
      console.log('✅ 旧公司系统数据加载成功:', companiesList.length, '个公司');
      
    } catch (error) {
      console.error('❌ 获取企业列表失败:', error);
      message.error('获取企业列表失败');
      // 设置默认的企业数据作为回退
      setCompanies([
        { id: 1, name: '企业数据加载失败，请刷新重试' }
      ]);
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  // 搜索企业（支持输入搜索）
  const searchCompanies = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      // 如果搜索关键字太短，返回默认企业列表
      return fetchCompanies();
    }

    try {
      setCompaniesLoading(true);
      const searchResults = await CompanyService.searchCompanies(keyword);
      
      // 转换为前端期望的格式
      const companiesList = searchResults.map(company => ({
        id: company.id,
        name: company.companyName,
        originalData: company
      }));
      
      setCompanies(companiesList);
    } catch (error) {
      console.error('Failed to search companies:', error);
      message.error('搜索企业失败');
    } finally {
      setCompaniesLoading(false);
    }
  }, [fetchCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // 用户数据状态
  const [usersData, setUsersData] = useState<any>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 获取用户列表数据
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const data = await UserManagementService.getUserList(searchParams);
      setUsersData(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      message.error('获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, [searchParams]);

  // 获取用户统计数据
  const fetchStats = useCallback(async () => {
    try {
      console.log('Starting fetchStats...');
      setStatsLoading(true);
      const data = await UserManagementService.getUserStats();
      console.log('fetchStats received data:', data);
      setUserStats(data);
      console.log('userStats updated to:', data);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      message.error('获取用户统计失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 刷新函数
  const refreshUsers = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  const refreshStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  // 初始化数据
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // 测试函数 - 临时调试用
  const testStatsAPI = async () => {
    try {
      console.log('=== Testing Stats API ===');
      const result = await UserManagementService.getUserStats();
      console.log('Test result:', result);
      alert('API测试成功，查看控制台');
    } catch (error) {
      console.error('Test failed:', error);
      alert('API测试失败：' + error.message);
    }
  };

  const users = usersData?.data || [];
  const total = usersData?.total || 0;

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchParams(prev => ({
      ...prev,
      search: value,
      page: 1
    }));
  }, []);

  // 处理筛选
  const handleFilter = useCallback((key: string, value: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  }, []);

  // 处理分页
  const handleTableChange = useCallback((pagination: unknown) => {
    setSearchParams(prev => ({
      ...prev,
      page: (pagination as any).current,
      page_size: (pagination as any).pageSize
    }));
  }, []);

  // 创建用户
  const handleCreateUser = useCallback(async (values: UserCreateRequest) => {
    try {
      // 验证必填字段
      if (!values.role) {
        message.error('请选择角色');
        return;
      }
      
      if (!values.user_type) {
        message.error('请选择用户类型');
        return;
      }
      
      // 验证用户类型和角色的匹配性
      const isValidRole = validateUserRole(values.user_type as UserType, values.role as UserRole);
      if (!isValidRole) {
        message.error(`所选角色不适用于${values.user_type === 'system' ? '系统' : '企业'}用户类型`);
        return;
      }
      
      await UserManagementService.createUser(values);
      message.success('用户创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      setSelectedUserType('system'); // 重置为默认值
      refreshUsers();
      refreshStats();
    } catch (error) {
      console.error('创建用户失败:', error);
      message.error('用户创建失败');
    }
  }, [createForm, refreshUsers, refreshStats]);

  // 编辑用户
  const handleEditUser = useCallback(async (values: UserUpdateRequest) => {
    if (!editingUser) return;
    
    try {
      await UserManagementService.updateUser(editingUser.id, values);
      message.success('用户信息更新成功');
      setEditModalVisible(false);
      setEditingUser(null);
      editForm.resetFields();
      refreshUsers();
      refreshStats();
    } catch (error) {
      message.error('用户信息更新失败');
    }
  }, [editingUser, editForm, refreshUsers, refreshStats]);

  // 重置密码
  const handleResetPassword = useCallback(async (values: { new_password: string }) => {
    if (!resetPasswordUser) return;
    
    try {
      await UserManagementService.resetUserPassword(resetPasswordUser.id, values);
      message.success('密码重置成功');
      setPasswordModalVisible(false);
      setResetPasswordUser(null);
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码重置失败');
    }
  }, [resetPasswordUser, passwordForm]);

  // 删除用户
  const handleDeleteUser = useCallback(async (user: User) => {
    try {
      await UserManagementService.deleteUser(user.id);
      message.success('用户删除成功');
      refreshUsers();
      refreshStats();
    } catch (error) {
      message.error('用户删除失败');
    }
  }, [refreshUsers, refreshStats]);

  // 更新用户状态
  const handleUpdateStatus = useCallback(async (user: User, status: UserStatus) => {
    try {
      await UserManagementService.updateUserStatus(user.id, status);
      message.success('用户状态更新成功');
      refreshUsers();
      refreshStats();
    } catch (error) {
      message.error('用户状态更新失败');
    }
  }, [refreshUsers, refreshStats]);

  // 批量操作
  const handleBatchOperation = useCallback(async (action: 'activate' | 'suspend' | 'delete') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }

    try {
      await UserManagementService.batchUpdateUsers(
        selectedRowKeys.map(key => Number(key)), 
        action
      );
      message.success(`批量${action === 'activate' ? '激活' : action === 'suspend' ? '停用' : '删除'}成功`);
      setSelectedRowKeys([]);
      refreshUsers();
      refreshStats();
    } catch (error) {
      message.error(`批量操作失败`);
    }
  }, [selectedRowKeys, refreshUsers, refreshStats]);

  // 导出用户数据
  const handleExportUsers = useCallback(async () => {
    try {
      const blob = await UserManagementService.exportUsers(searchParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('用户数据导出成功');
    } catch (error) {
      message.error('用户数据导出失败');
    }
  }, [searchParams]);

  // 打开编辑模态框
  const openEditModal = useCallback((user: User) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      company_id: user.company_id,
      role: user.role,
      status: user.status,
      profile: user.profile
    });
    setSelectedUserType(user.user_type);
    setEditModalVisible(true);
  }, [editForm]);

  // 打开密码重置模态框
  const openPasswordModal = useCallback((user: User) => {
    setResetPasswordUser(user);
    setPasswordModalVisible(true);
  }, []);

  // 表格列定义
  const columns: unknown[] = useMemo(() => [
    {
      title: '用户信息',
      key: 'user_info',
      fixed: 'left',
      width: 200,
      render: (_, user) => (
        <Space>
          <Avatar 
            size={40} 
            src={user.profile?.avatar} 
            icon={user.user_type === 'system' ? <BuildOutlined /> : <BankOutlined />}
            style={{ backgroundColor: USER_TYPE_CONFIG[user.user_type].color }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{user.profile?.name || user.username}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>@{user.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '用户类型',
      dataIndex: 'user_type',
      key: 'user_type',
      width: 120,
      render: (userType: UserType) => (
        <Tag 
          color={USER_TYPE_CONFIG[userType].color}
          icon={userType === 'system' ? <BuildOutlined /> : <BankOutlined />}
        >
          {USER_TYPE_CONFIG[userType].label}
        </Tag>
      ),
      filters: Object.entries(USER_TYPE_CONFIG).map(([key, config]) => ({
        text: config.label,
        value: key,
      })),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => (
        <Tag color={USER_ROLE_CONFIG[role]?.color}>
          {USER_ROLE_CONFIG[role]?.label || role}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => (
        <Badge 
          status={status === 'active' ? 'success' : status === 'inactive' ? 'warning' : 'error'}
          text={USER_STATUS_CONFIG[status].label}
        />
      ),
      filters: Object.entries(USER_STATUS_CONFIG).map(([key, config]) => ({
        text: config.label,
        value: key,
      })),
    },
    {
      title: '企业',
      key: 'company',
      width: 120,
      render: (_, user) => {
        if (user.user_type === 'company' && user.company_id) {
          const company = companies.find(c => c.id === user.company_id);
          return company ? (
            <Tooltip title={`企业ID: ${user.company_id}`}>
              <Text ellipsis style={{ maxWidth: 100 }}>
                {company.name}
              </Text>
            </Tooltip>
          ) : (
            <Text type="secondary">
              {companiesLoading ? '加载中...' : `企业${user.company_id}`}
            </Text>
          );
        }
        return user.user_type === 'system' ? (
          <Text type="secondary">-</Text>
        ) : (
          <Text type="warning">未关联</Text>
        );
      },
    },
    {
      title: '部门',
      key: 'department',
      width: 120,
      render: (_, user) => user.profile?.department || '-',
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 120,
      render: (date: string) => date ? formatTimeAgo(date) : '从未登录',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => formatTimeAgo(date),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, user) => (
        <Space size="small">
          <PermissionWrapper permission={USER_PERMISSIONS.UPDATE}>
            <Tooltip title="编辑">
              <Button 
                type="text" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => openEditModal(user)}
              />
            </Tooltip>
          </PermissionWrapper>
          <PermissionWrapper permission={USER_PERMISSIONS.UPDATE}>
            <Tooltip title="重置密码">
              <Button 
                type="text" 
                size="small" 
                icon={<KeyOutlined />}
                onClick={() => openPasswordModal(user)}
              />
            </Tooltip>
          </PermissionWrapper>
          <PermissionWrapper permission={USER_PERMISSIONS.UPDATE}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'activate',
                    label: '激活',
                    icon: <CheckCircleOutlined />,
                    disabled: user.status === 'active',
                    onClick: () => handleUpdateStatus(user, 'active'),
                  },
                  {
                    key: 'suspend',
                    label: '停用',
                    icon: <StopOutlined />,
                    disabled: user.status === 'suspended',
                    onClick: () => handleUpdateStatus(user, 'suspended'),
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    label: '删除',
                    icon: <DeleteOutlined />,
                    danger: true,
                  },
                ],
                onClick: ({ key }) => {
                  if (key === 'delete') {
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除用户 ${user.username} 吗？此操作不可恢复。`,
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: () => handleDeleteUser(user),
                    });
                  }
                },
              }}
              trigger={['click']}
            >
              <Button type="text" size="small" icon={<DownOutlined />} />
            </Dropdown>
          </PermissionWrapper>
        </Space>
      ),
    },
  ], [openEditModal, openPasswordModal, handleUpdateStatus, handleDeleteUser]);

  // 批量操作菜单
  const batchMenuItems = [
    {
      key: 'activate',
      label: '批量激活',
      icon: <CheckCircleOutlined />,
      onClick: () => handleBatchOperation('activate'),
    },
    {
      key: 'suspend',
      label: '批量停用',
      icon: <StopOutlined />,
      onClick: () => handleBatchOperation('suspend'),
    },
    { type: 'divider' as const },
    {
      key: 'reset-passwords',
      label: '批量重置密码',
      icon: <KeyOutlined />,
      onClick: () => {
        Modal.confirm({
          title: '确认批量重置密码',
          content: `确定要重置选中的 ${selectedRowKeys.length} 个用户的密码吗？系统将生成随机密码并通过邮件发送。`,
          okText: '重置密码',
          okType: 'primary',
          cancelText: '取消',
          onOk: () => {
            message.info('批量重置密码功能开发中...');
            // TODO: 实现批量重置密码功能
          },
        });
      },
    },
    {
      key: 'export-selected',
      label: '导出选中用户',
      icon: <ExportOutlined />,
      onClick: () => {
        message.info('正在导出选中用户...');
        // TODO: 实现导出选中用户功能
      },
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      label: '批量删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认批量删除',
          content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复。`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => handleBatchOperation('delete'),
        });
      },
    },
  ];

  return (
    <div className="page-container">
      {/* 面包屑导航 */}
      <Breadcrumb 
        style={{ marginBottom: '16px' }}
        items={[
          { title: '系统管理' },
          { title: '用户管理' }
        ]}
      />

      <div className="page-header">
        <Title level={2}>
          <Space>
            <TeamOutlined />
            用户管理
          </Space>
        </Title>
        <Text type="secondary">统一管理系统用户和企业用户账户</Text>
        
        {/* 调试信息 - 临时显示 */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ margin: '10px 0', padding: '10px', background: '#f0f0f0', fontSize: '12px' }}>
            <strong>调试信息:</strong> userStats = {JSON.stringify(userStats, null, 2)}
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={userStats?.total || 0}
              prefix={<UserOutlined />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={userStats?.by_status?.active || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="项目经理"
              value={userStats?.by_role?.project_manager || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="研发工程师"
              value={userStats?.by_role?.developer || 0}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="管理员"
              value={userStats?.by_role?.admin || 0}
              prefix={<BuildOutlined style={{ color: '#fa8c16' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="企业用户"
              value={(userStats?.by_role?.company_admin || 0) + (userStats?.by_role?.company_user || 0)}
              prefix={<BankOutlined style={{ color: '#722ed1' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="近期注册"
              value={userStats?.recent_registrations || 0}
              prefix={<PlusOutlined style={{ color: '#13c2c2' }} />}
              loading={statsLoading}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="停用用户"
              value={(userStats?.by_status?.inactive || 0) + (userStats?.by_status?.suspended || 0)}
              prefix={<StopOutlined style={{ color: '#ff4d4f' }} />}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Search
              placeholder="搜索用户名、邮箱、姓名..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="用户类型"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilter('user_type', value)}
            >
              {Object.entries(USER_TYPE_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    {key === 'system' ? <BuildOutlined /> : <BankOutlined />}
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="角色筛选"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilter('role', value)}
            >
              {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilter('status', value)}
            >
              {Object.entries(USER_STATUS_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Space>
              <PermissionWrapper permission={USER_PERMISSIONS.CREATE}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setSelectedUserType('system');
                    createForm.resetFields();
                    createForm.setFieldsValue({ 
                      user_type: 'system', 
                      role: undefined 
                    });
                    setCreateModalVisible(true);
                  }}
                >
                  新增用户
                </Button>
              </PermissionWrapper>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  refreshUsers();
                  refreshStats();
                }}
                loading={usersLoading}
              >
                刷新
              </Button>
              {/* 临时测试按钮 */}
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  onClick={testStatsAPI}
                  style={{ backgroundColor: '#f50', color: 'white' }}
                >
                  测试统计API
                </Button>
              )}
            </Space>
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space>
              <Button 
                icon={<ExportOutlined />}
                onClick={handleExportUsers}
              >
                导出用户数据
              </Button>
              {selectedRowKeys.length > 0 && (
                <PermissionWrapper permission={USER_PERMISSIONS.UPDATE}>
                  <Dropdown menu={{ items: batchMenuItems }} trigger={['click']}>
                    <Button>
                      批量操作 ({selectedRowKeys.length}个用户) <DownOutlined />
                    </Button>
                  </Dropdown>
                </PermissionWrapper>
              )}
              <Text type="secondary">
                共 {total} 个用户，当前显示第 {searchParams.page} 页
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 用户表格 */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={usersLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record: unknown) => ({
              disabled: (record as any).role === 'admin' && (record as any).id === 1, // 防止删除超级管理员
            }),
          }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.page_size,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建用户模态框 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            新建用户
          </Space>
        }
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
          setSelectedUserType('system');
          setAvailableRoles(getValidRolesForUserType('system'));
        }}
        onOk={() => createForm.submit()}
        width={700}
        okText="创建用户"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
          onFinishFailed={(errorInfo) => {
            console.error('表单验证失败:', errorInfo);
            
            const failedFields = errorInfo.errorFields?.map(field => ({
              name: field.name,
              errors: field.errors
            }));
            console.error('验证失败的字段:', failedFields);
            
            if (failedFields?.some(field => field.name.includes('role'))) {
              message.error('请选择角色');
            } else {
              message.error('请完善表单信息');
            }
          }}
          initialValues={{ user_type: 'system', role: undefined }}
        >
          <Form.Item
            name="user_type"
            label="用户类型"
            rules={[{ required: true, message: '请选择用户类型' }]}
          >
            <Radio.Group 
              onChange={(e) => {
                const newUserType = e.target.value;
                handleUserTypeChange(newUserType);
                // 清空角色选择
                createForm.setFieldValue('role', undefined);
              }}
            >
              <Radio value="system">
                <Space>
                  <BuildOutlined />
                  系统用户
                </Space>
              </Radio>
              <Radio value="company">
                <Space>
                  <BankOutlined />
                  企业用户
                </Space>
              </Radio>
            </Radio.Group>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 50, message: '用户名长度为3-50个字符' }
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          
          {/* 企业用户需要选择企业 */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.user_type !== current.user_type}
          >
            {({ getFieldValue }) => {
              const userType = getFieldValue('user_type');
              return userType === 'company' ? (
                <Form.Item
                  name="company_id"
                  label="所属企业"
                  rules={[{ required: true, message: '请选择所属企业' }]}
                >
                  <EnterpriseSelector 
                    placeholder="请选择企业"
                    onChange={(value, enterprise) => {
                      // 保持兼容性，同时支持新旧字段
                      if (createModalVisible) {
                        createForm.setFieldsValue({
                          company_id: value,
                          enterprise_id: value
                        });
                      }
                      if (editModalVisible) {
                        editForm.setFieldsValue({
                          company_id: value,
                          enterprise_id: value
                        });
                      }
                    }}
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' }
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, current) => prev.user_type !== current.user_type}
              >
                {({ getFieldValue }) => {
                  const userType = getFieldValue('user_type') || selectedUserType;
                  const roleConfig = getRoleConfigByType(userType);
                  
                  return (
                    <Form.Item
                      name="role"
                      label="角色"
                      rules={[{ required: true, message: '请选择角色' }]}
                      dependencies={['user_type']}
                    >
                      <Select 
                        placeholder={`请选择${userType === 'system' ? '系统' : '企业'}用户角色`}
                        allowClear
                        onClear={() => createForm.setFieldValue('role', undefined)}
                      >
                        {Object.entries(roleConfig).map(([key, config]) => (
                          <Option key={key} value={key}>{config.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['profile', 'name']} label="姓名">
                <Input placeholder="请输入真实姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['profile', 'phone']} label="电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={['profile', 'department']} label="部门">
            <Input placeholder="请输入部门" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            编辑用户
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingUser(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        width={700}
        okText="保存更改"
        cancelText="取消"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item
            name="user_type"
            label="用户类型"
            rules={[{ required: true, message: '请选择用户类型' }]}
          >
            <Radio.Group 
              onChange={(e) => {
                const newUserType = e.target.value;
                handleUserTypeChange(newUserType);
                // 清空角色选择
                editForm.setFieldValue('role', undefined);
              }}
            >
              <Radio value="system">
                <Space>
                  <BuildOutlined />
                  系统用户
                </Space>
              </Radio>
              <Radio value="company">
                <Space>
                  <BankOutlined />
                  企业用户
                </Space>
              </Radio>
            </Radio.Group>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 50, message: '用户名长度为3-50个字符' }
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          
          {/* 企业用户需要选择企业 */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.user_type !== current.user_type}
          >
            {({ getFieldValue }) => {
              const userType = getFieldValue('user_type');
              return userType === 'company' ? (
                <Form.Item
                  name="company_id"
                  label="所属企业"
                  rules={[{ required: true, message: '请选择所属企业' }]}
                >
                  <EnterpriseSelector 
                    placeholder="请选择企业"
                    onChange={(value, enterprise) => {
                      // 保持兼容性，同时支持新旧字段
                      if (createModalVisible) {
                        createForm.setFieldsValue({
                          company_id: value,
                          enterprise_id: value
                        });
                      }
                      if (editModalVisible) {
                        editForm.setFieldsValue({
                          company_id: value,
                          enterprise_id: value
                        });
                      }
                    }}
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, current) => prev.user_type !== current.user_type}
              >
                {({ getFieldValue }) => {
                  const userType = getFieldValue('user_type') || selectedUserType;
                  const roleConfig = getRoleConfigByType(userType);
                  
                  return (
                    <Form.Item
                      name="role"
                      label="角色"
                      rules={[{ required: true, message: '请选择角色' }]}
                      dependencies={['user_type']}
                    >
                      <Select 
                        placeholder={`请选择${userType === 'system' ? '系统' : '企业'}用户角色`}
                        allowClear
                        onClear={() => editForm.setFieldValue('role', undefined)}
                      >
                        {Object.entries(roleConfig).map(([key, config]) => (
                          <Option key={key} value={key}>{config.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {Object.entries(USER_STATUS_CONFIG).map(([key, config]) => (
                    <Option key={key} value={key}>{config.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['profile', 'name']} label="姓名">
                <Input placeholder="请输入真实姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['profile', 'phone']} label="电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={['profile', 'department']} label="部门">
            <Input placeholder="请输入部门" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            {`重置密码 - ${resetPasswordUser?.username}`}
          </Space>
        }
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          setResetPasswordUser(null);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
        okText="重置密码"
        cancelText="取消"
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;