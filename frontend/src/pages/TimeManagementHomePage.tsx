import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Space,
  Tag,
  Button,
  Tooltip,
  List,
  Avatar,
  Badge,
  Spin,
  Empty,
  Alert,
  message,
  Divider
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  ReloadOutlined,
  BarChartOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TimeManagementService, TodayTaskStats } from '../services/timeManagementService';
import { Task } from '../types/task';
import { useCache } from '../hooks/useCache';
import HomeTimerCard from '../components/HomeTimerCard';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#52c41a';
    case 'in_progress': return '#1890ff';
    case 'todo': return '#8c8c8c';
    case 'cancelled': return '#ff4d4f';
    default: return '#8c8c8c';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '已完成';
    case 'in_progress': return '进行中';
    case 'todo': return '待办';
    case 'cancelled': return '已取消';
    default: return status;
  }
};

// 获取优先级颜色
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return '#ff4d4f';
    case 'high': return '#fa8c16';
    case 'medium': return '#1890ff';
    case 'low': return '#52c41a';
    default: return '#8c8c8c';
  }
};

// 时间格式化函数
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};

// 效率评级
const getEfficiencyLevel = (efficiency: number) => {
  if (efficiency <= 80) return { level: '高效', color: '#52c41a', icon: <TrophyOutlined /> };
  if (efficiency <= 110) return { level: '正常', color: '#1890ff', icon: <CheckCircleOutlined /> };
  if (efficiency <= 150) return { level: '偏慢', color: '#fa8c16', icon: <ClockCircleOutlined /> };
  return { level: '需改进', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> };
};

const TimeManagementHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 获取今日任务统计数据
  const {
    data: todayStats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useCache<TodayTaskStats>(
    'today-task-stats',
    async () => {
      setLoading(true);
      try {
        const stats = await TimeManagementService.getTodayTaskStats();
        return stats;
      } finally {
        setLoading(false);
      }
    },
    { ttl: 2 * 60 * 1000 } // 2分钟缓存
  );

  // 定时刷新统计数据
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats();
    }, 5 * 60 * 1000); // 每5分钟刷新一次

    return () => clearInterval(interval);
  }, [refreshStats]);

  // 计算衍生数据
  const derivedData = useMemo(() => {
    if (!todayStats) return null;

    const efficiencyLevel = getEfficiencyLevel(todayStats.timeEfficiency);
    const isOverEfficient = todayStats.timeEfficiency > 100;
    const completionTrend = todayStats.completedTasks - todayStats.yesterdayCompletion;
    
    return {
      efficiencyLevel,
      isOverEfficient,
      completionTrend,
      completionTrendIcon: completionTrend > 0 ? <ArrowUpOutlined /> : 
                           completionTrend < 0 ? <ArrowDownOutlined /> : null,
      hasOverdueTasks: todayStats.overdueTasks > 0,
      hasUrgentTasks: todayStats.urgentTasks.length > 0,
      workloadLevel: todayStats.estimatedWorkload > 8 ? 'heavy' : 
                     todayStats.estimatedWorkload > 4 ? 'normal' : 'light'
    };
  }, [todayStats]);

  // 手动刷新
  const handleRefresh = async () => {
    try {
      await refreshStats();
      message.success('数据刷新成功');
    } catch (error) {
      message.error('刷新失败');
    }
  };

  const isDataLoading = statsLoading || loading;

  if (isDataLoading && !todayStats) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="加载今日统计数据...">
          <div style={{ height: '300px' }} />
        </Spin>
      </div>
    );
  }

  if (statsError && !todayStats) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="数据加载失败"
          description="无法获取今日任务统计数据，请检查网络连接或稍后重试。"
          type="error"
          action={
            <Button size="small" danger onClick={handleRefresh}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (!todayStats) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Empty description="暂无数据" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <div>
                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  <BarChartOutlined /> 时间管理工作台
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  {dayjs().format('YYYY年M月D日 dddd')} • 让每一分钟都有价值
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={isDataLoading}
              >
                刷新数据
              </Button>
              <Button 
                type="primary"
                onClick={() => navigate('/task-dashboard')}
              >
                查看任务看板
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 今日任务统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="今日任务总数"
              value={todayStats.totalTasks}
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
              suffix="个"
            />
            {derivedData?.completionTrend !== 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <Text type={derivedData?.completionTrend && derivedData.completionTrend > 0 ? 'success' : 'danger'}>
                  {derivedData?.completionTrendIcon} 
                  {derivedData?.completionTrend && derivedData.completionTrend > 0 ? '+' : ''}
                  {derivedData?.completionTrend || 0} vs昨日
                </Text>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已完成"
              value={todayStats.completedTasks}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix="个"
            />
            <div style={{ marginTop: '8px' }}>
              <Progress 
                percent={todayStats.completionRate} 
                size="small" 
                showInfo={false}
                strokeColor="#52c41a"
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                完成率 {todayStats.completionRate}%
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="进行中"
              value={todayStats.inProgressTasks}
              prefix={<PlayCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="个"
            />
            {todayStats.estimatedWorkload > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <Text type="secondary">
                  预估剩余 {todayStats.estimatedWorkload}h
                </Text>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="时间效率"
              value={todayStats.timeEfficiency}
              prefix={derivedData?.efficiencyLevel.icon}
              valueStyle={{ color: derivedData?.efficiencyLevel.color }}
              suffix="%"
            />
            <div style={{ marginTop: '8px' }}>
              <Tag color={derivedData?.efficiencyLevel.color} style={{ fontSize: '12px' }}>
                {derivedData?.efficiencyLevel.level}
              </Tag>
              {derivedData?.isOverEfficient && (
                <Text type="secondary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                  (超出预期)
                </Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 重要提醒 */}
      {(derivedData?.hasOverdueTasks || derivedData?.hasUrgentTasks) && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {derivedData.hasOverdueTasks && (
            <Col xs={24} sm={12}>
              <Alert
                message={`有 ${todayStats.overdueTasks} 个任务已逾期`}
                description="建议优先处理逾期任务，避免影响项目进度"
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
                action={
                  <Button size="small" danger onClick={() => navigate('/task-dashboard')}>
                    查看详情
                  </Button>
                }
              />
            </Col>
          )}
          
          {derivedData.hasUrgentTasks && (
            <Col xs={24} sm={12}>
              <Alert
                message={`有 ${todayStats.urgentTasks.length} 个紧急任务`}
                description="请注意紧急任务的处理优先级"
                type="warning"
                showIcon
                icon={<FireOutlined />}
                action={
                  <Button size="small" onClick={() => navigate('/task-dashboard')}>
                    查看详情
                  </Button>
                }
              />
            </Col>
          )}
        </Row>
      )}

      {/* 任务计时器卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={8}>
          <HomeTimerCard />
        </Col>
        <Col xs={24} lg={16}>
          {/* 这里可以添加其他工作台工具 */}
          <Card title="工作台工具" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                icon={<BarChartOutlined />}
                onClick={() => navigate('/task-dashboard')}
              >
                任务看板
              </Button>
              <Button 
                block 
                icon={<CalendarOutlined />}
                onClick={() => navigate('/time-analysis')}
              >
                时间分析
              </Button>
              <Button 
                block 
                icon={<CheckCircleOutlined />}
                onClick={() => navigate('/tasks')}
              >
                任务管理
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 详细统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* 任务状态分布 */}
        <Col xs={24} md={8}>
          <Card title="任务状态分布" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Badge color="#52c41a" />
                  <Text>已完成</Text>
                </Space>
                <Text strong>{todayStats.completedTasks}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Badge color="#1890ff" />
                  <Text>进行中</Text>
                </Space>
                <Text strong>{todayStats.inProgressTasks}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Badge color="#8c8c8c" />
                  <Text>待办</Text>
                </Space>
                <Text strong>{todayStats.todoTasks}</Text>
              </div>
              {todayStats.overdueTasks > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Badge color="#ff4d4f" />
                    <Text type="danger">逾期</Text>
                  </Space>
                  <Text strong type="danger">{todayStats.overdueTasks}</Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 优先级分布 */}
        <Col xs={24} md={8}>
          <Card title="优先级分布" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {todayStats.priorityDistribution.urgent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color="red" style={{ fontSize: '12px' }}>紧急</Tag>
                  <Text strong>{todayStats.priorityDistribution.urgent}</Text>
                </div>
              )}
              {todayStats.priorityDistribution.high > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color="orange" style={{ fontSize: '12px' }}>高</Tag>
                  <Text strong>{todayStats.priorityDistribution.high}</Text>
                </div>
              )}
              {todayStats.priorityDistribution.medium > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color="blue" style={{ fontSize: '12px' }}>中</Tag>
                  <Text strong>{todayStats.priorityDistribution.medium}</Text>
                </div>
              )}
              {todayStats.priorityDistribution.low > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color="green" style={{ fontSize: '12px' }}>低</Tag>
                  <Text strong>{todayStats.priorityDistribution.low}</Text>
                </div>
              )}
              {todayStats.priorityDistribution.unset > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color="default" style={{ fontSize: '12px' }}>未设置</Tag>
                  <Text strong>{todayStats.priorityDistribution.unset}</Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 时间统计 */}
        <Col xs={24} md={8}>
          <Card title="时间统计" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">计划时间:</Text>
                <Text strong style={{ marginLeft: '8px' }}>
                  {formatTime(todayStats.totalPlannedTime)}
                </Text>
              </div>
              <div>
                <Text type="secondary">实际时间:</Text>
                <Text strong style={{ marginLeft: '8px' }}>
                  {formatTime(todayStats.totalActualTime)}
                </Text>
              </div>
              {todayStats.avgTaskDuration > 0 && (
                <div>
                  <Text type="secondary">平均时长:</Text>
                  <Text strong style={{ marginLeft: '8px' }}>
                    {formatTime(todayStats.avgTaskDuration)}
                  </Text>
                </div>
              )}
              <div>
                <Text type="secondary">按时完成率:</Text>
                <Text strong style={{ marginLeft: '8px', color: todayStats.onTimeCompletionRate >= 80 ? '#52c41a' : '#fa8c16' }}>
                  {todayStats.onTimeCompletionRate}%
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 紧急任务和即将到期 */}
      <Row gutter={[16, 16]}>
        {/* 紧急任务 */}
        {todayStats.urgentTasks.length > 0 && (
          <Col xs={24} md={12}>
            <Card 
              title={
                <Space>
                  <FireOutlined style={{ color: '#ff4d4f' }} />
                  <span>紧急任务</span>
                  <Badge count={todayStats.urgentTasks.length} color="#ff4d4f" size="small" />
                </Space>
              }
              size="small"
              extra={
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => navigate('/task-dashboard')}
                >
                  查看全部
                </Button>
              }
            >
              <List
                dataSource={todayStats.urgentTasks.slice(0, 5)}
                size="small"
                renderItem={(task: Task) => (
                  <List.Item
                    actions={[
                      <Button 
                        key="view"
                        type="text" 
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                          icon={task.status === 'in_progress' ? <PlayCircleOutlined /> : <ClockCircleOutlined />}
                        />
                      }
                      title={
                        <Space>
                          <Text ellipsis style={{ maxWidth: '200px' }}>
                            {task.title}
                          </Text>
                          <Tag color={getPriorityColor(task.custom_fields?.priority || 'medium')} style={{ fontSize: '12px' }}>
                            {(task.custom_fields?.priority || 'medium').toUpperCase()}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space>
                          <Tag color={getStatusColor(task.status)} style={{ fontSize: '12px' }}>
                            {getStatusText(task.status)}
                          </Tag>
                          {task.due_date && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <CalendarOutlined /> {dayjs(task.due_date).format('MM-DD')}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {/* 即将到期 */}
        {todayStats.upcomingDeadlines.length > 0 && (
          <Col xs={24} md={12}>
            <Card 
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#fa8c16' }} />
                  <span>明日到期</span>
                  <Badge count={todayStats.upcomingDeadlines.length} color="#fa8c16" size="small" />
                </Space>
              }
              size="small"
              extra={
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => navigate('/task-dashboard')}
                >
                  查看全部
                </Button>
              }
            >
              <List
                dataSource={todayStats.upcomingDeadlines}
                size="small"
                renderItem={(task: Task) => (
                  <List.Item
                    actions={[
                      <Button 
                        key="view"
                        type="text" 
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                          icon={<CalendarOutlined />}
                        />
                      }
                      title={
                        <Text ellipsis style={{ maxWidth: '250px' }}>
                          {task.title}
                        </Text>
                      }
                      description={
                        <Space>
                          <Tag color={getStatusColor(task.status)} style={{ fontSize: '12px' }}>
                            {getStatusText(task.status)}
                          </Tag>
                          {task.assignee_name && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              👤 {task.assignee_name}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {/* 如果没有紧急任务和即将到期的任务，显示空状态 */}
        {todayStats.urgentTasks.length === 0 && todayStats.upcomingDeadlines.length === 0 && (
          <Col xs={24}>
            <Card>
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical">
                    <Text>🎉 没有紧急任务和即将到期的任务</Text>
                    <Text type="secondary">可以专注于当前的工作</Text>
                  </Space>
                }
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* 效率小贴士 */}
      {derivedData && (
        <Card style={{ marginTop: '24px' }} size="small">
          <Title level={5}>💡 效率小贴士</Title>
          <Space direction="vertical">
            {derivedData.workloadLevel === 'heavy' && (
              <Alert
                type="info"
                message="今日工作量较大，建议合理安排休息时间，保持工作效率。"
                showIcon
              />
            )}
            {todayStats.completionRate < 50 && todayStats.totalTasks > 3 && (
              <Alert
                type="warning"
                message="完成率偏低，建议检查任务安排是否合理，或调整优先级。"
                showIcon
              />
            )}
            {todayStats.timeEfficiency > 120 && (
              <Alert
                type="success"
                message="时间效率很高！但要注意任务质量，避免为了速度而忽略细节。"
                showIcon
              />
            )}
            {todayStats.onTimeCompletionRate < 70 && todayStats.completedTasks > 2 && (
              <Alert
                type="warning"
                message="按时完成率偏低，建议重新评估任务的时间预估。"
                showIcon
              />
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default TimeManagementHomePage;