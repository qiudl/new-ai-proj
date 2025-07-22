import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  List, 
  Avatar, 
  Progress, 
  Tag, 
  Spin, 
  Alert,
  Typography,
  Space,
  Empty,
  Tooltip,
  Dropdown,
  Input,
  Collapse,
  Badge
} from 'antd';
import { 
  ProjectOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ImportOutlined,
  UserOutlined,
  CalendarOutlined,
  TrophyOutlined,
  LineChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  BulbOutlined,
  ReloadOutlined,
  PlusOutlined,
  DownOutlined,
  SettingOutlined,
  FolderOutlined,
  StarOutlined,
  BellOutlined,
  RightOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  DashboardService, 
  DashboardStats, 
  ProjectProgressInfo, 
  UserWorkload 
} from '../services/dashboardService';
import { TimelineEvent } from '../types/task';
import { useCache } from '../hooks/useCache';
import { 
  formatTimeAgo, 
  getWorkloadStatus
} from '../utils/formatters';
import '../styles/OptimizedDashboard.css';

const { Text } = Typography;
const { Search } = Input;

const OptimizedDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<string[]>(['team', 'activities']);

  // 使用缓存钩子加载各类数据
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCache<DashboardStats>(
    'dashboard-stats',
    () => DashboardService.getDashboardStats(),
    { ttl: 2 * 60 * 1000 }
  );

  // 使用缓存钩子加载今日任务数据
  const {
    data: todayTasksData,
    loading: todayTasksLoading,
    refresh: refreshTodayTasks
  } = useCache<any[]>(
    'dashboard-today-tasks',
    () => DashboardService.getTodayTasks(),
    { ttl: 1 * 60 * 1000 }
  );

  // 使用缓存钩子加载本周任务数据
  const {
    data: thisWeekTasksData,
    loading: thisWeekTasksLoading,
    refresh: refreshThisWeekTasks
  } = useCache<any[]>(
    'dashboard-thisweek-tasks',
    () => DashboardService.getThisWeekTasks(),
    { ttl: 2 * 60 * 1000 }
  );

  // 使用缓存钩子加载逾期任务数据
  const {
    data: overdueTasksData,
    loading: overdueTasksLoading,
    refresh: refreshOverdueTasks
  } = useCache<any[]>(
    'dashboard-overdue-tasks',
    () => DashboardService.getOverdueTasks(),
    { ttl: 2 * 60 * 1000 }
  );

  const {
    data: recentActivities,
    loading: activitiesLoading,
    refresh: refreshActivities
  } = useCache<TimelineEvent[]>(
    'dashboard-activities',
    () => DashboardService.getRecentActivities(6),
    { ttl: 1 * 60 * 1000 }
  );

  const {
    data: projectProgress,
    loading: progressLoading,
    refresh: refreshProgress
  } = useCache<ProjectProgressInfo[]>(
    'dashboard-progress',
    () => DashboardService.getProjectProgress(),
    { ttl: 5 * 60 * 1000 }
  );

  const {
    data: userWorkload,
    loading: workloadLoading,
    refresh: refreshWorkload
  } = useCache<UserWorkload[]>(
    'dashboard-workload',
    () => DashboardService.getUserWorkload(),
    { ttl: 3 * 60 * 1000 }
  );

  const {
    data: productivityStats,
    loading: productivityLoading,
    refresh: refreshProductivity
  } = useCache(
    'dashboard-productivity',
    () => DashboardService.getProductivityStats(),
    { ttl: 10 * 60 * 1000 }
  );

  // 计算加载状态
  const isLoading = statsLoading || activitiesLoading || progressLoading || workloadLoading || productivityLoading;
  const hasError = statsError;

  // 刷新所有数据
  const refreshAllData = async () => {
    await Promise.all([
      refreshStats(),
      refreshActivities(),
      refreshProgress(),
      refreshWorkload(),
      refreshProductivity(),
      refreshTodayTasks(),
      refreshThisWeekTasks(),
      refreshOverdueTasks(),
      refreshProjects()
    ]);
  };

  // 快速操作下拉菜单配置
  const quickActionMenuItems = [
    {
      key: 'new-task',
      label: '新建任务',
      icon: <PlusOutlined />,
      onClick: () => navigate('/tasks/new')
    },
    {
      key: 'new-project',
      label: '新建项目',
      icon: <ProjectOutlined />,
      onClick: () => navigate('/projects/new')
    },
    {
      key: 'task-template',
      label: '任务模板',
      icon: <FileTextOutlined />,
      onClick: () => navigate('/templates')
    },
    {
      key: 'batch-update',
      label: '批量更新',
      icon: <EditOutlined />,
      onClick: () => navigate('/tasks/batch')
    }
  ];

  // 获取今日重点任务（模拟数据）
  const todayTasks = useMemo(() => [
    {
      id: '1',
      title: '完成环境搭建',
      status: 'in_progress',
      progress: 75,
      priority: 'high',
      dueDate: '今天'
    },
    {
      id: '2', 
      title: 'API接口开发',
      status: 'in_progress',
      progress: 40,
      priority: 'medium',
      dueDate: '明天'
    },
    {
      id: '3',
      title: '数据库设计评审',
      status: 'todo',
      progress: 0,
      priority: 'high',
      dueDate: '今天'
    }
  ], []);

  // 获取即将到期的任务
  const upcomingTasks = useMemo(() => [
    { title: '数据库设计', dueDate: '明天到期', priority: 'high' },
    { title: '前端开发', dueDate: '3天后', priority: 'medium' },
    { title: '测试部署', dueDate: '1周后', priority: 'medium' }
  ], []);

  // 获取真实项目数据用于导航
  const {
    data: projectsData,
    loading: projectsLoading,
    refresh: refreshProjects
  } = useCache<any[]>(
    'dashboard-projects',
    () => DashboardService.getAllProjects(),
    { ttl: 5 * 60 * 1000 } // 5分钟缓存
  );

  // 处理项目导航数据
  const projectNavigation = useMemo(() => {
    if (!projectsData) return [];
    
    return projectsData.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      starred: false, // 暂时设为false，后续可以添加收藏功能
      taskCount: 0 // 将在渲染时动态获取
    }));
  }, [projectsData]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#fa8c16';
      case 'low': return '#52c41a';
      default: return '#8c8c8c';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'in_progress': return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'todo': return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
      default: return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="page-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载工作台数据...">
          <div style={{ height: '200px', width: '100%' }} />
        </Spin>
      </div>
    );
  }

  if (hasError && !stats) {
    return (
      <div className="page-container">
        <Alert
          message="数据加载失败"
          description="无法加载工作台数据，请检查网络连接或刷新页面重试"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refreshAllData} loading={isLoading}>
              重新加载
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container optimized-dashboard">
      {/* 紧凑型顶部操作栏 */}
      <div className="compact-action-bar">
        <div className="action-left">
          <Space size="small">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
              新建任务
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => navigate('/bulk-import')}>
              批量导入
            </Button>
            <Dropdown menu={{ items: quickActionMenuItems }} trigger={['click']}>
              <Button>
                快速模板 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>
        <div className="action-center">
          <Search
            placeholder="搜索任务、项目..."
            style={{ width: 300 }}
            onSearch={(value) => console.log('搜索:', value)}
          />
        </div>
        <div className="action-right">
          <Space>
            <Tooltip title="刷新数据">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={refreshAllData}
                loading={isLoading}
                type="text"
              />
            </Tooltip>
            <Button icon={<SettingOutlined />} type="text" />
            <Avatar icon={<UserOutlined />} size="small" />
          </Space>
        </div>
      </div>

      {/* 主要内容区域 - 3栏布局 */}
      <Row gutter={[16, 16]} className="main-content-area">
        {/* 左侧边栏 */}
        <Col xs={24} lg={6} className="left-sidebar">
          {/* 任务概览卡片 */}
          <Card size="small" className="sidebar-card" title={
            <Space>
              <CheckCircleOutlined style={{ color: '#1890ff' }} />
              任务概览
            </Space>
          }>
            <div className="task-overview">
              <div className="overview-item" onClick={() => navigate('/task-dashboard?filter=today')} style={{ cursor: 'pointer' }}>
                <Badge count={todayTasksData?.length || 0} color="#1890ff">
                  <span>今日任务</span>
                </Badge>
              </div>
              <div className="overview-item" onClick={() => navigate('/task-dashboard?filter=thisweek')} style={{ cursor: 'pointer' }}>
                <Badge count={thisWeekTasksData?.length || 0} color="#52c41a">
                  <span>本周任务</span>
                </Badge>
              </div>
              <div className="overview-item" onClick={() => navigate('/task-dashboard?filter=overdue')} style={{ cursor: 'pointer' }}>
                <Badge count={overdueTasksData?.length || 0} color="#ff4d4f">
                  <span>逾期任务</span>
                </Badge>
              </div>
            </div>
          </Card>

          {/* 项目导航 */}
          <Card size="small" className="sidebar-card" title={
            <Space>
              <FolderOutlined style={{ color: '#52c41a' }} />
              项目导航
              {projectsLoading && <Spin size="small" />}
            </Space>
          }>
            <div className="project-navigation">
              {projectNavigation.length > 0 ? (
                projectNavigation.map(project => (
                  <div 
                    key={project.id} 
                    className="project-nav-item"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="project-name">
                      <Space>
                        <RightOutlined style={{ fontSize: 10 }} />
                        <span title={project.description}>{project.name}</span>
                        {project.starred && <StarOutlined style={{ color: '#faad14', fontSize: 12 }} />}
                      </Space>
                    </div>
                    <div className="project-tasks">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        点击查看项目详情
                      </Text>
                    </div>
                  </div>
                ))
              ) : (
                <Empty 
                  description="暂无项目数据" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: '20px 0' }}
                />
              )}
            </div>
          </Card>
        </Col>

        {/* 中间主体区域 */}
        <Col xs={24} lg={12} className="center-panel">
          {/* 今日重点任务 */}
          <Card 
            title={
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                今日重点任务
              </Space>
            }
            extra={<Button type="link" size="small">管理优先级</Button>}
            className="main-card"
          >
            <div className="today-tasks">
              {todayTasks.map(task => (
                <div key={task.id} className="task-card">
                  <div className="task-header">
                    <Space>
                      {getStatusIcon(task.status)}
                      <span className="task-title">{task.title}</span>
                      <Tag color={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Tag>
                    </Space>
                    <Text type="secondary">{task.dueDate}</Text>
                  </div>
                  <Progress 
                    percent={task.progress} 
                    size="small" 
                    showInfo={false}
                    strokeColor={task.progress >= 70 ? '#52c41a' : task.progress >= 30 ? '#1890ff' : '#ff4d4f'}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* 进度总览 */}
          <Card 
            title={
              <Space>
                <LineChartOutlined style={{ color: '#1890ff' }} />
                进度总览
              </Space>
            }
            className="main-card"
            loading={progressLoading}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="本周完成"
                  value={productivityStats?.thisWeek?.completed || 0}
                  suffix="个"
                  valueStyle={{ color: '#52c41a', fontSize: 18 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="进行中"
                  value={stats?.inProgressTasks || 0}
                  suffix="个"
                  valueStyle={{ color: '#1890ff', fontSize: 18 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="总体进度"
                  value={projectProgress ? Math.round(
                    projectProgress.reduce((sum, p) => sum + p.progress, 0) / projectProgress.length
                  ) : 0}
                  suffix="%"
                  valueStyle={{ color: '#722ed1', fontSize: 18 }}
                />
              </Col>
            </Row>
          </Card>

          {/* 进行中任务列表 */}
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                进行中任务
              </Space>
            }
            extra={<Button type="link" size="small">查看全部</Button>}
            className="main-card"
          >
            {projectProgress && projectProgress.length > 0 ? (
              <div className="in-progress-tasks">
                {projectProgress.slice(0, 3).map((project, index) => (
                  <div key={project.id} className="progress-item">
                    <div className="progress-header">
                      <Text strong>{project.name}</Text>
                      <Text type="secondary">
                        {project.completedTasks}/{project.totalTasks}
                      </Text>
                    </div>
                    <Progress 
                      percent={project.progress} 
                      size="small"
                      strokeColor={{
                        '0%': project.progress >= 80 ? '#52c41a' : project.progress >= 50 ? '#fa8c16' : '#ff4d4f',
                        '100%': project.progress >= 80 ? '#73d13d' : project.progress >= 50 ? '#ffc53d' : '#ff7875'
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无进行中任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* 右侧信息栏 */}
        <Col xs={24} lg={6} className="right-sidebar">
          {/* 即将到期提醒 */}
          <Card size="small" className="sidebar-card" title={
            <Space>
              <BellOutlined style={{ color: '#ff4d4f' }} />
              即将到期
            </Space>
          }>
            <div className="upcoming-tasks">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="upcoming-item">
                  <div className="upcoming-title">{task.title}</div>
                  <div className="upcoming-due">
                    <Tag color={task.priority === 'high' ? 'red' : 'orange'}>
                      {task.dueDate}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 个人工作统计 */}
          <Card size="small" className="sidebar-card" title={
            <Space>
              <UserOutlined style={{ color: '#722ed1' }} />
              个人统计
            </Space>
          }>
            <div className="personal-stats">
              <div className="stat-item">
                <Text type="secondary">本周完成</Text>
                <Text strong style={{ color: '#52c41a' }}>8 个</Text>
              </div>
              <div className="stat-item">
                <Text type="secondary">待办任务</Text>
                <Text strong style={{ color: '#1890ff' }}>12 个</Text>
              </div>
              <div className="stat-item">
                <Text type="secondary">平均用时</Text>
                <Text strong style={{ color: '#fa8c16' }}>2.5 小时</Text>
              </div>
            </div>
          </Card>

          {/* 快捷工具 */}
          <Card size="small" className="sidebar-card" title={
            <Space>
              <BulbOutlined style={{ color: '#13c2c2' }} />
              快捷工具
            </Space>
          }>
            <div className="quick-tools">
              <Button block size="small" icon={<ProjectOutlined />} onClick={() => navigate('/projects')}>
                项目管理
              </Button>
              <Button block size="small" icon={<CheckCircleOutlined />} onClick={() => navigate('/tasks')}>
                任务管理
              </Button>
              <Button block size="small" icon={<LineChartOutlined />} onClick={() => navigate('/analytics')}>
                数据分析
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 底部可折叠区域 */}
      <div className="collapsible-footer">
        <Collapse
          activeKey={collapsedSections}
          onChange={setCollapsedSections}
          size="small"
          ghost
          items={[
            {
              key: 'team',
              label: (
                <Space>
                  <TeamOutlined style={{ color: '#722ed1' }} />
                  团队工作负载
                  {workloadLoading && <Spin size="small" />}
                </Space>
              ),
              children: userWorkload && userWorkload.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {userWorkload.map((user, index) => {
                    const workloadInfo = getWorkloadStatus(user.totalEstimatedHours);
                    return (
                      <Col key={user.id} xs={24} sm={12} md={8} lg={6}>
                        <Card size="small" className="workload-card">
                          <div className="workload-header">
                            <Avatar size="small" icon={<UserOutlined />} />
                            <Text strong>{user.name}</Text>
                          </div>
                          <div className="workload-info">
                            <div className="workload-tasks">
                              <Tag color="processing">{user.inProgressTasks} 进行中</Tag>
                              <Tag color="default">{user.todoTasks} 待办</Tag>
                            </div>
                            <div className="workload-hours">
                              <Text type="secondary">预估: {user.totalEstimatedHours}h</Text>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%',
                                  backgroundColor: workloadInfo.color
                                }} />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {workloadInfo.text}
                                </Text>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              ) : (
                <Empty description="暂无团队数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )
            },
            {
              key: 'activities',
              label: (
                <Space>
                  <CalendarOutlined style={{ color: '#1890ff' }} />
                  最近活动
                  {activitiesLoading && <Spin size="small" />}
                </Space>
              ),
              children: recentActivities && recentActivities.length > 0 ? (
                <List
                  size="small"
                  dataSource={recentActivities}
                  renderItem={(activity) => (
                    <List.Item className="activity-item">
                      <List.Item.Meta
                        avatar={<Avatar size="small" icon={<UserOutlined />} />}
                        title={
                          <div className="activity-title">
                            <span>{activity.description}</span>
                            <Text type="secondary">{formatTimeAgo(activity.event_date)}</Text>
                          </div>
                        }
                        description={
                          <Text type="secondary" ellipsis>
                            {activity.task_title} - {activity.username}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无活动记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default OptimizedDashboardPage;