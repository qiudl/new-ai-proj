import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Tag, Space, message, Modal, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project, ProjectRequest } from '../types/project';
import ProjectModal from '../components/ProjectModal';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [modalLoading, setModalLoading] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjects();
      setProjects(response.data);
    } catch (error) {
      message.error('加载项目失败');
      console.error('Error loading projects:', error);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">项目管理</h1>
            <p className="page-description">管理您的所有项目</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
            创建项目
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} sm={12} lg={8} key={project.id}>
              <Card
                actions={[
                  <Button
                    type="text"
                    icon={<EditOutlined />}
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
                  <h3 style={{ margin: 0, marginBottom: 8 }}>{project.name}</h3>
                  <p style={{ color: '#8c8c8c', margin: 0 }}>{project.description || '暂无描述'}</p>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <Tag color="processing">
                    进行中
                  </Tag>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c' }}>
                  <span>创建时间: {new Date(project.created_at).toLocaleDateString()}</span>
                  <span>更新时间: {new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
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