import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Spin,
  Row,
  Col,
  Typography,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { Project, ProjectRequest } from '../types/project';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ProjectEditPageSimplified: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (projectId && projectId !== 'create') {
      setIsEditing(true);
      loadProject();
    } else {
      setIsEditing(false);
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId || projectId === 'create') return;

    try {
      setLoading(true);
      const projectData = await projectService.getProject(Number(projectId));
      
      setProject(projectData);
      
      // 设置表单值
      form.setFieldsValue({
        name: projectData.name,
        description: projectData.description || '',
      });
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      // 目前后端只支持基本的name和description字段
      const projectData: ProjectRequest = {
        name: values.name,
        description: values.description || ''
      };

      if (isEditing && projectId) {
        await projectService.updateProject(Number(projectId), projectData);
        message.success('项目更新成功');
        message.info('注意：目前只支持更新项目名称和描述，其他功能即将推出');
      } else {
        await projectService.createProject(projectData);
        message.success('项目创建成功');
        message.info('注意：目前只支持创建基本项目信息，其他功能即将推出');
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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <Spin size="large" tip="加载项目信息中..." />
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
              </Space>
              <Text type="secondary">
                {isEditing ? '修改项目的基本信息' : '创建一个新的项目，设置基本信息'}
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
          <Col xs={24} lg={16} xl={12}>
            {/* 基本信息 */}
            <Card title="基本信息" extra={<InfoCircleOutlined />} style={{ marginBottom: 24 }}>
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

            {/* 功能提示 */}
            <Card title="功能说明" style={{ marginBottom: '24px' }}>
              <Alert
                message="当前版本功能限制"
                description={
                  <div>
                    <p>目前项目编辑功能仅支持：</p>
                    <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                      <li>项目名称编辑</li>
                      <li>项目描述编辑</li>
                    </ul>
                    <p style={{ marginTop: '12px', marginBottom: 0 }}>
                      以下功能正在开发中，敬请期待：
                    </p>
                    <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                      <li>项目状态和优先级设置</li>
                      <li>项目进度跟踪</li>
                      <li>客户关联管理</li>
                      <li>项目成员分配</li>
                      <li>项目时间计划</li>
                    </ul>
                  </div>
                }
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default ProjectEditPageSimplified;