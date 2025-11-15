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
  Breadcrumb,
  Popover,
  Checkbox,
  Divider,
  InputNumber
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
  BankOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
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
import userManagementService from '../services/userManagementService';
// import CompanyService from '../services/companyService'; // Removed - company service no longer exists
import enterpriseService from '../services/enterpriseService';
import EnterpriseSelector from '../components/EnterpriseSelector';
import DepartmentSelector from '../components/DepartmentSelector';
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

  // 企业归属管理状态
  const [selectedEnterpriseIdForDept, setSelectedEnterpriseIdForDept] = useState<number | undefined>(undefined);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

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
        return;
      } catch (enterpriseError) {
        console.warn('⚠️ 新企业系统不可用，回退到旧系统:', enterpriseError);
      }
      
      // 回退到旧的公司系统API
      // ✅ FIXED - Use getEnterprises instead of getCompanies (TS2339)
      const response = await enterpriseService.getEnterprises(
        1, // page
        100, // pageSize
        { status: 'active' } // filters
      );
      
      // ✅ FIXED - Use company.name instead of company.companyName (TS2339)
      const companiesList = response.data.map(company => ({
        id: company.id,
        name: company.name,
        companyName: company.name,
        // 保留原始数据以备将来使用
        originalData: company
      }));
      
      setCompanies(companiesList);
      
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
      // ✅ FIXED - Use getEnterprises with search filter (TS2339)
      const response = await enterpriseService.getEnterprises(1, 100, { search: keyword });

      // ✅ FIXED - Use company.name directly (TS2339)
      const companiesList = response.data.map(company => ({
        id: company.id,
        name: company.name,
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

  // 列显示自定义状态
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'user_info', 'type_role', 'status', 'company_dept', 'login_info', 'actions'
  ]);
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false);

  // 排序状态
  // ✅ FIXED - Allow empty string in sortOrder type (TS2345)
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');

  // 获取用户列表数据
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const data = await userManagementService.getUserList(searchParams);
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
      setStatsLoading(true);
      const data = await userManagementService.getUserStats();
      setUserStats(data);
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

  // 统计数据筛选处理函数
  const handleStatFilter = useCallback((filterType: string, value?: any) => {
    let newParams: any = { page: 1 };
    
    switch (filterType) {
      case 'total':
        // 显示所有用户，清空筛选条件
        newParams = { page: 1, page_size: searchParams.page_size };
        break;
      case 'active':
        newParams = { ...searchParams, status: 'active', page: 1 };
        break;
      case 'admin':
        newParams = { ...searchParams, role: 'admin', page: 1 };
        break;
      case 'company':
        newParams = { ...searchParams, user_type: 'company', page: 1 };
        break;
      case 'recent':
        // 最近注册用户（暂时无法实现时间范围筛选，显示所有用户）
        // TODO: 后端需要支持时间范围筛选参数，如created_after
        newParams = { ...searchParams, page: 1 };
        break;
      case 'inactive':
        // 显示停用和暂停的用户，需要支持多个状态，这里优先显示停用用户
        // 注意：后端可能需要支持多状态筛选，暂时使用inactive
        newParams = { ...searchParams, status: 'inactive', page: 1 };
        break;
      default:
        return;
    }
    
    setSearchParams(newParams);
  }, [searchParams]);

  // 处理筛选
  const handleFilter = useCallback((key: string, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  }, []);

  // 处理分页和排序
  const handleTableChange = useCallback((pagination: unknown, filters: any, sorter: any) => {
    const newSearchParams: any = {
      ...searchParams,
      page: (pagination as any).current,
      page_size: (pagination as any).pageSize
    };

    // 处理排序
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
      newSearchParams.sort_field = sorter.field;
      newSearchParams.sort_order = sorter.order;
    } else {
      setSortField('');
      setSortOrder('');
      delete newSearchParams.sort_field;
      delete newSearchParams.sort_order;
    }

    setSearchParams(newSearchParams);
  }, [searchParams]);

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
      
      await userManagementService.createUser(values);
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
  const handleEditUser = useCallback(async (values: any) => {
    if (!editingUser) return;

    try {
      // 1. 更新用户基本信息
      const basicUpdateData: UserUpdateRequest = {
        username: values.username,
        email: values.email,
        user_type: values.user_type,
        role: values.role,
        status: values.status,
        profile: values.profile
      };

      await userManagementService.updateUser(editingUser.id, basicUpdateData);

      // 2. 更新企业归属信息（如果有修改）
      const enterpriseData: any = {};
      let hasEnterpriseChanges = false;

      if (values.company_id !== undefined) {
        enterpriseData.company_id = values.company_id || null;
        hasEnterpriseChanges = true;
      }
      if (values.enterprise_id_for_mgmt !== undefined) {
        enterpriseData.enterprise_id = values.enterprise_id_for_mgmt || null;
        hasEnterpriseChanges = true;
      }
      if (values.department_id_for_mgmt !== undefined) {
        enterpriseData.department_id = values.department_id_for_mgmt || null;
        hasEnterpriseChanges = true;
      }
      if (values.position_for_mgmt !== undefined) {
        enterpriseData.position = values.position_for_mgmt || null;
        hasEnterpriseChanges = true;
      }
      if (values.sync_to_enterprise !== undefined) {
        enterpriseData.sync_to_enterprise = values.sync_to_enterprise;
        hasEnterpriseChanges = true;
      }

      // 如果有企业归属字段的更改，调用企业归属更新API
      if (hasEnterpriseChanges && Object.keys(enterpriseData).length > 0) {
        try {
          await userManagementService.updateUserEnterprise(editingUser.id, enterpriseData);
          message.success('用户信息和企业归属更新成功');
        } catch (enterpriseError) {
          console.error('企业归属更新失败:', enterpriseError);
          message.warning('用户基本信息已更新，但企业归属更新失败');
        }
      } else {
        message.success('用户信息更新成功');
      }

      setEditModalVisible(false);
      setEditingUser(null);
      editForm.resetFields();
      setSelectedEnterpriseIdForDept(undefined);
      refreshUsers();
      refreshStats();
    } catch (error) {
      console.error('用户信息更新失败:', error);
      message.error('用户信息更新失败');
    }
  }, [editingUser, editForm, refreshUsers, refreshStats]);

  // 重置密码
  const handleResetPassword = useCallback(async (values: { new_password: string }) => {
    if (!resetPasswordUser) return;
    
    try {
      await userManagementService.resetUserPassword(resetPasswordUser.id, values);
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
      await userManagementService.deleteUser(user.id);
      message.success('用户删除成功');
      refreshUsers();
      refreshStats();
    } catch (error) {
      message.error('用户删除失败');
    }
  }, [refreshUsers, refreshStats]);

  // 更新用户状态
  const handleUpdateStatus = useCallback(async (user: User, status: UserStatus) => {
    if (!user || !user.id) {
      message.error('用户信息无效');
      return;
    }

    try {
      await userManagementService.updateUserStatus(user.id, status);
      message.success('用户状态更新成功');
      refreshUsers();
      refreshStats();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      if (error.message?.includes('not found') || error.message?.includes('deleted')) {
        message.error('用户不存在或已被删除，正在刷新页面...');
        setTimeout(() => {
          refreshUsers();
          refreshStats();
        }, 1500);
      } else {
        message.error('用户状态更新失败');
      }
    }
  }, [refreshUsers, refreshStats]);

  // 批量操作
  const handleBatchOperation = useCallback(async (action: 'activate' | 'suspend' | 'delete') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }

    try {
      await userManagementService.batchUpdateUsers(
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
      const blob = await userManagementService.exportUsers(searchParams);
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
  const openEditModal = useCallback(async (user: User) => {
    setEditingUser(user);

    // 基本信息
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      enterprise_id: user.enterprise_id,
      role: user.role,
      status: user.status,
      profile: user.profile
    });
    setSelectedUserType(user.user_type);

    // 加载企业归属详情
    try {
      const enterpriseDetails = await userManagementService.getUserEnterpriseDetails(user.id);

      // 设置企业归属管理字段
      editForm.setFieldsValue({
        company_id: enterpriseDetails.user.company_id,
        enterprise_id_for_mgmt: enterpriseDetails.enterprise_user?.enterprise_id,
        department_id_for_mgmt: enterpriseDetails.enterprise_user?.department_id,
        position_for_mgmt: enterpriseDetails.enterprise_user?.position,
        sync_to_enterprise: false // 默认不勾选
      });

      // 设置企业ID以便部门选择器使用
      if (enterpriseDetails.enterprise_user?.enterprise_id) {
        setSelectedEnterpriseIdForDept(enterpriseDetails.enterprise_user.enterprise_id);
      }
    } catch (error) {
      console.error('加载企业归属信息失败:', error);
      // 如果加载失败，不影响基本信息编辑
    }

    setEditModalVisible(true);
  }, [editForm]);

  // 打开密码重置模态框
  const openPasswordModal = useCallback((user: User) => {
    setResetPasswordUser(user);
    setPasswordModalVisible(true);
  }, []);

  // 所有可用列定义
  const allColumns = useMemo(() => ({
    user_info: {
      title: '用户信息',
      key: 'user_info',
      dataIndex: 'username',
      fixed: 'left',
      width: 180,
      sorter: true,
      sortOrder: sortField === 'username' ? sortOrder : null,
      render: (_, user) => {
        // 根据用户类型生成不同的详情页链接
        const getDetailLink = (user: User) => {
          if (user.user_type === 'enterprise' && user.enterprise_id) {
            // 企业用户：跳转到企业用户详情页
            return `/enterprises/${user.enterprise_id}/users/${user.id}`;
          } else {
            // 系统用户：跳转到旧的用户详情页
            return `/users/${user.id}`;
          }
        };

        return (
          <Link to={getDetailLink(user)} style={{ color: 'inherit', textDecoration: 'none' }}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                size={32}
                src={user.profile?.avatar}
                icon={user.user_type === 'system' ? <BuildOutlined /> : <BankOutlined />}
                style={{ backgroundColor: USER_TYPE_CONFIG[user.user_type].color }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '13px', color: '#1890ff' }}>
                  {user.profile?.name || user.username}
                </div>
                <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.2' }}>
                  @{user.username}
                </div>
                <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.2' }}>
                  {user.email}
                </div>
              </div>
            </Space>
          </Link>
        );
      },
    },
    type_role: {
      title: '类型/角色',
      key: 'type_role',
      dataIndex: 'user_type',
      width: 120,
      sorter: true,
      sortOrder: sortField === 'user_type' ? sortOrder : null,
      render: (_, user) => (
        <div>
          <Tag 
            
            color={USER_TYPE_CONFIG[user.user_type].color}
            style={{ marginBottom: '2px' }}
          >
            {USER_TYPE_CONFIG[user.user_type].label}
          </Tag>
          <br />
          <Tag  color={USER_ROLE_CONFIG[user.role]?.color}>
            {USER_ROLE_CONFIG[user.role]?.label || user.role}
          </Tag>
        </div>
      ),
    },
    status: {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      sorter: true,
      sortOrder: sortField === 'status' ? sortOrder : null,
      render: (status: UserStatus) => (
        <Badge 
          
          status={status === 'active' ? 'success' : status === 'inactive' ? 'warning' : 'error'}
          text={USER_STATUS_CONFIG[status].label}
        />
      ),
    },
    company_dept: {
      title: '企业/部门',
      key: 'company_dept',
      dataIndex: 'enterprise_id',
      width: 140,
      sorter: true,
      sortOrder: sortField === 'enterprise_id' ? sortOrder : null,
      render: (_, user) => {
        // 优先使用新的企业系统数据
        const companyInfo = (user.user_type === 'enterprise' || user.user_type === 'company') && user.enterprise_id ?
          (() => {
            // 先从 enterprises 中查找
            const enterprise = enterprises.find(e => e.id === user.enterprise_id);
            if (enterprise) {
              return enterprise.name;
            }
            // 再从 companies 中查找（向后兼容）
            const company = companies.find(c => c.id === user.enterprise_id);
            return company ? company.name : `企业${user.enterprise_id}`;
          })() :
          (user.user_type === 'system' ? '系统用户' : '未关联');
        
        const department = user.profile?.department || '-';
        
        return (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>
              {companyInfo}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {department}
            </div>
          </div>
        );
      },
    },
    login_info: {
      title: '登录信息',
      key: 'login_info',
      dataIndex: 'last_login_at',
      width: 100,
      sorter: true,
      sortOrder: sortField === 'last_login_at' ? sortOrder : null,
      render: (_, user) => (
        <div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {user.last_login_at ? formatTimeAgo(user.last_login_at) : '从未登录'}
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>
            {formatTimeAgo(user.created_at)}
          </div>
        </div>
      ),
    },
    actions: {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, user) => (
        <Space size={4}>
          <PermissionWrapper permission={USER_PERMISSIONS.UPDATE}>
            <Tooltip title="编辑">
              <Button 
                type="text" 
                 
                icon={<EditOutlined />}
                onClick={() => openEditModal(user)}
                style={{ padding: '2px 4px' }}
              />
            </Tooltip>
          </PermissionWrapper>
          <PermissionWrapper permission={USER_PERMISSIONS.UPDATE}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'password',
                    label: '重置密码',
                    icon: <KeyOutlined />,
                    onClick: () => openPasswordModal(user),
                  },
                  { type: 'divider' },
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
              <Tooltip title="更多操作">
                <Button 
                  type="text" 
                   
                  icon={<DownOutlined />} 
                  style={{ padding: '2px 4px' }}
                />
              </Tooltip>
            </Dropdown>
          </PermissionWrapper>
        </Space>
      ),
    }
  }), [sortField, sortOrder, enterprises, companies, openEditModal, openPasswordModal, handleUpdateStatus, handleDeleteUser]);

  // 根据可见列配置过滤列
  const columns = useMemo(() => {
    return visibleColumns.map(key => allColumns[key]).filter(Boolean);
  }, [allColumns, visibleColumns]);

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
        
      </div>

      {/* 紧凑的统计概览 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 8]}>
          <Col xs={12} sm={8} md={6} lg={4}>
            <div 
              style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderRadius: '4px' }}
              onClick={() => handleStatFilter('total')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                {userStats?.total || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>总用户</div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <div 
              style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderRadius: '4px' }}
              onClick={() => handleStatFilter('active')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                {userStats?.by_status?.active || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>活跃用户</div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <div 
              style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderRadius: '4px' }}
              onClick={() => handleStatFilter('admin')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                {userStats?.by_role?.admin || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>管理员</div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <div 
              style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderRadius: '4px' }}
              onClick={() => handleStatFilter('company')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                {(userStats?.by_role?.company_admin || 0) + (userStats?.by_role?.company_user || 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>企业用户</div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <div 
              style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderRadius: '4px' }}
              onClick={() => handleStatFilter('recent')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#13c2c2' }}>
                {userStats?.recent_registrations || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>新注册</div>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <div 
              style={{ textAlign: 'center', padding: '8px 0', cursor: 'pointer', borderRadius: '4px' }}
              onClick={() => handleStatFilter('inactive')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {(userStats?.by_status?.inactive || 0) + (userStats?.by_status?.suspended || 0)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>停用用户</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 操作工具栏 - 紧凑风格 */}
      <Card style={{ marginBottom: 16, padding: '12px 16px' }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={24} md={10} lg={8}>
            <Search
              placeholder="搜索用户名、邮箱、姓名..."
              allowClear
              onSearch={handleSearch}
              
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Select
              mode="multiple"
              placeholder="企业"
              allowClear
              
              style={{ width: '100%' }}
              value={searchParams.enterprise_ids}
              onChange={(value) => handleFilter('enterprise_ids', value)}
              maxTagCount="responsive"
            >
              {enterprises.map(enterprise => (
                <Option key={enterprise.id} value={enterprise.id}>
                  {enterprise.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3}>
            <Select
              placeholder="类型"
              allowClear
              
              style={{ width: '100%' }}
              value={searchParams.user_type}
              onChange={(value) => handleFilter('user_type', value)}
            >
              {Object.entries(USER_TYPE_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3}>
            <Select
              placeholder="角色"
              allowClear
              
              style={{ width: '100%' }}
              value={searchParams.role}
              onChange={(value) => handleFilter('role', value)}
            >
              {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3} lg={3}>
            <Select
              placeholder="状态"
              allowClear
              
              style={{ width: '100%' }}
              value={searchParams.status}
              onChange={(value) => handleFilter('status', value)}
            >
              {Object.entries(USER_STATUS_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={4} lg={4}>
            <Space >
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
                  新增
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
              <Popover
                title="自定义列显示"
                content={
                  <div style={{ width: 200 }}>
                    <Checkbox.Group
                      value={visibleColumns}
                      onChange={setVisibleColumns}
                      style={{ width: '100%' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Checkbox value="user_info">用户信息</Checkbox>
                        <Checkbox value="type_role">类型/角色</Checkbox>
                        <Checkbox value="status">状态</Checkbox>
                        <Checkbox value="company_dept">企业/部门</Checkbox>
                        <Checkbox value="login_info">登录信息</Checkbox>
                        <Checkbox value="actions" disabled>操作</Checkbox>
                      </div>
                    </Checkbox.Group>
                  </div>
                }
                trigger="click"
                placement="bottomRight"
              >
                <Button 
                  icon={<SettingOutlined />}
                  
                  title="列设置"
                />
              </Popover>
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
                  name="enterprise_id"
                  label="所属企业"
                  rules={[{ required: true, message: '请选择所属企业' }]}
                >
                  <EnterpriseSelector 
                    placeholder="请选择企业"
                    onChange={(value, enterprise) => {
                      // ✅ FIXED - Removed duplicate enterprise_id properties (TS1117)
                      if (createModalVisible) {
                        createForm.setFieldsValue({
                          enterprise_id: value
                        });
                      }
                      if (editModalVisible) {
                        editForm.setFieldsValue({
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
                  name="enterprise_id"
                  label="所属企业"
                  rules={[{ required: true, message: '请选择所属企业' }]}
                >
                  <EnterpriseSelector 
                    placeholder="请选择企业"
                    onChange={(value, enterprise) => {
                      // ✅ FIXED - Removed duplicate enterprise_id properties (TS1117)
                      if (createModalVisible) {
                        createForm.setFieldsValue({
                          enterprise_id: value
                        });
                      }
                      if (editModalVisible) {
                        editForm.setFieldsValue({
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

          {/* 企业归属管理区域（仅超级管理员可见）*/}
          <Divider orientation="left">企业归属管理（仅超级管理员）</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="company_id"
                label="公司ID（旧模型）"
                tooltip="向后兼容的公司ID字段"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入公司ID"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enterprise_id_for_mgmt"
                label="企业ID（新模型）"
                tooltip="企业管理系统中的企业ID"
              >
                <EnterpriseSelector
                  placeholder="请选择企业"
                  onChange={(value) => {
                    setSelectedEnterpriseIdForDept(value);
                    // 清空部门选择
                    editForm.setFieldValue('department_id_for_mgmt', undefined);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department_id_for_mgmt"
                label="部门ID"
                tooltip="企业下的部门ID，需先选择企业"
              >
                <DepartmentSelector
                  enterpriseId={selectedEnterpriseIdForDept}
                  placeholder="请先选择企业"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position_for_mgmt"
                label="职位"
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="sync_to_enterprise"
            valuePropName="checked"
            tooltip="是否同步到enterprise_users表（新企业管理系统）"
          >
            <Checkbox>同步到enterprise_users表</Checkbox>
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