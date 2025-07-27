import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Tag, 
  Row, 
  Col, 
  Descriptions, 
  Spin,
  Alert,
  Modal,
  Divider,
  Tabs,
  Table,
  message,
  Tooltip,
  Empty,
  Badge
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  EyeOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  BankOutlined,
  TeamOutlined,
  BuildOutlined,
  CalendarOutlined,
  ContactsOutlined,
  HistoryOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Company, CompanyUser, CompanyContact } from '../types/company';
import { Project, ProjectUser, ProjectCompany } from '../types/project';
import companyService from '../services/companyService';
import { projectService } from '../services/projectService';
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '../utils/formatters';
import AddCompanyUserModal from '../components/AddCompanyUserModal';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

const CompanyDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [companyContacts, setCompanyContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | undefined>(undefined);

  const companyId = parseInt(id || '0');

  // 加载企业基本信息
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId || companyId <= 0) {
        message.error('无效的企业 ID');
        navigate('/companies');
        return;
      }

      setLoading(true);
      try {
        const data = await companyService.getCompany(companyId);
        setCompany(data);
      } catch (error) {
        console.error('Failed to load company:', error);
        message.error('加载企业信息失败');
        navigate('/companies');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId, navigate]);

  // 加载企业项目
  const loadCompanyProjects = async () => {
    if (!companyId) return;
    
    setProjectsLoading(true);
    try {
      const data = await projectService.getProjectsByCompany(companyId);
      // 确保只显示属于当前企业的项目
      const filteredProjects = data.filter(project => 
        project.company_id === companyId || 
        (project.companies && project.companies.some(company => company.company_id === companyId))
      );
      setCompanyProjects(filteredProjects);
    } catch (error) {
      console.error('Failed to load company projects:', error);
      message.error('加载企业项目失败');
    } finally {
      setProjectsLoading(false);
    }
  };

  // 加载企业用户
  const loadCompanyUsers = async () => {
    if (!companyId) return;
    
    setUsersLoading(true);
    try {
      const data = await companyService.getCompanyUsers(companyId);
      setCompanyUsers(data);
    } catch (error) {
      console.error('Failed to load company users:', error);
      message.error('加载企业用户失败');
    } finally {
      setUsersLoading(false);
    }
  };

  // 加载联系记录
  const loadCompanyContacts = async () => {
    if (!companyId) return;
    
    setContactsLoading(true);
    try {
      const response = await companyService.getCompanyContacts(companyId, { page: 1, pageSize: 50 });
      setCompanyContacts(response.data);
    } catch (error) {
      console.error('Failed to load company contacts:', error);
      message.error('加载联系记录失败');
    } finally {
      setContactsLoading(false);
    }
  };

  // 切换标签页时加载对应数据
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'projects' && companyProjects.length === 0) {
      loadCompanyProjects();
    } else if (key === 'users' && companyUsers.length === 0) {
      loadCompanyUsers();
    } else if (key === 'contacts' && companyContacts.length === 0) {
      loadCompanyContacts();
    }
  };

  // 首次加载时加载项目数据
  useEffect(() => {
    if (company && activeTab === 'projects') {
      loadCompanyProjects();
    }
  }, [company, activeTab]);

  // 删除企业
  const handleDelete = () => {
    if (!company) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除企业"${company.companyName}"吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await companyService.deleteCompany(company.id);
          message.success('企业删除成功');
          navigate('/companies');
        } catch (error) {
          console.error('Failed to delete company:', error);
          message.error('删除企业失败');
        }
      },
    });
  };

  // 处理添加用户成功
  const handleAddUserSuccess = (updatedUser: CompanyUser) => {
    if (editingUser) {
      // 编辑模式：更新现有用户
      setCompanyUsers(prev => 
        prev.map(user => user.id === updatedUser.id ? updatedUser : user)
      );
    } else {
      // 添加模式：添加新用户
      setCompanyUsers(prev => [...prev, updatedUser]);
    }
    setShowAddUserModal(false);
    setEditingUser(undefined);
  };

  // 删除企业用户
  const handleDeleteUser = (userId: number, userName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户"${userName}"吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          // 这里需要实现删除用户的API调用
          // await companyService.deleteCompanyUser(userId);
          setCompanyUsers(prev => prev.filter(user => user.id !== userId));
          message.success('用户删除成功');
        } catch (error) {
          console.error('Failed to delete user:', error);
          message.error('删除用户失败');
        }
      },
    });
  };

  // 项目表格列配置
  const projectColumns: ColumnsType<Project> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            <Button 
              type="link" 
              style={{ padding: 0, fontSize: '14px', fontWeight: 500 }}
              onClick={() => navigate(`/projects/${record.id}`)}
            >
              {text}
            </Button>
          </div>
          {record.project_number && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              项目编号: {record.project_number}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '项目描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          planning: { label: '规划中', color: 'blue' },
          active: { label: '进行中', color: 'green' },
          on_hold: { label: '暂停', color: 'orange' },
          completed: { label: '已完成', color: 'cyan' },
          cancelled: { label: '已取消', color: 'red' },
        };
        const statusInfo = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityMap: Record<string, { label: string; color: string }> = {
          high: { label: '高', color: 'red' },
          medium: { label: '中', color: 'orange' },
          low: { label: '低', color: 'green' },
        };
        const priorityInfo = priorityMap[priority] || { label: priority, color: 'default' };
        return <Tag color={priorityInfo.color}>{priorityInfo.label}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                backgroundColor: progress >= 80 ? '#52c41a' : progress >= 50 ? '#faad14' : '#1890ff',
                width: `${progress || 0}%`,
                borderRadius: '3px'
              }}
            />
          </div>
          <Text style={{ fontSize: '12px', minWidth: '32px' }}>{progress || 0}%</Text>
        </div>
      ),
    },
    {
      title: '项目时间',
      key: 'dateRange',
      width: 200,
      render: (_, record: Project) => (
        <div>
          {record.start_date && (
            <div style={{ fontSize: '12px', marginBottom: 2 }}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              开始: {formatDate(record.start_date)}
            </div>
          )}
          {record.end_date && (
            <div style={{ fontSize: '12px' }}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              结束: {formatDate(record.end_date)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: Project) => (
        <Space size="small">
          <Tooltip title="查看项目详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/projects/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑项目">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => navigate(`/projects/${record.id}/edit`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 企业用户表格列配置
  const userColumns: ColumnsType<CompanyUser> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: CompanyUser) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.position && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.position}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (text: string) => text || '-',
    },
    {
      title: '角色',
      dataIndex: 'roleText',
      key: 'role',
      render: (text: string, record: CompanyUser) => (
        <Space>
          <Tag color={record.isPrimaryContact ? 'red' : 'blue'}>{text}</Tag>
          {record.isPrimaryContact && <Tag color="red">主要联系人</Tag>}
          {record.canMakeDecisions && <Tag color="orange">决策人</Tag>}
        </Space>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_, record: CompanyUser) => (
        <div>
          {record.email && (
            <div style={{ fontSize: '12px', marginBottom: 2 }}>
              <MailOutlined style={{ marginRight: 4 }} />
              <Text type="secondary">{record.email}</Text>
            </div>
          )}
          {record.phone && (
            <div style={{ fontSize: '12px' }}>
              <PhoneOutlined style={{ marginRight: 4 }} />
              <Text type="secondary">{record.phone}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'statusText',
      key: 'status',
      render: (text: string, record: CompanyUser) => (
        <Tag color={record.status === 'active' ? 'green' : record.status === 'inactive' ? 'orange' : 'red'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: CompanyUser) => (
        <Space size="small">
          <Tooltip title="编辑用户">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setEditingUser(record);
                setShowAddUserModal(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除用户">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDeleteUser(record.id, record.name)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 联系记录表格列配置
  const contactColumns: ColumnsType<CompanyContact> = [
    {
      title: '联系方式',
      dataIndex: 'contactType',
      key: 'contactType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; icon: React.ReactNode }> = {
          email: { label: '邮件', icon: <MailOutlined /> },
          phone: { label: '电话', icon: <PhoneOutlined /> },
          meeting: { label: '会议', icon: <TeamOutlined /> },
          visit: { label: '拜访', icon: <UserOutlined /> },
          video_call: { label: '视频会议', icon: <TeamOutlined /> },
          other: { label: '其他', icon: <ContactsOutlined /> },
        };
        const typeInfo = typeMap[type] || { label: type, icon: <ContactsOutlined /> };
        return (
          <Space>
            {typeInfo.icon}
            {typeInfo.label}
          </Space>
        );
      },
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string) => text || '-',
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '联系时间',
      dataIndex: 'contactDate',
      key: 'contactDate',
      width: 150,
      render: (date: string) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          planned: { label: '计划中', color: 'blue' },
          completed: { label: '已完成', color: 'green' },
          cancelled: { label: '已取消', color: 'red' },
          rescheduled: { label: '已改期', color: 'orange' },
        };
        const statusInfo = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="企业不存在"
          description="请检查企业 ID 是否正确"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/companies')}>
              返回企业列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页头 */}
      <div style={{ marginBottom: '24px' }}>
        <Space style={{ marginBottom: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/companies')}
          >
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {company.companyName}
          </Title>
          <Tag color={getStatusColor(company.status)}>{company.statusText}</Tag>
          <Tag color={getPriorityColor(company.priority)}>{company.priorityText}</Tag>
        </Space>

        <Space>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/companies/${company.id}/edit`)}
          >
            编辑
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
        </Space>
      </div>

      {/* 内容标签页 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          items={[
            {
              label: (
                <span>
                  <ProjectOutlined />
                  企业项目
                  {companyProjects.length > 0 && <Badge count={companyProjects.length} style={{ marginLeft: 8 }} />}
                </span>
              ),
              key: 'projects',
              children: (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Button 
                      type="primary" 
                      icon={<ProjectOutlined />}
                      onClick={() => navigate(`/projects/create?companyId=${company.id}`)}
                    >
                      新建项目
                    </Button>
                  </div>
                  
                  <Table
                    columns={projectColumns}
                    dataSource={companyProjects}
                    rowKey="id"
                    loading={projectsLoading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个项目`,
                    }}
                    locale={{
                      emptyText: <Empty description="该企业暂无项目" />
                    }}
                  />
                </div>
              ),
            },
            {
              label: (
                <span>
                  <BankOutlined />
                  基本信息
                </span>
              ),
              key: 'basic',
              children: (
                <div>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Descriptions title="企业信息" column={1} bordered>
                        <Descriptions.Item label="企业名称">{company.companyName}</Descriptions.Item>
                        <Descriptions.Item label="企业代码">{company.companyCode || '-'}</Descriptions.Item>
                        <Descriptions.Item label="企业类型">{company.companyTypeText}</Descriptions.Item>
                        <Descriptions.Item label="行业">{company.industry || '-'}</Descriptions.Item>
                        <Descriptions.Item label="法定代表人">{company.legalRepresentative || '-'}</Descriptions.Item>
                        <Descriptions.Item label="营业执照">{company.businessLicense || '-'}</Descriptions.Item>
                        <Descriptions.Item label="税号">{company.taxNumber || '-'}</Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={12}>
                      <Descriptions title="联系信息" column={1} bordered>
                        <Descriptions.Item label="地址">
                          {[company.address, company.city, company.province]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="邮政编码">{company.postalCode || '-'}</Descriptions.Item>
                        <Descriptions.Item label="网站">
                          {company.website ? (
                            <a href={company.website} target="_blank" rel="noopener noreferrer">
                              <GlobalOutlined style={{ marginRight: 4 }} />
                              {company.website}
                            </a>
                          ) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="主要电话">
                          {company.mainPhone ? (
                            <span>
                              <PhoneOutlined style={{ marginRight: 4 }} />
                              {company.mainPhone}
                            </span>
                          ) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="主要邮箱">
                          {company.mainEmail ? (
                            <span>
                              <MailOutlined style={{ marginRight: 4 }} />
                              {company.mainEmail}
                            </span>
                          ) : '-'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={24}>
                    <Col span={12}>
                      <Descriptions title="商务信息" column={1} bordered>
                        <Descriptions.Item label="状态">
                          <Tag color={getStatusColor(company.status)}>{company.statusText}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="优先级">
                          <Tag color={getPriorityColor(company.priority)}>{company.priorityText}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="年度合同金额">
                          {company.annualContractValue ? formatCurrency(company.annualContractValue) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="总合同金额">
                          {company.totalContractValue ? formatCurrency(company.totalContractValue) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="合作开始时间">
                          {company.startDate ? formatDate(company.startDate) : '-'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col span={12}>
                      <Descriptions title="规模信息" column={1} bordered>
                        <Descriptions.Item label="企业规模">{company.companySizeText || '-'}</Descriptions.Item>
                        <Descriptions.Item label="员工数量">
                          {company.employeeCount ? (
                            <span>
                              <TeamOutlined style={{ marginRight: 4 }} />
                              {company.employeeCount}人
                            </span>
                          ) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="关联用户数">{company.userCount || 0}</Descriptions.Item>
                        <Descriptions.Item label="关联项目数">{company.projectCount || 0}</Descriptions.Item>
                        <Descriptions.Item label="合同数量">{company.contractCount || 0}</Descriptions.Item>
                        <Descriptions.Item label="最后联系时间">
                          {company.lastContactDate ? formatDate(company.lastContactDate) : '-'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Col>
                  </Row>

                  <Divider />

                  <Descriptions title="系统信息" column={2} bordered>
                    <Descriptions.Item label="创建者">{company.createdByName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="更新者">{company.updatedByName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{formatDate(company.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="更新时间">{formatDate(company.updatedAt)}</Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              label: (
                <span>
                  <UserOutlined />
                  企业用户
                  {companyUsers.length > 0 && <Badge count={companyUsers.length} style={{ marginLeft: 8 }} />}
                </span>
              ),
              key: 'users',
              children: (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Button 
                      type="primary" 
                      icon={<UserOutlined />}
                      onClick={() => setShowAddUserModal(true)}
                    >
                      添加用户
                    </Button>
                  </div>
                  
                  <Table
                    columns={userColumns}
                    dataSource={companyUsers}
                    rowKey="id"
                    loading={usersLoading}
                    pagination={false}
                    locale={{
                      emptyText: <Empty description="暂无企业用户" />
                    }}
                  />
                </div>
              ),
            },
            {
              label: (
                <span>
                  <HistoryOutlined />
                  联系记录
                  {companyContacts.length > 0 && <Badge count={companyContacts.length} style={{ marginLeft: 8 }} />}
                </span>
              ),
              key: 'contacts',
              children: (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Button type="primary" icon={<ContactsOutlined />}>
                      添加联系记录
                    </Button>
                  </div>
                  
                  <Table
                    columns={contactColumns}
                    dataSource={companyContacts}
                    rowKey="id"
                    loading={contactsLoading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                    }}
                    locale={{
                      emptyText: <Empty description="暂无联系记录" />
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 添加用户Modal */}
      {company && (
        <AddCompanyUserModal
          visible={showAddUserModal}
          companyId={company.id}
          companyName={company.companyName}
          editUser={editingUser}
          onCancel={() => {
            setShowAddUserModal(false);
            setEditingUser(undefined);
          }}
          onSuccess={handleAddUserSuccess}
        />
      )}
    </div>
  );
};

export default CompanyDetailPage;