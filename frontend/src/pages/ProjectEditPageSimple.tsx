import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  message,
  Space,
  Spin,
  Row,
  Col,
  Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { Project, ProjectRequest } from '../types/project';

const { Title } = Typography;
const { TextArea } = Input;

const ProjectEditPageSimple: React.FC = () => {
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
      form.setFieldsValue({
        status: 'planning',
        priority: 'medium'
      });
    }
  }, [projectId, form]);

  const loadProject = async () => {
    if (!projectId || projectId === 'create') return;

    try {
      setLoading(true);
      const projectData = await projectService.getProject(Number(projectId));
      setProject(projectData);
      
      form.setFieldsValue({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium'
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
      
      const projectData: ProjectRequest = {
        name: values.name,
        description: values.description,
        status: values.status,
        priority: values.priority
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
              <Title level={2} style={{ margin: 0 }}>
                {isEditing ? '编辑项目' : '创建项目'}
              </Title>
            </div>
            
            <Space>
              <Button icon={<CloseOutlined />} onClick={handleCancel}>
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

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
        <Row gutter={24}>
          <Col span={24}>
            <Card title="基本信息">
              <Form.Item
                label="项目名称"
                name="name"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="请输入项目名称" />
              </Form.Item>

              <Form.Item
                label="项目描述"
                name="description"
              >
                <TextArea rows={4} placeholder="请描述项目的目标和范围..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="项目状态"
                    name="status"
                    rules={[{ required: true, message: '请选择项目状态' }]}
                  >
                    <Select placeholder="请选择项目状态">
                      <Select.Option value="planning">规划中</Select.Option>
                      <Select.Option value="active">进行中</Select.Option>
                      <Select.Option value="on_hold">暂停</Select.Option>
                      <Select.Option value="completed">已完成</Select.Option>
                      <Select.Option value="cancelled">已取消</Select.Option>
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
                      <Select.Option value="high">高</Select.Option>
                      <Select.Option value="medium">中</Select.Option>
                      <Select.Option value="low">低</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default ProjectEditPageSimple;