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
  Divider,
  DatePicker,
  Table,
  Tabs,
  Calendar,
  Timeline,
  Select
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
  ArrowDownOutlined,
  DownloadOutlined,
  PrinterOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// 模拟数据类型定义
interface WeeklyStats {
  totalHours: number;
  completedTasks: number;
  totalTasks: number;
  efficiency: number;
  weekStart: string;
  weekEnd: string;
}

interface TaskTimeEntry {
  id: string;
  taskTitle: string;
  projectName: string;
  duration: number;
  date: string;
  status: 'completed' | 'in_progress' | 'todo';
  priority: 'high' | 'medium' | 'low';
}

interface DailyStats {
  date: string;
  totalHours: number;
  tasksCompleted: number;
  efficiency: number;
  topTask: string;
}

interface ProjectTimeStats {
  projectName: string;
  totalHours: number;
  tasksCount: number;
  completionRate: number;
  color: string;
}

const TimeWeeklyReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('week'),
    dayjs().endOf('week')
  ]);

  // 模拟数据
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalHours: 42.5,
    completedTasks: 28,
    totalTasks: 35,
    efficiency: 85,
    weekStart: dayjs().startOf('week').format('YYYY-MM-DD'),
    weekEnd: dayjs().endOf('week').format('YYYY-MM-DD')
  });

  const [taskTimeEntries, setTaskTimeEntries] = useState<TaskTimeEntry[]>([
    {
      id: '1',
      taskTitle: '前端界面优化',
      projectName: 'AI项目管理平台',
      duration: 8.5,
      date: '2025-01-27',
      status: 'completed',
      priority: 'high'
    },
    {
      id: '2',
      taskTitle: '数据库设计',
      projectName: '客户管理系统',
      duration: 6.0,
      date: '2025-01-26',
      status: 'completed',
      priority: 'medium'
    },
    {
      id: '3',
      taskTitle: 'API接口开发',
      projectName: 'AI项目管理平台',
      duration: 7.5,
      date: '2025-01-25',
      status: 'in_progress',
      priority: 'high'
    },
    {
      id: '4',
      taskTitle: '用户需求分析',
      projectName: '文档管理系统',
      duration: 4.0,
      date: '2025-01-24',
      status: 'completed',
      priority: 'low'
    }
  ]);

  const [dailyStats, setDailyStats] = useState<DailyStats[]>([
    { date: '2025-01-21', totalHours: 8.0, tasksCompleted: 4, efficiency: 90, topTask: '前端界面设计' },
    { date: '2025-01-22', totalHours: 7.5, tasksCompleted: 3, efficiency: 85, topTask: '后端API开发' },
    { date: '2025-01-23', totalHours: 9.0, tasksCompleted: 5, efficiency: 92, topTask: '数据库优化' },
    { date: '2025-01-24', totalHours: 8.5, tasksCompleted: 4, efficiency: 88, topTask: '用户需求分析' },
    { date: '2025-01-25', totalHours: 6.0, tasksCompleted: 2, efficiency: 75, topTask: 'API接口开发' },
    { date: '2025-01-26', totalHours: 3.5, tasksCompleted: 1, efficiency: 70, topTask: '数据库设计' },
    { date: '2025-01-27', totalHours: 0, tasksCompleted: 0, efficiency: 0, topTask: '休息日' }
  ]);

  const [projectStats, setProjectStats] = useState<ProjectTimeStats[]>([
    { projectName: 'AI项目管理平台', totalHours: 24.0, tasksCount: 12, completionRate: 85, color: '#1890ff' },
    { projectName: '客户管理系统', totalHours: 15.5, tasksCount: 8, completionRate: 92, color: '#52c41a' },
    { projectName: '文档管理系统', totalHours: 8.0, tasksCount: 5, completionRate: 78, color: '#fa8c16' }
  ]);

  // 计算周统计
  const weekSummary = useMemo(() => {
    const totalDaysWorked = dailyStats.filter(day => day.totalHours > 0).length;
    const avgHoursPerDay = weeklyStats.totalHours / totalDaysWorked || 0;
    const avgEfficiency = dailyStats.reduce((sum, day) => sum + day.efficiency, 0) / dailyStats.length;
    const bestDay = dailyStats.reduce((max, day) => day.efficiency > max.efficiency ? day : max, dailyStats[0]);
    
    return {
      totalDaysWorked,
      avgHoursPerDay,
      avgEfficiency,
      bestDay,
      completionRate: (weeklyStats.completedTasks / weeklyStats.totalTasks) * 100
    };
  }, [weeklyStats, dailyStats]);

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

  // 导出报告
  const handleExportReport = () => {
    message.success('报告导出成功！');
  };

  // 打印报告
  const handlePrintReport = () => {
    window.print();
  };

  // 时间轴数据
  const timelineData = useMemo(() => {
    return taskTimeEntries.map(entry => ({
      color: entry.status === 'completed' ? 'green' : entry.status === 'in_progress' ? 'blue' : 'gray',
      children: (
        <div>
          <Space direction="vertical" size="small">
            <Text strong>{entry.taskTitle}</Text>
            <Text type="secondary">{entry.projectName}</Text>
            <Space>
              <Tag color={getPriorityColor(entry.priority)}>
                {entry.priority === 'high' ? '高' : entry.priority === 'medium' ? '中' : '低'}优先级
              </Tag>
              {getStatusTag(entry.status)}
              <Text>{entry.duration}小时</Text>
            </Space>
          </Space>
        </div>
      )
    }));
  }, [taskTimeEntries]);

  // 日历数据
  const getCalendarData = (value: dayjs.Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayData = dailyStats.find(day => day.date === dateStr);
    if (!dayData || dayData.totalHours === 0) return null;
    
    return {
      type: dayData.efficiency >= 85 ? 'success' : dayData.efficiency >= 70 ? 'warning' : 'error',
      content: `${dayData.totalHours}h`
    };
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题和操作 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: '8px' }} />
            时间周报
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            {selectedDateRange[0].format('MM月DD日')} - {selectedDateRange[1].format('MM月DD日')} 工作总结
          </Text>
        </div>
        <Space>
          <RangePicker
            value={selectedDateRange}
            onChange={(dates) => dates && setSelectedDateRange(dates as [Dayjs, Dayjs])}
            format="MM-DD"
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>
            刷新
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
            导出
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
            打印
          </Button>
        </Space>
      </div>

      {/* 核心统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总工作时长"
              value={weeklyStats.totalHours}
              suffix="小时"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                日均 {weekSummary.avgHoursPerDay.toFixed(1)} 小时
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="任务完成率"
              value={weekSummary.completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                {weeklyStats.completedTasks}/{weeklyStats.totalTasks} 个任务
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="工作效率"
              value={weekSummary.avgEfficiency}
              suffix="%"
              prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                最佳: {weekSummary.bestDay?.date && dayjs(weekSummary.bestDay.date).format('MM-DD')}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="工作天数"
              value={weekSummary.totalDaysWorked}
              suffix="天"
              prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                连续工作周
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 详细分析标签页 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><BarChartOutlined />概览分析</span>} key="overview">
            <Row gutter={[16, 16]}>
              {/* 每日工作统计 */}
              <Col xs={24} lg={12}>
                <Card title="每日工作统计" size="small">
                  <Table
                    dataSource={dailyStats}
                    rowKey="date"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '日期',
                        dataIndex: 'date',
                        render: (date) => dayjs(date).format('MM-DD dddd')
                      },
                      {
                        title: '工作时长',
                        dataIndex: 'totalHours',
                        render: (hours) => `${hours}h`
                      },
                      {
                        title: '完成任务',
                        dataIndex: 'tasksCompleted',
                        render: (count) => <Badge count={count} showZero />
                      },
                      {
                        title: '效率',
                        dataIndex: 'efficiency',
                        render: (efficiency) => (
                          <Progress
                            percent={efficiency}
                            size="small"
                            status={efficiency >= 85 ? 'success' : efficiency >= 70 ? 'active' : 'exception'}
                            showInfo={false}
                          />
                        )
                      }
                    ]}
                  />
                </Card>
              </Col>

              {/* 项目时间分布 */}
              <Col xs={24} lg={12}>
                <Card title="项目时间分布" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {projectStats.map((project, index) => (
                      <div key={index}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <Text strong>{project.projectName}</Text>
                          <Text>{project.totalHours}h</Text>
                        </div>
                        <Progress
                          percent={(project.totalHours / weeklyStats.totalHours) * 100}
                          strokeColor={project.color}
                          showInfo={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                          <span>{project.tasksCount} 个任务</span>
                          <span>完成率 {project.completionRate}%</span>
                        </div>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>

              {/* 工作亮点 */}
              <Col xs={24}>
                <Card title="本周亮点" size="small">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                      <Alert
                        message="最高效的一天"
                        description={
                          <div>
                            <Text strong>{dayjs(weekSummary.bestDay?.date).format('MM月DD日')}</Text>
                            <br />
                            <Text>效率达到 {weekSummary.bestDay?.efficiency}%</Text>
                            <br />
                            <Text type="secondary">主要任务: {weekSummary.bestDay?.topTask}</Text>
                          </div>
                        }
                        type="success"
                        showIcon
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Alert
                        message="工作时长统计"
                        description={
                          <div>
                            <Text>总计 {weeklyStats.totalHours} 小时</Text>
                            <br />
                            <Text>超出计划 2.5 小时</Text>
                            <br />
                            <Text type="secondary">建议合理安排工作量</Text>
                          </div>
                        }
                        type="info"
                        showIcon
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Alert
                        message="任务完成情况"
                        description={
                          <div>
                            <Text>完成率 {weekSummary.completionRate.toFixed(0)}%</Text>
                            <br />
                            <Text>超额完成 3 个任务</Text>
                            <br />
                            <Text type="secondary">表现优秀</Text>
                          </div>
                        }
                        type="warning"
                        showIcon
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span><LineChartOutlined />任务时间轴</span>} key="timeline">
            <Card title="任务执行时间轴" size="small">
              <Timeline items={timelineData} />
            </Card>
          </TabPane>

          <TabPane tab={<span><CalendarOutlined />工作日历</span>} key="calendar">
            <Card title="工作日历视图" size="small">
              <Calendar
                value={currentWeek}
                onChange={setCurrentWeek}
                cellRender={(value) => {
                  const data = getCalendarData(value);
                  return data ? (
                    <Badge
                      status={data.type as any}
                      text={data.content}
                    />
                  ) : null;
                }}
              />
            </Card>
          </TabPane>

          <TabPane tab={<span><TeamOutlined />团队对比</span>} key="team">
            <Card title="团队工作效率对比" size="small">
              <Empty description="团队数据正在开发中..." />
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default TimeWeeklyReportPage;