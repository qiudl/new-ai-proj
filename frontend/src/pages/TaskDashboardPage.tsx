import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Spin,
  Select,
  Input,
  Tooltip,
  Progress,
  Empty,
  Badge,
  Statistic,
  List,
  Avatar,
  Divider
} from 'antd';
import { 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  TrophyOutlined,
  RocketOutlined,
  LeftOutlined,
  RightOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardService } from '../services/dashboardService';
import { Task } from '../types/task';
import { useCache } from '../hooks/useCache';
import { formatTimeAgo } from '../utils/formatters';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// 扩展 dayjs 插件
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionRate: number;
  weekRange: string;
}

interface DayTasks {
  date: string;
  dayName: string;
  tasks: Task[];
  isToday: boolean;
  isPast: boolean;
}

const TaskDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedWeek, setSelectedWeek] = useState<Dayjs>(dayjs());
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 计算当前周的开始和结束日期
  const weekStart = useMemo(() => {
    return selectedWeek.startOf('week');
  }, [selectedWeek]);

  const weekEnd = useMemo(() => {
    return selectedWeek.endOf('week');
  }, [selectedWeek]);

  // 获取本周任务数据
  const {
    data: weeklyTasks,
    loading: weeklyTasksLoading,
    refresh: refreshWeeklyTasks
  } = useCache<Task[]>(
    `weekly-tasks-${weekStart.format('YYYY-MM-DD')}`,
    async () => {
      const allTasks = await DashboardService.getAllTasks();
      return allTasks.filter((task: Task) => {
        if (!task.due_date && !task.created_at) return false;
        
        const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
        return taskDate.isBetween(weekStart, weekEnd, 'day', '[]');
      });
    },
    { ttl: 2 * 60 * 1000 }
  );

  // 获取所有任务用于统计
  const {
    data: allTasks,
    loading: allTasksLoading,
    refresh: refreshAllTasks
  } = useCache<Task[]>(
    'all-tasks',
    () => DashboardService.getAllTasks(),
    { ttl: 5 * 60 * 1000 }
  );

  // 计算每日任务分布
  const dailyTasks: DayTasks[] = useMemo(() => {
    if (!weeklyTasks) return [];

    const days = [];
    const today = dayjs();
    
    for (let i = 0; i < 7; i++) {
      const currentDay = weekStart.add(i, 'day');
      const dayTasks = weeklyTasks.filter((task: Task) => {
        const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.created_at);
        return taskDate.isSame(currentDay, 'day');
      });

      days.push({
        date: currentDay.format('YYYY-MM-DD'),
        dayName: currentDay.format('dddd'),
        tasks: dayTasks,
        isToday: currentDay.isSame(today, 'day'),
        isPast: currentDay.isBefore(today, 'day')
      });
    }

    return days;
  }, [weeklyTasks, weekStart]);

  // 计算本周统计数据
  const weeklyStats: WeeklyStats = useMemo(() => {
    if (!weeklyTasks) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        completionRate: 0,
        weekRange: `${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')}`
      };
    }

    const totalTasks = weeklyTasks.length;
    const completedTasks = weeklyTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = weeklyTasks.filter(task => task.status === 'in_progress').length;
    const todoTasks = weeklyTasks.filter(task => task.status === 'todo').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate,
      weekRange: `${weekStart.format('MM/DD')} - ${weekEnd.format('MM/DD')}`
    };
  }, [weeklyTasks, weekStart, weekEnd]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    if (!weeklyTasks) return [];

    return weeklyTasks.filter(task => {
      const matchesSearch = !searchText || 
        task.title.toLowerCase().includes(searchText.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [weeklyTasks, searchText, selectedStatus]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#1890ff';
      case 'low': return '#52c41a';
      default: return '#8c8c8c';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#52c41a';
      case 'in_progress': return '#1890ff';
      case 'todo': return '#8c8c8c';
      case 'cancelled': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'todo': return '待办';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const refreshAllData = async () => {
    await Promise.all([refreshWeeklyTasks(), refreshAllTasks()]);
  };

  const isLoading = weeklyTasksLoading || allTasksLoading;

  if (isLoading && !weeklyTasks) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载本周任务数据...">
          <div style={{ height: '200px', width: '100%' }} />
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 周选择器和标题 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card style={{ background: 'linear-gradient(90deg, #e6f3ff 0%, #f0f9ff 100%)' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space size="large">
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                      <RocketOutlined /> 本周开发冲刺
                    </Title>
                    <Space>
                      <Text type="secondary" style={{ fontSize: '16px' }}>
                        {selectedWeek.format('YYYY年M月')} • {weeklyStats.weekRange}
                      </Text>
                      <Badge 
                        count={`第${selectedWeek.week()}周`} 
                        style={{ backgroundColor: '#1890ff' }}
                      />
                      {selectedWeek.isSame(dayjs(), 'week') && (
                        <Badge count="当前" color="#52c41a" />
                      )}
                    </Space>
                  </div>
                  <Divider type="vertical" style={{ height: '50px' }} />
                  <Space direction="vertical" size={0}>
                    <Space>
                      <Button 
                        icon={<LeftOutlined />} 
                        onClick={() => setSelectedWeek(selectedWeek.subtract(1, 'week'))}
                        type="text"
                      >
                        上周
                      </Button>
                      <Button 
                        type="primary" 
                        onClick={() => setSelectedWeek(dayjs())}
                        style={{ minWidth: '80px' }}
                      >
                        回到本周
                      </Button>
                      <Button 
                        icon={<RightOutlined />} 
                        onClick={() => setSelectedWeek(selectedWeek.add(1, 'week'))}
                        type="text"
                      >
                        下周
                      </Button>
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                      快速周期切换
                    </Text>
                  </Space>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" align="end">
                  <Space>
                    <Select
                      value={viewMode}
                      onChange={setViewMode}
                      style={{ width: 120 }}
                    >
                      <Option value="calendar">📅 日历视图</Option>
                      <Option value="list">📋 列表视图</Option>
                    </Select>
                    <Button 
                      icon={<ReloadOutlined />} 
                      onClick={refreshAllData}
                      loading={isLoading}
                    >
                      刷新
                    </Button>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/tasks/new')}
                      size="large"
                    >
                      新建任务
                    </Button>
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    最后更新: {dayjs().format('HH:mm')}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 本周统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card 
            hoverable
            style={{ 
              borderLeft: '4px solid #1890ff',
              background: 'linear-gradient(135deg, #f8faff 0%, #e6f3ff 100%)'
            }}
          >
            <Statistic
              title="📊 本周任务总数"
              value={weeklyStats.totalTasks}
              prefix={<RocketOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {selectedWeek.isSame(dayjs(), 'week') ? '本周工作量' : '该周工作量'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card 
            hoverable
            style={{ 
              borderLeft: '4px solid #52c41a',
              background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)'
            }}
          >
            <Statistic
              title="✅ 已完成"
              value={weeklyStats.completedTasks}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="个"
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                完成效率
              </Text>
              {weeklyStats.totalTasks > 0 && (
                <Badge 
                  count={`${Math.round((weeklyStats.completedTasks / weeklyStats.totalTasks) * 100)}%`}
                  style={{ backgroundColor: '#52c41a' }}
                />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card 
            hoverable
            style={{ 
              borderLeft: '4px solid #fa8c16',
              background: 'linear-gradient(135deg, #fff7e6 0%, #fff1b8 100%)'
            }}
          >
            <Statistic
              title="🔄 进行中"
              value={weeklyStats.inProgressTasks}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              suffix="个"
              valueStyle={{ color: '#fa8c16', fontSize: '28px', fontWeight: 'bold' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {weeklyStats.inProgressTasks > 0 ? '需要关注推进' : '暂无进行中任务'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card 
            hoverable
            style={{ 
              borderLeft: '4px solid #722ed1',
              background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)'
            }}
          >
            <Statistic
              title="🏆 完成率"
              value={weeklyStats.completionRate}
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
              suffix="%"
              valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
            />
            <Progress 
              percent={weeklyStats.completionRate} 
              size="small" 
              showInfo={false}
              strokeColor={{
                '0%': '#ff4d4f',
                '30%': '#fa8c16',
                '70%': '#1890ff',
                '100%': '#52c41a',
              }}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {weeklyStats.completionRate >= 80 ? '🎉 表现优秀' : 
               weeklyStats.completionRate >= 60 ? '👍 进展良好' :
               weeklyStats.completionRate >= 30 ? '⚡ 需要加速' : '🔥 冲刺阶段'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="搜索本周任务..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: '100%' }}
            placeholder="筛选状态"
          >
            <Option value="all">全部状态</Option>
            <Option value="todo">待办</Option>
            <Option value="in_progress">进行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Badge count={filteredTasks.length} color="#1890ff">
            <Text>共 {weeklyTasks?.length || 0} 个本周任务</Text>
          </Badge>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      {viewMode === 'calendar' ? (
        /* 日历视图 */
        <Row gutter={[12, 12]}>
          {dailyTasks.map((day, index) => {
            const completedCount = day.tasks.filter(t => t.status === 'completed').length;
            const totalCount = day.tasks.length;
            const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            return (
              <Col key={day.date} xs={24} sm={12} md={8} lg={6} xl={3.42}>
                <Card
                  size="small"
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Text strong style={{ 
                          color: day.isToday ? '#1890ff' : day.isPast ? '#8c8c8c' : '#000000',
                          fontSize: '14px'
                        }}>
                          {day.dayName}
                        </Text>
                        {day.isToday && <Badge dot color="#1890ff" />}
                      </Space>
                      <Badge 
                        count={totalCount} 
                        color={day.isToday ? '#1890ff' : '#8c8c8c'} 
                        size="small"
                      />
                    </div>
                  }
                  extra={
                    <div style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        {dayjs(day.date).format('MM/DD')}
                      </Text>
                      {totalCount > 0 && (
                        <Text 
                          style={{ 
                            fontSize: '10px', 
                            color: completionRate === 100 ? '#52c41a' : '#fa8c16'
                          }}
                        >
                          {completionRate}%
                        </Text>
                      )}
                    </div>
                  }
                  style={{
                    borderColor: day.isToday ? '#1890ff' : undefined,
                    borderWidth: day.isToday ? '2px' : '1px',
                    backgroundColor: day.isPast ? '#fafafa' : 
                                    day.isToday ? '#f0f9ff' : undefined,
                    boxShadow: day.isToday ? '0 4px 12px rgba(24, 144, 255, 0.15)' : undefined
                  }}
                  bodyStyle={{ padding: '12px 8px' }}
                >
                  <div style={{ minHeight: '220px' }}>
                    {/* 进度条 */}
                    {totalCount > 0 && (
                      <Progress 
                        percent={completionRate}
                        size="small"
                        showInfo={false}
                        strokeColor={completionRate === 100 ? '#52c41a' : '#1890ff'}
                        style={{ marginBottom: '12px' }}
                      />
                    )}
                    
                    {totalCount === 0 ? (
                      <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                        description={
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {day.isToday ? '今日暂无任务' : '无任务安排'}
                          </Text>
                        }
                        style={{ margin: '40px 0' }}
                      />
                    ) : (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {day.tasks.map((task: Task) => (
                          <Card
                            key={task.id}
                            size="small"
                            hoverable
                            style={{
                              cursor: 'pointer',
                              borderLeft: `4px solid ${getStatusColor(task.status)}`,
                              transition: 'all 0.3s ease',
                              transform: 'translateY(0)',
                            }}
                            onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                            bodyStyle={{ padding: '10px' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div>
                              <Text 
                                ellipsis={{ tooltip: task.title }} 
                                style={{ 
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  display: 'block',
                                  marginBottom: '6px',
                                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                  opacity: task.status === 'completed' ? 0.7 : 1
                                }}
                              >
                                {task.status === 'completed' && '✅ '}
                                {task.status === 'in_progress' && '🔄 '}
                                {task.status === 'todo' && '📝 '}
                                {task.title}
                              </Text>
                              
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '4px'
                              }}>
                                <Tag 
                                  color={getStatusColor(task.status)} 
                                  style={{ fontSize: '10px', margin: 0, padding: '2px 6px' }}
                                >
                                  {getStatusText(task.status)}
                                </Tag>
                                {task.custom_fields?.priority && (
                                  <Tag 
                                    color={getPriorityColor(task.custom_fields.priority)} 
                                    style={{ fontSize: '10px', margin: 0, padding: '2px 6px' }}
                                  >
                                    {task.custom_fields.priority === 'high' ? '🔥' : 
                                     task.custom_fields.priority === 'medium' ? '⚡' : '📋'}
                                  </Tag>
                                )}
                              </div>
                              
                              {/* 进度条 */}
                              {task.custom_fields?.progress !== undefined && (
                                <Progress 
                                  percent={task.custom_fields.progress} 
                                  size="small" 
                                  showInfo={false}
                                  strokeColor={task.status === 'completed' ? '#52c41a' : '#1890ff'}
                                  style={{ marginTop: '4px' }}
                                />
                              )}
                              
                              {/* 负责人 */}
                              {task.assignee_name && (
                                <Text 
                                  type="secondary" 
                                  style={{ fontSize: '10px', display: 'block', marginTop: '4px' }}
                                >
                                  👤 {task.assignee_name}
                                </Text>
                              )}
                            </div>
                          </Card>
                        ))}
                      </Space>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* 列表视图 */
        <Card>
          <List
            itemLayout="horizontal"
            dataSource={filteredTasks}
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条任务`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical">
                      <Text>暂无本周任务</Text>
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/tasks/new')}
                      >
                        创建本周任务
                      </Button>
                    </Space>
                  }
                />
              )
            }}
            renderItem={(task: Task) => (
              <List.Item
                actions={[
                  <Tooltip title="查看详情" key="view">
                    <Button 
                      type="text" 
                      icon={<EyeOutlined />} 
                      onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}
                    />
                  </Tooltip>,
                  <Tooltip title="编辑任务" key="edit">
                    <Button 
                      type="text" 
                      icon={<EditOutlined />} 
                      onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}/edit`)}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      style={{ 
                        backgroundColor: getStatusColor(task.status),
                        borderRadius: '4px'
                      }}
                      shape="square"
                      size="small"
                      icon={
                        task.status === 'completed' ? <CheckCircleOutlined /> : 
                        task.status === 'in_progress' ? <ClockCircleOutlined /> : 
                        <UserOutlined />
                      }
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{task.title}</Text>
                      <Tag color={getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </Tag>
                      {task.custom_fields?.priority && (
                        <Tag color={getPriorityColor(task.custom_fields.priority)}>
                          {task.custom_fields.priority.toUpperCase()}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      {task.description && (
                        <Text type="secondary" ellipsis>
                          {task.description}
                        </Text>
                      )}
                      <Space size="large">
                        {task.due_date && (
                          <Text type="secondary">
                            📅 到期: {dayjs(task.due_date).format('MM/DD dddd')}
                          </Text>
                        )}
                        {task.assignee_name && (
                          <Text type="secondary">
                            👤 负责人: {task.assignee_name}
                          </Text>
                        )}
                        {task.custom_fields?.progress && (
                          <Text type="secondary">
                            📊 进度: {task.custom_fields.progress}%
                          </Text>
                        )}
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default TaskDashboardPage;