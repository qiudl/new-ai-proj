import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Alert,
  Spin,
  message,
  Tabs,
  Tooltip
} from 'antd';
import {
  ReloadOutlined,
  BarChartOutlined,
  BulbOutlined,
  CalendarOutlined,
  RiseOutlined
} from '@ant-design/icons';
import DailyEfficiencyCard from './DailyEfficiencyCard';
import EfficiencyTrendsCard from './EfficiencyTrendsCard';
import EfficiencyInsightsCard from './EfficiencyInsightsCard';
import dailyEfficiencyService from '../services/dailyEfficiencyService';
import { ProcessedComparisonData } from '../types/dailyEfficiency';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DailyComparisonViewProps {
  style?: React.CSSProperties;
  className?: string;
}

const DailyComparisonView: React.FC<DailyComparisonViewProps> = ({
  style,
  className
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProcessedComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // 加载数据
  const loadData = async (force = false) => {
    try {
      setError(null);
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const comparisonData = await dailyEfficiencyService.getProcessedComparisonData({ force });
      setData(comparisonData);
      
      if (force) {
        message.success('数据刷新成功');
      }
    } catch (err) {
      console.error('Failed to load daily comparison data:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
      
      if (force) {
        message.error('数据刷新失败');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, []);

  // 刷新数据
  const handleRefresh = () => {
    loadData(true);
  };

  // 错误状态
  if (error && !data) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => loadData()}>
            重试
          </Button>
        }
        style={style}
        className={className}
      />
    );
  }

  return (
    <div style={style} className={className}>
      {/* 头部标题和操作 */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={3} style={{ margin: 0 }}>
                <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                三日效率对比分析
              </Title>
              <Text type="secondary">
                基于工作时长、任务完成和专注度的综合效率评估
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tooltip title="刷新数据">
                <Button
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={handleRefresh}
                >
                  刷新
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" spinning={true}>
            <div style={{ padding: '20px', color: '#666' }}>
              正在分析效率数据...
            </div>
          </Spin>
        </div>
      )}

      {/* 主要内容 */}
      {data && !loading && (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ width: '100%' }}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <BarChartOutlined />
                  数据概览
                </span>
              ),
              children: (
                <div>
                  {/* 三日对比卡片 */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                      <DailyEfficiencyCard
                        dayData={data.day_before}
                        dayLabel="前日"
                        showComparison={false}
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <DailyEfficiencyCard
                        dayData={data.yesterday}
                        dayLabel="昨日"
                        comparisonBase={data.day_before}
                        showComparison={true}
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <DailyEfficiencyCard
                        dayData={data.today}
                        dayLabel="今日"
                        isToday={true}
                        comparisonBase={data.yesterday}
                        showComparison={true}
                      />
                    </Col>
                  </Row>

                  {/* 综合总结卡片 */}
                  <Card
                    title={
                      <Space>
                        <RiseOutlined style={{ color: '#1890ff' }} />
                        <span>综合分析总结</span>
                      </Space>
                    }
                    style={{ marginBottom: 24 }}
                  >
                    <Row gutter={[24, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            表现最佳
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text strong style={{ color: '#52c41a' }}>
                              {data.summary.best_day === 'today' ? '今日' :
                               data.summary.best_day === 'yesterday' ? '昨日' : '前日'}
                            </Text>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            最大改进
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text strong>{data.summary.biggest_improvement}</Text>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            主要挑战
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text strong style={{ color: '#fa8c16' }}>
                              {data.summary.main_challenge}
                            </Text>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            改进建议
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text strong style={{ color: '#1890ff' }}>
                              {data.summary.recommendation}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </div>
              )
            },
            {
              key: 'trends',
              label: (
                <span>
                  <RiseOutlined />
                  趋势分析
                </span>
              ),
              children: (
                <EfficiencyTrendsCard
                  trends={data.trends}
                  chartData={dailyEfficiencyService.getChartData(data)}
                />
              )
            },
            {
              key: 'insights',
              label: (
                <span>
                  <BulbOutlined />
                  智能洞察
                </span>
              ),
              children: (
                <EfficiencyInsightsCard insights={data.insights} />
              )
            }
          ]}
        />
      )}

      {/* 无数据状态 */}
      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Text type="secondary">暂无效率数据</Text>
        </div>
      )}
    </div>
  );
};

export default DailyComparisonView;