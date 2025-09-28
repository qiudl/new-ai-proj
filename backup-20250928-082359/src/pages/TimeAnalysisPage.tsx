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
  DatePicker,
  Select,
  Table,
  Spin,
  Empty,
  Alert,
  message,
  Divider,
  Tooltip
} from 'antd';
import {
  ClockCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/plots';
import { useNavigate } from 'react-router-dom';
import { TimeManagementService } from '../services/timeManagementService';
import { Task } from '../types/task';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 时间范围选项
const TIME_RANGES = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '最近7天', value: 'last7days' },
  { label: '最近30天', value: 'last30days' },
  { label: '自定义', value: 'custom' }
];

// 分析维度选项
const ANALYSIS_DIMENSIONS = [
  { label: '按时间', value: 'time' },
  { label: '按项目', value: 'project' },
  { label: '按优先级', value: 'priority' },
  { label: '按状态', value: 'status' }
];

interface TimeStats {
  totalTasks: number;
  completedTasks: number;
  totalPlannedTime: number;
  totalActualTime: number;
  timeEfficiency: number;
  avgTaskDuration: number;
  onTimeCompletionRate: number;
}

interface TrendData {
  date: string;
  plannedTime: number;
  actualTime: number;
  efficiency: number;
  tasksCompleted: number;
}

interface ProjectStats {
  projectName: string;
  taskCount: number;
  completedCount: number;
  plannedTime: number;
  actualTime: number;
  efficiency: number;
}

const TimeAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('last7days');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [analysisDimension, setAnalysisDimension] = useState('time');
  
  // 数据状态
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  // 获取日期范围
  const getDateRange = () => {
    const today = dayjs();
    switch (timeRange) {
      case 'today':
        return [today.startOf('day'), today.endOf('day')];
      case 'week':
        return [today.startOf('week'), today.endOf('week')];
      case 'month':
        return [today.startOf('month'), today.endOf('month')];
      case 'last7days':
        return [today.subtract(6, 'day').startOf('day'), today.endOf('day')];
      case 'last30days':
        return [today.subtract(29, 'day').startOf('day'), today.endOf('day')];
      case 'custom':
        return customDateRange ? [customDateRange[0], customDateRange[1]] : [today.subtract(6, 'day'), today];
      default:
        return [today.subtract(6, 'day'), today];
    }
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = getDateRange();
      
      // 获取所有任务数据
      const allTasksResponse = await TimeManagementService.getAllTasks();
      
      // 根据日期范围筛选任务
      const filteredTasks = allTasksResponse.filter(task => {
        if (task.status === 'cancelled') return false;
        
        // 检查任务是否在指定日期范围内
        const taskDate = task.due_date ? dayjs(task.due_date) : 
                        task.updated_at ? dayjs(task.updated_at) :
                        dayjs(task.created_at);
        
        return taskDate.isBetween(startDate, endDate, 'day', '[]');
      });
      
      setAllTasks(filteredTasks);
      
      // 计算时间统计
      calculateTimeStats(filteredTasks);
      
      // 计算趋势数据
      calculateTrendData(filteredTasks, startDate, endDate);
      
      // 计算项目统计
      calculateProjectStats(filteredTasks);
      
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算时间统计
  const calculateTimeStats = (tasks: Task[]) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    
    let totalPlannedTime = 0;
    let totalActualTime = 0;
    
    tasks.forEach(task => {
      const planned = (task.estimated_hours || 0) * 60;
      const actual = ((task.actual_hours || 0) * 60) + ((task.total_time_seconds || 0) / 60);
      
      totalPlannedTime += planned;
      totalActualTime += actual;
    });
    
    const timeEfficiency = totalPlannedTime > 0 ? (totalActualTime / totalPlannedTime) * 100 : 100;
    const avgTaskDuration = completedTasks > 0 ? totalActualTime / completedTasks : 0;
    
    // 按时完成率
    const onTimeCompleted = tasks.filter(task => {
      if (task.status !== 'completed' || !task.due_date || !task.updated_at) return false;
      return dayjs(task.updated_at).isSameOrBefore(dayjs(task.due_date));
    }).length;
    
    const tasksWithDueDate = tasks.filter(task => task.due_date && task.status === 'completed').length;
    const onTimeCompletionRate = tasksWithDueDate > 0 ? (onTimeCompleted / tasksWithDueDate) * 100 : 100;
    
    setTimeStats({
      totalTasks,
      completedTasks,
      totalPlannedTime,
      totalActualTime,
      timeEfficiency,
      avgTaskDuration,
      onTimeCompletionRate
    });
  };

  // 计算趋势数据
  const calculateTrendData = (tasks: Task[], startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
    const trends: TrendData[] = [];
    const daysDiff = endDate.diff(startDate, 'day') + 1;
    
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = startDate.add(i, 'day');
      const dayTasks = tasks.filter(task => {
        const taskDate = task.due_date ? dayjs(task.due_date) : dayjs(task.updated_at || task.created_at);
        return taskDate.isSame(currentDate, 'day');
      });
      
      let plannedTime = 0;
      let actualTime = 0;
      const tasksCompleted = dayTasks.filter(task => task.status === 'completed').length;
      
      dayTasks.forEach(task => {
        plannedTime += (task.estimated_hours || 0) * 60;
        actualTime += ((task.actual_hours || 0) * 60) + ((task.total_time_seconds || 0) / 60);
      });
      
      const efficiency = plannedTime > 0 ? (actualTime / plannedTime) * 100 : 100;
      
      trends.push({
        date: currentDate.format('MM-DD'),
        plannedTime: Math.round(plannedTime),
        actualTime: Math.round(actualTime),
        efficiency: Math.round(efficiency),
        tasksCompleted
      });
    }
    
    setTrendData(trends);
  };

  // 计算项目统计
  const calculateProjectStats = async (tasks: Task[]) => {
    try {
      // 获取项目信息
      const response = await fetch('/api/v1/projects?page=1&page_size=100', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const projectsData = await response.json();
      const projects = projectsData.data || [];
      
      const stats: ProjectStats[] = [];
      
      projects.forEach((project: unknown) => {
        const projectTasks = tasks.filter(task => task.project_id === (project as any).id);
        
        if (projectTasks.length === 0) return;
        
        const taskCount = projectTasks.length;
        const completedCount = projectTasks.filter(task => task.status === 'completed').length;
        
        let plannedTime = 0;
        let actualTime = 0;
        
        projectTasks.forEach(task => {
          plannedTime += (task.estimated_hours || 0) * 60;
          actualTime += ((task.actual_hours || 0) * 60) + ((task.total_time_seconds || 0) / 60);
        });
        
        const efficiency = plannedTime > 0 ? (actualTime / plannedTime) * 100 : 100;
        
        stats.push({
          projectName: (project as any).name,
          taskCount,
          completedCount,
          plannedTime: Math.round(plannedTime),
          actualTime: Math.round(actualTime),
          efficiency: Math.round(efficiency)
        });
      });
      
      setProjectStats(stats.sort((a, b) => b.taskCount - a.taskCount));
    } catch (error) {
      console.error('获取项目统计失败:', error);
    }
  };

  // 初始化数据
  useEffect(() => {
    loadData();
  }, [timeRange, customDateRange]);

  // 格式化时间
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  // 获取效率等级
  const getEfficiencyLevel = (efficiency: number) => {
    if (efficiency <= 80) return { level: '高效', color: '#52c41a', icon: <TrophyOutlined /> };
    if (efficiency <= 110) return { level: '正常', color: '#1890ff', icon: <ClockCircleOutlined /> };
    if (efficiency <= 150) return { level: '偏慢', color: '#fa8c16', icon: <MinusOutlined /> };
    return { level: '需改进', color: '#ff4d4f', icon: <ArrowDownOutlined /> };
  };

  // 趋势图配置
  const trendChartConfig = {
    data: trendData,
    xField: 'date',
    yField: 'actualTime',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  // 效率柱状图配置
  const efficiencyChartConfig = {
    data: trendData,
    xField: 'date',
    yField: 'efficiency',
    color: ({ efficiency }: any) => {
      if (efficiency <= 80) return '#52c41a';
      if (efficiency <= 110) return '#1890ff';
      if (efficiency <= 150) return '#fa8c16';
      return '#ff4d4f';
    },
    label: {
      position: 'center' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    meta: {
      efficiency: { alias: '效率 (%)' },
    },
  };

  // 项目统计表格列
  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      ellipsis: true,
    },
    {
      title: '任务数',
      dataIndex: 'taskCount',
      key: 'taskCount',
      width: 80,
      render: (count: number) => <Text strong>{count}</Text>
    },
    {
      title: '完成数',
      dataIndex: 'completedCount',
      key: 'completedCount',
      width: 80,
      render: (count: number, record: ProjectStats) => (
        <Space>
          <Text strong style={{ color: '#52c41a' }}>{count}</Text>
          <Text type="secondary">({Math.round((count / record.taskCount) * 100)}%)</Text>
        </Space>
      )
    },
    {
      title: '计划时间',
      dataIndex: 'plannedTime',
      key: 'plannedTime',
      width: 120,
      render: (time: number) => formatTime(time)
    },
    {
      title: '实际时间',
      dataIndex: 'actualTime',
      key: 'actualTime',
      width: 120,
      render: (time: number) => formatTime(time)
    },
    {
      title: '时间效率',
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 100,
      render: (efficiency: number) => {
        const level = getEfficiencyLevel(efficiency);
        return (
          <Space>
            <Text style={{ color: level.color }}>{efficiency}%</Text>
            <Tag color={level.color}>{level.level}</Tag>
          </Space>
        );
      }
    }
  ];

  if (loading && !timeStats) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="加载数据中...">
          <div style={{ height: '300px' }} />
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题和工具栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <div>
                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  <BarChartOutlined /> 时间管理统计分析
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  深度分析时间使用效率，优化工作流程
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: 120 }}
                suffixIcon={<CalendarOutlined />}
              >
                {TIME_RANGES.map(range => (
                  <Option key={range.value} value={range.value}>
                    {range.label}
                  </Option>
                ))}
              </Select>
              
              {timeRange === 'custom' && (
                <RangePicker
                  value={customDateRange}
                  onChange={(dates) => setCustomDateRange(dates as [Dayjs, Dayjs] | null)}
                  style={{ width: 240 }}
                />
              )}
              
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadData}
                loading={loading}
              >
                刷新
              </Button>
              
              <Button 
                type="primary"
                icon={<ExportOutlined />}
                onClick={() => message.info('导出功能开发中...')}
              >
                导出报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {timeStats && (
        <>
          {/* 核心指标概览 */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="总任务数"
                  value={timeStats.totalTasks}
                  prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="个"
                />
                <div style={{ marginTop: '8px' }}>
                  <Progress 
                    percent={Math.round((timeStats.completedTasks / timeStats.totalTasks) * 100)} 
                    
                    strokeColor="#52c41a"
                    showInfo={false}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    完成 {timeStats.completedTasks} 个
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="计划时间"
                  value={formatTime(timeStats.totalPlannedTime)}
                  prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <Text type="secondary">
                    平均 {formatTime(timeStats.totalPlannedTime / (timeStats.totalTasks || 1))} /任务
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="实际时间"
                  value={formatTime(timeStats.totalActualTime)}
                  prefix={<ThunderboltOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16' }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <Text type="secondary">
                    平均 {formatTime(timeStats.avgTaskDuration)} /任务
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="时间效率"
                  value={Math.round(timeStats.timeEfficiency)}
                  prefix={getEfficiencyLevel(timeStats.timeEfficiency).icon}
                  valueStyle={{ color: getEfficiencyLevel(timeStats.timeEfficiency).color }}
                  suffix="%"
                />
                <div style={{ marginTop: '8px' }}>
                  <Tag color={getEfficiencyLevel(timeStats.timeEfficiency).color} style={{ fontSize: '12px' }}>
                    {getEfficiencyLevel(timeStats.timeEfficiency).level}
                  </Tag>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 详细统计 */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <span>按时完成率</span>
                      <Tooltip title="在截止日期前完成的任务比例">
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Tooltip>
                    </Space>
                  }
                  value={Math.round(timeStats.onTimeCompletionRate)}
                  valueStyle={{ 
                    color: timeStats.onTimeCompletionRate >= 80 ? '#52c41a' : 
                           timeStats.onTimeCompletionRate >= 60 ? '#fa8c16' : '#ff4d4f' 
                  }}
                  suffix="%"
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="时间节约"
                  value={formatTime(Math.abs(timeStats.totalPlannedTime - timeStats.totalActualTime))}
                  valueStyle={{ 
                    color: timeStats.totalActualTime <= timeStats.totalPlannedTime ? '#52c41a' : '#ff4d4f' 
                  }}
                  prefix={
                    timeStats.totalActualTime <= timeStats.totalPlannedTime ? 
                    <ArrowDownOutlined style={{ color: '#52c41a' }} /> :
                    <ArrowUpOutlined style={{ color: '#ff4d4f' }} />
                  }
                />
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <Text type="secondary">
                    {timeStats.totalActualTime <= timeStats.totalPlannedTime ? '节约了' : '超出了'} 
                    {Math.round(Math.abs(1 - timeStats.timeEfficiency / 100) * 100)}%
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="生产力指数"
                  value={Math.round((timeStats.completedTasks / timeStats.totalTasks) * (100 / (timeStats.timeEfficiency || 100)) * 100)}
                  valueStyle={{ color: '#722ed1' }}
                  prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
                />
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <Text type="secondary">
                    完成率 × 时间效率
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 图表分析 */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            {/* 时间效率趋势 */}
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <Space>
                    <LineChartOutlined />
                    <span>时间效率趋势</span>
                  </Space>
                }
                extra={
                  <Tooltip title="效率 = 实际时间 / 计划时间 × 100%">
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                }
              >
                {trendData.length > 0 ? (
                  <Column {...efficiencyChartConfig} height={300} />
                ) : (
                  <Empty description="暂无数据" style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
                )}
              </Card>
            </Col>
            
            {/* 任务完成趋势 */}
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <Space>
                    <BarChartOutlined />
                    <span>任务完成趋势</span>
                  </Space>
                }
              >
                {trendData.length > 0 ? (
                  <Line 
                    data={trendData}
                    xField="date"
                    yField="tasksCompleted"
                    point={{ size: 5, shape: 'diamond' }}
                    smooth={true}
                    height={300}
                    color="#52c41a"
                  />
                ) : (
                  <Empty description="暂无数据" style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
                )}
              </Card>
            </Col>
          </Row>

          {/* 项目统计表格 */}
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                <span>项目时间统计</span>
              </Space>
            }
            extra={
              <Button 
                type="link"
                onClick={() => navigate('/projects')}
              >
                查看所有项目
              </Button>
            }
          >
            {projectStats.length > 0 ? (
              <Table
                dataSource={projectStats}
                columns={projectColumns}
                rowKey="projectName"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            ) : (
              <Empty description="暂无项目数据" />
            )}
          </Card>

          {/* 分析建议 */}
          <Card style={{ marginTop: '24px' }} title="💡 分析建议">
            <Space direction="vertical" style={{ width: '100%' }}>
              {timeStats.timeEfficiency > 120 && (
                <Alert
                  type="warning"
                  message="时间预估偏乐观"
                  description="实际用时比预估时间多20%以上，建议重新评估任务复杂度，制定更实际的时间计划。"
                  showIcon
                />
              )}
              
              {timeStats.onTimeCompletionRate < 70 && (
                <Alert
                  type="error"
                  message="按时完成率偏低"
                  description="建议优化任务优先级管理，合理安排工作时间，或考虑调整任务截止日期。"
                  showIcon
                />
              )}
              
              {timeStats.timeEfficiency < 80 && timeStats.onTimeCompletionRate > 80 && (
                <Alert
                  type="success"
                  message="效率优秀"
                  description="时间利用效率很高，可以考虑承担更多任务或挑战更复杂的项目。"
                  showIcon
                />
              )}
              
              {timeStats.completedTasks === 0 && timeStats.totalTasks > 0 && (
                <Alert
                  type="info"
                  message="任务执行建议"
                  description="有待完成的任务，建议按优先级和截止日期合理安排执行顺序。"
                  showIcon
                />
              )}
            </Space>
          </Card>
        </>
      )}
    </div>
  );
};

export default TimeAnalysisPage;