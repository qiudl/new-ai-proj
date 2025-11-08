import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  message,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Breadcrumb,
  Badge,
  Tooltip,
  Popconfirm,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  HomeOutlined,
  BankOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import enterpriseService, { EnterpriseUserUpdateRequest } from '../services/enterpriseService';
import {
  Enterprise,
  EnterpriseUser,
  EnterpriseUserRequest,
  EnterpriseDepartment,
  ACCESS_LEVEL_OPTIONS,
  USER_STATUS_OPTIONS
} from '../types/enterprise';

const { Title, Text } = Typography;
const { Option } = Select;

// ✅ FIXED - Remove type parameter and use type assertion for useParams (TS2344)
const EnterpriseUserManagementPage: React.FC = () => {
  const { enterpriseId } = useParams() as { enterpriseId: string };
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [users, setUsers] = useState<EnterpriseUser[]>([]);
  const [departments, setDepartments] = useState<EnterpriseDepartment[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<EnterpriseUser | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [form] = Form.useForm();

  const enterpriseIdNum = enterpriseId ? parseInt(enterpriseId, 10) : 0;

  // 使用useMemo生成部门选项列表
  const departmentOptions = useMemo(() => {
    console.log('🔧 useMemo: 重新计算部门选项列表');
    console.log('📊 当前部门数据:', departments);
    console.log('📊 部门数量:', departments?.length);
    
    if (!departments || departments.length === 0) {
      console.log('⚠️ 部门数据为空，返回空选项列表');
      return [];
    }
    
    const options = departments.map((dept, index) => {
      const option = {
        value: dept.id,
        label: dept.name,
        key: dept.id
      };
      console.log(`🔧 生成选项 ${index + 1}:`, option);
      return option;
    });
    
    console.log('✅ 最终部门选项列表:', options);
    return options;
  }, [departments]);

  // 加载企业信息
  const loadEnterprise = async () => {
    if (!enterpriseIdNum) return;
    try {
      const result = await enterpriseService.getEnterprise(enterpriseIdNum);
      setEnterprise(result);
    } catch (error) {
      console.error('加载企业信息失败:', error);
      message.error('加载企业信息失败');
    }
  };

  // 加载用户数据
  const loadUsers = async (page = 1, pageSize = 20) => {
    if (!enterpriseIdNum) return;
    setLoading(true);
    try {
      const result = await enterpriseService.getEnterpriseUsers(enterpriseIdNum, page, pageSize);
      setUsers(result?.data || []);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: result?.pagination?.total || 0,
      });
    } catch (error) {
      console.error('加载用户数据失败:', error);
      message.error('加载用户数据失败');
      setUsers([]); // 确保错误时也设置为空数组
      setPagination({
        current: 1,
        pageSize: 20,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载部门数据
  const loadDepartments = async () => {
    if (!enterpriseIdNum) {
      console.log('⚠️ 企业ID无效，跳过部门加载');
      return;
    }
    
    console.log('🔍 ========== 开始加载企业部门 ==========');
    console.log('🏢 企业ID:', enterpriseIdNum);
    console.log('⏳ 设置加载状态为 true...');
    setDepartmentsLoading(true);
    
    try {
      console.log('📡 调用API: enterpriseService.getEnterpriseDepartments()');
      const result = await enterpriseService.getEnterpriseDepartments(enterpriseIdNum, 1, 100);
      console.log('✅ 部门API调用成功！');
      console.log('📦 原始API响应:', result);
      console.log('📋 解析的部门数据:', result?.data);
      console.log('📊 部门数量:', result?.data?.length);
      
      if (result?.data && Array.isArray(result.data)) {
        console.log('📝 部门详细列表:');
        result.data.forEach((dept, index) => {
          console.log(`  ${index + 1}. ID:${dept.id} | 名称:${dept.name} | 状态:${dept.status}`);
        });
      }
      
      const departmentsList = result?.data || [];
      setDepartments(departmentsList);
      console.log('🔄 部门状态已更新');
      console.log('💾 存储的部门数据:', departmentsList);
      
    } catch (error) {
      console.error('❌ 加载部门数据失败:', error);
      console.error('❌ 错误详情:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      setDepartments([]); // 确保错误时也设置为空数组
      console.log('🔄 部门状态已重置为空数组');
    } finally {
      console.log('⏳ 设置加载状态为 false...');
      setDepartmentsLoading(false);
      console.log('🔍 ========== 部门加载完成 ==========');
    }
  };

  useEffect(() => {
    if (!enterpriseIdNum) {
      message.error('无效的企业ID');
      navigate('/enterprises');
      return;
    }
    loadEnterprise();
    loadUsers();
    loadDepartments();
  }, [enterpriseIdNum]);

  // 处理表格分页变化
  const handleTableChange = (pagination: any) => {
    loadUsers(pagination.current, pagination.pageSize);
  };

  // 打开创建/编辑对话框
  const openModal = async (user?: EnterpriseUser) => {
    console.log('🔍 ========== 打开用户编辑/创建对话框 ==========');
    console.log('👤 编辑用户:', user);
    console.log('🏢 当前部门列表:', departments);
    console.log('📊 部门数量:', departments?.length);
    console.log('✅ 部门加载状态:', departments ? '已加载' : '未加载');
    
    // 确保部门数据在对话框打开时已加载
    if (!departments || departments.length === 0) {
      console.log('🔄 部门数据为空，重新加载...');
      await loadDepartments();
      console.log('🔄 重新加载后部门数据:', departments);
    }
    
    setEditingUser(user || null);
    
    // 详细日志Form数据设置过程
    if (user) {
      console.log('📝 设置编辑用户表单数据:');
      console.log('  - 用户ID:', user.id);
      console.log('  - 用户名:', user.username);
      console.log('  - 姓名:', user.name);
      console.log('  - 部门ID:', user.department_id);
      console.log('  - 部门名称:', user.department_name);
      console.log('  - 完整用户数据:', user);
      
      form.setFieldsValue({
        ...user,
        // 确保部门ID被正确设置
        department_id: user.department_id
      });
      
      // 验证表单数据设置结果
      setTimeout(() => {
        const formValues = form.getFieldsValue();
        console.log('✅ 表单数据设置完成，当前值:', formValues);
        console.log('✅ 部门字段值:', formValues.department_id);
      }, 100);
    } else {
      console.log('📝 设置新用户默认表单数据');
      form.resetFields();
      form.setFieldsValue({
        status: 'active',
        access_level: 2,
        is_primary_contact: false,
      });
    }
    
    setModalVisible(true);
    console.log('🔍 ========== 对话框打开完成 ==========');
  };

  // 关闭对话框
  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  // 保存用户
  const saveUser = async (values: any) => {
    try {
      console.log('💾 开始保存用户，编辑模式:', !!editingUser);
      console.log('📝 表单数据:', values);
      
      if (editingUser) {
        // 更新用户
        console.log('🔄 更新用户ID:', editingUser.id);
        const updateData: EnterpriseUserUpdateRequest = {
          username: values.username,
          name: values.name,
          email: values.email,
          phone: values.phone,
          position: values.position,
          department_id: values.department_id,
          access_level: values.access_level,
          status: values.status,
          is_primary_contact: values.is_primary_contact,
          enterprise_id: enterpriseIdNum
        };
        console.log('📤 更新数据:', updateData);

        // ✅ FIXED - Type assertion for Partial<EnterpriseUserRequest> (TS2345)
        const result = await enterpriseService.updateEnterpriseUser(enterpriseIdNum, editingUser.id, updateData as Partial<EnterpriseUserRequest>);
        console.log('✅ 更新成功:', result);
        message.success('更新用户成功');
      } else {
        // 创建用户
        console.log('➕ 创建新用户');
        const createData: EnterpriseUserRequest = values;
        console.log('📤 创建数据:', createData);
        
        const result = await enterpriseService.createEnterpriseUser(enterpriseIdNum, createData);
        console.log('✅ 创建成功:', result);
        
        if (result.generated_password) {
          Modal.info({
            title: '用户创建成功',
            content: (
              <div>
                <p>用户已成功创建！</p>
                <p><strong>生成的密码：</strong> <code>{result.generated_password}</code></p>
                <p style={{ color: '#fa8c16' }}>请将密码告知用户，并建议用户首次登录后修改密码。</p>
              </div>
            ),
            width: 500,
          });
        } else {
          message.success('创建用户成功');
        }
      }
      closeModal();
      loadUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('💥 保存用户失败:', error);
      console.error('💥 错误详情:', error.response?.data || error.message);
      message.error(editingUser ? '更新用户失败' : '创建用户失败');
    }
  };

  // 获取访问级别文本
  const getAccessLevelText = (level: number): string => {
    const option = ACCESS_LEVEL_OPTIONS.find(opt => opt.value === level);
    return option ? option.label as string : `级别 ${level}`;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'suspended': return 'red';
      default: return 'default';
    }
  };

  // 表格列定义
  const columns: ColumnsType<EnterpriseUser> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户信息',
      key: 'user_info',
      render: (_, record: EnterpriseUser) => (
        <div>
          <div>
            <Text strong>{record.name}</Text>
            {record.is_primary_contact && (
              <Tag color="gold" style={{ marginLeft: 8 }}>主要联系人</Tag>
            )}
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              @{record.username}
            </Text>
          </div>
          {record.email && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <MailOutlined /> {record.email}
              </Text>
            </div>
          )}
          {record.phone && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <PhoneOutlined /> {record.phone}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      render: (text: string) => text || <Text type="secondary">未设置</Text>,
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      key: 'department',
      render: (text: string) => text || <Text type="secondary">未分配</Text>,
    },
    {
      title: '访问级别',
      dataIndex: 'access_level',
      key: 'access_level',
      render: (level: number) => (
        <Tag color="blue">{getAccessLevelText(level)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text: string, record: EnterpriseUser) => (
        <Tag color={getStatusColor(text)}>
          {record.status_text}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (text: string) => text ? new Date(text).toLocaleString() : <Text type="secondary">从未登录</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record: EnterpriseUser) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => navigate(`/enterprises/${enterpriseId}/users/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗?"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => {
              message.info('删除用户功能开发中...');
            }}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!enterprise) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message="企业信息加载中..."
          type="info"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb 
        style={{ marginBottom: '24px' }}
        items={[
          { title: <HomeOutlined /> },
          { 
            title: (
              <span 
                style={{ cursor: 'pointer' }} 
                onClick={() => navigate('/enterprises')}
              >
                <BankOutlined /> 企业管理
              </span>
            )
          },
          { title: enterprise.name },
          { title: (<><UserOutlined /> 用户管理</>) }
        ]}
      />

      {/* 页面标题和返回按钮 */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/enterprises')}
            style={{ marginRight: '16px' }}
          >
            返回
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <UserOutlined /> {enterprise.name} - 用户管理
            </Title>
            <Text type="secondary">管理企业内部用户账户</Text>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={enterprise.user_count || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={users.filter(u => u.status === 'active').length}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="主要联系人"
              value={users.filter(u => u.is_primary_contact).length}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Card>
            <Statistic
              title="部门数"
              value={enterprise.department_count || 0}
              prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              添加用户
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadUsers(pagination.current, pagination.pageSize);
                loadDepartments();
              }}
            >
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑用户对话框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={closeModal}
        width={600}
        footer={null}
        destroyOnHidden={true}
        getContainer={() => document.body}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveUser}
          initialValues={{
            status: 'active',
            access_level: 2,
            is_primary_contact: false,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 50, message: '用户名长度为3-50个字符' }
                ]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入姓名' }
                ]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入正确的邮箱格式' }
                ]}
              >
                <Input placeholder="请输入邮箱（必填）" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="电话"
                name="phone"
              >
                <Input placeholder="请输入电话" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="职位"
                name="position"
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="部门"
                name="department_id"
              >
                <Select 
                  placeholder={
                    departmentsLoading 
                      ? "正在加载部门数据..." 
                      : (!departments || departments.length === 0)
                      ? "暂无部门，请先创建部门" 
                      : "请选择部门"
                  }
                  allowClear
                  loading={departmentsLoading}
                  disabled={!departmentsLoading && (!departments || departments.length === 0)}
                  showSearch
                  
                  filterOption={(input, option) =>
                    option?.label?.toString().toLowerCase().includes(input.toLowerCase())
                  }
                  options={departmentOptions}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  notFoundContent={
                    departmentsLoading ? "正在加载..." :
                    (!departments || departments.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '12px' }}>
                        <div>暂无部门数据</div>
                        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                          请先在组织管理中创建部门
                        </div>
                      </div>
                    ) : "暂无数据"
                  }
                  onFocus={() => {
                    console.log('🔍 部门选择框获得焦点');
                    console.log('📊 当前部门数据:', departments);
                    console.log('📊 部门数量:', departments?.length);
                    console.log('🔄 是否加载中:', departmentsLoading);
                  }}
                  onChange={(value) => {
                    console.log('📝 部门选择变更:', value);
                    console.log('📋 选择的部门ID:', value);
                  }}
                />
              </Form.Item>
              
              {/* 将提示信息移到Form.Item外面 */}
              {!departmentsLoading && (!departments || departments.length === 0) && (
                <div style={{ 
                  color: '#fa8c16', 
                  fontSize: '12px', 
                  marginTop: '4px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <span>💡 提示：此企业暂无部门，</span>
                  <a 
                    href={`/enterprises/${enterpriseId}/organization`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff' }}
                  >
                    点击此处创建部门
                  </a>
                </div>
              )}
              {departmentsLoading && (
                <div style={{ 
                  color: '#1890ff', 
                  fontSize: '12px', 
                  marginTop: '4px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  <span>🔄 正在加载部门数据...</span>
                </div>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="访问级别"
                name="access_level"
                rules={[{ required: true, message: '请选择访问级别' }]}
              >
                <Select 
                  placeholder="请选择访问级别"
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                >
                  {ACCESS_LEVEL_OPTIONS && ACCESS_LEVEL_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select 
                  placeholder="请选择状态"
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                >
                  {USER_STATUS_OPTIONS && USER_STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_primary_contact"
            valuePropName="checked"
          >
            <Checkbox>设为主要联系人</Checkbox>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={closeModal}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseUserManagementPage;