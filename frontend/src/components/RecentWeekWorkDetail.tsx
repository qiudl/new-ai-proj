import React, { useMemo } from 'react';
import {
  Card,
  Statistic,
  Progress,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Timeline,
  Alert,
  Empty,
  Divider
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { DailyStats, TaskTimeEntry, WeeklyStats } from '../services/weeklyReportService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface RecentWeekWorkDetailProps {
  dailyStats: DailyStats[];
  taskEntries: TaskTimeEntry[];
  weeklyStats: WeeklyStats;
}

const RecentWeekWorkDetail: React.FC<RecentWeekWorkDetailProps> = ({
  dailyStats,
  taskEntries,
  weeklyStats
}) => {
  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap = {
      'completed': { color: 'success', text: '已完成' },
      'in_progress': { color: 'processing', text: '进行中' },
      'todo': { color: 'default', text: '待办' }
    };
    const config = statusMap[status as keyof typeof statusMap];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 计算最近7天的汇总数据
  const weekSummary = useMemo(() => {
    // 按状态统计任务
    const completedTasks = taskEntries.filter(task => task.status === 'completed');
    const inProgressTasks = taskEntries.filter(task => task.status === 'in_progress');
    const todoTasks = taskEntries.filter(task => task.status === 'todo');
    
    // 按优先级统计
    const highPriorityTasks = taskEntries.filter(task => task.priority === 'high');
    const mediumPriorityTasks = taskEntries.filter(task => task.priority === 'medium');
    const lowPriorityTasks = taskEntries.filter(task => task.priority === 'low');
    
    // 工作天数和平均数据
    const workingDays = dailyStats.filter(day => day.totalHours > 0);
    const avgHoursPerDay = workingDays.length > 0 ? weeklyStats.totalHours / workingDays.length : 0;
    const avgEfficiency = dailyStats.length > 0 ? dailyStats.reduce((sum, day) => sum + day.efficiency, 0) / dailyStats.length : 0;
    
    // 最高效的一天
    const bestDay = dailyStats.reduce((max, day) => day.efficiency > max.efficiency ? day : max, dailyStats[0]);
    
    // 趋势分析（比较前半周与后半周）
    const midIndex = Math.floor(dailyStats.length / 2);
    const firstHalf = dailyStats.slice(0, midIndex);
    const secondHalf = dailyStats.slice(midIndex);
    
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, day) => sum + day.efficiency, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, day) => sum + day.efficiency, 0) / secondHalf.length : 0;
    
    const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
    const trendValue = Math.abs(secondHalfAvg - firstHalfAvg);
    
    return {
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      todoTasks: todoTasks.length,
      highPriorityTasks: highPriorityTasks.length,
      mediumPriorityTasks: mediumPriorityTasks.length,
      lowPriorityTasks: lowPriorityTasks.length,
      workingDays: workingDays.length,
      avgHoursPerDay,
      avgEfficiency,
      bestDay,
      trend,
      trendValue,
      completionRate: taskEntries.length > 0 ? (completedTasks.length / taskEntries.length) * 100 : 0,
      highPriorityHours: highPriorityTasks.reduce((sum, task) => sum + (task.duration || 0), 0),
      mediumPriorityHours: mediumPriorityTasks.reduce((sum, task) => sum + (task.duration || 0), 0),
      lowPriorityHours: lowPriorityTasks.reduce((sum, task) => sum + (task.duration || 0), 0)
    };
  }, [dailyStats, taskEntries, weeklyStats]);

  // 每日效率时间轴数据
  const efficiencyTimeline = useMemo(() => {
    return dailyStats
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
      .map(day => ({
        color: day.efficiency >= 85 ? 'green' : day.efficiency >= 70 ? 'blue' : day.efficiency >= 50 ? 'orange' : 'red',
        children: (
          <div key={day.date}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <Text strong style={{ fontSize: '14px' }}>{dayjs(day.date).format('MM-DD dddd')}</Text>
              <Space>
                <Text style={{ color: '#666', fontSize: '12px' }}>{day.totalHours.toFixed(2)}h</Text>
                <Tag color={day.efficiency >= 85 ? 'success' : day.efficiency >= 70 ? 'processing' : 'warning'}>
                  {day.efficiency.toFixed(2)}%
                </Tag>
              </Space>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                完成 {day.tasksCompleted} 个任务
                {day.topTask && ` · 主要任务: ${day.topTask}`}
              </Text>
            </div>
          </div>
        )
      }));
  }, [dailyStats]);

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>
          <CalendarOutlined style={{ marginRight: '8px' }} />
          最近7天工作总览
        </Title>
        <Text type="secondary">
          {dailyStats.length > 0 && dayjs(dailyStats[0]?.date).format('MM月DD日')} - {dailyStats.length > 0 && dayjs(dailyStats[dailyStats.length - 1]?.date).format('MM月DD日')} · 工作趋势分析
        </Text>
      </div>

      {/* 概览统计 */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="总工作时长"
              value={weeklyStats.totalHours.toFixed(2)}
              suffix="小时"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              日均 {weekSummary.avgHoursPerDay.toFixed(2)} 小时 · {weekSummary.workingDays} 个工作日
            </Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="任务完成率"
              value={weekSummary.completionRate.toFixed(2)}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '18px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {weekSummary.completedTasks}/{taskEntries.length} 个任务
            </Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="平均效率"
              value={weekSummary.avgEfficiency.toFixed(2)}
              suffix="%"
              prefix={<FireOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: '18px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {weekSummary.trend === 'up' ? (
                <><ArrowUpOutlined style={{ color: '#52c41a', marginRight: '2px' }} />
                <Text style={{ color: '#52c41a' }}>+{weekSummary.trendValue.toFixed(2)}%</Text></>
              ) : weekSummary.trend === 'down' ? (
                <><ArrowDownOutlined style={{ color: '#ff4d4f', marginRight: '2px' }} />
                <Text style={{ color: '#ff4d4f' }}>-{weekSummary.trendValue.toFixed(2)}%</Text></>
              ) : (
                <Text style={{ color: '#666' }}>趋势平稳</Text>
              )}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="最佳表现"
              value={weekSummary.bestDay?.efficiency?.toFixed(2) || '0.00'}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontSize: '18px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {weekSummary.bestDay?.date && dayjs(weekSummary.bestDay.date).format('MM-DD dddd')}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 任务统计分布 */}
      <Card title="任务完成分布" size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 8]}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}>
                {weekSummary.completedTasks}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>已完成</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}>
                {weekSummary.inProgressTasks}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>进行中</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                {weekSummary.todoTasks}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>待办</Text>
            </div>
          </Col>
        </Row>
        
        <Divider style={{ margin: '12px 0' }} />
        
        {/* 完成度进度条 */}
        <div>
          <Text style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
            整体完成度
          </Text>
          <Progress
            percent={weekSummary.completionRate}
            status={weekSummary.completionRate >= 80 ? 'success' : 'active'}
            size="small"
          />
        </div>
      </Card>

      {/* 优先级分析 */}
      <Card title="优先级工作分布" size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="#ff4d4f">高优先级</Tag>
              <Text style={{ fontSize: '12px' }}>{weekSummary.highPriorityTasks} 个任务</Text>
            </Space>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {weekSummary.highPriorityHours.toFixed(2)}h
            </Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="#faad14">中优先级</Tag>
              <Text style={{ fontSize: '12px' }}>{weekSummary.mediumPriorityTasks} 个任务</Text>
            </Space>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {weekSummary.mediumPriorityHours.toFixed(2)}h
            </Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="#52c41a">低优先级</Tag>
              <Text style={{ fontSize: '12px' }}>{weekSummary.lowPriorityTasks} 个任务</Text>
            </Space>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {weekSummary.lowPriorityHours.toFixed(2)}h
            </Text>
          </div>
        </Space>
      </Card>

      {/* 工作亮点 */}
      {weekSummary.bestDay && (
        <Alert
          message="本周亮点"
          description={
            <div>
              <Text>最高效的一天是 <Text strong>{dayjs(weekSummary.bestDay.date).format('MM月DD日')}</Text></Text>
              <br />
              <Text type="secondary">效率达到 {weekSummary.bestDay.efficiency.toFixed(2)}%，主要任务: {weekSummary.bestDay.topTask}</Text>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 每日效率时间轴 */}
      <Card title="每日效率趋势" size="small">
        {efficiencyTimeline.length > 0 ? (
          <Timeline
            items={efficiencyTimeline}
            mode="left"
            style={{ marginTop: '8px' }}
          />
        ) : (
          <Empty
            description="暂无工作数据"
            style={{ margin: '20px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default RecentWeekWorkDetail;