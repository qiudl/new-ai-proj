import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Tag, message, Modal, Spin, Table, Space, Typography, Radio } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, UnorderedListOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, ProjectRequest } from '../types/project';
import ProjectModal from '../components/ProjectModal';

const { Title } = Typography;

type ViewMode = 'list' | 'card';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [modalLoading, setModalLoading] = useState(false);
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
      
      // Filter out invalid project objects
      const validProjects = projectsData.filter(project => 
        project && 
        typeof project === 'object' && 
        typeof project.id !== 'undefined'
      );
      
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
    setEditingProject(undefined);
    setModalVisible(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setModalVisible(true);
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

  const handleModalSubmit = async (values: ProjectRequest) => {
    try {
      setModalLoading(true);
      if (editingProject) {
        await projectService.updateProject(editingProject.id, values);
      } else {
        await projectService.createProject(values);
      }
      loadProjects();
    } catch (error) {
      throw error; // Let the modal handle the error
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingProject(undefined);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingProject(undefined);
  };

  // 表格列配置
  const columns: ColumnsType<Project> = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/projects/${record.id}/tasks`)}
          style={{ padding: 0, fontSize: '14px' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '暂无描述',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      render: () => <Tag color="processing">进行中</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      responsive: ['md' as const],
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      responsive: ['lg' as const],
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Project) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => navigate(`/projects/${record.id}/tasks`)}
          >
            查看任务
          </Button>
          <Button 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditProject(record)}
          >
            编辑
          </Button>
          <Button 
            size="small"
            icon={<DeleteOutlined />} 
            danger
            onClick={() => handleDeleteProject(record)}
          >
            删除
          </Button>
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
              <Button
                type="text"
                onClick={() => navigate(`/projects/${project.id}/tasks`)}
              >
                查看任务
              </Button>,
              <Button 
                type="text" 
                icon={<EditOutlined />}
                onClick={() => handleEditProject(project)}
              >
                编辑
              </Button>,
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                danger
                onClick={() => handleDeleteProject(project)}
              >
                删除
              </Button>,
            ]}
          >
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>{project.name}</Title>
              <p style={{ color: '#8c8c8c', margin: 0, minHeight: '40px' }}>
                {project.description || '暂无描述'}
              </p>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Tag color="processing">进行中</Tag>
            </div>
            
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

      <ProjectModal
        visible={modalVisible}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
        project={editingProject}
        loading={modalLoading}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default ProjectsPage;