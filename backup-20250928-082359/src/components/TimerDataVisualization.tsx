// Phase 3: 数据可视化组件 - 计时数据分析图表展示
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Tabs, Spin, message, Row, Col, Statistic, Progress, Tag, Button, Tooltip, Typography } from 'antd';
import { 
  ClockCircleOutlined, 
  TrophyOutlined, 
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
// Temporarily disable echarts imports until dependency issues are resolved
// import ChartPlaceholder from 'echarts-for-react';
// import * as echarts from 'echarts';
import timerDataAnalyticsService, { 
  TimerAnalyticsData, 
  ProjectTimeStats, 
  WeeklyTrendData,
  EfficiencyMetrics 
} from '../services/timerDataAnalytics';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Text } = Typography;

// Temporary placeholder component for charts until echarts issues are resolved
const ChartPlaceholder: React.FC<{ title: string; height?: string | number }> = ({ title, height = 300 }) => (
  <div 
    style={{ 
      height: height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px dashed #d9d9d9',
      borderRadius: '6px',
      background: '#fafafa',
      flexDirection: 'column',
      gap: '8px'
    }}
  >
    <BarChartOutlined style={{ fontSize: '24px', color: '#8c8c8c' }} />
    <Text type="secondary">{title} 图表</Text>
    <Text type="secondary" style={{ fontSize: '12px' }}>图表功能开发中...</Text>
  </div>
);

interface TimerDataVisualizationProps {
  height?: string | number;
  style?: React.CSSProperties;
  compactMode?: boolean;
  showTabs?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // 秒
}

