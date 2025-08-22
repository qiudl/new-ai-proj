import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Typography, Space, Progress } from 'antd';
import { BarChartOutlined, PieChartOutlined, LineChartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import personalTimerService from '../services/personalTimerService';

const { Title, Text } = Typography;
const { Option } = Select;

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
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

const TimerAnalyticsCharts: React.FC<TimerAnalyticsChartsProps> = ({
  timeRange = '7days',
  onTimeRangeChange
}) => {
  const [chartData, setChartData] = useState<ChartData>({
    categories: [],
    weeklyTrend: [],
    hourlyDistribution: [],
    taskEfficiency: []
  });

  // 从后端获取真实数据
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const data: any = await personalTimerService.getAnalytics({ range: timeRange });
        const totalSeconds: number = (data && data.total_time && data.total_time.total_seconds) || 0;

        const categories = (data?.category_breakdown || []).map((c: any) => ({
          name: c.category || '未分类',
          value: c.total_seconds || 0,
          color: c.color || '#1890ff',
          percentage: typeof c.percentage === 'number'
            ? Math.round(c.percentage)
            : (totalSeconds ? Math.round((c.total_seconds / totalSeconds) * 100) : 0)
        }));

        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weeklyTrend = (data?.weekly_trend || []).map((w: any) => {
          const dateStr = w.week_start || w.date || w.day;
          const d = dayjs(dateStr);
          return {
            day: dayNames[d.day()],
            value: w.total_seconds || 0,
            sessions: w.sessions_count || 0,
          };
        });

        const hourlyDistribution = (data?.hourly_distribution || []).map((h: any) => ({
          hour: h.hour,
          value: h.total_seconds || 0,
        }));

        const taskEfficiency = (data?.task_efficiency || []).map((t: any) => ({
          taskName: t.task_name,
          totalTime: t.total_time || 0,
          targetTime: t.target_time || 0,
          efficiency: t.efficiency || 0,
        }));

        const chart: ChartData = {
          categories,
          weeklyTrend,
          hourlyDistribution,
          taskEfficiency,
        };

        if (isMounted) setChartData(chart);
      } catch (err) {
        // 出错时使用空数据避免展示错误的模拟数据
        if (isMounted) setChartData({ categories: [], weeklyTrend: [], hourlyDistribution: [], taskEfficiency: [] });
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [timeRange]);

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
                  {Math.floor(item.value / 60)}m
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
    const chartHeight = 120;
    const chartWidth = 300;
    
    // 生成路径点
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth + 25;
      const y = chartHeight - (item.value / maxValue) * chartHeight + 20;
      return { x, y, value: item.value, hour: item.hour };
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
              <text
                x={point.x}
                y={chartHeight + 35}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                {point.hour}:00
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div>
      {/* 时间范围选择 */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Text>时间范围：</Text>
          <Select
            value={timeRange}
            onChange={onTimeRangeChange}
            style={{ width: 120 }}
          >
            <Option value="7days">最近7天</Option>
            <Option value="30days">最近30天</Option>
            <Option value="90days">最近3个月</Option>
          </Select>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* 分类分布饼图 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <PieChartOutlined />
                <span>分类分布</span>
              </Space>
            }
          >
            <PieChart data={chartData.categories} />
          </Card>
        </Col>

        {/* 每周趋势柱状图 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>每周趋势</span>
              </Space>
            }
          >
            <BarChart data={chartData.weeklyTrend} />
          </Card>
        </Col>

        {/* 时段分布折线图 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <LineChartOutlined />
                <span>时段分布</span>
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
              {chartData.taskEfficiency.map((task, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <Title level={5} style={{ margin: '0 0 8px 0' }}>
                      {task.taskName}
                    </Title>
                    <Progress
                      type="circle"
                      percent={task.efficiency}
                      size={80}
                      strokeColor={
                        task.efficiency >= 100 ? '#52c41a' :
                        task.efficiency >= 75 ? '#1890ff' :
                        task.efficiency >= 50 ? '#faad14' : '#ff4d4f'
                      }
                    />
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {Math.floor(task.totalTime / 3600)}h {Math.floor((task.totalTime % 3600) / 60)}m
                        / {Math.floor(task.targetTime / 3600)}h {Math.floor((task.targetTime % 3600) / 60)}m
                      </Text>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TimerAnalyticsCharts;