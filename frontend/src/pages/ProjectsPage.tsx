import React from 'react';
import { Button, Card, Row, Col, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - will be replaced with API calls
  const projects = [
    {
      id: 1,
      name: '示例项目1',
      description: '这是一个用于测试的示例项目',
      status: 'active',
      taskCount: 12,
      completedCount: 8,
    },
    {
      id: 2,
      name: 'AI模型训练项目',
      description: '机器学习模型训练和部署项目',
      status: 'active',
      taskCount: 18,
      completedCount: 5,
    },
    {
      id: 3,
      name: '前端开发项目',
      description: 'React前端应用开发项目',
      status: 'completed',
      taskCount: 25,
      completedCount: 25,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'processing';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      default:
        return '未知';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">项目管理</h1>
            <p className="page-description">管理您的所有项目</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>
            创建项目
          </Button>
        </div>
      </div>

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
                <Button type="text" icon={<EditOutlined />}>
                  编辑
                </Button>,
                <Button type="text" icon={<DeleteOutlined />} danger>
                  删除
                </Button>,
              ]}
            >
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, marginBottom: 8 }}>{project.name}</h3>
                <p style={{ color: '#8c8c8c', margin: 0 }}>{project.description}</p>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Tag color={getStatusColor(project.status)}>
                  {getStatusText(project.status)}
                </Tag>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c' }}>
                <span>任务总数: {project.taskCount}</span>
                <span>已完成: {project.completedCount}</span>
              </div>
              
              <div style={{ marginTop: 8 }}>
                <div style={{ 
                  width: '100%', 
                  height: 4, 
                  backgroundColor: '#f0f0f0',
                  borderRadius: 2 
                }}>
                  <div style={{
                    width: `${(project.completedCount / project.taskCount) * 100}%`,
                    height: '100%',
                    backgroundColor: '#52c41a',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ProjectsPage;