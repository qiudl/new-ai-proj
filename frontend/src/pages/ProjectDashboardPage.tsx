import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Button, 
  List, 
  Avatar, 
  Tag, 
  Typography,
  Space,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import { 
  ProjectOutlined, 
  TeamOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  PlusOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  TrophyOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types/project';
import { Task } from '../types/task';

const { Title, Text } = Typography;

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamMembers: number;
}

interface ProjectProgress {
  id: number;
  name: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  status: 'active' | 'completed' | 'delayed';
  owner: string;
  dueDate?: string;
}

const ProjectDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    teamMembers: 0
  });
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 模拟数据加载 - 将来替换为真实API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟项目统计数据
      setStats({
        totalProjects: 12,
        activeProjects: 8,
        completedProjects: 4,
        totalTasks: 156,
        completedTasks: 89,
        overdueTasks: 15,
        teamMembers: 24
      });

      // 模拟项目进度数据
      setProjectProgress([
        {
          id: 1,
          name: 'AI项目管理平台MVP',
          progress: 78,
          totalTasks: 25,
          completedTasks: 19,
          status: 'active',
          owner: '张三',
          dueDate: '2025-08-15'
        },
        {
          id: 2,
          name: '机器学习模型训练',
          progress: 45,
          totalTasks: 18,
          completedTasks: 8,
          status: 'active',
          owner: '李四'
        },
        {
          id: 3,
          name: '前端界面优化',
          progress: 92,
          totalTasks: 12,
          completedTasks: 11,
          status: 'active',
          owner: '王五',
          dueDate: '2025-07-30'
        },
        {
          id: 4,
          name: '数据分析平台',
          progress: 100,
          totalTasks: 20,
          completedTasks: 20,
          status: 'completed',
          owner: '赵六'
        }
      ]);

      // 模拟最近项目数据
      setRecentProjects([
        {
          id: 1,
          name: 'AI项目管理平台MVP',
          description: '智能项目管理平台的最小可行产品开发',
          owner_id: 1,
          created_at: '2025-07-19T03:25:37.453607Z',
          updated_at: '2025-07-20T10:15:30.123456Z'
        },
        {
          id: 2,
          name: '机器学习模型训练',
          description: '深度学习模型训练和部署项目',
          owner_id: 1,
          created_at: '2025-07-18T09:30:15.789012Z',
          updated_at: '2025-07-20T08:45:22.345678Z'
        }
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#52c41a';
      case 'completed': return '#1890ff';
      case 'delayed': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'delayed': return '延期';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>项目Dashboard</Title>
        <Text type="secondary">项目总览和关键指标监控</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总项目数"
              value={stats.totalProjects}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃项目"
              value={stats.activeProjects}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="任务完成率"
              value={Math.round((stats.completedTasks / stats.totalTasks) * 100)}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="团队成员"
              value={stats.teamMembers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 项目进度概览 */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                项目进度概览
              </Space>
            }
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/projects')}
              >
                管理项目
              </Button>
            }
          >
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {projectProgress.map(project => (
                <div key={project.id} style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <Text strong>{project.name}</Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <Tag color={getStatusColor(project.status)}>
                          {getStatusText(project.status)}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          <UserOutlined /> {project.owner}
                        </Text>
                        {project.dueDate && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            <CalendarOutlined /> {project.dueDate}
                          </Text>
                        )}
                      </div>
                    </div>
                    <Button 
                      type="text" 
                      icon={<RightOutlined />}
                      onClick={() => navigate(`/projects/${project.id}/tasks`)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Progress 
                      percent={project.progress} 
                      style={{ flex: 1 }}
                      status={project.progress === 100 ? 'success' : 'active'}
                    />
                    <Text style={{ fontSize: '12px', color: '#666', minWidth: '60px' }}>
                      {project.completedTasks}/{project.totalTasks} 任务
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 右侧面板 */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 快速操作 */}
            <Card title="快速操作" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  block
                  onClick={() => navigate('/projects')}
                >
                  创建新项目
                </Button>
                <Button 
                  icon={<ProjectOutlined />} 
                  block
                  onClick={() => navigate('/projects')}
                >
                  查看所有项目
                </Button>
                <Button 
                  icon={<BarChartOutlined />} 
                  block
                  onClick={() => navigate('/tasks')}
                >
                  全局任务视图
                </Button>
              </Space>
            </Card>

            {/* 最近活跃项目 */}
            <Card 
              title={
                <Space>
                  <TrophyOutlined />
                  最近活跃项目
                </Space>
              }
              size="small"
            >
              {recentProjects.length > 0 ? (
                <List
                  size="small"
                  dataSource={recentProjects}
                  renderItem={project => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/projects/${project.id}/tasks`)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<ProjectOutlined />} size="small" />}
                        title={
                          <Text style={{ fontSize: '14px' }} ellipsis={{ tooltip: true }}>
                            {project.name}
                          </Text>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: '12px' }} ellipsis={{ tooltip: true }}>
                            {project.description}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无项目" />
              )}
            </Card>

            {/* 关键指标 */}
            <Card title="关键指标" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>逾期任务</Text>
                  <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.overdueTasks}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>总任务数</Text>
                  <Text style={{ fontWeight: 'bold' }}>{stats.totalTasks}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>已完成任务</Text>
                  <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.completedTasks}</Text>
                </div>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default ProjectDashboardPage;