const TimerDataVisualization: React.FC<TimerDataVisualizationProps> = ({
  height = "100%",
  style,
  compactMode = false,
  showTabs = true,
  autoRefresh = true,
  refreshInterval = 300 // 5分钟
}) => {
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<TimerAnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [error, setError] = useState<string | null>(null);

  // 加载分析数据
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await timerDataAnalyticsService.getAnalyticsData();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setError('加载数据失败');
      message.error('加载分析数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 手动刷新
  const handleRefresh = useCallback(() => {
    timerDataAnalyticsService.clearCache();
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // 初始加载和自动刷新
  useEffect(() => {
    loadAnalyticsData();
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadAnalyticsData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [loadAnalyticsData, autoRefresh, refreshInterval]);

  // 今日项目分布饼图配置
  const projectDistributionOption = useMemo(() => {
    if (!analyticsData?.today_stats.project_distribution) return null;

    const data = analyticsData.today_stats.project_distribution.map(item => ({
      name: item.project_name,
      value: item.total_seconds,
      itemStyle: { color: item.color }
    }));

    return {
      title: {
        text: '今日时间分配',
        left: 'center',
        textStyle: { fontSize: compactMode ? 14 : 16 }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const duration = timerDataAnalyticsService.formatDuration(params.value);
          const percentage = params.percent;
          return `${params.name}<br/>时长: ${duration}<br/>占比: ${percentage}%`;
        }
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        textStyle: { fontSize: compactMode ? 10 : 12 }
      },
      series: [
        {
          name: '时间分配',
          type: 'pie',
          radius: compactMode ? ['30%', '60%'] : ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: compactMode ? 16 : 20,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data
        }
      ]
    };
  }, [analyticsData, compactMode]);

  // 每小时工作模式柱状图配置
  const hourlyPatternOption = useMemo(() => {
    if (!analyticsData?.today_stats.hourly_pattern) return null;

    const hours = analyticsData.today_stats.hourly_pattern.map(item => `${item.hour}:00`);
    const workTime = analyticsData.today_stats.hourly_pattern.map(item => 
      Math.round(item.total_seconds / 60)
    );
    const efficiency = analyticsData.today_stats.hourly_pattern.map(item => item.avg_efficiency);

    return {
      title: {
        text: '今日工作模式',
        left: 'center',
        textStyle: { fontSize: compactMode ? 14 : 16 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['工作时长(分钟)', '效率评分'],
        top: 30
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          interval: compactMode ? 3 : 1,
          fontSize: compactMode ? 10 : 12
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '时长(分钟)',
          position: 'left',
          nameTextStyle: { fontSize: compactMode ? 10 : 12 }
        },
        {
          type: 'value',
          name: '效率评分',
          position: 'right',
          nameTextStyle: { fontSize: compactMode ? 10 : 12 },
          max: 100
        }
      ],
      series: [
        {
          name: '工作时长(分钟)',
          type: 'bar',
          data: workTime,
          itemStyle: { color: '#1890ff' }
        },
        {
          name: '效率评分',
          type: 'line',
          yAxisIndex: 1,
          data: efficiency,
          itemStyle: { color: '#52c41a' },
          lineStyle: { width: 2 }
        }
      ]
    };
  }, [analyticsData, compactMode]);

  // 周度趋势折线图配置
  const weeklyTrendOption = useMemo(() => {
    if (!analyticsData?.weekly_trend) return null;

    const dates = analyticsData.weekly_trend.map(item => dayjs(item.date).format('MM/DD'));
    const actualTime = analyticsData.weekly_trend.map(item => Math.round(item.total_seconds / 3600 * 10) / 10);
    const plannedTime = analyticsData.weekly_trend.map(item => Math.round(item.planned_seconds / 3600 * 10) / 10);
    const efficiency = analyticsData.weekly_trend.map(item => item.efficiency_score);

    return {
      title: {
        text: '7天工作趋势',
        left: 'center',
        textStyle: { fontSize: compactMode ? 14 : 16 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['实际工时', '计划工时', '效率评分'],
        top: 30
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: compactMode ? 10 : 12 }
      },
      yAxis: [
        {
          type: 'value',
          name: '工时(小时)',
          position: 'left',
          nameTextStyle: { fontSize: compactMode ? 10 : 12 }
        },
        {
          type: 'value',
          name: '效率评分',
          position: 'right',
          nameTextStyle: { fontSize: compactMode ? 10 : 12 },
          max: 100
        }
      ],
      series: [
        {
          name: '实际工时',
          type: 'bar',
          data: actualTime,
          itemStyle: { color: '#1890ff' }
        },
        {
          name: '计划工时',
          type: 'bar',
          data: plannedTime,
          itemStyle: { color: '#f0f0f0', borderColor: '#d9d9d9', borderWidth: 1 }
        },
        {
          name: '效率评分',
          type: 'line',
          yAxisIndex: 1,
          data: efficiency,
          itemStyle: { color: '#52c41a' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    };
  }, [analyticsData, compactMode]);

  // 渲染今日统计卡片
  const renderTodayStatsCards = () => {
    if (!analyticsData) return null;

    const { today_stats } = analyticsData;
    
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card  style={{ textAlign: 'center' }}>
            <Statistic
              title="今日工时"
              value={timerDataAnalyticsService.formatDuration(today_stats.total_seconds)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: compactMode ? '16px' : '20px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card  style={{ textAlign: 'center' }}>
            <Statistic
              title="完成会话"
              value={today_stats.session_count}
              suffix="次"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: compactMode ? '16px' : '20px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card  style={{ textAlign: 'center' }}>
            <Statistic
              title="效率评分"
              value={today_stats.efficiency_score}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ 
                color: today_stats.efficiency_score >= 80 ? '#52c41a' : 
                       today_stats.efficiency_score >= 60 ? '#faad14' : '#ff4d4f',
                fontSize: compactMode ? '16px' : '20px'
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card  style={{ textAlign: 'center' }}>
            <div style={{ fontSize: compactMode ? '12px' : '14px', color: '#8c8c8c', marginBottom: '8px' }}>
              目标达成
            </div>
            <Progress
              type="circle"
              percent={Math.round((today_stats.total_seconds / today_stats.planned_seconds) * 100)}
              size={compactMode ? 60 : 80}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染效率指标
  const renderEfficiencyMetrics = () => {
    if (!analyticsData?.efficiency_metrics) return null;

    const metrics = analyticsData.efficiency_metrics;
    
    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card >
              <Statistic
                title="整体效率"
                value={metrics.overall_efficiency}
                suffix="%"
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ marginTop: 8 }}>
                <Tag color={metrics.overall_efficiency >= 80 ? 'green' : 'orange'}>
                  {timerDataAnalyticsService.formatEfficiencyScore(metrics.overall_efficiency)}
                </Tag>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card >
              <Statistic
                title="专注指数"
                value={metrics.focus_index}
                suffix="%"
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ marginTop: 8 }}>
                <Tag color={metrics.focus_index >= 80 ? 'green' : 'orange'}>
                  {timerDataAnalyticsService.getFocusLevelDescription(metrics.focus_index)}
                </Tag>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card >
              <Statistic
                title="一致性"
                value={metrics.consistency_score}
                suffix="%"
                prefix={<LineChartOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ marginTop: 8 }}>
                <Tag color={metrics.productivity_trend === 'increasing' ? 'green' : 'blue'}>
                  {metrics.productivity_trend === 'increasing' ? '上升趋势' : 
                   metrics.productivity_trend === 'stable' ? '稳定' : '下降趋势'}
                </Tag>
              </div>
            </Card>
          </Col>
        </Row>
        
        <Card  title="工作建议" style={{ fontSize: compactMode ? '12px' : '14px' }}>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {analyticsData.task_completion_analysis.improvement_suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>{suggestion}</li>
            ))}
          </ul>
        </Card>
      </div>
    );
  };

  if (error) {
    return (
      <Card 
        title="📊 数据分析" 
        style={{ height, ...style }}
        extra={
          <Button  icon={<ReloadOutlined />} onClick={handleRefresh}>
            重试
          </Button>
        }
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ color: '#ff4d4f', marginBottom: '16px' }}>
            {error}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="📊 数据分析" 
      style={{ height, ...style }}
      extra={
        <Tooltip title="刷新数据">
          <Button 
             
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          />
        </Tooltip>
      }
      styles={{
        body: { 
          padding: compactMode ? '12px' : '24px',
          height: 'calc(100% - 57px)',
          overflow: 'auto'
        }
      }}
    >
      <Spin spinning={loading}>
        {showTabs ? (
            <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size={compactMode ? 'small' : 'middle'}
            items={[
              {
                key: 'today',
                label: (
                  <span>
                    <PieChartOutlined />
                    今日分析
                  </span>
                ),
                children: (
                  <div>
                    {renderTodayStatsCards()}
                    <Row gutter={16}>
                      <Col span={12}>
                        <ChartPlaceholder
                          title="项目时间分布"
                          height={compactMode ? '200px' : '300px'}
                        />
                      </Col>
                      <Col span={12}>
                        <ChartPlaceholder
                          title="每小时效率分布"
                          height={compactMode ? '200px' : '300px'}
                        />
                      </Col>
                    </Row>
                  </div>
                )
              },
              {
                key: 'trend',
                label: (
                  <span>
                    <LineChartOutlined />
                    趋势分析
                  </span>
                ),
                children: (
                  <div>
                    <ChartPlaceholder
                      title="每周时间趋势"
                      height={compactMode ? '300px' : '400px'}
                    />
                  </div>
                )
              },
              {
                key: 'efficiency',
                label: (
                  <span>
                    <BarChartOutlined />
                    效率分析
                  </span>
                ),
                children: renderEfficiencyMetrics()
              }
            ]}
          />
        ) : (
          // 不显示Tabs时，直接显示今日分析
          <div>
            {renderTodayStatsCards()}
            <Row gutter={16}>
              <Col span={12}>
                <ChartPlaceholder
                  title="项目时间分布"
                  height={compactMode ? '200px' : '300px'}
                />
              </Col>
              <Col span={12}>
                <ChartPlaceholder
                  title="每小时效率分布"
                  height={compactMode ? '200px' : '300px'}
                />
              </Col>
            </Row>
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default TimerDataVisualization;