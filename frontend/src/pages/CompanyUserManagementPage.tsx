import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
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
  DatePicker,
  Switch,
  Divider,
  Breadcrumb,
  Tabs,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DownOutlined,
  ExportOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CalendarOutlined,
  StopOutlined,
  CheckCircleOutlined,
  BankOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import dayjs from 'dayjs';

import {
  CompanyUserCreateRequest,
  CompanyUserCreateResponse,
  CompanyUserUpdateRequest,
  CompanyUserListParams,
  CompanyUserListResponse,
  CompanyUserStats,
  EnterpriseUserResponse,
  BatchCompanyUserRequest,
} from '../types/user';
import { Company } from '../types/company';
import CompanyUserService from '../services/companyUserService';
import companyService from '../services/companyService';
import CompanyRoleManagement from '../components/CompanyRoleManagement';

const { Search } = Input;
const { Option } = Select;
const { confirm } = Modal;
const { Title, Text } = Typography;

interface CompanyUserManagementPageProps {}

const CompanyUserManagementPage: React.FC<CompanyUserManagementPageProps> = () => {
  // State management
  const [users, setUsers] = useState<EnterpriseUserResponse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyUserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Table state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<CompanyUserListParams>({
    page: 1,
    page_size: 20,
  });

  // Modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<EnterpriseUserResponse | null>(null);

  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Load data functions
  const loadUsers = useCallback(async (params: CompanyUserListParams = filters) => {
    setLoading(true);
    try {
      const response = await CompanyUserService.getCompanyUserList(params);
      console.log('loadUsers response:', response); // 调试日志
      
      // API拦截器处理后，response 应该是 { data: [], total, page } 格式
      console.log('loadUsers response:', response); // 调试日志
      console.log('response type:', typeof response);
      console.log('response is array:', Array.isArray(response));
      console.log('response.data type:', typeof response.data);
      console.log('response.data is array:', Array.isArray(response.data));
      console.log('response.data:', response.data);
      
      // 处理两种可能的数据结构
      if (Array.isArray(response)) {
        // 如果response直接是数组，说明拦截器处理有问题，临时兼容
        console.warn('Response is array, using fallback logic');
        setUsers(response);
        setPagination(prev => ({ ...prev, total: response.length }));
      } else if (response && typeof response === 'object' && Array.isArray(response.data)) {
        // 正常情况：response = {data: [], total, page}
        console.log('Using normal structure: {data: [], total, page}');
        setUsers(response.data);
        setPagination(prev => ({
          ...prev,
          current: response.page || 1,
          pageSize: response.page_size || 20,
          total: response.total || 0,
        }));
      } else {
        console.error('Unexpected response structure:', response);
        setUsers([]);
      }
    } catch (error) {
      message.error('获取企业用户列表失败');
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadCompanies = useCallback(async () => {
    try {
      const response = await companyService.getCompanies({ page: 1, pageSize: 100 });
      setCompanies(response.data);
    } catch (error) {
      message.error('获取企业列表失败');
      console.error('Load companies error:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await CompanyUserService.getCompanyUserStats();
      setStats(statsData);
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('Load stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadUsers();
    loadCompanies();
    loadStats();
  }, [loadUsers, loadCompanies, loadStats]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    const newFilters = { ...filters, search: value, page: 1 };
    setFilters(newFilters);
    loadUsers(newFilters);
  }, [filters, loadUsers]);

  // Handle filter change
  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    loadUsers(newFilters);
  }, [filters, loadUsers]);

  // Handle pagination change
  const handleTableChange = useCallback((newPagination: any) => {
    const newFilters = {
      ...filters,
      page: newPagination.current,
      page_size: newPagination.pageSize,
    };
    setFilters(newFilters);
    loadUsers(newFilters);
  }, [filters, loadUsers]);

  // Handle create user
  const handleCreateUser = useCallback(async (values: CompanyUserCreateRequest) => {
    console.log('handleCreateUser called with values:', values);
    
    try {
      console.log('Calling CompanyUserService.createCompanyUser...');
      const response = await CompanyUserService.createCompanyUser(values);
      console.log('Create user response:', response);
      
      // 检查响应数据结构
      if (!response || typeof response !== 'object') {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
      
      // 获取密码，支持多种可能的数据结构
      // 修复后的API拦截器应该正确解包，密码应该在response.password中
      const password = (response as any)?.password || (response as any)?.data?.password || (response as any)?.user?.password;
      
      if (!password) {
        console.error('No password in response:', response);
        throw new Error('Server did not return initial password');
      }
      
      console.log('Password extracted successfully:', password);
      
      // 立即关闭模态框并刷新列表
      setCreateModalVisible(false);
      createForm.resetFields();
      
      // 清除筛选条件，确保新用户能显示
      const defaultFilters = { page: 1, page_size: 20 };
      setFilters(defaultFilters);
      loadUsers(defaultFilters);
      loadStats();
      
      // 显示成功消息和密码
      message.success(`企业用户创建成功！初始密码：${password}`, 10); // 10秒显示
      
      // 也可以用模态框显示密码，但不依赖用户操作来刷新列表
      Modal.info({
        title: '用户创建成功',
        content: (
          <div>
            <p>用户 <strong>{values.username}</strong> 创建成功！</p>
            <p>初始密码：<strong style={{ color: '#f50' }}>{password}</strong></p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              请将此密码告知用户，并要求用户首次登录后修改密码。
            </p>
            <p style={{ color: '#1890ff', fontSize: '12px' }}>
              已自动清除筛选条件以显示新用户。
            </p>
          </div>
        ),
      });
    } catch (error) {
      console.error('Create user error - detailed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        isAppError: error?.constructor?.name
      });
      
      // 无论是否出错，都刷新用户列表（以防用户实际创建成功了）
      // 并清除筛选条件
      const defaultFilters = { page: 1, page_size: 20 };
      setFilters(defaultFilters);
      loadUsers(defaultFilters);
      loadStats();
      
      message.error(error instanceof Error ? error.message : '创建企业用户失败');
    }
  }, [createForm, loadUsers, loadStats, setFilters]);

  // Handle update user
  const handleUpdateUser = useCallback(async (values: CompanyUserUpdateRequest) => {
    if (!currentUser) return;
    
    try {
      await CompanyUserService.updateCompanyUser(currentUser.id, values);
      message.success('企业用户更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentUser(null);
      loadUsers();
      loadStats();
    } catch (error) {
      message.error('更新企业用户失败');
      console.error('Update user error:', error);
    }
  }, [currentUser, editForm, loadUsers, loadStats]);

  // Handle status change
  const handleStatusChange = useCallback(async (user: EnterpriseUserResponse, newStatus: string) => {
    try {
      await CompanyUserService.updateCompanyUserStatus(user.id, { status: newStatus as 'active' | 'inactive' });
      message.success(`用户状态已更新为${newStatus === 'active' ? '正常' : '停用'}`);
      loadUsers();
      loadStats();
    } catch (error) {
      message.error('更新用户状态失败');
      console.error('Update status error:', error);
    }
  }, [loadUsers, loadStats]);

  // Handle delete user
  const handleDeleteUser = useCallback(async (user: EnterpriseUserResponse) => {
    confirm({
      title: '确认删除',
      content: `确定要删除用户 "${CompanyUserService.getDisplayName(user)}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await CompanyUserService.deleteCompanyUser(user.id);
          message.success('企业用户删除成功');
          loadUsers();
          loadStats();
        } catch (error) {
          message.error('删除企业用户失败');
          console.error('Delete user error:', error);
        }
      },
    });
  }, [loadUsers, loadStats]);

  // Handle batch operations
  const handleBatchOperation = useCallback(async (action: BatchCompanyUserRequest['action']) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的用户');
      return;
    }

    const actionText = {
      activate: '激活',
      deactivate: '停用',
      extend_expiry: '延长有效期',
    }[action];

    confirm({
      title: `批量${actionText}`,
      content: `确定要${actionText}选中的 ${selectedRowKeys.length} 个用户吗？`,
      onOk: async () => {
        try {
          await CompanyUserService.batchUpdateCompanyUsers({
            user_ids: selectedRowKeys as number[],
            action,
          });
          message.success(`批量${actionText}成功`);
          setSelectedRowKeys([]);
          loadUsers();
          loadStats();
        } catch (error) {
          message.error(`批量${actionText}失败`);
          console.error('Batch operation error:', error);
        }
      },
    });
  }, [selectedRowKeys, loadUsers, loadStats]);

  // Handle edit modal
  const showEditModal = useCallback((user: EnterpriseUserResponse) => {
    setCurrentUser(user);
    editForm.setFieldsValue({
      contact_person_name: user.contact_person_name,
      contact_phone: user.contact_phone,
      department_title: user.department_title,
      is_primary_contact: user.is_primary_contact,
      account_expires_at: user.account_expires_at ? dayjs(user.account_expires_at) : undefined,
      notes: user.notes,
      status: user.status,
    });
    setEditModalVisible(true);
  }, [editForm]);

  // Table columns
  const columns: ColumnsType<EnterpriseUserResponse> = useMemo(() => [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <strong>{record.contact_person_name}</strong>
            {record.is_primary_contact && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                <StarOutlined /> 主要联系人
              </Tag>
            )}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            <UserOutlined /> {record.username}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            <MailOutlined /> {record.email}
          </div>
        </div>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            <PhoneOutlined /> {record.contact_phone}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            <IdcardOutlined /> {record.department_title}
          </div>
        </div>
      ),
    },
    {
      title: '所属企业',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 150,
      render: (text) => (
        <div>
          <BankOutlined /> {text}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const statusConfig = CompanyUserService.getStatusConfig(record.status);
        const isExpired = CompanyUserService.isAccountExpired(record);
        const isExpiringSoon = CompanyUserService.isAccountExpiringSoon(record);
        
        return (
          <div>
            <Badge
              status={statusConfig.color as any}
              text={statusConfig.text}
            />
            {isExpired && (
              <Tag color="red" style={{ marginTop: 4 }}>
                已过期
              </Tag>
            )}
            {!isExpired && isExpiringSoon && (
              <Tag color="orange" style={{ marginTop: 4 }}>
                即将过期
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '最后登录',
      key: 'lastLogin',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{CompanyUserService.formatLastLogin(record.last_login_at)}</div>
          {record.account_expires_at && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              <CalendarOutlined /> 到期: {dayjs(record.account_expires_at).format('YYYY-MM-DD')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => showEditModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'active' ? '停用' : '激活'}>
            <Button
              type="text"
              icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              size="small"
              onClick={() => handleStatusChange(record, record.status === 'active' ? 'inactive' : 'active')}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDeleteUser(record)}
              disabled={!CompanyUserService.canDeleteUser(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ], [showEditModal, handleStatusChange, handleDeleteUser]);

  // Row selection
  const rowSelection: TableRowSelection<EnterpriseUserResponse> = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  // Batch operation menu
  const batchMenu = {
    items: [
      {
        key: 'activate',
        label: '批量激活',
        icon: <CheckCircleOutlined />,
        onClick: () => handleBatchOperation('activate'),
      },
      {
        key: 'deactivate',
        label: '批量停用',
        icon: <StopOutlined />,
        onClick: () => handleBatchOperation('deactivate'),
      },
      {
        key: 'extend_expiry',
        label: '延长有效期',
        icon: <CalendarOutlined />,
        onClick: () => handleBatchOperation('extend_expiry'),
      },
    ],
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>系统管理</Breadcrumb.Item>
        <Breadcrumb.Item>用户管理</Breadcrumb.Item>
        <Breadcrumb.Item>企业用户管理</Breadcrumb.Item>
      </Breadcrumb>
      
      <div style={{ marginBottom: '16px' }}>
        <Title level={2}>
          <BankOutlined /> 企业用户管理
        </Title>
        <Text type="secondary">管理企业客户的用户账户、权限和访问控制</Text>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={stats.total}
                prefix={<UserOutlined />}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="主要联系人"
                value={stats.primary_contacts}
                prefix={<StarOutlined />}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="即将过期"
                value={stats.expiring_accounts}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#faad14' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本月新增"
                value={stats.recent_registrations}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={statsLoading}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content with Tabs */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: (
                <span>
                  <UserOutlined />
                  用户管理
                </span>
              ),
              children: (
                <>
                  {/* Toolbar */}
                  <div style={{ marginBottom: 16 }}>
                    <Row justify="space-between" align="middle" gutter={[16, 16]}>
                      <Col xs={24} lg={12}>
                        <Space wrap>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setCreateModalVisible(true)}
                          >
                            新建企业用户
                          </Button>
                          {selectedRowKeys.length > 0 && (
                            <Dropdown menu={batchMenu} placement="bottomLeft">
                              <Button>
                                批量操作 ({selectedRowKeys.length}个用户) <DownOutlined />
                              </Button>
                            </Dropdown>
                          )}
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              loadUsers();
                              loadStats();
                            }}
                          >
                            刷新
                          </Button>
                          <Button
                            icon={<ExportOutlined />}
                            onClick={() => message.info('导出功能开发中...')}
                          >
                            导出数据
                          </Button>
                        </Space>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Row gutter={[8, 8]} justify="end">
                          <Col xs={24} sm={8}>
                            <Select
                              placeholder="选择企业"
                    style={{ width: '100%' }}
                    allowClear
                    value={filters.company_id}
                    onChange={(value) => handleFilterChange('company_id', value)}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown)?.toString()?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {companies.map(company => (
                      <Option key={company.id} value={company.id}>
                        {company.companyName}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={6}>
                  <Select
                    placeholder="用户状态"
                    style={{ width: '100%' }}
                    allowClear
                    value={filters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                  >
                    <Option value="active">正常</Option>
                    <Option value="inactive">停用</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={10}>
                  <Search
                    placeholder="搜索用户名、姓名、邮箱、电话..."
                    style={{ width: '100%' }}
                    onSearch={handleSearch}
                    enterButton
                  />
                </Col>
              </Row>
            </Col>
          </Row>
          <Row style={{ marginTop: 8 }}>
            <Col span={24}>
              <Text type="secondary">
                共 {pagination.total} 个企业用户，当前显示第 {pagination.current} 页
                {filters.company_id && (
                  <span>，筛选企业: {companies.find(c => c.id === filters.company_id)?.companyName}</span>
                )}
              </Text>
            </Col>
          </Row>
        </div>

        {/* Table */}
        <div style={{ marginBottom: 16 }}>
          <div>调试信息：用户数量 {users.length}，加载状态 {loading ? '加载中' : '已完成'}</div>
          <div>分页信息：第 {pagination.current} 页，每页 {pagination.pageSize} 条，总计 {pagination.total} 条</div>
        </div>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
                </>
              )
            },
            {
              key: 'roles',
              label: (
                <span>
                  <TeamOutlined />
                  角色管理
                </span>
              ),
              children: (
                <CompanyRoleManagement
                  onRoleUpdate={() => {
                    loadUsers();
                    loadStats();
                  }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="新建企业用户"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="company_id"
                label="所属企业"
                rules={[{ required: true, message: '请选择企业' }]}
              >
                <Select
                  placeholder="选择企业"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown)?.toString()?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {companies.map(company => (
                    <Option key={company.id} value={company.id}>
                      {company.companyName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名不能少于3个字符' },
                ]}
              >
                <Input placeholder="输入用户名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="输入邮箱地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact_person_name"
                label="联系人姓名"
                rules={[{ required: true, message: '请输入联系人姓名' }]}
              >
                <Input placeholder="输入真实姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_phone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                ]}
              >
                <Input placeholder="输入手机号码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department_title"
                label="职务/部门"
                rules={[{ required: true, message: '请输入职务或部门' }]}
              >
                <Input placeholder="如：技术总监、产品经理" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_primary_contact"
                label="主要联系人"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="account_expires_at"
                label="账号有效期"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="选择过期时间"
                  disabledDate={(current) => current && current < dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="输入备注信息（可选）"
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建用户
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="编辑企业用户"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCurrentUser(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_person_name"
                label="联系人姓名"
                rules={[{ required: true, message: '请输入联系人姓名' }]}
              >
                <Input placeholder="输入真实姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact_phone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                ]}
              >
                <Input placeholder="输入手机号码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department_title"
                label="职务/部门"
                rules={[{ required: true, message: '请输入职务或部门' }]}
              >
                <Input placeholder="如：技术总监、产品经理" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="用户状态"
                rules={[{ required: true, message: '请选择用户状态' }]}
              >
                <Select>
                  <Option value="active">正常</Option>
                  <Option value="inactive">停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_primary_contact"
                label="主要联系人"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="account_expires_at"
                label="账号有效期"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="选择过期时间"
                  disabledDate={(current) => current && current < dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="输入备注信息（可选）"
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
                setCurrentUser(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                更新用户
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyUserManagementPage;