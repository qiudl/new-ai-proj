import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
// import companyService from '../services/companyService'; // Removed - company service no longer exists
import enterpriseService from '../services/enterpriseService';
import { Project, ProjectRequest, Company } from '../types/project';
// import { Company, CompanyUser } from '../types/company'; // Removed - company types no longer exist - using Company from project.ts now
import { Enterprise, EnterpriseUser } from '../types/enterprise';
import { useEnterprise } from '../contexts/EnterpriseContext';
// import AddCompanyUserModal from '../components/AddCompanyUserModal'; // Removed - component no longer exists

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ✅ 临时类型定义：CompanyUser (向后兼容旧的公司用户系统)
interface CompanyUser {
  id: number;
  customerId: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  role?: string;
  roleText?: string;
  isPrimaryContact?: boolean;
  canMakeDecisions?: boolean;
  accessLevel?: number;
  accessLevelText?: string;
  status?: string;
  statusText?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

// ✅ Phase 2优化：提取模拟数据为常量，避免每次渲染都创建新对象
const MOCK_COMPANIES: Company[] = [
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

// ✅ Phase 2优化：提取模拟用户数据工厂函数，避免每次调用loadCompanyUsers都创建新对象
const createMockCompanyUsers = (companyId: number, company?: Company): CompanyUser[] => [
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

const ProjectEditPageNew: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  
  // 企业上下文 - 用于数据隔离
  const { currentEnterprise } = useEnterprise();
  
  // ✅ 优化：合并loading相关状态，减少重渲染
  const [loadingStates, setLoadingStates] = useState({
    page: false,
    company: false,
    enterprise: false,
    user: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(true);

  // 客户相关状态（向后兼容）
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);

  // 企业相关状态（新架构）
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterprise, setSelectedEnterprise] = useState<number | null>(null);

  // 用户相关状态
  const [companyUsers, setCompanyUsers] = useState<{ [companyId: number]: CompanyUser[] }>({});
  const [enterpriseUsers, setEnterpriseUsers] = useState<EnterpriseUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ProjectCompanyUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<{ [userKey: string]: string }>({});

  // ✅ 优化：合并modal相关状态
  const [modalStates, setModalStates] = useState({
    showAddUserModal: false,
    selectedCompanyForUser: null as number | null,
    showRoleModal: false,
    currentUserForRole: null as string | null
  });

  // ✅ 优化：使用useCallback包装loadProject，稳定函数引用
  const loadProject = useCallback(async () => {
    if (!projectId || projectId === 'create') return;

    try {
      setLoadingStates(prev => ({ ...prev, page: true }));
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

      // 设置选中的企业（优先使用新架构）
      if (projectData.enterprise_id) {
        setSelectedEnterprise(projectData.enterprise_id);
      } else if (projectData.companies) {
        // 兼容旧的多客户架构
        const companyIds = projectData.companies.map(pc => pc.company_id);
        setSelectedCompanies(companyIds);
      } else if (projectData.company_id) {
        // 兼容旧的单客户架构
        setSelectedCompanies([projectData.company_id]);
      }

      // 设置选中的用户（如果项目详情包含用户信息）
      if ((projectData as any).users) {
        const userKeys = (projectData as any).users.map((pu: any) => `${pu.user_id}_${pu.project_id}`);
        setSelectedUsers(userKeys);
      }
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败');
      navigate('/projects');
    } finally {
      setLoadingStates(prev => ({ ...prev, page: false }));
    }
  }, [projectId, form, navigate]);

  // ✅ 优化：使用useCallback包装loadCompanies
  const loadCompanies = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, company: true }));

      // 企业系统已不再支持选择其他公司客户
      // 在企业模式下，项目只能关联当前企业
      console.log('企业模式下不再加载外部客户列表，项目只关联当前企业');

      // 使用空数组作为公司列表，因为在企业模式下不需要选择外部公司
      setCompanies([]);

      // 如果需要兼容旧的公司模拟数据（仅用于非企业环境）
      const isEnterpriseMode = selectedEnterprise || enterprises.length > 0;
      if (!isEnterpriseMode) {
        // ✅ Phase 2优化：使用提取的常量，避免每次调用都创建新对象
        setCompanies(MOCK_COMPANIES);
        message.info('使用模拟数据显示客户列表');
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
      message.error('加载客户列表失败');
    } finally {
      setLoadingStates(prev => ({ ...prev, company: false }));
    }
  }, [selectedEnterprise, enterprises.length]);

  // ✅ 优化：使用useCallback包装loadEnterprises
  const loadEnterprises = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, enterprise: true }));

      // 在企业模式下，只显示当前企业，不允许选择其他企业
      if (currentEnterprise) {
        console.log('企业模式：只加载当前企业', currentEnterprise.name);
        setEnterprises([currentEnterprise]);
        setSelectedEnterprise(currentEnterprise.id);
      } else {
        // 兼容模式：加载所有企业（管理员模式）
        const response = await enterpriseService.getEnterprises(1, 100);
        setEnterprises(response.data);
      }
    } catch (error) {
      console.error('加载企业列表失败:', error);
      message.error('加载企业列表失败');
    } finally {
      setLoadingStates(prev => ({ ...prev, enterprise: false }));
    }
  }, [currentEnterprise]);

  // ✅ 优化：使用useCallback包装loadEnterpriseUsers
  const loadEnterpriseUsers = useCallback(async () => {
    if (!selectedEnterprise) {
      setEnterpriseUsers([]);
      setAvailableUsers([]);
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, user: true }));
      const response = await enterpriseService.getEnterpriseUsers(selectedEnterprise, 1, 100);
      setEnterpriseUsers(response.data);

      // 转换为可用用户格式
      const projectUsers: ProjectCompanyUser[] = response.data.map(user => ({
        key: `${user.id}_${selectedEnterprise}`,
        companyId: selectedEnterprise,
        companyName: enterprises.find(e => e.id === selectedEnterprise)?.name || '',
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        position: user.position,
        department: user.department_name,
        avatar: undefined
      }));

      setAvailableUsers(projectUsers);
    } catch (error) {
      console.error('加载企业用户失败:', error);
      message.error('加载企业用户失败');
      setEnterpriseUsers([]);
      setAvailableUsers([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, user: false }));
    }
  }, [selectedEnterprise, enterprises]);

  // ✅ 优化：使用useCallback包装loadCompanyUsers
  const loadCompanyUsers = useCallback(async () => {
    if (selectedCompanies.length === 0) {
      // 确保清理时设置为空数组而不是undefined
      setAvailableUsers([]);
      setSelectedUsers([]);
      setCompanyUsers({});
      setUserRoles({});
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, user: true }));

      // ✅ 由于 companyService 已废弃，直接使用模拟数据
      try {
        // 注释掉旧的 companyService 调用
        // const userPromises = selectedCompanies.map(companyId =>
        //   companyService.getCompanyUsers(companyId).then(users => ({
        //     companyId,
        //     users
        //   }))
        // );
        // const results = await Promise.all(userPromises);

        // 直接抛出错误以使用模拟数据
        throw new Error('companyService is deprecated, using mock data');
      } catch (apiError) {
        console.warn('使用模拟数据（companyService 已废弃）:', apiError);

        // ✅ Phase 2优化：使用提取的工厂函数，避免每次都创建新对象
        const mockUsers = selectedCompanies.map(companyId => {
          const company = Array.isArray(companies)
            ? companies.find(c => c.id === companyId)
            : null;
          return {
            companyId,
            users: createMockCompanyUsers(companyId, company || undefined)
          };
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
      setLoadingStates(prev => ({ ...prev, user: false }));
    }
  }, [selectedCompanies, companies]);

  // ✅ 优化：使用useCallback包装handleAddUserSuccess
  const handleAddUserSuccess = useCallback((newUser: CompanyUser) => {
    if (!modalStates.selectedCompanyForUser) return;

    // 更新company users状态
    setCompanyUsers(prev => ({
      ...prev,
      [modalStates.selectedCompanyForUser!]: [...(prev[modalStates.selectedCompanyForUser!] || []), newUser]
    }));

    // 更新available users
    const company = Array.isArray(companies)
      ? companies.find(c => c.id === modalStates.selectedCompanyForUser)
      : null;
    if (company) {
      const newProjectUser: ProjectCompanyUser = {
        key: `${newUser.id}_${modalStates.selectedCompanyForUser}`,
        companyId: modalStates.selectedCompanyForUser!,
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

    setModalStates(prev => ({ ...prev, showAddUserModal: false, selectedCompanyForUser: null }));
    message.success('企业用户添加成功，已添加到可选用户列表');
  }, [modalStates.selectedCompanyForUser, companies]);

  // ✅ 优化：使用useCallback包装handleAddUserForCompany
  const handleAddUserForCompany = useCallback((companyId: number) => {
    setModalStates(prev => ({
      ...prev,
      selectedCompanyForUser: companyId,
      showAddUserModal: true
    }));
  }, []);

  // 项目角色选项
  const getProjectRoleOptions = () => [
    { value: 'manager', label: '项目经理', color: 'red' },
    { value: 'developer', label: '开发人员', color: 'blue' },
    { value: 'designer', label: '设计师', color: 'purple' },
    { value: 'consultant', label: '顾问', color: 'green' },
    { value: 'customer', label: '客户代表', color: 'orange' }
  ];

  // ✅ 优化：使用useCallback包装handleSetUserRole
  const handleSetUserRole = useCallback((userKey: string, role: string) => {
    setUserRoles(prev => ({ ...prev, [userKey]: role }));
    setModalStates(prev => ({ ...prev, showRoleModal: false, currentUserForRole: null }));
    message.success('用户角色设置成功');
  }, []);

  // 获取用户角色显示
  const getUserRoleDisplay = (userKey: string) => {
    if (!userKey || typeof userKey !== 'string') {
      return { value: 'customer', label: '客户代表', color: 'orange' };
    }
    const role = userRoles[userKey] || 'customer';
    const roleInfo = getProjectRoleOptions().find(r => r.value === role);
    return roleInfo || { value: 'customer', label: '客户代表', color: 'orange' };
  };

  // ✅ 优化：使用useCallback包装handleSubmit
  const handleSubmit = useCallback(async (values: any) => {
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
        // 优先使用新的enterprise架构
        enterprise_id: selectedEnterprise || undefined,
        // 兼容旧的company架构
        company_id: !selectedEnterprise && selectedCompanies.length > 0 ? selectedCompanies[0] : undefined,
        company_ids: !selectedEnterprise && selectedCompanies.length > 0 ? selectedCompanies : undefined,
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
  }, [selectedUsers, selectedEnterprise, selectedCompanies, isEditing, projectId, navigate]);

  // ✅ 优化：使用useCallback包装handleCancel
  const handleCancel = useCallback(() => {
    if (isEditing) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  }, [isEditing, projectId, navigate]);

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

  // ✅ 优化：使用useCallback包装renderUserItem
  const renderUserItem = useCallback((item: ProjectCompanyUser) => {
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
          <Avatar  src={item.avatar} icon={<UserOutlined />} />
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
                    setModalStates(prev => ({
                      ...prev,
                      currentUserForRole: item.key,
                      showRoleModal: true
                    }));
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

              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setModalStates(prev => ({
                  ...prev,
                  currentUserForRole: item.key,
                  showRoleModal: true
                }));
              }}
              style={{ opacity: 0.7 }}
            />
          )}
        </div>
      ),
      value: item.key,
    };
  }, [selectedUsers, userRoles]);

  // ✅ Phase 2优化：使用useMemo缓存Transfer组件的dataSource，避免每次渲染都重新计算
  const transferDataSource = useMemo(() => {
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
  }, [availableUsers, renderUserItem]);

  // ✅ 优化：修复useEffect依赖，添加缺失的函数依赖
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

      // 检查URL参数中的enterpriseId，优先使用新架构
      const enterpriseIdParam = searchParams.get('enterpriseId');
      if (enterpriseIdParam) {
        const enterpriseId = parseInt(enterpriseIdParam);
        if (!isNaN(enterpriseId)) {
          setSelectedEnterprise(enterpriseId);
        }
      } else {
        // 兼容旧的companyId参数
        const companyIdParam = searchParams.get('companyId');
        if (companyIdParam) {
          const companyId = parseInt(companyIdParam);
          if (!isNaN(companyId)) {
            setSelectedCompanies([companyId]);
          }
        }
      }
    }
    loadCompanies();
    loadEnterprises();
  }, [projectId, form, searchParams, loadProject, loadCompanies, loadEnterprises]);

  // ✅ 优化：修复useEffect依赖，添加缺失的函数依赖
  useEffect(() => {
    if (selectedEnterprise) {
      loadEnterpriseUsers();
    } else if (selectedCompanies && selectedCompanies.length > 0) {
      loadCompanyUsers();
    } else {
      // 安全地重置用户相关状态，确保始终是数组类型
      setAvailableUsers([]);
      setSelectedUsers([]);
      setCompanyUsers({});
      setEnterpriseUsers([]);
      setUserRoles({});
    }
  }, [selectedCompanies, selectedEnterprise, loadEnterpriseUsers, loadCompanyUsers]);

  if (loadingStates.page) {
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
                    
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/enterprises/create')}
                  >
                    新建客户
                  </Button>
                  <BankOutlined />
                </Space>
              } 
              style={{ marginBottom: 24 }}
            >
              <div style={{ marginBottom: '16px' }}>
                {/* 企业选择器（新架构） */}
                <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                  <Col>
                    <Text strong>
                      {currentEnterprise ? '关联企业' : '选择关联企业'}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {currentEnterprise 
                        ? `当前企业模式，项目自动关联到 ${currentEnterprise.name}`
                        : '推荐使用企业架构，选择一个企业来管理项目'
                      }
                    </Text>
                  </Col>
                </Row>
                <Select
                  placeholder={currentEnterprise 
                    ? `已自动关联：${currentEnterprise.name}`
                    : "请选择企业，支持搜索企业名称"
                  }
                  value={selectedEnterprise}
                  onChange={setSelectedEnterprise}
                  loading={loadingStates.enterprise}
                  disabled={!!currentEnterprise} // 在企业模式下禁用选择器
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%', marginBottom: '16px' }}
                  popupRender={(menu) => (
                    <div>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => navigate('/enterprises/create')}
                          style={{ width: '100%' }}
                        >
                          新建企业
                        </Button>
                      </Space>
                    </div>
                  )}
                >
                  {Array.isArray(enterprises) && enterprises.map(enterprise => (
                    <Option key={enterprise.id} value={enterprise.id}>
                      <Space>
                        <BankOutlined />
                        <div>
                          <div>{enterprise.name}</div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {enterprise.code} | {enterprise.business_type_text}
                          </Text>
                        </div>
                      </Space>
                    </Option>
                  ))}
                </Select>

                {/* 客户选择器（向后兼容） */}
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong>选择关联客户（传统模式）</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {selectedEnterprise ? '已选择企业，此选项已禁用' : '项目可以关联多个客户，至少选择一个'}
                    </Text>
                  </Col>
                  <Col>
                    <Space>
                      <Button
                        type="dashed"
                        
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/enterprises/create')}
                      >
                        新建客户
                      </Button>
                      <Button
                        type="text"
                        
                        icon={<ReloadOutlined />}
                        onClick={loadCompanies}
                        loading={loadingStates.company}
                      >
                        刷新
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </div>

              <Form.Item
                rules={[{ 
                  required: !selectedEnterprise, 
                  message: '请至少选择一个关联客户或企业' 
                }]}
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
                          onClick={() => navigate('/enterprises/create')}
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
                    placeholder={selectedEnterprise ? "已选择企业，客户选择已禁用" : "请选择关联的客户，支持搜索客户名称"}
                    value={selectedCompanies}
                    onChange={setSelectedCompanies}
                    loading={loadingStates.company}
                    disabled={!!selectedEnterprise}
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
                            onClick={() => navigate('/enterprises/create')}
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
              {!selectedEnterprise && selectedCompanies.length === 0 ? (
                <Alert
                  message="请先选择关联企业或客户"
                  description="只能添加所选企业或客户的用户作为项目成员"
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
                      <Spin spinning={loadingStates.user} tip="加载用户中...">
                        <Transfer
                          dataSource={transferDataSource}
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

      {/* 添加企业用户Modal - 已废弃 */}
      {/* AddCompanyUserModal component no longer exists - functionality moved to enterprise system */}
      {/* {modalStates.selectedCompanyForUser && (
        <AddCompanyUserModal
          visible={modalStates.showAddUserModal}
          companyId={modalStates.selectedCompanyForUser}
          companyName={(Array.isArray(companies)
            ? companies.find(c => c.id === modalStates.selectedCompanyForUser)?.companyName
            : null) || ''}
          onCancel={() => {
            setModalStates(prev => ({
              ...prev,
              showAddUserModal: false,
              selectedCompanyForUser: null
            }));
          }}
          onSuccess={handleAddUserSuccess}
        />
      )} */}

      {/* 用户角色设置Modal */}
      <Modal
        title="设置项目角色"
        open={modalStates.showRoleModal}
        onCancel={() => {
          setModalStates(prev => ({
            ...prev,
            showRoleModal: false,
            currentUserForRole: null
          }));
        }}
        footer={null}
        width={400}
      >
        {modalStates.currentUserForRole && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              {(() => {
                // 安全检查：确保 availableUsers 是数组
                const user = Array.isArray(availableUsers)
                  ? availableUsers.find(u => u.key === modalStates.currentUserForRole)
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
                  
                  hoverable
                  style={{
                    cursor: 'pointer',
                    border: userRoles[modalStates.currentUserForRole!] === roleOption.value
                      ? `2px solid ${roleOption.color === 'red' ? '#ff4d4f' : roleOption.color === 'blue' ? '#1890ff' : roleOption.color === 'purple' ? '#722ed1' : roleOption.color === 'green' ? '#52c41a' : '#faad14'}`
                      : '1px solid #d9d9d9'
                  }}
                  onClick={() => handleSetUserRole(modalStates.currentUserForRole!, roleOption.value)}
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