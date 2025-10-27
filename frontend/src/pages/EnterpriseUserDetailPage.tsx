import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Spin,
  Alert,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Tag,
  Avatar,
  Descriptions,
  Tabs,
  Table,
  Statistic,
  Badge,
  Divider,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Timeline,
  Progress,
  Empty,
  Breadcrumb
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  SafetyOutlined,
  CalendarOutlined,
  SettingOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { EnterpriseUser, Enterprise } from '../services/enterpriseService';
import enterpriseService from '../services/enterpriseService';
import enterpriseUserService from '../services/enterpriseUserService';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface UserActivity {
  id: number;
  type: 'login' | 'project' | 'task' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

interface UserProject {
  id: number;
  name: string;
  role: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  created_at: string;
}

const EnterpriseUserDetailPage: React.FC = () => {
  const { enterpriseId, userId } = useParams<{ enterpriseId: string; userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<EnterpriseUser | null>(null);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [userStats, setUserStats] = useState<{
    online_hours: number;
    project_count: number;
    completed_task_count: number;
  }>({
    online_hours: 0,
    project_count: 0,
    completed_task_count: 0
  });
  const [form] = Form.useForm();

  useEffect(() => {
    loadUserData();
  }, [enterpriseId, userId]);

  const loadUserData = async () => {
    if (!enterpriseId || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const entId = Number(enterpriseId);
      const usrId = Number(userId);

      // 并行加载所有数据
      const [enterpriseResult, userResult, statsResult, projectsResult, activitiesResult] = await Promise.all([
        enterpriseService.getEnterprise(entId),
        enterpriseService.getEnterpriseUser(entId, usrId),
        enterpriseUserService.getEnterpriseUserStats(entId, usrId),
        enterpriseUserService.getEnterpriseUserProjects(entId, usrId),
        enterpriseUserService.getEnterpriseUserActivities(entId, usrId, { page: 1, page_size: 10 })
      ]);

      setEnterprise(enterpriseResult.data || enterpriseResult);
      setUser(userResult.data || userResult);
      setUserStats({
        online_hours: statsResult.online_hours || 0,
        project_count: statsResult.project_count || 0,
        completed_task_count: statsResult.completed_task_count || 0
      });
      // 确保projects和activities是数组
      setProjects(Array.isArray(projectsResult) ? projectsResult : []);
      setActivities(Array.isArray(activitiesResult) ? activitiesResult : []);

    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || '加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'suspended': return '暂停';
      default: return status;
    }
  };

  const getAccessLevelText = (level: number) => {
    const levels = {
      1: '基础权限',
      2: '一般权限',
      3: '中级权限',
      4: '高级权限',
      5: '最高权限'
    };
    return levels[level as keyof typeof levels] || `Level ${level}`;
  };

  const getAccessLevelColor = (level: number) => {
    if (level >= 5) return 'red';
    if (level >= 4) return 'orange';
    if (level >= 3) return 'gold';
    if (level >= 2) return 'blue';
    return 'green';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <UserOutlined />;
      case 'project': return <ProjectOutlined />;
      case 'task': return <CheckCircleOutlined />;
      case 'system': return <SettingOutlined />;
      default: return <ClockCircleOutlined />;
    }
  };

  const getActivityColor = (status?: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'warning': return 'orange';
      case 'error': return 'red';
      default: return 'blue';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'processing';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const handleEdit = () => {
    if (user) {
      form.setFieldsValue(user);
      setEditModalVisible(true);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!enterpriseId || !userId) return;

      await enterpriseService.updateEnterpriseUser(
        Number(enterpriseId),
        Number(userId),
        values
      );

      message.success('用户信息更新成功');
      setEditModalVisible(false);
      loadUserData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      message.error('更新用户信息失败');
    }
  };

  const handleDelete = async () => {
    // 实现删除逻辑
    message.info('删除功能需要在后端实现');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>
          <Text>正在加载用户信息...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" danger onClick={loadUserData}>
            重试
          </Button>
        }
      />
    );
  }

  if (!user || !enterprise) {
    return (
      <Empty 
        description="未找到用户信息"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/enterprises')} style={{ cursor: 'pointer' }}>
            企业管理
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <span onClick={() => navigate(`/enterprises/${enterpriseId}`)} style={{ cursor: 'pointer' }}>
            {enterprise.name}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <span onClick={() => navigate(`/enterprises/${enterpriseId}/users`)} style={{ cursor: 'pointer' }}>
            用户管理
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{user.name}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面头部 */}
      <Card 
        className="user-detail-header"
        style={{ marginBottom: '24px' }}
        styles={{ body: { padding: '32px'  }}}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate(`/enterprises/${enterpriseId}/users`)}
              >
                返回
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Avatar size={64} icon={<UserOutlined />} />
                <div>
                  <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                    {user.name}
                  </Title>
                  <Space size="middle" style={{ marginTop: '8px' }}>
                    <Text type="secondary">@{user.username}</Text>
                    <Tag color={getStatusColor(user.status)}>
                      {getStatusText(user.status)}
                    </Tag>
                    <Tag color={getAccessLevelColor(user.access_level)}>
                      {getAccessLevelText(user.access_level)}
                    </Tag>
                    {user.is_primary_contact && (
                      <Tag color="purple">主要联系人</Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个用户吗？"
                description="此操作不可恢复，请谨慎操作。"
                onConfirm={handleDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 用户统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在线时长"
              value={userStats.online_hours}
              suffix="小时"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="参与项目"
              value={userStats.project_count}
              suffix="个"
              prefix={<ProjectOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="完成任务"
              value={userStats.completed_task_count}
              suffix="个"
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="最后登录"
              value={user.last_login_at ? formatDistance(new Date(user.last_login_at), new Date(), { locale: zhCN, addSuffix: true }) : '从未登录'}
              prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card>
            <Tabs defaultActiveKey="overview">
              <TabPane tab="基本信息" key="overview">
                <Descriptions
                  column={{ xs: 1, sm: 2, md: 2 }}
                  labelStyle={{ fontWeight: 'bold', color: '#666' }}
                  size="middle"
                >
                  <Descriptions.Item 
                    label={<><MailOutlined /> 邮箱</>}
                  >
                    {user.email || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><PhoneOutlined /> 电话</>}
                  >
                    {user.phone || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><BuildOutlined /> 职位</>}
                  >
                    {user.position || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><TeamOutlined /> 部门</>}
                  >
                    {user.department_name || '未分配'}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><SafetyOutlined /> 权限级别</>}
                  >
                    <Tag color={getAccessLevelColor(user.access_level)}>
                      {getAccessLevelText(user.access_level)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><CalendarOutlined /> 创建时间</>}
                  >
                    {new Date(user.created_at).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><CalendarOutlined /> 更新时间</>}
                  >
                    {new Date(user.updated_at).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label="用户状态"
                  >
                    <Tag color={getStatusColor(user.status)}>
                      {getStatusText(user.status)}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="参与项目" key="projects">
                <Table
                  dataSource={projects}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                >
                  <Table.Column
                    title="项目名称"
                    dataIndex="name"
                    key="name"
                    render={(name: string) => <Text strong>{name}</Text>}
                  />
                  <Table.Column
                    title="角色"
                    dataIndex="role"
                    key="role"
                  />
                  <Table.Column
                    title="状态"
                    dataIndex="status"
                    key="status"
                    render={(status: string) => (
                      <Badge status={getProjectStatusColor(status)} text={status === 'active' ? '进行中' : status === 'completed' ? '已完成' : '暂停'} />
                    )}
                  />
                  <Table.Column
                    title="进度"
                    dataIndex="progress"
                    key="progress"
                    render={(progress: number) => (
                      <Progress percent={progress} size="small" />
                    )}
                  />
                  <Table.Column
                    title="加入时间"
                    dataIndex="created_at"
                    key="created_at"
                    render={(date: string) => new Date(date).toLocaleDateString()}
                  />
                </Table>
              </TabPane>

              <TabPane tab="活动记录" key="activities">
                <Timeline>
                  {activities.map((activity) => (
                    <Timeline.Item
                      key={activity.id}
                      dot={getActivityIcon(activity.type)}
                      color={getActivityColor(activity.status)}
                    >
                      <div>
                        <Text strong>{activity.title}</Text>
                        <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                          {formatDistance(new Date(activity.timestamp), new Date(), { locale: zhCN, addSuffix: true })}
                        </div>
                        <Paragraph style={{ margin: '8px 0 0 0', color: '#666' }}>
                          {activity.description}
                        </Paragraph>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
            </Tabs>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 企业信息卡片 */}
            <Card title="所属企业" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ color: '#1890ff' }}>{enterprise.name}</Text>
                </div>
                <div>
                  <Text type="secondary">企业代码：{enterprise.code}</Text>
                </div>
                <div>
                  <Tag color="blue">{enterprise.business_type_text}</Tag>
                </div>
                {enterprise.description && (
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    {enterprise.description}
                  </Paragraph>
                )}
              </Space>
            </Card>

            {/* 快速操作卡片 */}
            <Card title="快速操作" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block icon={<EditOutlined />} onClick={handleEdit}>
                  编辑用户信息
                </Button>
                <Button
                  block
                  icon={<SafetyOutlined />}
                  onClick={() => message.info('权限管理功能开发中')}
                >
                  管理权限
                </Button>
                <Button block icon={<CalendarOutlined />}>
                  查看日程
                </Button>
                <Divider style={{ margin: '12px 0' }} />
                <Popconfirm
                  title="确定要重置密码吗？"
                  description="将为用户生成新的临时密码"
                  onConfirm={async () => {
                    try {
                      const result = await enterpriseUserService.resetEnterpriseUserPassword(
                        Number(enterpriseId),
                        Number(userId)
                      );
                      Modal.success({
                        title: '密码重置成功',
                        content: `临时密码: ${result.temporaryPassword}`,
                      });
                    } catch (error) {
                      message.error('重置密码失败');
                    }
                  }}
                >
                  <Button block type="dashed">
                    重置密码
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户信息"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={user}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="电话" name="phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="职位" name="position">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="权限级别" name="access_level">
                <Select>
                  <Select.Option value={1}>基础权限</Select.Option>
                  <Select.Option value={2}>一般权限</Select.Option>
                  <Select.Option value={3}>中级权限</Select.Option>
                  <Select.Option value={4}>高级权限</Select.Option>
                  <Select.Option value={5}>最高权限</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="状态" name="status">
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">非活跃</Select.Option>
              <Select.Option value="suspended">暂停</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseUserDetailPage;