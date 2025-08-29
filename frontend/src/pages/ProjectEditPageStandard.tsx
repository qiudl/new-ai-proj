import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  message,
  Space,
  Spin,
  Row,
  Col,
  Typography,
  Divider,
  Tag,
  Alert,
  Switch,
  Transfer,
  Table,
  Avatar,
  Tooltip,
  Modal
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloseOutlined,
  NumberOutlined,
  BankOutlined,
  CalendarOutlined,
  BuildOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  UserOutlined,
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  ReloadOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { TransferDirection } from 'antd/es/transfer';
import dayjs from 'dayjs';
import { projectService } from '../services/projectService';
import companyService from '../services/companyService';
import { Project, ProjectRequest } from '../types/project';
import { Company, CompanyUser } from '../types/company';
import AddCompanyUserModal from '../components/AddCompanyUserModal';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ProjectCompanyUser {
  key: string;
  companyId: number;
  companyName: string;
  userId: number;
  userName: string;
  userEmail?: string;
  position?: string;
  department?: string;
  avatar?: string;
}

const ProjectEditPageNew: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  
  // 客户相关状态
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  
  // 用户相关状态
  const [companyUsers, setCompanyUsers] = useState<{ [companyId: number]: CompanyUser[] }>({});
  const [availableUsers, setAvailableUsers] = useState<ProjectCompanyUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<{ [userKey: string]: string }>({});
  const [userLoading, setUserLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedCompanyForUser, setSelectedCompanyForUser] = useState<number | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [currentUserForRole, setCurrentUserForRole] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && projectId !== 'create') {
      setIsEditing(true);
      loadProject();
    } else {
      setIsEditing(false);
      form.setFieldsValue({
        status: 'planning',
        priority: 'medium',
        progress: 0
      });
      
      // 检查URL参数中的companyId，如果有则预选择该企业
      const companyIdParam = searchParams.get('companyId');
      if (companyIdParam) {
        const companyId = parseInt(companyIdParam);
        if (!isNaN(companyId)) {
          setSelectedCompanies([companyId]);
        }
      }
    }
    loadCompanies();
  }, [projectId, form, searchParams]);

  useEffect(() => {
    if (selectedCompanies && selectedCompanies.length > 0) {
      loadCompanyUsers();
    } else {
      // 安全地重置用户相关状态，确保始终是数组类型
      setAvailableUsers([]);
      setSelectedUsers([]);
      setCompanyUsers({});
      setUserRoles({});
    }
  }, [selectedCompanies]);

  const loadProject = async () => {
    if (!projectId || projectId === 'create') return;

    try {
      setLoading(true);
      const projectData = await projectService.getProject(Number(projectId));
      
      setProject(projectData);
      
      // 设置表单值
      form.setFieldsValue({
        project_number: projectData.project_number || `P${(100 + projectData.id).toString()}`,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        progress: projectData.progress || 0,
        date_range: projectData.start_date && projectData.end_date ? [
          dayjs(projectData.start_date),
          dayjs(projectData.end_date)
        ] : undefined
      });

      // 设置选中的客户
      if (projectData.companies) {
        const companyIds = projectData.companies.map(pc => pc.company_id);
        setSelectedCompanies(companyIds);
      } else if (projectData.company_id) {
        setSelectedCompanies([projectData.company_id]);
      }

      // 设置选中的用户（如果项目详情包含用户信息）
      if ((projectData as unknown).users) {
        const userKeys = (projectData as unknown).users.map((pu: unknown) => `${pu.user_id}_${pu.project_id}`);
        setSelectedUsers(userKeys);
      }
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      setCompanyLoading(true);
      
      try {
        const response = await companyService.getCompanies({ page: 1, pageSize: 100 });
        setCompanies(response.data);
      } catch (apiError) {
        console.warn('使用API加载客户失败，使用模拟数据:', apiError);
        
        // 使用模拟数据
        const mockCompanies: Company[] = [
          {
            id: 1,
            companyName: '北京科技有限公司',
            companyCode: 'BJKJ001',
            companyType: 'limited_company',
            companyTypeText: '有限责任公司',
            industry: '信息技术',
            address: '北京市朝阳区望京街10号',
            mainPhone: '010-12345678',
            mainEmail: 'contact@bjtech.com',
            status: 'active',
            statusText: '活跃客户',
            priority: 'high',
            priorityText: '高优先级',
            createdBy: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            companyName: '上海创新科技',
            companyCode: 'SHCX002',
            companyType: 'limited_company',
            companyTypeText: '有限责任公司',
            industry: '人工智能',
            address: '上海市浦东新区世纪大道80号',
            mainPhone: '021-87654321',
            mainEmail: 'info@shtech.com',
            status: 'active',
            statusText: '活跃客户',
            priority: 'medium',
            priorityText: '中优先级',
            createdBy: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 3,
            companyName: '深圳智能制造',
            companyCode: 'SZZN003',
            companyType: 'limited_company',
            companyTypeText: '有限责任公司',
            industry: '智能制造',
            address: '深圳市南山区科技园南区',
            mainPhone: '0755-98765432',
            mainEmail: 'service@sztech.com',
            status: 'active',
            statusText: '活跃客户',
            priority: 'medium',
            priorityText: '中优先级',
            createdBy: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ];
        
        setCompanies(mockCompanies);
        message.info('使用模拟数据显示客户列表');
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
      message.error('加载客户列表失败');
    } finally {
      setCompanyLoading(false);
    }
  };

  const loadCompanyUsers = async () => {
    if (selectedCompanies.length === 0) {
      // 确保清理时设置为空数组而不是undefined
      setAvailableUsers([]);
      setSelectedUsers([]);
      setCompanyUsers({});
      setUserRoles({});
      return;
    }

    try {
      setUserLoading(true);
      
      try {
        const userPromises = selectedCompanies.map(companyId =>
          companyService.getCompanyUsers(companyId).then(users => ({
            companyId,
            users
          }))
        );

        const results = await Promise.all(userPromises);
        const newCompanyUsers: { [companyId: number]: CompanyUser[] } = {};
        const newAvailableUsers: ProjectCompanyUser[] = [];

        results.forEach(({ companyId, users }) => {
          newCompanyUsers[companyId] = users;
          const company = Array.isArray(companies) 
            ? companies.find(c => c.id === companyId)
            : null;
          
          users.forEach(user => {
            newAvailableUsers.push({
              key: `${user.id}_${companyId}`,
              companyId,
              companyName: company?.companyName || '未知客户',
              userId: user.id,
              userName: user.name || '未知用户',
              userEmail: user.email,
              position: user.position,
              department: user.department,
              avatar: undefined // CompanyUser不包含avatar字段
            });
          });
        });

        setCompanyUsers(newCompanyUsers);
        setAvailableUsers(newAvailableUsers);
      } catch (apiError) {
        console.warn('使用API加载用户失败，使用模拟数据:', apiError);
        
        // 使用模拟数据
        const mockUsers = selectedCompanies.map(companyId => {
          const company = Array.isArray(companies) 
            ? companies.find(c => c.id === companyId)
            : null;
          const users: CompanyUser[] = [
            {
              id: companyId * 100 + 1,
              customerId: companyId,
              name: `${company?.companyName || '客户'}负责人`,
              email: `manager@company${companyId}.com`,
              phone: '138****1234',
              position: '项目经理',
              department: '技术部',
              role: 'primary_contact',
              roleText: '主要联系人',
              isPrimaryContact: true,
              canMakeDecisions: true,
              accessLevel: 5,
              accessLevelText: '高级权限',
              status: 'active',
              statusText: '在职',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            {
              id: companyId * 100 + 2,
              customerId: companyId,
              name: `${company?.companyName || '客户'}技术专员`,
              email: `tech@company${companyId}.com`,
              phone: '139****5678',
              position: '技术专员',
              department: '技术部',
              role: 'technical_contact',
              roleText: '技术联系人',
              isPrimaryContact: false,
              canMakeDecisions: false,
              accessLevel: 3,
              accessLevelText: '中级权限',
              status: 'active',
              statusText: '在职',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ];
          return { companyId, users };
        });
        
        const newCompanyUsers: { [companyId: number]: CompanyUser[] } = {};
        const newAvailableUsers: ProjectCompanyUser[] = [];
        
        mockUsers.forEach(({ companyId, users }) => {
          newCompanyUsers[companyId] = users;
          const company = Array.isArray(companies) 
            ? companies.find(c => c.id === companyId)
            : null;
          
          users.forEach(user => {
            newAvailableUsers.push({
              key: `${user.id}_${companyId}`,
              companyId,
              companyName: company?.companyName || '未知客户',
              userId: user.id,
              userName: user.name || '未知用户',
              userEmail: user.email,
              position: user.position,
              department: user.department,
              avatar: undefined // CompanyUser不包含avatar字段
            });
          });
        });
        
        setCompanyUsers(newCompanyUsers);
        setAvailableUsers(newAvailableUsers);
        message.info('使用模拟数据显示客户用户');
      }
    } catch (error) {
      console.error('加载客户用户失败:', error);
      // 确保错误时也设置为空数组，防止undefined状态
      setAvailableUsers([]);
      setCompanyUsers({});
      setSelectedUsers([]);
      setUserRoles({});
      message.error('加载客户用户失败');
    } finally {
      setUserLoading(false);
    }
  };

  // 处理添加企业用户成功
  const handleAddUserSuccess = (newUser: CompanyUser) => {
    if (!selectedCompanyForUser) return;
    
    // 更新company users状态
    setCompanyUsers(prev => ({
      ...prev,
      [selectedCompanyForUser]: [...(prev[selectedCompanyForUser] || []), newUser]
    }));

    // 更新available users
    const company = Array.isArray(companies) 
      ? companies.find(c => c.id === selectedCompanyForUser)
      : null;
    if (company) {
      const newProjectUser: ProjectCompanyUser = {
        key: `${newUser.id}_${selectedCompanyForUser}`,
        companyId: selectedCompanyForUser,
        companyName: company.companyName,
        userId: newUser.id,
        userName: newUser.name,
        position: newUser.position,
        department: newUser.department,
        userEmail: newUser.email,
        avatar: undefined
      };
      
      setAvailableUsers(prev => [...prev, newProjectUser]);
    }

    setShowAddUserModal(false);
    setSelectedCompanyForUser(null);
    message.success('企业用户添加成功，已添加到可选用户列表');
  };

  // 打开添加用户模态框
  const handleAddUserForCompany = (companyId: number) => {
    setSelectedCompanyForUser(companyId);
    setShowAddUserModal(true);
  };

  // 项目角色选项
  const getProjectRoleOptions = () => [
    { value: 'manager', label: '项目经理', color: 'red' },
    { value: 'developer', label: '开发人员', color: 'blue' },
    { value: 'designer', label: '设计师', color: 'purple' },
    { value: 'consultant', label: '顾问', color: 'green' },
    { value: 'customer', label: '客户代表', color: 'orange' }
  ];

  // 设置用户角色
  const handleSetUserRole = (userKey: string, role: string) => {
    setUserRoles(prev => ({ ...prev, [userKey]: role }));
    setShowRoleModal(false);
    setCurrentUserForRole(null);
    message.success('用户角色设置成功');
  };

  // 获取用户角色显示
  const getUserRoleDisplay = (userKey: string) => {
    if (!userKey || typeof userKey !== 'string') {
      return { value: 'customer', label: '客户代表', color: 'orange' };
    }
    const role = userRoles[userKey] || 'customer';
    const roleInfo = getProjectRoleOptions().find(r => r.value === role);
    return roleInfo || { value: 'customer', label: '客户代表', color: 'orange' };
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      // 安全地处理 selectedUsers 数组
      const processedUserIds = Array.isArray(selectedUsers) 
        ? selectedUsers
            .filter(key => key && typeof key === 'string')
            .map(key => {
              const [userId] = key.split('_');
              return Number(userId);
            })
            .filter(id => !isNaN(id) && id > 0)
        : [];

      const projectData: ProjectRequest = {
        project_number: values.project_number?.trim() || undefined,
        name: values.name?.trim() || '',
        description: values.description?.trim() || '',
        company_id: selectedCompanies.length > 0 ? selectedCompanies[0] : undefined,
        company_ids: selectedCompanies.length > 0 ? selectedCompanies : undefined,
        user_ids: processedUserIds.length > 0 ? processedUserIds : undefined,
        status: values.status || 'planning',
        priority: values.priority || 'medium',
        progress: typeof values.progress === 'number' ? values.progress : 0,
        start_date: values.date_range?.[0]?.format('YYYY-MM-DD') || undefined,
        end_date: values.date_range?.[1]?.format('YYYY-MM-DD') || undefined
      };

      if (isEditing && projectId) {
        await projectService.updateProject(Number(projectId), projectData);
        message.success('项目更新成功');
      } else {
        await projectService.createProject(projectData);
        message.success('项目创建成功');
      }
      
      navigate('/projects');
    } catch (error) {
      console.error('保存项目失败:', error);
      message.error(isEditing ? '更新项目失败' : '创建项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  };

  const getStatusOptions = () => [
    { label: '规划中', value: 'planning', color: 'blue' },
    { label: '进行中', value: 'active', color: 'green' },
    { label: '暂停', value: 'on_hold', color: 'orange' },
    { label: '已完成', value: 'completed', color: 'purple' },
    { label: '已取消', value: 'cancelled', color: 'red' }
  ];

  const getPriorityOptions = () => [
    { label: '高', value: 'high', color: 'red' },
    { label: '中', value: 'medium', color: 'orange' },
    { label: '低', value: 'low', color: 'green' }
  ];

  // Transfer组件的渲染函数
  const renderUserItem = (item: ProjectCompanyUser) => {
    // 添加更严格的安全检查
    if (!item || typeof item !== 'object') {
      console.warn('Invalid user item:', item);
      return { label: '无效用户', value: `invalid-${Math.random()}` };
    }
    
    if (!item.key || typeof item.key !== 'string') {
      console.warn('User item missing valid key:', item);
      return { 
        label: `${item.userName || '未知用户'} (无效Key)`, 
        value: `invalid-${item.userId || Math.random()}` 
      };
    }
    
    const roleInfo = getUserRoleDisplay(item.key);
    const isSelected = Array.isArray(selectedUsers) && selectedUsers.includes(item.key);
    
    return {
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar size="small" src={item.avatar} icon={<UserOutlined />} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{item.userName || '未知用户'}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {item.position && `${item.position} - `}{item.companyName || '未知客户'}
            </div>
            {isSelected && (
              <div style={{ marginTop: '4px' }}>
                <Tag 
                  color={roleInfo.color} 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentUserForRole(item.key);
                    setShowRoleModal(true);
                  }}
                >
                  {roleInfo.label}
                </Tag>
              </div>
            )}
          </div>
          {isSelected && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentUserForRole(item.key);
                setShowRoleModal(true);
              }}
              style={{ opacity: 0.7 }}
            />
          )}
        </div>
      ),
      value: item.key,
    };
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666' }}>加载项目信息中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleCancel}
          style={{ marginBottom: '16px' }}
        >
          返回{isEditing ? '项目详情' : '项目列表'}
        </Button>
        
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Space align="center" style={{ marginBottom: '8px' }}>
                <FileTextOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                <Title level={2} style={{ margin: 0 }}>
                  {isEditing ? '编辑项目' : '创建项目'}
                </Title>
                {isEditing && project && (
                  <Tag color="blue">
                    {project.project_number || `P${(100 + project.id).toString()}`}
                  </Tag>
                )}
              </Space>
              <Text type="secondary">
                {isEditing ? '修改项目的基本信息、关联客户和项目成员' : '创建一个新的项目，设置基本信息并分配团队'}
              </Text>
            </div>
            
            <Space>
              <Button 
                icon={<CloseOutlined />}
                onClick={handleCancel}
              >
                取消
              </Button>
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
                loading={submitting}
              >
                {isEditing ? '保存更改' : '创建项目'}
              </Button>
            </Space>
          </div>
        </Card>
      </div>


      {/* 表单内容 */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        size="large"
      >
        <Row gutter={24}>
          {/* 左侧：基本信息和配置 */}
          <Col xs={24} lg={12}>
            {/* 基本信息 */}
            <Card title="基本信息" extra={<InfoCircleOutlined />} style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="项目编号"
                    name="project_number"
                    rules={[
                      { required: true, message: '请输入项目编号' },
                      { pattern: /^[A-Za-z0-9-_]+$/, message: '项目编号只能包含字母、数字、短横线和下划线' },
                      { min: 2, max: 20, message: '项目编号长度应在2-20个字符之间' }
                    ]}
                    tooltip="唯一的项目标识符，支持字母、数字、短横线和下划线"
                  >
                    <Input 
                      placeholder="如：P101, PRJ-001"
                      prefix={<NumberOutlined />}
                      maxLength={20}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    label="项目名称"
                    name="name"
                    rules={[
                      { required: true, message: '请输入项目名称' },
                      { min: 2, max: 100, message: '项目名称长度应在2-100个字符之间' }
                    ]}
                  >
                    <Input 
                      placeholder="请输入项目名称"
                      prefix={<FileTextOutlined />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="项目描述"
                name="description"
                rules={[{ max: 1000, message: '描述长度不能超过1000个字符' }]}
              >
                <TextArea 
                  rows={4}
                  placeholder="请描述项目的目标、范围和主要特点..."
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="项目状态"
                    name="status"
                    rules={[{ required: true, message: '请选择项目状态' }]}
                  >
                    <Select placeholder="请选择项目状态">
                      {getStatusOptions().map(option => (
                        <Option key={option.value} value={option.value}>
                          <Space>
                            <Tag color={option.color} style={{ margin: 0 }}>
                              {option.label}
                            </Tag>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    label="优先级"
                    name="priority"
                    rules={[{ required: true, message: '请选择优先级' }]}
                  >
                    <Select placeholder="请选择优先级">
                      {getPriorityOptions().map(option => (
                        <Option key={option.value} value={option.value}>
                          <Space>
                            <Tag color={option.color} style={{ margin: 0 }}>
                              {option.label}
                            </Tag>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 项目配置 */}
            <Card title="项目配置" extra={<BuildOutlined />}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="项目进度"
                    name="progress"
                    rules={[
                      { required: true, message: '请输入项目进度' },
                      { type: 'number', min: 0, max: 100, message: '进度应在0-100之间' }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="项目进度"
                      min={0}
                      max={100}
                      addonAfter="%"
                    />
                  </Form.Item>
                </Col>
              </Row>


              <Form.Item
                label="项目周期"
                name="date_range"
                rules={[{ required: true, message: '请选择项目开始和结束日期' }]}
              >
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={['开始日期', '结束日期']}
                  format="YYYY-MM-DD"
                />
              </Form.Item>

              {isEditing && project && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    创建时间: {new Date(project.created_at).toLocaleString()}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    更新时间: {new Date(project.updated_at).toLocaleString()}
                  </Text>
                </div>
              )}
            </Card>
          </Col>

          {/* 右侧：客户关联和用户分配 */}
          <Col xs={24} lg={12}>
            {/* 客户关联 */}
            <Card 
              title="关联客户" 
              extra={
                <Space>
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/companies/create')}
                  >
                    新建客户
                  </Button>
                  <BankOutlined />
                </Space>
              } 
              style={{ marginBottom: 24 }}
            >
              <div style={{ marginBottom: '16px' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong>选择关联客户</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      项目可以关联多个客户，至少选择一个
                    </Text>
                  </Col>
                  <Col>
                    <Space>
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/companies/create')}
                      >
                        新建客户
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={loadCompanies}
                        loading={companyLoading}
                      >
                        刷新
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </div>

              <Form.Item
                rules={[{ required: true, message: '请至少选择一个关联客户' }]}
              >
                {!companies || companies.length === 0 ? (
                  <Alert
                    message="暂无客户"
                    description={
                      <div>
                        系统中还没有客户，您需要先创建客户才能关联到项目。
                        <br />
                        <Button
                          type="link"
                          icon={<PlusOutlined />}
                          onClick={() => navigate('/companies/create')}
                          style={{ padding: 0, marginTop: '8px' }}
                        >
                          立即创建第一个客户
                        </Button>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                ) : (
                  <Select
                    mode="multiple"
                    placeholder="请选择关联的客户，支持搜索客户名称"
                    value={selectedCompanies}
                    onChange={setSelectedCompanies}
                    loading={companyLoading}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                    popupRender={(menu) => (
                      <div>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px' }}>
                          <Button
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={() => navigate('/companies/create')}
                            style={{ width: '100%' }}
                          >
                            新建客户
                          </Button>
                        </Space>
                      </div>
                    )}
                  >
                    {companies.map(company => (
                      <Option key={company.id} value={company.id}>
                        <Space>
                          <BankOutlined style={{ color: '#52c41a' }} />
                          <div>
                            <div>{company.companyName}</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {company.industry} • {company.statusText}
                            </Text>
                          </div>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                )}
              </Form.Item>

              {selectedCompanies.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    已选择 {selectedCompanies.length} 个客户：
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    {selectedCompanies.map(companyId => {
                      const company = Array.isArray(companies) 
                        ? companies.find(c => c.id === companyId)
                        : null;
                      return (
                        <Tag key={companyId} color="blue" style={{ marginBottom: '4px' }}>
                          {company?.companyName || `客户${companyId}`}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* 用户分配 */}
            <Card title="项目成员" extra={<TeamOutlined />}>
              {selectedCompanies.length === 0 ? (
                <Alert
                  message="请先选择关联客户"
                  description="只能添加所选客户的用户作为项目成员"
                  type="info"
                  showIcon
                />
              ) : (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong>选择项目成员</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          从所选客户的用户中选择项目成员（共{availableUsers?.length || 0}个可选用户）
                        </Text>
                      </Col>
                      <Col>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          size="small"
                          onClick={() => {
                            if (selectedCompanies.length === 1) {
                              handleAddUserForCompany(selectedCompanies[0]);
                            } else {
                              Modal.confirm({
                                title: '选择企业',
                                content: (
                                  <div>
                                    <p>请选择要为哪个企业添加用户：</p>
                                    <Select
                                      style={{ width: '100%' }}
                                      placeholder="选择企业"
                                      onChange={(companyId) => {
                                        Modal.destroyAll();
                                        handleAddUserForCompany(companyId);
                                      }}
                                    >
                                      {selectedCompanies.map(companyId => {
                                        const company = Array.isArray(companies) 
                                          ? companies.find(c => c.id === companyId)
                                          : null;
                                        return (
                                          <Option key={companyId} value={companyId}>
                                            {company?.companyName}
                                          </Option>
                                        );
                                      })}
                                    </Select>
                                  </div>
                                ),
                                okText: '取消',
                                cancelButtonProps: { style: { display: 'none' } }
                              });
                            }
                          }}
                        >
                          添加企业用户
                        </Button>
                      </Col>
                    </Row>
                  </div>

                  {!availableUsers || availableUsers.length === 0 ? (
                    <Alert
                      message="所选企业暂无用户"
                      description={
                        <div>
                          所选择的企业中还没有用户，您可以：
                          <br />
                          1. 点击上方"添加企业用户"按钮为企业添加用户
                          <br />
                          2. 或者先去企业详情页管理企业用户
                        </div>
                      }
                      type="warning"
                      showIcon
                      style={{ marginBottom: '16px' }}
                      action={
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            if (selectedCompanies.length === 1) {
                              handleAddUserForCompany(selectedCompanies[0]);
                            } else {
                              message.info('请先选择单个企业再添加用户');
                            }
                          }}
                        >
                          立即添加
                        </Button>
                      }
                    />
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <Spin spinning={userLoading} tip="加载用户中...">
                        <Transfer
                          dataSource={(() => {
                            // 安全地处理 availableUsers，确保它是数组且每个元素有效
                            if (!Array.isArray(availableUsers)) {
                              console.warn('availableUsers is not an array:', availableUsers);
                              return [];
                            }
                            
                            return availableUsers
                              .filter(user => user && typeof user === 'object' && user.key)
                              .map((user, index) => {
                                try {
                                  const renderResult = renderUserItem(user);
                                  if (!renderResult || !renderResult.value) {
                                    console.warn('Invalid render result for user:', user);
                                    return null;
                                  }
                                  return {
                                    ...renderResult,
                                    key: user.key || `user-${index}`,
                                  };
                                } catch (error) {
                                  console.error('Error rendering user item:', error, user);
                                  return {
                                    key: `error-${index}`,
                                    value: `error-${index}`,
                                    label: `渲染错误: ${user?.userName || '未知用户'}`
                                  };
                                }
                              })
                              .filter(item => item !== null);
                          })()}
                          targetKeys={Array.isArray(selectedUsers) ? selectedUsers : []}
                          onChange={(targetKeys) => {
                            if (Array.isArray(targetKeys)) {
                              setSelectedUsers(targetKeys.filter(key => typeof key === 'string'));
                            }
                          }}
                          render={item => item?.label || '未知项目'}
                          titles={['可选用户', '项目成员']}
                          showSearch
                          listStyle={{ width: '100%', height: '300px' }}
                          locale={{
                            searchPlaceholder: '搜索用户',
                            itemUnit: '项',
                            itemsUnit: '项',
                            notFoundContent: '暂无数据',
                            remove: '移除',
                            removeAll: '全部移除',
                            removeCurrent: '移除当前页',
                            selectAll: '全部选择',
                            selectCurrent: '选择当前页',
                            selectInvert: '反选当前页'
                          }}
                        />
                      </Spin>
                    </div>
                  )}

                  {Array.isArray(selectedUsers) && selectedUsers.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        已选择 {selectedUsers.length} 位项目成员
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 创建提示 */}
        {!isEditing && (
          <Card title="温馨提示" style={{ marginTop: '24px' }}>
            <Alert
              message="项目创建后您还可以："
              description={
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                  <li>在项目详情页添加更多团队成员和调整成员角色</li>
                  <li>创建和分配项目任务</li>
                  <li>设置项目里程碑和关键节点</li>
                  <li>跟踪项目进度和团队协作</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Card>
        )}
      </Form>

      {/* 添加企业用户Modal */}
      {selectedCompanyForUser && (
        <AddCompanyUserModal
          visible={showAddUserModal}
          companyId={selectedCompanyForUser}
          companyName={(Array.isArray(companies) 
            ? companies.find(c => c.id === selectedCompanyForUser)?.companyName 
            : null) || ''}
          onCancel={() => {
            setShowAddUserModal(false);
            setSelectedCompanyForUser(null);
          }}
          onSuccess={handleAddUserSuccess}
        />
      )}

      {/* 用户角色设置Modal */}
      <Modal
        title="设置项目角色"
        open={showRoleModal}
        onCancel={() => {
          setShowRoleModal(false);
          setCurrentUserForRole(null);
        }}
        footer={null}
        width={400}
      >
        {currentUserForRole && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              {(() => {
                // 安全检查：确保 availableUsers 是数组
                const user = Array.isArray(availableUsers) 
                  ? availableUsers.find(u => u.key === currentUserForRole)
                  : null;
                return user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar src={user.avatar} icon={<UserOutlined />} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{user.userName}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {user.position && `${user.position} - `}{user.companyName}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <div style={{ fontWeight: 500 }}>未知用户</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        用户信息加载中...
                      </Text>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong>选择在项目中的角色：</Text>
            </div>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              {getProjectRoleOptions().map(roleOption => (
                <Card
                  key={roleOption.value}
                  size="small"
                  hoverable
                  style={{ 
                    cursor: 'pointer',
                    border: userRoles[currentUserForRole] === roleOption.value 
                      ? `2px solid ${roleOption.color === 'red' ? '#ff4d4f' : roleOption.color === 'blue' ? '#1890ff' : roleOption.color === 'purple' ? '#722ed1' : roleOption.color === 'green' ? '#52c41a' : '#faad14'}`
                      : '1px solid #d9d9d9'
                  }}
                  onClick={() => handleSetUserRole(currentUserForRole, roleOption.value)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag color={roleOption.color}>{roleOption.label}</Tag>
                    <div style={{ flex: 1 }}>
                      <Text style={{ fontSize: '13px' }}>
                        {roleOption.value === 'manager' && '负责项目整体规划和团队协调'}
                        {roleOption.value === 'developer' && '负责项目开发和技术实现'}
                        {roleOption.value === 'designer' && '负责项目设计和用户体验'}
                        {roleOption.value === 'consultant' && '提供专业建议和咨询服务'}
                        {roleOption.value === 'customer' && '代表客户参与项目沟通'}
                      </Text>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectEditPageNew;