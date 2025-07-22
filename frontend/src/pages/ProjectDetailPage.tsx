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
  PhoneOutlined,
  MailOutlined,
  NumberOutlined,
  BankOutlined,
  BuildOutlined,
  FundProjectionScreenOutlined,
  BarChartOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { ProjectDetail, ProjectUser, ProjectActivity, ProjectUserRole } from '../types/project';
import { Task } from '../types/task';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userForm] = Form.useForm();

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
          onClick={() => navigate(`/tasks/${record.id}`)}
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
        <Spin size="large" tip="加载项目详情中..." />
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
                value={project.users.length}
                prefix={<TeamOutlined />}
              />
            </Col>
          </Row>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="项目概览" key="overview">
          <Row gutter={[24, 24]}>
            {/* 项目描述 */}
            <Col xs={24} lg={16}>
              <Card title="项目描述" extra={<FileTextOutlined />}>
                <Paragraph style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  {project.description || '暂无项目描述'}
                </Paragraph>
                
                <Divider />
                
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Space direction="vertical" size="small">
                      <Text type="secondary">开始日期</Text>
                      <Text strong>
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '未设置'}
                      </Text>
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" size="small">
                      <Text type="secondary">结束日期</Text>
                      <Text strong>
                        {project.end_date ? new Date(project.end_date).toLocaleDateString() : '未设置'}
                      </Text>
                    </Space>
                  </Col>
                </Row>

                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">项目进度</Text>
                  <Progress 
                    percent={project.progress || 0} 
                    size="default"
                    status={project.progress === 100 ? 'success' : 'active'}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              </Card>
            </Col>

            {/* 快速统计 */}
            <Col xs={24} lg={8}>
              <Card title="项目统计" extra={<BarChartOutlined />}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">任务完成率</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Progress 
                        type="circle" 
                        percent={project.completed_task_count && project.task_count ? 
                          Math.round((project.completed_task_count / project.task_count) * 100) : 0
                        }
                        size={80}
                      />
                    </div>
                  </div>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">创建时间</Text>
                      <Text>{new Date(project.created_at).toLocaleDateString()}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">最后更新</Text>
                      <Text>{new Date(project.updated_at).toLocaleDateString()}</Text>
                    </div>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="项目成员" key="users">
          <Card 
            title="项目团队" 
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
                添加成员
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              {project.users.map((user) => (
                <Col xs={24} sm={12} lg={8} key={user.id}>
                  <Card size="small" hoverable>
                    <div style={{ textAlign: 'center' }}>
                      <Badge 
                        dot={user.is_primary} 
                        color="gold"
                        offset={[-8, 8]}
                      >
                        <Avatar 
                          size={64} 
                          src={user.user_avatar}
                          icon={<UserOutlined />}
                          style={{ marginBottom: '12px' }}
                        />
                      </Badge>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <Space direction="vertical" size="small" align="center">
                          <Text strong style={{ fontSize: '16px' }}>{user.user_name}</Text>
                          <Space align="center">
                            {getRoleIcon(user.role)}
                            <Text type="secondary">{user.role_name}</Text>
                          </Space>
                        </Space>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {user.department}
                        </Text>
                      </div>

                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {user.user_email && (
                          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                            <MailOutlined style={{ marginRight: '4px', color: '#8c8c8c' }} />
                            <Text type="secondary">{user.user_email}</Text>
                          </div>
                        )}
                        {user.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                            <PhoneOutlined style={{ marginRight: '4px', color: '#8c8c8c' }} />
                            <Text type="secondary">{user.phone}</Text>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                          <CalendarOutlined style={{ marginRight: '4px', color: '#8c8c8c' }} />
                          <Text type="secondary">
                            加入于 {new Date(user.joined_at).toLocaleDateString()}
                          </Text>
                        </div>
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="项目任务" key="tasks">
          <Card 
            title="任务列表" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate(`/projects/${project.id}/tasks/create`)}
              >
                创建任务
              </Button>
            }
          >
            <Table
              dataSource={tasks}
              columns={taskColumns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 个任务`,
              }}
              size="middle"
            />
          </Card>
        </TabPane>

        <TabPane tab="项目动态" key="activities">
          <Card title="项目动态时间线">
            {project.activities.length > 0 ? (
              <Timeline>
                {project.activities.map((activity) => (
                  <Timeline.Item
                    key={activity.id}
                    dot={getActivityIcon(activity.type)}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{activity.title}</Text>
                      <Text type="secondary" style={{ marginLeft: '12px', fontSize: '12px' }}>
                        {new Date(activity.created_at).toLocaleString()}
                      </Text>
                    </div>
                    {activity.description && (
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary">{activity.description}</Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        操作人：{activity.user_name}
                      </Text>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无项目动态" />
            )}
          </Card>
        </TabPane>
      </Tabs>

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