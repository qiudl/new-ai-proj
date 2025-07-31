// @ts-nocheck
// 企业客户详情页前端性能优化方案
// CompanyDetailPage.tsx 优化版本

import React, { useState, useEffect, useCallback} from 'react';
import { 
 Card, 
 Typography, 
 Modal, 
 message, 
 Empty, 
 Skeleton
} from 'antd';
import { 
 ArrowLeftOutlined, 
 EditOutlined, 
 ProjectOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Company, CompanyUser, CompanyContact } from '../types/company';
import { Project, ProjectUser, ProjectCompany } from '../types/project';
import companyService from '../services/companyService';
import { projectService } from '../services/projectService';
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '../utils/formatters';
import AddCompanyUserModal from '../components/AddCompanyUserModal';
import type {} from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

// ========================================
// 性能优化组件
// ========================================

// 骨架屏组件 - 改善用户体验
const CompanyDetailSkeleton: React.FC = React.memo(() => (
  <div style={{ padding: '24px' }}>
    <div style={{ marginBottom: '24px' }}>
      <Space style={{ marginBottom: '16px' }}>
        <Skeleton.Button size="default" active />
        <Skeleton.Input size="large" active style={{ width: 200 }} />
        <Skeleton.Button size="small" active />
        <Skeleton.Button size="small" active />
      </Space>
      <Space>
        <Skeleton.Button size="default" active />
        <Skeleton.Button size="default" active />
      </Space>
    </div>
    <Card>
      <Skeleton active paragraph={{ rows: 4 }} />
    </Card>
  </div>
));

