import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Tag, message, Modal, Spin, Table, Space, Typography, Radio, Progress, Tooltip } from 'antd';
import { cleanupModalOverlays } from '../utils/overlayCleanup';
import type { ColumnsType } from 'antd/es/table';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  AppstoreOutlined, 
  UnorderedListOutlined, 
  UserOutlined, 
  CalendarOutlined,
  EyeOutlined,
  BuildOutlined,
  BankOutlined,
  NumberOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types/project';
import ColumnCustomizer, { ColumnConfig } from '../components/ColumnCustomizer';
import PermissionWrapper from '../components/PermissionWrapper';
import { PROJECT_PERMISSIONS } from '../constants/permissions';

const { Title } = Typography;

type ViewMode = 'list' | 'card';

// 工具函数
const generateProjectNumber = (projectId: number): string => {
  return `P${(100 + projectId).toString()}`;
};

const getStatusColor = (status?: string): string => {
  const colorMap: Record<string, string> = {
    'planning': 'blue',
    'active': 'green',
    'on_hold': 'orange',
    'completed': 'purple',
    'cancelled': 'red'
  };
  return colorMap[status || 'active'] || 'green';
};

const getStatusText = (status?: string): string => {
  const textMap: Record<string, string> = {
    'planning': '规划中',
    'active': '进行中',
    'on_hold': '暂停',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return textMap[status || 'active'] || '进行中';
};

const getPriorityColor = (priority?: string): string => {
  const colorMap: Record<string, string> = {
    'high': 'red',
    'medium': 'orange',
    'low': 'green'
  };
  return colorMap[priority || 'medium'] || 'orange';
};

const getPriorityText = (priority?: string): string => {
  const textMap: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低'
  };
  return textMap[priority || 'medium'] || '中';
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  // Removed modal-related state since we're using dedicated edit page
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // 默认为列表视图
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      
      // Debug: 检查认证状态
      const token = localStorage.getItem('token');
      console.log('当前token状态:', token ? '存在' : '不存在');
      
      const response = await projectService.getProjects();
      
      
      // axios interceptor已经解包，response结构是 { data: [...], pagination: {...} }
      // 所以 response.data 就是项目数组
      if (!response || !Array.isArray(response.data)) {
        console.warn('Invalid response structure:', response);
        setProjects([]);
        return;
      }
      
      // response.data 就是项目数组
      const projectsData = response.data;
      
      // Filter out invalid project objects and add project numbers
      const validProjects = projectsData.filter(project => 
        project && 
        typeof project === 'object' && 
        typeof project.id !== 'undefined'
      ).map(project => ({
        ...project,
        project_number: project.project_number || generateProjectNumber(project.id),
        company_name: project.company_name || '未分配客户' // 如果没有客户信息，显示默认值
      }));
      
      setProjects(validProjects);
    } catch (error) {
      message.error('加载项目失败');
      console.error('Error loading projects:', error);
      // Set empty array on error to prevent undefined state
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = () => {
    navigate('/projects/create');
  };

  const handleEditProject = (project: Project) => {
    navigate(`/projects/${project.id}/edit`);
  };

  const handleDeleteProject = (project: Project) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目 "${project.name}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await projectService.deleteProject(project.id);
          message.success('项目删除成功');
          loadProjects();
        } catch (error) {
          message.error('删除项目失败');
          console.error('Error deleting project:', error);
        } finally {
          // Ensure modal cleanup after operation
          setTimeout(cleanupModalOverlays, 100);
        }
      },
      onCancel: () => {
        // Ensure cleanup on cancel as well
        setTimeout(cleanupModalOverlays, 100);
      },
    });
  };

  // Modal handlers removed - using dedicated edit page now

  // 默认列配置
  const defaultColumns: ColumnConfig[] = [
    {
      key: 'project_number',
      title: '项目编号',
      visible: true,
      required: true,
      description: '系统生成的唯一项目编号',
      width: 100
    },
    {
      key: 'name',
      title: '项目名称',
      visible: true,
      required: true,
      description: '项目的名称标题',
      width: 200
    },
    {
      key: 'company_name',
      title: '所属客户',
      visible: true,
      description: '项目所属的客户公司',
      width: 150
    },
    {
      key: 'status',
      title: '状态',
      visible: true,
      description: '项目当前状态',
      width: 100
    },
    {
      key: 'priority',
      title: '优先级',
      visible: true,
      description: '项目优先级等级',
      width: 80
    },
    {
      key: 'progress',
      title: '进度',
      visible: true,
      description: '项目完成进度百分比',
      width: 120
    },
    {
      key: 'description',
      title: '项目描述',
      visible: false,
      description: '项目的详细描述信息',
      width: 200
    },
    {
      key: 'created_at',
      title: '创建时间',
      visible: true,
      description: '项目创建日期',
      width: 120
    },
    {
      key: 'updated_at',
      title: '更新时间',
      visible: false,
      description: '项目最后更新日期',
      width: 120
    },
    {
      key: 'actions',
      title: '操作',
      visible: true,
      required: true,
      description: '查看、编辑、删除操作',
      width: 120
    }
  ];

  // 初始化列配置
  useEffect(() => {
    setColumnConfig(defaultColumns);
  }, []);

  // 处理列配置变更
  const handleColumnConfigChange = (newColumns: ColumnConfig[]) => {
    setColumnConfig(newColumns);
  };

  // 获取排序后的项目数据
  const getSortedProjects = () => {
    if (!sortConfig) return projects;
    
    return [...projects].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // 根据不同字段处理排序值
      switch (sortConfig.field) {
        case 'project_number':
          aValue = a.project_number || generateProjectNumber(a.id);
          bValue = b.project_number || generateProjectNumber(b.id);
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'company_name':
          aValue = a.company_name || '未分配客户';
          bValue = b.company_name || '未分配客户';
          break;
        case 'status':
          aValue = a.status || 'active';
          bValue = b.status || 'active';
          break;
        case 'priority':
          // 优先级排序：high > medium > low
          const priorityMap = { high: 3, medium: 2, low: 1 };
          aValue = priorityMap[a.priority as keyof typeof priorityMap] || 0;
          bValue = priorityMap[b.priority as keyof typeof priorityMap] || 0;
          break;
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'created_at':
        case 'updated_at':
          aValue = new Date((a as unknown)[sortConfig.field]).getTime();
          bValue = new Date((b as unknown)[sortConfig.field]).getTime();
          break;
        default:
          aValue = (a as unknown)[sortConfig.field];
          bValue = (b as unknown)[sortConfig.field];
      }
      
      let comparison = 0;
      
      // 处理字符串和数字的比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'zh-CN');
      } else {
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
      }
      
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
  };

  // 处理排序
  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ field, direction });
  };

  // 表格列配置
  const columns: unknown[] = columnConfig
    .filter(col => col.visible)
    .map(col => {
      const baseColumn = {
        key: col.key,
        title: col.title,
        width: col.width,
        sorter: col.key !== 'actions', // 除了操作列，所有列都支持排序
        sortOrder: sortConfig?.field === col.key ? sortConfig.direction + 'end' as unknown : null,
        onHeaderCell: () => ({
          onClick: () => col.key !== 'actions' && handleSort(col.key)
        })
      };

      switch (col.key) {
        case 'project_number':
          return {
            ...baseColumn,
            dataIndex: 'project_number',
            render: (text: string, record: Project) => (
              <Space align="center">
                <NumberOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 500, color: '#1890ff' }}>
                  {record.project_number || generateProjectNumber(record.id)}
                </span>
              </Space>
            ),
          };
        case 'name':
          return {
            ...baseColumn,
            dataIndex: 'name',
            render: (text: string, record: Project) => (
              <Button 
                type="link" 
                onClick={() => navigate(`/projects/${record.id}`)}
                style={{ padding: 0, fontSize: '14px', fontWeight: 500 }}
              >
                {text}
              </Button>
            ),
          };
        case 'company_name':
          return {
            ...baseColumn,
            dataIndex: 'company_name',
            render: (text: string, record: Project) => (
              <Space align="center">
                <BankOutlined style={{ color: '#52c41a' }} />
                <span style={{ color: record.company_name && record.company_name !== '未分配客户' ? '#000' : '#8c8c8c' }}>
                  {text || '未分配客户'}
                </span>
              </Space>
            ),
          };
        case 'status':
          return {
            ...baseColumn,
            render: (_, record: Project) => (
              <Tag color={getStatusColor(record.status)}>
                {getStatusText(record.status)}
              </Tag>
            ),
          };
        case 'priority':
          return {
            ...baseColumn,
            render: (_, record: Project) => (
              <Tag color={getPriorityColor(record.priority)}>
                {getPriorityText(record.priority)}
              </Tag>
            ),
          };
        case 'progress':
          return {
            ...baseColumn,
            render: (_, record: Project) => (
              <Progress 
                percent={record.progress || 0} 
                size="small"
                status={record.progress === 100 ? 'success' : 'active'}
                showInfo={true}
              />
            ),
            responsive: ['md' as const],
          };
        case 'description':
          return {
            ...baseColumn,
            dataIndex: 'description',
            render: (text: string) => (
              <Tooltip title={text}>
                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {text || '暂无描述'}
                </span>
              </Tooltip>
            ),
          };
        case 'created_at':
          return {
            ...baseColumn,
            dataIndex: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
            responsive: ['xl' as const],
          };
        case 'updated_at':
          return {
            ...baseColumn,
            dataIndex: 'updated_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
            responsive: ['xl' as const],
          };
        case 'actions':
          return {
            ...baseColumn,
            fixed: 'right',
            render: (_: unknown, record: Project) => (
              <Space size="middle">
                <Tooltip title="查看">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/projects/${record.id}`)}
                    style={{ color: '#1890ff' }}
                  />
                </Tooltip>
                <PermissionWrapper permission={PROJECT_PERMISSIONS.UPDATE}>
                  <Tooltip title="编辑">
                    <Button 
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditProject(record)}
                      style={{ color: '#52c41a' }}
                    />
                  </Tooltip>
                </PermissionWrapper>
                <PermissionWrapper permission={PROJECT_PERMISSIONS.DELETE}>
                  <Tooltip title="删除">
                    <Button 
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteProject(record)}
                      style={{ color: '#ff4d4f' }}
                      danger
                    />
                  </Tooltip>
                </PermissionWrapper>
              </Space>
            ),
          };
        default:
          return baseColumn;
      }
    }) as unknown[];


  // 渲染卡片视图
  const renderCardView = () => (
    <Row gutter={[16, 16]}>
      {projects.map((project) => (
        <Col xs={24} sm={12} lg={8} key={project.id}>
          <Card
            hoverable
            actions={[
              <Tooltip title="查看" key="view">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>,
              <PermissionWrapper permission={PROJECT_PERMISSIONS.UPDATE} key="edit">
                <Tooltip title="编辑">
                  <Button 
                    type="text" 
                    icon={<EditOutlined />}
                    onClick={() => handleEditProject(project)}
                    style={{ color: '#52c41a' }}
                  />
                </Tooltip>
              </PermissionWrapper>,
              <PermissionWrapper permission={PROJECT_PERMISSIONS.DELETE} key="delete">
                <Tooltip title="删除">
                  <Button 
                    type="text" 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDeleteProject(project)}
                    style={{ color: '#ff4d4f' }}
                  danger
                />
              </Tooltip>
              </PermissionWrapper>,
            ]}
          >
            {/* 项目编号 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space align="center">
                <NumberOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 500, color: '#1890ff' }}>
                  {project.project_number || generateProjectNumber(project.id)}
                </span>
              </Space>
              <Space>
                <Tag color={getStatusColor(project.status)}>
                  {getStatusText(project.status)}
                </Tag>
                <Tag color={getPriorityColor(project.priority)}>
                  {getPriorityText(project.priority)}
                </Tag>
              </Space>
            </div>

            {/* 项目标题和描述 */}
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>{project.name}</Title>
              <p style={{ color: '#8c8c8c', margin: 0, minHeight: '40px' }}>
                {project.description || '暂无描述'}
              </p>
            </div>

            {/* 所属客户 */}
            <div style={{ marginBottom: 12 }}>
              <Space align="center">
                <BankOutlined style={{ color: '#52c41a' }} />
                <span style={{ 
                  fontSize: '13px',
                  color: project.company_name && project.company_name !== '未分配客户' ? '#000' : '#8c8c8c' 
                }}>
                  {project.company_name || '未分配客户'}
                </span>
              </Space>
            </div>

            {/* 进度条 */}
            {project.progress !== undefined && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>项目进度</div>
                <Progress 
                  percent={project.progress} 
                  size="small"
                  status={project.progress === 100 ? 'success' : 'active'}
                />
              </div>
            )}

            
            {/* 时间信息 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#8c8c8c', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CalendarOutlined style={{ marginRight: '4px' }} />
                <span>创建: {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <UserOutlined style={{ marginRight: '4px' }} />
                <span>更新: {new Date(project.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // 渲染列表视图
  const renderListView = () => (
    <Table
      dataSource={Array.isArray(projects) ? getSortedProjects() : []}
      columns={columns}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 个项目`,
      }}
      size="middle"
      scroll={{ x: 1200 }}
      bordered
    />
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>项目列表</Title>
            <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>管理您的所有项目</p>
          </div>
          <PermissionWrapper 
            permission={PROJECT_PERMISSIONS.CREATE}
            fallback={<Tooltip title="您没有创建项目的权限"><Button type="primary" disabled icon={<PlusOutlined />}>创建项目</Button></Tooltip>}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
              创建项目
            </Button>
          </PermissionWrapper>
        </div>
        
        {/* 视图切换控件和列设置 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#8c8c8c' }}>视图模式:</span>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="list">
                <UnorderedListOutlined /> 列表
              </Radio.Button>
              <Radio.Button value="card">
                <AppstoreOutlined /> 卡片
              </Radio.Button>
            </Radio.Group>
            
            {/* 列自定义功能，仅在列表视图时显示 */}
            {viewMode === 'list' && (
              <ColumnCustomizer
                columns={columnConfig}
                onChange={handleColumnConfigChange}
                storageKey="project-list-columns"
              />
            )}
          </div>
          
          <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
            共 {projects.length} 个项目
            {sortConfig && (
              <span style={{ marginLeft: '8px' }}>
                (按{columnConfig.find(col => col.key === sortConfig.field)?.title}{sortConfig.direction === 'asc' ? '升序' : '降序'})
              </span>
            )}
          </div>
        </div>
      </div>

      <Spin spinning={loading}>
        {viewMode === 'list' ? renderListView() : renderCardView()}
      </Spin>

      {/* Project modal removed - using dedicated edit page */}
    </div>
  );
};

export default ProjectsPage;