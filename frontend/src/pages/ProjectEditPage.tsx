import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Upload,
  Switch
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
  UploadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { projectService } from '../services/projectService';
import { Project, ProjectRequest } from '../types/project';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ProjectEditPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(true); // 判断是创建还是编辑模式

  useEffect(() => {
    if (projectId && projectId !== 'create') {
      setIsEditing(true);
      loadProject();
    } else {
      setIsEditing(false);
      // 创建模式下设置默认值
      form.setFieldsValue({
        status: 'planning',
        priority: 'medium',
        progress: 0
      });
    }
  }, [projectId, form]);

  const loadProject = async () => {
    if (!projectId || projectId === 'create') return;

    try {
      setLoading(true);
      const projectData = await projectService.getProject(Number(projectId));
      
      setProject(projectData);
      
      // 设置表单值
      form.setFieldsValue({
        name: projectData.name,
        description: projectData.description,
        company_id: projectData.company_id,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        progress: projectData.progress || 0,
        date_range: projectData.start_date && projectData.end_date ? [
          dayjs(projectData.start_date),
          dayjs(projectData.end_date)
        ] : undefined
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
      
      // 处理表单数据
      const projectData: ProjectRequest = {
        name: values.name,
        description: values.description,
        company_id: values.company_id,
        status: values.status,
        priority: values.priority,
        progress: values.progress,
        start_date: values.date_range?.[0]?.format('YYYY-MM-DD'),
        end_date: values.date_range?.[1]?.format('YYYY-MM-DD')
      };

      if (isEditing && projectId) {
        // 编辑模式
        await projectService.updateProject(Number(projectId), projectData);
        message.success('项目更新成功');
      } else {
        // 创建模式
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
                {isEditing && project && (
                  <Tag color="blue">
                    {project.project_number || `P${(100 + project.id).toString()}`}
                  </Tag>
                )}
              </Space>
              <Text type="secondary">
                {isEditing ? '修改项目的基本信息和配置' : '创建一个新的项目'}
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
          {/* 基本信息 */}
          <Col xs={24} lg={16}>
            <Card title="基本信息" extra={<InfoCircleOutlined />}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
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
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="所属客户"
                    name="company_id"
                    rules={[{ required: true, message: '请选择所属客户' }]}
                  >
                    <Select 
                      placeholder="请选择所属客户"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      <Option value={1}>
                        <Space>
                          <BankOutlined style={{ color: '#52c41a' }} />
                          北京科技有限公司
                        </Space>
                      </Option>
                      <Option value={2}>
                        <Space>
                          <BankOutlined style={{ color: '#52c41a' }} />
                          上海创新科技
                        </Space>
                      </Option>
                      <Option value={3}>
                        <Space>
                          <BankOutlined style={{ color: '#52c41a' }} />
                          深圳智能制造
                        </Space>
                      </Option>
                    </Select>
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
                <Col xs={24} md={8}>
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
                
                <Col xs={24} md={8}>
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
                
                <Col xs={24} md={8}>
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
            </Card>
          </Col>

          {/* 项目配置 */}
          <Col xs={24} lg={8}>
            <Card title="项目配置" extra={<BuildOutlined />}>

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

              <Divider />
              
              {isEditing && project && (
                <div>
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

            {!isEditing && (
              <Card title="温馨提示" style={{ marginTop: '16px' }}>
                <Alert
                  message="创建项目后您可以："
                  description={
                    <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                      <li>添加团队成员</li>
                      <li>创建项目任务</li>
                      <li>设置里程碑</li>
                      <li>跟踪项目进度</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                />
              </Card>
            )}
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default ProjectEditPage;