import React from 'react';
import {
  Card,
  Statistic,
  Progress,
  Typography,
  Space,
  Tag,
  List,
  Row,
  Col,
  Timeline,
  Alert,
  Empty
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { DailyStats, TaskTimeEntry } from '../services/weeklyReportService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface DailyWorkDetailProps {
  selectedDate: string;
  dailyStats: DailyStats;
  taskEntries: TaskTimeEntry[];
}

const DailyWorkDetail: React.FC<DailyWorkDetailProps> = ({
  selectedDate,
  dailyStats,
  taskEntries
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

  // 计算该日期的详细统计
  const dayTasks = taskEntries.filter(entry => entry.date === selectedDate);
  const completedTasks = dayTasks.filter(task => task.status === 'completed');
  const inProgressTasks = dayTasks.filter(task => task.status === 'in_progress');
  const todoTasks = dayTasks.filter(task => task.status === 'todo');
  
  const totalDuration = dayTasks.reduce((sum, task) => sum + task.duration, 0);
  const avgTaskDuration = dayTasks.length > 0 ? totalDuration / dayTasks.length : 0;

  // 按优先级分组
  const highPriorityTasks = dayTasks.filter(task => task.priority === 'high');
  const mediumPriorityTasks = dayTasks.filter(task => task.priority === 'medium');
  const lowPriorityTasks = dayTasks.filter(task => task.priority === 'low');

  // 时间轴数据
  const timelineData = dayTasks
    .sort((a, b) => a.duration - b.duration) // 按时长排序
    .map(task => ({
      color: task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : 'gray',
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <Text strong style={{ fontSize: '14px' }}>{task.taskTitle}</Text>
            <Text style={{ color: '#666', fontSize: '12px' }}>{task.duration}h</Text>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>{task.projectName}</Text>
          </div>
          <Space>
            <Tag color={getPriorityColor(task.priority)} size="small">
              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
            </Tag>
            {getStatusTag(task.status)}
          </Space>
        </div>
      )
    }));

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>
          <CalendarOutlined style={{ marginRight: '8px' }} />
          {dayjs(selectedDate).format('YYYY年MM月DD日')} 工作详情
        </Title>
        <Text type="secondary">
          {dayjs(selectedDate).format('dddd')} · 详细工作统计分析
        </Text>
      </div>

      {/* 概览统计 */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="工作时长"
              value={dailyStats.totalHours}
              suffix="小时"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="完成任务"
              value={dailyStats.tasksCompleted}
              suffix="个"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="工作效率"
              value={dailyStats.efficiency.toFixed(1)}
              suffix="%"
              prefix={<FireOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <Statistic
              title="平均时长"
              value={avgTaskDuration.toFixed(1)}
              suffix="h/任务"
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontSize: '18px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 任务状态分布 */}
      <Card title="任务状态分布" size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}>
                {completedTasks.length}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>已完成</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#1890ff', fontSize: '20px', fontWeight: 'bold' }}>
                {inProgressTasks.length}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>进行中</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                {todoTasks.length}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>待办</Text>
            </div>
          </Col>
        </Row>
        
        {/* 完成度进度条 */}
        <div style={{ marginTop: '12px' }}>
          <Text style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
            任务完成度
          </Text>
          <Progress
            percent={dayTasks.length > 0 ? (completedTasks.length / dayTasks.length) * 100 : 0}
            status={completedTasks.length === dayTasks.length && dayTasks.length > 0 ? 'success' : 'active'}
            size="small"
          />
        </div>
      </Card>

      {/* 优先级分析 */}
      <Card title="优先级分布" size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="#ff4d4f" size="small">高优先级</Tag>
              <Text style={{ fontSize: '12px' }}>{highPriorityTasks.length} 个任务</Text>
            </Space>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {highPriorityTasks.reduce((sum, task) => sum + task.duration, 0).toFixed(1)}h
            </Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="#faad14" size="small">中优先级</Tag>
              <Text style={{ fontSize: '12px' }}>{mediumPriorityTasks.length} 个任务</Text>
            </Space>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {mediumPriorityTasks.reduce((sum, task) => sum + task.duration, 0).toFixed(1)}h
            </Text>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Tag color="#52c41a" size="small">低优先级</Tag>
              <Text style={{ fontSize: '12px' }}>{lowPriorityTasks.length} 个任务</Text>
            </Space>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {lowPriorityTasks.reduce((sum, task) => sum + task.duration, 0).toFixed(1)}h
            </Text>
          </div>
        </Space>
      </Card>

      {/* 工作亮点 */}
      {dailyStats.topTask && (
        <Alert
          message="今日主要任务"
          description={dailyStats.topTask}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 任务时间轴 */}
      <Card title="任务执行时间轴" size="small">
        {timelineData.length > 0 ? (
          <Timeline
            items={timelineData}
            mode="left"
            style={{ marginTop: '8px' }}
          />
        ) : (
          <Empty
            description="当天无任务记录"
            style={{ margin: '20px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default DailyWorkDetail;