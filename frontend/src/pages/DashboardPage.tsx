import React, { useMemo } from 'react';
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
  Tooltip
} from 'antd';
import { 
  ProjectOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ImportOutlined,
  UserOutlined,
  CalendarOutlined,
  TrophyOutlined,
  WarningOutlined,
  LineChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  BulbOutlined,
  ReloadOutlined
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
  getWorkloadStatus, 
  formatNumber
} from '../utils/formatters';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // 使用缓存钩子加载各类数据
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCache<DashboardStats>(
    'dashboard-stats',
    () => DashboardService.getDashboardStats(),
    { ttl: 2 * 60 * 1000 } // 2分钟缓存
  );

  const {
    data: recentActivities,
    loading: activitiesLoading,
    refresh: refreshActivities
  } = useCache<TimelineEvent[]>(
    'dashboard-activities',
    () => DashboardService.getRecentActivities(6),
    { ttl: 1 * 60 * 1000 } // 1分钟缓存
  );

  const {
    data: projectProgress,
    loading: progressLoading,
    refresh: refreshProgress
  } = useCache<ProjectProgressInfo[]>(
    'dashboard-progress',
    () => DashboardService.getProjectProgress(),
    { ttl: 5 * 60 * 1000 } // 5分钟缓存
  );

  const {
    data: userWorkload,
    loading: workloadLoading,
    refresh: refreshWorkload
  } = useCache<UserWorkload[]>(
    'dashboard-workload',
    () => DashboardService.getUserWorkload(),
    { ttl: 3 * 60 * 1000 } // 3分钟缓存
  );

  const {
    data: productivityStats,
    loading: productivityLoading,
    refresh: refreshProductivity
  } = useCache(
    'dashboard-productivity',
    () => DashboardService.getProductivityStats(),
    { ttl: 10 * 60 * 1000 } // 10分钟缓存
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
      refreshProductivity()
    ]);
  };

  // 获取活动类型图标和颜色
  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'updated':
        return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'created':
        return <BulbOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // 快速操作配置 - 使用 useMemo 优化
  const quickActions = useMemo(() => [
    {
      title: '项目管理',
      description: '查看和管理所有项目',
      icon: <ProjectOutlined style={{ fontSize: 18, color: '#1890ff' }} />,
      action: () => navigate('/projects'),
    },
    {
      title: '批量导入',
      description: '使用AI辅助批量导入任务',
      icon: <ImportOutlined style={{ fontSize: 18, color: '#52c41a' }} />,
      action: () => navigate('/bulk-import'),
    },
    {
      title: '任务管理',
      description: '管理和查看所有任务',
      icon: <CheckCircleOutlined style={{ fontSize: 18, color: '#fa8c16' }} />,
      action: () => navigate('/tasks'),
    },
    {
      title: '数据分析',
      description: '查看项目和任务分析报表',
      icon: <LineChartOutlined style={{ fontSize: 18, color: '#722ed1' }} />,
      action: () => navigate('/analytics'),
    },
  ], [navigate]);

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

  // 显示部分错误状态但继续显示可用数据
  const hasPartialData = stats || recentActivities || projectProgress || userWorkload || productivityStats;
  
  if (hasError && !hasPartialData) {
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
    <div className="page-container">
      {/* 部分错误提示 */}
      {hasError && hasPartialData && (
        <Alert
          message="部分数据加载失败"
          description="某些模块数据无法加载，显示的数据可能不完整"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" onClick={refreshAllData} loading={isLoading}>
              重试
            </Button>
          }
        />
      )}
      
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                工作台
              </Space>
            </Title>
            <Text type="secondary">项目和任务概览 · 实时数据更新</Text>
          </div>
          <Tooltip title="刷新数据">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshAllData}
              loading={isLoading}
              type="text"
            >
              刷新
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card dashboard-stat-card">
            <Statistic
              title="项目总数"
              value={stats?.totalProjects || 0}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
            />
            {!stats && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                数据加载中...
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card dashboard-stat-card">
            <Statistic
              title="已完成任务"
              value={stats?.completedTasks || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="个"
            />
            {!stats && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                数据加载中...
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card dashboard-stat-card">
            <Statistic
              title="进行中任务"
              value={stats?.inProgressTasks || 0}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              suffix="个"
            />
            {!stats && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                数据加载中...
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="dashboard-card dashboard-stat-card">
            <Statistic
              title="待办任务"
              value={stats?.todoTasks || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix="个"
            />
            {stats && stats.overdueTasks > 0 && (
              <div style={{ marginTop: 8 }}>
                <Tag color="red" icon={<WarningOutlined />}>
                  {stats.overdueTasks} 个逾期
                </Tag>
              </div>
            )}
            {!stats && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                数据加载中...
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* 效率统计 */}
      {(productivityStats || productivityLoading) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <LineChartOutlined style={{ color: '#1890ff' }} />
                  本周效率统计
                </Space>
              }
              size="small"
              className="dashboard-card"
              loading={productivityLoading}
            >
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="本周完成"
                    value={productivityStats?.thisWeek.completed || 0}
                    suffix="个任务"
                    valueStyle={{ color: '#52c41a', fontSize: 18 }}
                  />
                  {!productivityStats && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      统计计算中...
                    </Text>
                  )}
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="本周创建"
                    value={productivityStats?.thisWeek.created || 0}
                    suffix="个任务"
                    valueStyle={{ color: '#1890ff', fontSize: 18 }}
                  />
                  {!productivityStats && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      统计计算中...
                    </Text>
                  )}
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="效率提升"
                    value={productivityStats ? Math.abs(productivityStats.improvement) : 0}
                    suffix="%"
                    valueStyle={{ 
                      color: productivityStats && productivityStats.improvement >= 0 ? '#52c41a' : '#ff4d4f',
                      fontSize: 18
                    }}
                    prefix={productivityStats && productivityStats.improvement >= 0 ? '↗' : '↘'}
                  />
                  {!productivityStats && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      统计计算中...
                    </Text>
                  )}
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* 快速操作 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <BulbOutlined style={{ color: '#fa8c16' }} />
                快速操作
              </Space>
            }
            extra={<Button type="link" size="small">更多功能</Button>}
            className="dashboard-card"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quickActions.map((action, index) => (
                <div 
                  key={index} 
                  className="dashboard-quick-action"
                  onClick={action.action}
                >
                  {action.icon}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2, fontSize: 14 }}>
                      {action.title}
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                      {action.description}
                    </div>
                  </div>
                  <Button type="primary" size="small" ghost>
                    前往
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CalendarOutlined style={{ color: '#1890ff' }} />
                最近活动
                {activitiesLoading && <Spin size="small" />}
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/audit-log')}>
                查看全部
              </Button>
            }
            className="dashboard-card"
          >
            {recentActivities && recentActivities.length > 0 ? (
              <List
                size="small"
                dataSource={recentActivities}
                renderItem={(activity, index) => (
                  <List.Item 
                    className="dashboard-activity-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <List.Item.Meta
                      avatar={getActivityIcon(activity.event_type)}
                      title={
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          gap: 8
                        }}>
                          <span style={{ fontSize: 13, lineHeight: '18px' }}>
                            {activity.description}
                          </span>
                          <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            {formatTimeAgo(activity.event_date)}
                          </Text>
                        </div>
                      }
                      description={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {activity.username}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                            {activity.task_title}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="暂无活动记录" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 项目进度 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <ProjectOutlined style={{ color: '#52c41a' }} />
                项目进度
                {progressLoading && <Spin size="small" />}
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/projects')}>
                管理项目
              </Button>
            }
            className="dashboard-card"
          >
            {projectProgress && projectProgress.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {projectProgress.map((project, index) => (
                  <div 
                    key={project.id} 
                    className="dashboard-progress-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 8
                    }}>
                      <Tooltip title={project.description}>
                        <Text strong style={{ fontSize: 14 }} ellipsis>
                          {project.name}
                        </Text>
                      </Tooltip>
                      <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {project.completedTasks}/{project.totalTasks} 个任务
                      </Text>
                    </div>
                    <Progress 
                      percent={project.progress} 
                      size="small"
                      strokeColor={{
                        '0%': project.progress >= 80 ? '#52c41a' :
                             project.progress >= 50 ? '#fa8c16' : '#ff4d4f',
                        '100%': project.progress >= 80 ? '#73d13d' :
                                project.progress >= 50 ? '#ffc53d' : '#ff7875'
                      }}
                      trailColor="#f5f5f5"
                      showInfo={true}
                      format={(percent) => `${percent}%`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Empty 
                description="暂无项目数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* 团队工作负载 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TeamOutlined style={{ color: '#722ed1' }} />
                团队工作负载
                {workloadLoading && <Spin size="small" />}
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/tasks')}>
                任务分配
              </Button>
            }
            className="dashboard-card"
          >
            {userWorkload && userWorkload.length > 0 ? (
              <List
                size="small"
                dataSource={userWorkload}
                renderItem={(user, index) => {
                  const workloadInfo = getWorkloadStatus(user.totalEstimatedHours);
                  return (
                    <List.Item 
                      className="dashboard-workload-item"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={<UserOutlined />} 
                            size="small" 
                            style={{ backgroundColor: '#1890ff' }}
                          />
                        }
                        title={
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {user.name}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {user.inProgressTasks > 0 && (
                                <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                                  {user.inProgressTasks} 进行中
                                </Tag>
                              )}
                              {user.todoTasks > 0 && (
                                <Tag color="default" style={{ fontSize: 10, margin: 0 }}>
                                  {user.todoTasks} 待办
                                </Tag>
                              )}
                            </div>
                          </div>
                        }
                        description={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              预估工时: {user.totalEstimatedHours}h
                            </Text>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div 
                                style={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%',
                                  backgroundColor: workloadInfo.color
                                }} 
                              />
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                {workloadInfo.text}
                              </Text>
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty 
                description="暂无工作负载数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 底部统计信息 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card size="small" className="dashboard-card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: 32,
                padding: '8px 0'
              }}>
                <Statistic
                  title="总任务数"
                  value={formatNumber(stats.totalTasks)}
                  valueStyle={{ fontSize: 16 }}
                />
                <Statistic
                  title="完成率"
                  value={stats.completionRate}
                  suffix="%"
                  valueStyle={{ 
                    fontSize: 16,
                    color: stats.completionRate >= 70 ? '#52c41a' : 
                           stats.completionRate >= 40 ? '#fa8c16' : '#ff4d4f'
                  }}
                />
                <Statistic
                  title="平均项目进度"
                  value={projectProgress ? Math.round(
                    projectProgress.reduce((sum, p) => sum + p.progress, 0) / projectProgress.length
                  ) : 0}
                  suffix="%"
                  valueStyle={{ fontSize: 16, color: '#1890ff' }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default DashboardPage;