// 优化的表格组件 - 使用React.memo减少重渲染
const OptimizedProjectTable = React.memo<{
  projects: Project[];
  loading: boolean;
  onNavigate: (path: string) => void;
}>(({ projects, loading, onNavigate }) => {
  
  // 使用useMemo优化列配置，避免每次渲染重新创建
  const columns = useMemo(() => [
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
              onClick={() => onNavigate(`/projects/${record.id}`)}
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
      )},
    {
      title: '项目描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-'},
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
          cancelled: { label: '已取消', color: 'red' }};
        const statusInfo = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      }},
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityMap: Record<string, { label: string; color: string }> = {
          high: { label: '高', color: 'red' },
          medium: { label: '中', color: 'orange' },
          low: { label: '低', color: 'green' }};
        const priorityInfo = priorityMap[priority] || { label: priority, color: 'default' };
        return <Tag color={priorityInfo.color}>{priorityInfo.label}</Tag>;
      }},
    // ... 其他列配置
  ], [onNavigate]);

  return (
    <Table
      columns={columns}
      dataSource={projects}
      rowKey="id"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 个项目`}}
      locale={{
        emptyText: <Empty description="该企业暂无项目" />
      }}
    />
  );
});

// 优化的用户表格组件
const OptimizedUserTable = React.memo<{
  users: CompanyUser[];
  loading: boolean;
  onEditUser: (user: CompanyUser) => void;
  onDeleteUser: (id: number, name: string) => void;
}>(({ users, loading, onEditUser, onDeleteUser }) => {
  
  const columns = useMemo(() => [
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
      )},
    // ... 其他列配置
  ], [onEditUser, onDeleteUser]);

  return (
    <Table
      columns={columns}
      dataSource={users}
      rowKey="id"
      loading={loading}
      pagination={false}
      locale={{
        emptyText: <Empty description="暂无企业用户" />
      }}
    />
  );
});

// ========================================
// 主组件
// ========================================

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [companyContacts, setCompanyContacts] = useState<CompanyContact[]>([]);
  
  // 优化loading状态管理 - 使用单一状态对象
  const [loadingState, setLoadingState] = useState({
    basic: true,
    projects: false,
    users: false,
    contacts: false
  });
  
  // 数据加载状态追踪 - 避免重复加载
  const [dataLoaded, setDataLoaded] = useState({
    projects: false,
    users: false,
    contacts: false
  });
  
  const [activeTab, setActiveTab] = useState('projects');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | undefined>(undefined);

  const companyId = parseInt(id || '0');

  // 使用useCallback优化函数引用，避免子组件重渲染
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // 优化的数据加载函数
  const loadCompany = useCallback(async () => {
    if (!companyId || companyId <= 0) {
      message.error('无效的企业 ID');
      navigate('/companies');
      return;
    }

    setLoadingState(prev => ({ ...prev, basic: true }));
    try {
      const data = await companyService.getCompany(companyId);
      setCompany(data);
    } catch (error) {
      console.error('Failed to load company:', error);
      message.error('加载企业信息失败');
      navigate('/companies');
    } finally {
      setLoadingState(prev => ({ ...prev, basic: false }));
    }
  }, [companyId, navigate]);

  // 并行加载相关数据 - 性能优化关键点
  const preloadRelatedData = useCallback(async () => {
    if (!companyId) return;

    // 并行加载所有相关数据，而不是等待用户点击标签
    const loadPromises: Promise<void>[] = [];

    // 项目数据预加载
    if (!dataLoaded.projects) {
      loadPromises.push(
        (async () => {
          try {
            setLoadingState(prev => ({ ...prev, projects: true }));
            const projectData = await projectService.getProjectsByCompany(companyId);
            const filteredProjects = projectData.filter(project => 
              project.company_id === companyId || 
              (project.companies && project.companies.some(company => company.company_id === companyId))
            );
            setCompanyProjects(filteredProjects);
            setDataLoaded(prev => ({ ...prev, projects: true }));
          } catch (error) {
            console.error('Failed to preload projects:', error);
          } finally {
            setLoadingState(prev => ({ ...prev, projects: false }));
          }
        })()
      );
    }

    // 用户数据预加载
    if (!dataLoaded.users) {
      loadPromises.push(
        (async () => {
          try {
            setLoadingState(prev => ({ ...prev, users: true }));
            const userData = await companyService.getCompanyUsers(companyId);
            setCompanyUsers(userData);
            setDataLoaded(prev => ({ ...prev, users: true }));
          } catch (error) {
            console.error('Failed to preload users:', error);
          } finally {
            setLoadingState(prev => ({ ...prev, users: false }));
          }
        })()
      );
    }

    // 联系记录数据预加载
    if (!dataLoaded.contacts) {
      loadPromises.push(
        (async () => {
          try {
            setLoadingState(prev => ({ ...prev, contacts: true }));
            const contactResponse = await companyService.getCompanyContacts(companyId, { page: 1, pageSize: 50 });
            setCompanyContacts(contactResponse.data);
            setDataLoaded(prev => ({ ...prev, contacts: true }));
          } catch (error) {
            console.error('Failed to preload contacts:', error);
          } finally {
            setLoadingState(prev => ({ ...prev, contacts: false }));
          }
        })()
      );
    }

    // 等待所有预加载完成
    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
    }
  }, [companyId, dataLoaded]);

  // 初始化数据加载
  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  // 企业信息加载完成后立即开始预加载相关数据
  useEffect(() => {
    if (company) {
      // 延迟一点时间开始预加载，避免阻塞主界面渲染
      const timer = setTimeout(() => {
        preloadRelatedData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [company, preloadRelatedData]);

  // 优化的标签切换处理
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    // 由于数据已经预加载，这里不需要额外的加载逻辑
  }, []);

  // 优化的用户编辑处理
  const handleEditUser = useCallback((user: CompanyUser) => {
    setEditingUser(user);
    setShowAddUserModal(true);
  }, []);

  // 优化的用户删除处理
  const handleDeleteUser = useCallback((userId: number, userName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户"${userName}"吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          setCompanyUsers(prev => prev.filter(user => user.id !== userId));
          message.success('用户删除成功');
        } catch (error) {
          console.error('Failed to delete user:', error);
          message.error('删除用户失败');
        }
      }});
  }, []);

  // 使用useMemo优化标签页配置
  const tabItems = useMemo(() => [
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
              onClick={() => navigate(`/projects/create?companyId=${company?.id}`)}
            >
              新建项目
            </Button>
          </div>
          <OptimizedProjectTable
            projects={companyProjects}
            loading={loadingState.projects}
            onNavigate={handleNavigate}
          />
        </div>
      )},
    // ... 其他标签页配置
  ], [companyProjects, loadingState.projects, handleNavigate, company?.id, navigate]);

  // 如果正在加载基本信息，显示骨架屏
  if (loadingState.basic) {
    return <CompanyDetailSkeleton />;
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
            onClick={() => {
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
                }});
            }}
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
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default React.memo(CompanyDetailPage);
