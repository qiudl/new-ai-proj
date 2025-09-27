import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Progress,
  Space,
  Statistic,
  Tag,
  Alert
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { EfficiencyTrends, EfficiencyChartData } from '../types/dailyEfficiency';

const { Title, Text } = Typography;

interface EfficiencyTrendsCardProps {
  trends: EfficiencyTrends & {
    trend_indicators: {
      efficiency: 'up' | 'down' | 'stable';
      hours: 'up' | 'down' | 'stable';
      tasks: 'up' | 'down' | 'stable';
      focus: 'up' | 'down' | 'stable';
    };
  };
  chartData: EfficiencyChartData;
}

const EfficiencyTrendsCard: React.FC<EfficiencyTrendsCardProps> = ({
  trends,
  chartData
}) => {

  // 获取趋势图标
  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'down':
        return <FallOutlined style={{ color: '#f5222d' }} />;
      default:
        return <MinusOutlined style={{ color: '#bfbfbf' }} />;
    }
  };

  // 获取变化值的颜色和前缀
  const getChangeStyle = (value: number) => {
    if (Math.abs(value) < 1) {
      return { color: '#bfbfbf', prefix: '' };
    }
    return value > 0 
      ? { color: '#52c41a', prefix: '+' }
      : { color: '#f5222d', prefix: '' };
  };

  // 获取整体趋势的配置
  const getOverallTrendConfig = (direction: string) => {
    const configs = {
      improving: {
        color: '#52c41a',
        bgColor: '#f6ffed',
        text: '持续改善',
        description: '近3日效率呈上升趋势'
      },
      declining: {
        color: '#f5222d',
        bgColor: '#fff2f0',
        text: '需要关注',
        description: '近3日效率有下滑趋势'
      },
      stable: {
        color: '#1890ff',
        bgColor: '#f0f9ff',
        text: '保持稳定',
        description: '近3日效率基本保持稳定'
      }
    };
    return configs[direction as keyof typeof configs] || configs.stable;
  };

  const overallConfig = getOverallTrendConfig(trends.week_trend_direction);

  return (
    <div>
      {/* 整体趋势概览 */}
      <Alert
        message={
          <Space>
            <span>整体趋势：</span>
            <Tag color={overallConfig.color} style={{ margin: 0 }}>
              {overallConfig.text}
            </Tag>
          </Space>
        }
        description={overallConfig.description}
        type={trends.week_trend_direction === 'improving' ? 'success' : 
              trends.week_trend_direction === 'declining' ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 关键指标变化 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
            <div style={{ marginBottom: 8 }}>
              {getTrendIcon(trends.trend_indicators.efficiency)}
            </div>
            <Statistic
              title="效率指数变化"
              value={Math.abs(trends.efficiency_index_change)}
              precision={1}
              suffix="%"
              prefix={getChangeStyle(trends.efficiency_index_change).prefix}
              valueStyle={{
                color: getChangeStyle(trends.efficiency_index_change).color,
                fontSize: 18
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
            <div style={{ marginBottom: 8 }}>
              {getTrendIcon(trends.trend_indicators.hours)}
            </div>
            <Statistic
              title="工作时长变化"
              value={Math.abs(trends.total_hours_change)}
              precision={1}
              suffix="%"
              prefix={getChangeStyle(trends.total_hours_change).prefix}
              valueStyle={{
                color: getChangeStyle(trends.total_hours_change).color,
                fontSize: 18
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
            <div style={{ marginBottom: 8 }}>
              {getTrendIcon(trends.trend_indicators.tasks)}
            </div>
            <Statistic
              title="任务完成变化"
              value={Math.abs(trends.completed_tasks_change)}
              precision={1}
              suffix="%"
              prefix={getChangeStyle(trends.completed_tasks_change).prefix}
              valueStyle={{
                color: getChangeStyle(trends.completed_tasks_change).color,
                fontSize: 18
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
            <div style={{ marginBottom: 8 }}>
              {getTrendIcon(trends.trend_indicators.focus)}
            </div>
            <Statistic
              title="专注时长变化"
              value={Math.abs(trends.avg_session_change)}
              precision={1}
              suffix="%"
              prefix={getChangeStyle(trends.avg_session_change).prefix}
              valueStyle={{
                color: getChangeStyle(trends.avg_session_change).color,
                fontSize: 18
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 三日数据对比图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card 
            title="效率指数对比" 
            size="small"
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ marginBottom: 16 }}>
              {chartData.efficiency_comparison.data.map((value, index) => (
                <div key={index} style={{ marginBottom: 12 }}>
                  <Row justify="space-between" style={{ marginBottom: 4 }}>
                    <Col>
                      <Text style={{ fontSize: 12 }}>
                        {chartData.efficiency_comparison.labels[index]}
                      </Text>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 12 }}>
                        {value.toFixed(1)}
                      </Text>
                    </Col>
                  </Row>
                  <Progress
                    percent={value}
                    strokeColor={chartData.efficiency_comparison.colors[index]}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title="工作时长对比" 
            size="small"
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ marginBottom: 16 }}>
              {chartData.hours_comparison.data.map((value, index) => {
                const maxHours = Math.max(...chartData.hours_comparison.data);
                const percentage = maxHours > 0 ? (value / maxHours) * 100 : 0;
                
                return (
                  <div key={index} style={{ marginBottom: 12 }}>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Col>
                        <Text style={{ fontSize: 12 }}>
                          {chartData.hours_comparison.labels[index]}
                        </Text>
                      </Col>
                      <Col>
                        <Text strong style={{ fontSize: 12 }}>
                          {value.toFixed(1)}h
                        </Text>
                      </Col>
                    </Row>
                    <Progress
                      percent={percentage}
                      strokeColor={chartData.hours_comparison.colors[index]}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title="任务完成对比" 
            size="small"
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ marginBottom: 16 }}>
              {chartData.tasks_comparison.data.map((value, index) => {
                const maxTasks = Math.max(...chartData.tasks_comparison.data);
                const percentage = maxTasks > 0 ? (value / maxTasks) * 100 : 0;
                
                return (
                  <div key={index} style={{ marginBottom: 12 }}>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Col>
                        <Text style={{ fontSize: 12 }}>
                          {chartData.tasks_comparison.labels[index]}
                        </Text>
                      </Col>
                      <Col>
                        <Text strong style={{ fontSize: 12 }}>
                          {value}个
                        </Text>
                      </Col>
                    </Row>
                    <Progress
                      percent={percentage}
                      strokeColor={chartData.tasks_comparison.colors[index]}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 趋势线数据简化展示 */}
      <Card 
        title="三日变化趋势" 
        style={{ marginTop: 16 }}
        size="small"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                效率指数走势
              </Text>
              <div style={{ marginTop: 8 }}>
                {chartData.trend_lines.efficiency.map((point, index) => (
                  <span key={index} style={{ marginRight: 8 }}>
                    <Text style={{ fontSize: 11 }}>{point.x}</Text>
                    <Text strong style={{ fontSize: 12, marginLeft: 4 }}>
                      {point.y.toFixed(1)}
                    </Text>
                    {index < chartData.trend_lines.efficiency.length - 1 && (
                      <span style={{ margin: '0 4px', color: '#bfbfbf' }}>→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                工作时长走势
              </Text>
              <div style={{ marginTop: 8 }}>
                {chartData.trend_lines.hours.map((point, index) => (
                  <span key={index} style={{ marginRight: 8 }}>
                    <Text style={{ fontSize: 11 }}>{point.x}</Text>
                    <Text strong style={{ fontSize: 12, marginLeft: 4 }}>
                      {point.y.toFixed(1)}h
                    </Text>
                    {index < chartData.trend_lines.hours.length - 1 && (
                      <span style={{ margin: '0 4px', color: '#bfbfbf' }}>→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                任务完成走势
              </Text>
              <div style={{ marginTop: 8 }}>
                {chartData.trend_lines.tasks.map((point, index) => (
                  <span key={index} style={{ marginRight: 8 }}>
                    <Text style={{ fontSize: 11 }}>{point.x}</Text>
                    <Text strong style={{ fontSize: 12, marginLeft: 4 }}>
                      {point.y}个
                    </Text>
                    {index < chartData.trend_lines.tasks.length - 1 && (
                      <span style={{ margin: '0 4px', color: '#bfbfbf' }}>→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default EfficiencyTrendsCard;