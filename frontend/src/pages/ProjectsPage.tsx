import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Tag, message, Modal, Spin, Table, Space, Typography, Radio, Progress, Tooltip } from 'antd';
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

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjects();
      
      // Validate that response.data is an array
      if (!response || !response.data) {
        console.warn('Invalid response structure:', response);
        setProjects([]);
        return;
      }
      
      // Ensure data is an array
      const projectsData = Array.isArray(response.data) ? response.data : [];
      
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
        }
      },
    });
  };

  // Modal handlers removed - using dedicated edit page now

  // 表格列配置
  const columns: ColumnsType<Project> = [
    {
      title: '项目编号',
      dataIndex: 'project_number',
      key: 'project_number',
      width: 100,
      render: (text: string, record: Project) => (
        <Space align="center">
          <NumberOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500, color: '#1890ff' }}>
            {record.project_number || generateProjectNumber(record.id)}
          </span>
        </Space>
      ),
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/projects/${record.id}`)}
          style={{ padding: 0, fontSize: '14px', fontWeight: 500 }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '所属客户',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 150,
      render: (text: string, record: Project) => (
        <Space align="center">
          <BankOutlined style={{ color: '#52c41a' }} />
          <span style={{ color: record.company_name && record.company_name !== '未分配客户' ? '#000' : '#8c8c8c' }}>
            {text || '未分配客户'}
          </span>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record: Project) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      ),
    },
    {
      title: '优先级',
      key: 'priority',
      width: 80,
      render: (_, record: Project) => (
        <Tag color={getPriorityColor(record.priority)}>
          {getPriorityText(record.priority)}
        </Tag>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      width: 120,
      render: (_, record: Project) => (
        <Progress 
          percent={record.progress || 0} 
          size="small"
          status={record.progress === 100 ? 'success' : 'active'}
          showInfo={true}
        />
      ),
      responsive: ['md' as const],
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
      responsive: ['xl' as const],
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_: any, record: Project) => (
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
          <Tooltip title="编辑">
            <Button 
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditProject(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
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
        </Space>
      ),
    },
  ];

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
              <Tooltip title="编辑" key="edit">
                <Button 
                  type="text" 
                  icon={<EditOutlined />}
                  onClick={() => handleEditProject(project)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>,
              <Tooltip title="删除" key="delete">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  onClick={() => handleDeleteProject(project)}
                  style={{ color: '#ff4d4f' }}
                  danger
                />
              </Tooltip>,
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
      dataSource={Array.isArray(projects) ? projects : []}
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
            创建项目
          </Button>
        </div>
        
        {/* 视图切换控件 */}
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
          </div>
          
          <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
            共 {projects.length} 个项目
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