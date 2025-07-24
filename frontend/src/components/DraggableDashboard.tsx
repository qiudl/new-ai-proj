import React, { useState, useCallback, useMemo } from 'react';
import { Button, Card, Row, Col, Statistic, List, Progress, Empty, Space, Typography, Tag, Avatar, Alert, Spin, Tooltip, Select } from 'antd';
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
  ReloadOutlined,
  LayoutOutlined,
  UndoOutlined
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
import TimerDebugCard from './TimerDebugCard';

const { Title, Text } = Typography;
const { Option } = Select;

interface DashboardComponentProps {
  stats?: DashboardStats | null;
  recentActivities?: TimelineEvent[] | null;
  projectProgress?: ProjectProgressInfo[] | null;
  userWorkload?: UserWorkload[] | null;
  productivityStats?: any;
  activitiesLoading?: boolean;
  progressLoading?: boolean;
  workloadLoading?: boolean;
  productivityLoading?: boolean;
  refreshAllData?: () => void;
  isLoading?: boolean;
}

// 简化的布局选项
type LayoutType = 'default' | 'compact' | 'wide';

const DraggableDashboard: React.FC<DashboardComponentProps> = ({
  stats,
  recentActivities,
  projectProgress,
  userWorkload,
  productivityStats,
  activitiesLoading,
  progressLoading,
  workloadLoading,
  productivityLoading,
  refreshAllData,
  isLoading
}) => {
  const navigate = useNavigate();

  // 从 localStorage 获取保存的布局
  const getSavedLayout = (): LayoutType => {
    try {
      const saved = localStorage.getItem('dashboard-layout');
      return (saved as LayoutType) || 'default';
    } catch {
      return 'default';
    }
  };

  const [currentLayout, setCurrentLayout] = useState<LayoutType>(getSavedLayout);

  // 保存布局到 localStorage
  const handleLayoutChange = useCallback((layout: LayoutType) => {
    setCurrentLayout(layout);
    localStorage.setItem('dashboard-layout', layout);
  }, []);

  // 重置布局
  const resetLayout = useCallback(() => {
    setCurrentLayout('default');
    localStorage.setItem('dashboard-layout', 'default');
  }, []);

  // 快速操作配置
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

  // 渲染统计卡片组件
  const renderStatsComponent = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card className="dashboard-card dashboard-stat-card">
          <Statistic
            title="项目总数"
            value={stats?.totalProjects || 0}
            prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
            suffix="个"
          />
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
        </Card>
      </Col>
    </Row>
  );

  // 渲染效率统计组件
  const renderProductivityComponent = () => (
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
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="本周创建"
            value={productivityStats?.thisWeek.created || 0}
            suffix="个任务"
            valueStyle={{ color: '#1890ff', fontSize: 18 }}
          />
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
        </Col>
      </Row>
    </Card>
  );

  // 渲染快速操作组件
  const renderQuickActionsComponent = () => (
    <Card 
      title={
        <Space>
          <BulbOutlined style={{ color: '#fa8c16' }} />
          快速操作
        </Space>
      }
      className="dashboard-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {quickActions.map((action, index) => (
          <div 
            key={index} 
            className="dashboard-quick-action"
            onClick={action.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
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
  );

  // 渲染最近活动组件
  const renderRecentActivitiesComponent = () => (
    <Card 
      title={
        <Space>
          <CalendarOutlined style={{ color: '#1890ff' }} />
          最近活动
          {activitiesLoading && <Spin size="small" />}
        </Space>
      }
      className="dashboard-card"
    >
      {recentActivities && recentActivities.length > 0 ? (
        <List
          size="small"
          dataSource={recentActivities}
          renderItem={(activity) => (
            <List.Item>
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
  );

  // 渲染项目进度组件
  const renderProjectProgressComponent = () => (
    <Card 
        title={
          <Space>
            <ProjectOutlined style={{ color: '#52c41a' }} />
            项目进度
            {progressLoading && <Spin size="small" />}
          </Space>
        }
        className="dashboard-card"
      >
        {projectProgress && projectProgress.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projectProgress.map((project) => (
              <div key={project.id}>
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
  );

  // 渲染团队工作负载组件
  const renderUserWorkloadComponent = () => (
      <Card 
        title={
          <Space>
            <TeamOutlined style={{ color: '#722ed1' }} />
            团队工作负载
            {workloadLoading && <Spin size="small" />}
          </Space>
        }
        className="dashboard-card"
      >
        {userWorkload && userWorkload.length > 0 ? (
          <List
            size="small"
            dataSource={userWorkload}
            renderItem={(user) => {
              const workloadInfo = getWorkloadStatus(user.totalEstimatedHours);
              return (
                <List.Item>
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
  );

  // 渲染底部统计组件
  const renderSummaryComponent = () => (
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
            value={formatNumber(stats?.totalTasks || 0)}
            valueStyle={{ fontSize: 16 }}
          />
          <Statistic
            title="完成率"
            value={stats?.completionRate || 0}
            suffix="%"
            valueStyle={{ 
              fontSize: 16,
              color: (stats?.completionRate || 0) >= 70 ? '#52c41a' : 
                     (stats?.completionRate || 0) >= 40 ? '#fa8c16' : '#ff4d4f'
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
  );

  // 根据布局类型返回不同的列配置
  const getLayoutConfig = () => {
    switch (currentLayout) {
      case 'compact':
        return {
          statsSpan: 24,
          productivitySpan: 24,
          leftColSpan: 24,
          rightColSpan: 24,
          gutter: [12, 12] as [number, number]
        };
      case 'wide':
        return {
          statsSpan: 24,
          productivitySpan: 24,
          leftColSpan: 8,
          rightColSpan: 8,
          gutter: [24, 24] as [number, number]
        };
      default:
        return {
          statsSpan: 24,
          productivitySpan: 24,
          leftColSpan: 12,
          rightColSpan: 12,
          gutter: [16, 16] as [number, number]
        };
    }
  };

  const layoutConfig = getLayoutConfig();

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px 16px',
        background: '#fafafa',
        borderRadius: '8px'
      }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <Space>
              <LayoutOutlined style={{ color: '#1890ff' }} />
              工作台布局设置
            </Space>
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            选择布局模式，自动保存设置
          </Text>
        </div>
        <Space>
          <Select
            value={currentLayout}
            onChange={handleLayoutChange}
            size="small"
            style={{ width: 120 }}
          >
            <Option value="default">默认布局</Option>
            <Option value="compact">紧凑布局</Option>
            <Option value="wide">宽松布局</Option>
          </Select>
          <Tooltip title="重置布局">
            <Button 
              icon={<UndoOutlined />} 
              onClick={resetLayout}
              size="small"
            >
              重置
            </Button>
          </Tooltip>
          <Tooltip title="刷新数据">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshAllData}
              loading={isLoading}
              type="primary"
              size="small"
            >
              刷新
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* 响应式布局 */}
      <div>
        {/* 统计卡片 */}
        <Row gutter={layoutConfig.gutter} style={{ marginBottom: 16 }}>
          <Col span={layoutConfig.statsSpan}>
            {renderStatsComponent()}
          </Col>
        </Row>

        {/* 效率统计 */}
        {(productivityStats || productivityLoading) && (
          <Row gutter={layoutConfig.gutter} style={{ marginBottom: 16 }}>
            <Col span={layoutConfig.productivitySpan}>
              {renderProductivityComponent()}
            </Col>
          </Row>
        )}

        {/* 主要内容区域 */}
        <Row gutter={layoutConfig.gutter} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={layoutConfig.leftColSpan}>
            {renderQuickActionsComponent()}
          </Col>
          <Col xs={24} lg={layoutConfig.rightColSpan}>
            {renderRecentActivitiesComponent()}
          </Col>
        </Row>

        <Row gutter={layoutConfig.gutter} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={layoutConfig.leftColSpan}>
            {renderProjectProgressComponent()}
          </Col>
          <Col xs={24} lg={layoutConfig.rightColSpan}>
            {renderUserWorkloadComponent()}
          </Col>
        </Row>

        {/* 底部统计 */}
        {stats && (
          <Row gutter={layoutConfig.gutter}>
            <Col span={24}>
              {renderSummaryComponent()}
            </Col>
          </Row>
        )}
        
        {/* Debug Timer Component */}
        <TimerDebugCard />
      </div>
    </div>
  );
};

export default DraggableDashboard;