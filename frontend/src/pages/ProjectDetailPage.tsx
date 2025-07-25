import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Progress,
  Space,
  Avatar,
  Button,
  Divider,
  Timeline,
  Table,
  Tabs,
  Statistic,
  Badge,
  Tooltip,
  message,
  Spin,
  Empty,
  List,
  Modal,
  Form,
  Select,
  Input
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  CodeOutlined,
  SafetyCertificateOutlined,
  CrownOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PhoneOutlined,
  MailOutlined,
  NumberOutlined,
  BankOutlined,
  BuildOutlined,
  FundProjectionScreenOutlined,
  BarChartOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { ProjectDetail, ProjectUser, ProjectActivity, ProjectUserRole } from '../types/project';
import { Task } from '../types/task';
import DocumentList from '../components/DocumentList';

const { Title, Text, Paragraph } = Typography;
// const { TabPane } = Tabs; // Deprecated, using items instead

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userForm] = Form.useForm();

  // Tabs configuration using items (modern approach)
  const tabItems = [
    {
      key: 'overview',
      label: '项目概览',
      children: (
        <Row gutter={[24, 24]}>
          {/* 项目描述 */}
          <Col xs={24} lg={16}>
            <Card title="项目描述" extra={<FileTextOutlined />}>
              <Paragraph style={{ fontSize: '14px', lineHeight: '1.8' }}>
                {project?.description || '暂无项目描述'}
              </Paragraph>
              
              <Divider />
              
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Space direction="vertical" size="small">
                    <Text type="secondary">开始日期</Text>
                    <Text strong>
                      {project?.start_date ? new Date(project.start_date).toLocaleDateString() : '未设置'}
                    </Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical" size="small">
                    <Text type="secondary">结束日期</Text>
                    <Text strong>
                      {project?.end_date ? new Date(project.end_date).toLocaleDateString() : '未设置'}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 项目统计 */}
          <Col xs={24} lg={8}>
            <Card title="项目统计" extra={<BarChartOutlined />}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic 
                    title="总任务数" 
                    value={project?.task_count || 0}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="已完成" 
                    value={project?.completed_task_count || 0}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  />
                </Col>
                <Col span={24}>
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">完成进度</Text>
                    <Progress 
                      percent={
                        project?.task_count ? 
                        Math.round((project.completed_task_count || 0) / project.task_count * 100) : 
                        0
                      }
                      strokeColor="#52c41a"
                      style={{ marginTop: 8 }}
                    />
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'users',
      label: '项目成员',
      children: (
        <Card 
          title="成员管理" 
          extra={
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={() => setUserModalVisible(true)}
            >
              添加成员
            </Button>
          }
        >
          {/* 成员列表内容 */}
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            成员管理功能开发中...
          </div>
        </Card>
      )
    },
    {
      key: 'tasks',
      label: '项目任务',
      children: (
        <Card title="任务列表">
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            任务管理功能开发中...
          </div>
        </Card>
      )
    },
    {
      key: 'documents',
      label: (
        <span>
          <FileTextOutlined />
          项目文档
        </span>
      ),
      children: project ? (
        <DocumentList 
          projectId={project.id} 
          projectName={project.name}
          onCreateDocument={() => navigate(`/projects/${project.id}/documents/new`)}
        />
      ) : null
    },
    {
      key: 'activities',
      label: '项目动态',
      children: (
        <Card title="项目动态时间线">
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            项目动态功能开发中...
          </div>
        </Card>
      )
    }
  ];

  useEffect(() => {
    if (projectId) {
      loadProjectDetail();
      loadProjectTasks();
    }
  }, [projectId]);

  const loadProjectDetail = async () => {
    try {
      setLoading(true);
      
      // 获取项目详情（现在使用组合API调用）
      const projectDetail = await projectService.getProjectDetail(Number(projectId));

      setProject(projectDetail);
    } catch (error) {
      console.error('获取项目详情失败:', error);
      message.error('获取项目详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectTasks = async () => {
    try {
      // 调用实际API
      const response = await projectService.getProjectTasks(Number(projectId), { page: 1, pageSize: 50 });
      
      // 如果API调用成功，使用真实数据
      if (response && response.data) {
        setTasks(response.data);
        return;
      }
    } catch (error) {
      console.error('获取项目任务失败:', error);
    }
    
    // 如果API调用失败，使用模拟数据
    const mockTasks: Task[] = [
      {
        id: 1,
        title: '需求调研',
        description: '深入了解客户需求，制定详细的需求文档',
        status: 'completed',
        project_id: Number(projectId),
        assignee_id: 102,
        assignee_name: '李经理',
        task_level: 0,
        sort_order: 1,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-17T18:00:00Z',
        due_date: '2024-01-20T23:59:59Z'
      },
      {
        id: 2,
        title: '系统架构设计',
        description: '设计系统整体架构，包括前端、后端和数据库设计',
        status: 'in_progress',
        project_id: Number(projectId),
        assignee_id: 103,
        assignee_name: '王开发',
        task_level: 0,
        sort_order: 2,
        created_at: '2024-01-18T09:00:00Z',
        updated_at: '2024-01-20T15:30:00Z',
        due_date: '2024-01-25T23:59:59Z'
      },
      {
        id: 3,
        title: 'UI界面设计',
        description: '设计用户界面原型和交互逻辑',
        status: 'todo',
        project_id: Number(projectId),
        assignee_id: 104,
        assignee_name: '赵工程师',
        task_level: 0,
        sort_order: 3,
        created_at: '2024-01-19T10:00:00Z',
        updated_at: '2024-01-19T10:00:00Z',
        due_date: '2024-01-30T23:59:59Z'
      }
    ];
    
    setTasks(mockTasks);
    message.warning('任务数据使用模拟数据，请检查API连接');
  };

  const getRoleIcon = (role: ProjectUserRole) => {
    const iconMap = {
      customer: <CustomerServiceOutlined style={{ color: '#1890ff' }} />,
      consultant: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
      developer: <CodeOutlined style={{ color: '#722ed1' }} />,
      manager: <CrownOutlined style={{ color: '#fa8c16' }} />,
      designer: <FundProjectionScreenOutlined style={{ color: '#eb2f96' }} />
    };
    return iconMap[role] || <UserOutlined />;
  };

  const getActivityIcon = (type: string) => {
    const iconMap = {
      created: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      updated: <EditOutlined style={{ color: '#1890ff' }} />,
      user_added: <TeamOutlined style={{ color: '#722ed1' }} />,
      user_removed: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      task_created: <PlusOutlined style={{ color: '#52c41a' }} />,
      task_completed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      milestone_reached: <CrownOutlined style={{ color: '#fa8c16' }} />,
      status_changed: <ClockCircleOutlined style={{ color: '#1890ff' }} />
    };
    return iconMap[type as keyof typeof iconMap] || <ClockCircleOutlined />;
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

  const getTaskStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'todo': 'default',
      'in_progress': 'processing',
      'completed': 'success',
      'cancelled': 'error'
    };
    return colorMap[status] || 'default';
  };

  const getTaskStatusText = (status: string): string => {
    const textMap: Record<string, string> = {
      'todo': '待开始',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return textMap[status] || '未知';
  };

  const handleAddUser = () => {
    setUserModalVisible(true);
  };

  const handleUserModalOk = async () => {
    try {
      const values = await userForm.validateFields();
      
      // 调用API添加用户
      await projectService.addProjectUser(Number(projectId), {
        user_id: values.user_id,
        role: values.role,
        is_primary: values.is_primary || false
      });
      
      message.success('用户添加成功');
      setUserModalVisible(false);
      userForm.resetFields();
      loadProjectDetail(); // 重新加载项目详情
    } catch (error) {
      console.error('Error adding user:', error);
      message.error('添加用户失败');
    }
  };

  const handleUserModalCancel = () => {
    setUserModalVisible(false);
    userForm.resetFields();
  };

  const taskColumns: ColumnsType<Task> = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Task) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/projects/${projectId}/tasks/${record.id}`)}
          style={{ padding: 0, fontSize: '14px' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getTaskStatusColor(status)}>
          {getTaskStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 120,
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载项目详情中...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Empty description="项目不存在或已被删除" />
        <Button type="primary" onClick={() => navigate('/projects')}>
          返回项目列表
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/projects')}
          style={{ marginBottom: '16px' }}
        >
          返回项目列表
        </Button>
        
        <Card>
          <Row gutter={[24, 16]} align="middle">
            <Col flex="auto">
              <Space direction="vertical" size="small">
                <Space align="center">
                  <NumberOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {project.project_number}
                  </Text>
                  <Tag color={getStatusColor(project.status)}>
                    {getStatusText(project.status)}
                  </Tag>
                  <Tag color={getPriorityColor(project.priority)}>
                    优先级: {getPriorityText(project.priority)}
                  </Tag>
                </Space>
                <Title level={2} style={{ margin: 0 }}>
                  {project.name}
                </Title>
                <Space align="center">
                  <BankOutlined style={{ color: '#52c41a' }} />
                  <Text type="secondary">{project.company_name}</Text>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" size="small" align="end">
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/projects/${project.id}/edit`)}
                >
                  编辑项目
                </Button>
                <Space>
                  <Statistic 
                    title="项目进度" 
                    value={project.progress || 0} 
                    suffix="%" 
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Space>
              </Space>
            </Col>
          </Row>
          
          <Divider />
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="总任务数"
                value={project.task_count || 0}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="已完成任务"
                value={project.completed_task_count || 0}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="团队成员"
                value={project.users?.length || 0}
                prefix={<TeamOutlined />}
              />
            </Col>
          </Row>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      {/* 添加成员模态框 */}
      <Modal
        title="添加项目成员"
        open={userModalVisible}
        onOk={handleUserModalOk}
        onCancel={handleUserModalCancel}
        width={600}
      >
        <Form form={userForm} layout="vertical">
          <Form.Item
            name="user_id"
            label="选择用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select placeholder="请选择要添加的用户" showSearch>
              <Select.Option value={201}>张三 - 前端开发</Select.Option>
              <Select.Option value={202}>李四 - 后端开发</Select.Option>
              <Select.Option value={203}>王五 - UI设计师</Select.Option>
              <Select.Option value={204}>赵六 - 测试工程师</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="customer">客户方负责人</Select.Option>
              <Select.Option value="consultant">项目实施顾问</Select.Option>
              <Select.Option value="developer">研发工程师</Select.Option>
              <Select.Option value="manager">项目经理</Select.Option>
              <Select.Option value="designer">设计师</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="is_primary" valuePropName="checked">
            <input type="checkbox" /> 设为主要负责人
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;