import React, { useMemo } from 'react';
import { Card, Row, Col, Typography, Space, Progress } from 'antd';
import { BarChartOutlined, PieChartOutlined, LineChartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { WeeklyStats, DailyStats, TaskTimeEntry, ProjectTimeStats } from '../services/weeklyReportService';

const { Title, Text } = Typography;

interface ChartData {
  categories: {
    name: string;
    value: number;
    color: string;
    percentage: number;
  }[];
  weeklyTrend: {
    day: string;
    value: number;
    sessions: number;
  }[];
  hourlyDistribution: {
    hour: number;
    value: number;
  }[];
  taskEfficiency: {
    taskName: string;
    totalTime: number;
    targetTime: number;
    efficiency: number;
  }[];
}

interface TimerAnalyticsChartsProps {
  weeklyStats: WeeklyStats;
  dailyStats: DailyStats[];
  taskTimeEntries: TaskTimeEntry[];
  projectStats: ProjectTimeStats[];
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

const TimerAnalyticsCharts: React.FC<TimerAnalyticsChartsProps> = ({
  weeklyStats,
  dailyStats,
  taskTimeEntries,
  projectStats,
  dateRange
}) => {

  // 基于props数据计算图表数据
  const chartData = useMemo(() => {
    // 项目分布饼图数据
    const categories = projectStats
      .filter(project => project.totalHours > 0) // 过滤掉无时长的项目
      .map(project => ({
        name: project.projectName || '未命名项目',
        value: project.totalHours * 3600, // 转换为秒
        color: project.color || '#1890ff',
        percentage: Math.round((project.totalHours / Math.max(weeklyStats.totalHours, 0.01)) * 100)
      }));

    // 如果没有项目数据，但有任务数据，创建任务状态分布
    const statusCategories = categories.length === 0 && taskTimeEntries.length > 0 ? (() => {
      const statusGroups = taskTimeEntries.reduce((acc, task) => {
        const status = task.status || 'unknown';
        acc[status] = (acc[status] || 0) + task.duration;
        return acc;
      }, {} as Record<string, number>);
      
      const statusColors = {
        completed: '#52c41a',
        in_progress: '#1890ff', 
        todo: '#faad14',
        unknown: '#d9d9d9'
      };
      
      const statusNames = {
        completed: '已完成',
        in_progress: '进行中',
        todo: '待办',
        unknown: '未知'
      };
      
      const totalHours = Object.values(statusGroups).reduce((sum, hours) => sum + hours, 0);
      
      return Object.entries(statusGroups).map(([status, hours]) => ({
        name: statusNames[status as keyof typeof statusNames] || status,
        value: hours * 3600,
        color: statusColors[status as keyof typeof statusColors] || '#d9d9d9',
        percentage: Math.round((hours / Math.max(totalHours, 0.01)) * 100)
      }));
    })() : [];
    
    const finalCategories = categories.length > 0 ? categories : statusCategories;

    // 每日工作时长趋势
    const weeklyTrend = dailyStats
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
      .map(day => ({
        day: dayjs(day.date).format('MM-DD'),
        value: day.totalHours * 3600, // 转换为秒
        sessions: day.tasksCompleted
      }));

    // 效率趋势数据（替代小时分布）
    const hourlyDistribution = dailyStats
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
      .map((day, index) => ({
        hour: index, // 使用索引作为x轴
        value: day.efficiency,
        date: day.date,
        dayName: dayjs(day.date).format('MM-DD')
      }));

    // 任务效率分析
    const validTasks = taskTimeEntries.filter(task => task.duration > 0 && task.taskTitle);
    const avgDuration = validTasks.length > 0 
      ? validTasks.reduce((sum, task) => sum + task.duration, 0) / validTasks.length 
      : 0;
    
    const taskEfficiency = validTasks
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 8) // 只显示前8个任务
      .map(task => {
        // 效率计算：基于任务时长相对于平均值的表现
        // 效率 = 100 - |实际时长 - 平均时长| / 平均时长 * 50
        // 时长越接近平均值，效率越高
        let efficiency = 0;
        if (avgDuration > 0) {
          const deviation = Math.abs(task.duration - avgDuration) / avgDuration;
          efficiency = Math.max(0, Math.min(100, Math.round(100 - deviation * 50)));
        }
        
        // 特殊情况：如果任务时长远低于平均值，认为高效率
        if (task.duration < avgDuration * 0.5 && task.duration > 0) {
          efficiency = Math.min(100, efficiency + 20);
        }
        
        return {
          taskName: task.taskTitle.length > 15 
            ? `${task.taskTitle.slice(0, 15)}...` 
            : task.taskTitle,
          totalTime: task.duration * 3600,
          targetTime: avgDuration * 3600,
          efficiency
        };
      });

    return {
      categories: finalCategories,
      weeklyTrend,
      hourlyDistribution,
      taskEfficiency
    };
  }, [weeklyStats, dailyStats, taskTimeEntries, projectStats]);

  // 饼图组件
  const PieChart: React.FC<{ data: ChartData['categories'] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (!data.length || total <= 0) {
      return (
        <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
          无数据
        </div>
      );
    }
    let currentAngle = 0;
    
    const center = 100;
    const radius = 80;
    
    return (
      <div style={{ textAlign: 'center' }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const angle = (item.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            // 计算路径
            const startX = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${center} ${center}`,
              `L ${startX} ${startY}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              'Z'
            ].join(' ');
            
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
          {/* 中心圆 */}
          <circle cx={center} cy={center} r="40" fill="white" />
          <text x={center} y={center - 10} textAnchor="middle" fontSize="14" fontWeight="bold">
            总计时
          </text>
          <text x={center} y={center + 10} textAnchor="middle" fontSize="12" fill="#666">
            {Math.floor(total / 3600)}h {Math.floor((total % 3600) / 60)}m
          </text>
        </svg>
        
        {/* 图例 */}
        <div style={{ marginTop: '16px' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: item.color,
                  borderRadius: '50%',
                  marginRight: '8px'
                }}
              />
              <Text style={{ fontSize: '12px' }}>
                {item.name} ({item.percentage}%)
              </Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 柱状图组件
  const BarChart: React.FC<{ data: ChartData['weeklyTrend'] }> = ({ data }) => {
    if (!data.length) {
      return <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>无数据</div>;
    }
    const maxValue = Math.max(...data.map(item => item.value));
    if (maxValue <= 0) {
      return <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>无时长数据</div>;
    }
    const chartHeight = 120;
    
    return (
      <div style={{ padding: '16px' }}>
        <svg width="100%" height={chartHeight + 40} viewBox="0 0 350 160">
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = index * 45 + 20;
            const y = chartHeight - barHeight + 20;
            
            return (
              <g key={index}>
                {/* 柱子 */}
                <rect
                  x={x}
                  y={y}
                  width="30"
                  height={barHeight}
                  fill="#1890ff"
                  rx="2"
                />
                {/* 数值标签 */}
                <text
                  x={x + 15}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  {item.value >= 3600 
                    ? `${Math.floor(item.value / 3600)}h${Math.floor((item.value % 3600) / 60)}m`
                    : `${Math.floor(item.value / 60)}m`
                  }
                </text>
                {/* X轴标签 */}
                <text
                  x={x + 15}
                  y={chartHeight + 35}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                >
                  {item.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // 折线图组件
  const LineChart: React.FC<{ data: ChartData['hourlyDistribution'] }> = ({ data }) => {
    if (!data.length) {
      return <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>无数据</div>;
    }
    const maxValue = Math.max(...data.map(item => item.value));
    if (maxValue <= 0) {
      return <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>无数据</div>;
    }
    const chartHeight = 120;
    const chartWidth = 300;
    
    // 生成路径点
    const points = data.map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * chartWidth + 25;
      const y = chartHeight - (item.value / maxValue) * chartHeight + 20;
      return { 
        x, 
        y, 
        value: item.value, 
        hour: item.hour,
        dayName: (item as any).dayName || `Day${item.hour + 1}`
      };
    });
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    
    return (
      <div style={{ padding: '16px' }}>
        <svg width="100%" height={chartHeight + 40} viewBox="0 0 350 160">
          {/* 网格线 */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = chartHeight - (percent / 100) * chartHeight + 20;
            return (
              <line
                key={percent}
                x1="25"
                y1={y}
                x2={chartWidth + 25}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            );
          })}
          
          {/* 折线 */}
          <path
            d={pathData}
            stroke="#1890ff"
            strokeWidth="2"
            fill="none"
          />
          
          {/* 数据点 */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#1890ff"
                stroke="white"
                strokeWidth="2"
              />
              {/* 效率值显示 */}
              <text
                x={point.x}
                y={point.y - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#1890ff"
                fontWeight="bold"
              >
                {Math.round(point.value)}%
              </text>
              {/* 日期标签 */}
              <text
                x={point.x}
                y={chartHeight + 35}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                {point.dayName}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div>
      {/* 时间范围显示 */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Text>时间范围：</Text>
          <Text strong>
            {dateRange[0].format('MM月DD日')} - {dateRange[1].format('MM月DD日')}
          </Text>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* 项目分布饼图 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <PieChartOutlined />
                <span>项目分布</span>
              </Space>
            }
          >
            <PieChart data={chartData.categories} />
          </Card>
        </Col>

        {/* 每日时长趋势 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>每日时长</span>
              </Space>
            }
          >
            <BarChart data={chartData.weeklyTrend} />
          </Card>
        </Col>

        {/* 效率趋势折线图 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <LineChartOutlined />
                <span>效率趋势</span>
              </Space>
            }
          >
            <LineChart data={chartData.hourlyDistribution} />
          </Card>
        </Col>
      </Row>

      {/* 任务效率分析 */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>任务效率分析</span>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              {chartData.taskEfficiency.length === 0 ? (
                <Col span={24}>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#999',
                    background: '#fafafa',
                    borderRadius: '8px'
                  }}>
                    <ClockCircleOutlined style={{ fontSize: '32px', marginBottom: '16px' }} />
                    <div>暂无任务数据</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      完成一些任务后将显示效率分析
                    </div>
                  </div>
                </Col>
              ) : (
                chartData.taskEfficiency.map((task, index) => (
                  <Col xs={24} sm={12} md={6} key={index}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <Title level={5} style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                        {task.taskName}
                      </Title>
                      <Progress
                        type="circle"
                        percent={task.efficiency}
                        size={80}
                        strokeColor={
                          task.efficiency >= 80 ? '#52c41a' :
                          task.efficiency >= 60 ? '#1890ff' :
                          task.efficiency >= 40 ? '#faad14' : '#ff4d4f'
                        }
                      />
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          实际: {Math.floor(task.totalTime / 3600)}h {Math.floor((task.totalTime % 3600) / 60)}m
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          平均: {Math.floor(task.targetTime / 3600)}h {Math.floor((task.targetTime % 3600) / 60)}m
                        </Text>
                      </div>
                    </div>
                  </Col>
                ))
              )}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TimerAnalyticsCharts;