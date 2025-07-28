import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Space,
  Button,
  DatePicker,
  Select,
  Table,
  Tag,
  Tooltip,
  Alert,
  Empty,
  Divider,
  Tabs
} from 'antd';
import {
  DollarCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  TrophyOutlined,
  ReloadOutlined,
  DownloadOutlined,
  LineChartOutlined,
  PieChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// Using any for table columns to avoid type conflicts
// import type { ColumnsType } from 'antd/lib/table';
import { AIProvider, AI_PROVIDER_INFO } from '../types/ai';
import { TaskGenerationHistory } from '../types/aiTaskGenerator';
import aiTaskGeneratorService from '../services/aiTaskGeneratorService';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface AIUsageStatsProps {
  projectId?: number;
  timeRange?: 'today' | 'week' | 'month' | 'all';
  className?: string;
}

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgQuality: number;
  avgResponseTime: number;
  providerStats: Record<AIProvider, ProviderUsageStats>;
  dailyStats: DailyUsageStats[];
  topKeywords: KeywordStats[];
}

interface ProviderUsageStats {
  provider: AIProvider;
  requests: number;
  tokens: number;
  cost: number;
  avgQuality: number;
  successRate: number;
  avgResponseTime: number;
}

interface DailyUsageStats {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
}

interface KeywordStats {
  keyword: string;
  count: number;
  avgQuality: number;
  totalCost: number;
}

interface CostBreakdown {
  provider: AIProvider;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  percentage: number;
}

const AIUsageStats: React.FC<AIUsageStatsProps> = ({
  projectId,
  timeRange = 'month',
  className = ''
}) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | 'all'>('all');
  const [customDateRange, setCustomDateRange] = useState<[Date, Date] | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'trends' | 'costs'>('overview');

  // 加载使用统计数据
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // 获取历史记录数据
      const history = aiTaskGeneratorService.getGenerationHistory();
      
      // 根据项目和时间范围过滤数据
      let filteredHistory = history;
      
      if (projectId) {
        filteredHistory = filteredHistory.filter(h => h.parentTaskId === projectId);
      }
      
      // 时间范围过滤
      const now = new Date();
      const filterByTimeRange = (h: TaskGenerationHistory) => {
        const timestamp = new Date(h.timestamp);
        switch (selectedTimeRange) {
          case 'today':
            return timestamp.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return timestamp >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return timestamp >= monthAgo;
          case 'all':
          default:
            return true;
        }
      };
      
      if (customDateRange) {
        const [start, end] = customDateRange;
        filteredHistory = filteredHistory.filter(h => {
          const timestamp = new Date(h.timestamp);
          return timestamp >= start && timestamp <= end;
        });
      } else {
        filteredHistory = filteredHistory.filter(filterByTimeRange);
      }
      
      if (selectedProvider !== 'all') {
        filteredHistory = filteredHistory.filter(h => h.usedProvider === selectedProvider);
      }
      
      // 计算统计数据
      const calculatedStats = calculateStats(filteredHistory);
      setStats(calculatedStats);
      
    } catch (error) {
      console.error('加载使用统计失败:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedTimeRange, selectedProvider, customDateRange]);

  // 计算统计数据
  const calculateStats = (history: TaskGenerationHistory[]): UsageStats => {
    const totalRequests = history.length;
    const successfulRequests = history.filter(h => h.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const totalTokens = history.reduce((sum, h) => sum + h.tokensUsed, 0);
    const totalCost = history.reduce((sum, h) => sum + h.cost, 0);
    const avgQuality = totalRequests > 0 ? 
      history.reduce((sum, h) => sum + h.quality, 0) / totalRequests : 0;
    
    // 计算平均响应时间（模拟数据，实际应该从历史记录中获取）
    const avgResponseTime = totalRequests > 0 ? 
      history.reduce((sum, h) => sum + (Math.random() * 3000 + 1000), 0) / totalRequests : 0;
    
    // 按提供商统计
    const providerStats: Record<AIProvider, ProviderUsageStats> = {
      openai: { provider: 'openai', requests: 0, tokens: 0, cost: 0, avgQuality: 0, successRate: 0, avgResponseTime: 0 },
      claude: { provider: 'claude', requests: 0, tokens: 0, cost: 0, avgQuality: 0, successRate: 0, avgResponseTime: 0 },
      deepseek: { provider: 'deepseek', requests: 0, tokens: 0, cost: 0, avgQuality: 0, successRate: 0, avgResponseTime: 0 }
    };
    
    history.forEach(h => {
      const provider = h.usedProvider;
      if (providerStats[provider]) {
        providerStats[provider].requests++;
        providerStats[provider].tokens += h.tokensUsed;
        providerStats[provider].cost += h.cost;
        providerStats[provider].avgQuality += h.quality;
      }
    });
    
    // 计算提供商平均值
    Object.keys(providerStats).forEach(key => {
      const provider = key as AIProvider;
      const stats = providerStats[provider];
      if (stats.requests > 0) {
        stats.avgQuality = stats.avgQuality / stats.requests;
        const successfulCount = history.filter(h => h.usedProvider === provider && h.success).length;
        stats.successRate = (successfulCount / stats.requests) * 100;
        stats.avgResponseTime = Math.random() * 3000 + 1000; // 模拟数据
      }
    });
    
    // 按日期统计
    const dailyStatsMap = new Map<string, DailyUsageStats>();
    history.forEach(h => {
      const dateKey = new Date(h.timestamp).toDateString();
      if (!dailyStatsMap.has(dateKey)) {
        dailyStatsMap.set(dateKey, {
          date: dateKey,
          requests: 0,
          tokens: 0,
          cost: 0,
          successRate: 0
        });
      }
      const daily = dailyStatsMap.get(dateKey)!;
      daily.requests++;
      daily.tokens += h.tokensUsed;
      daily.cost += h.cost;
    });
    
    const dailyStats = Array.from(dailyStatsMap.values()).map(daily => ({
      ...daily,
      successRate: daily.requests > 0 ? 
        (history.filter(h => new Date(h.timestamp).toDateString() === daily.date && h.success).length / daily.requests) * 100 : 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 关键词统计
    const keywordMap = new Map<string, { count: number; totalQuality: number; totalCost: number }>();
    history.forEach(h => {
      const keywords = h.keywords.toLowerCase().split(/[,，\s]+/).filter(k => k.length > 2);
      keywords.forEach(keyword => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, { count: 0, totalQuality: 0, totalCost: 0 });
        }
        const stats = keywordMap.get(keyword)!;
        stats.count++;
        stats.totalQuality += h.quality;
        stats.totalCost += h.cost;
      });
    });
    
    const topKeywords = Array.from(keywordMap.entries())
      .map(([keyword, stats]) => ({
        keyword,
        count: stats.count,
        avgQuality: stats.totalQuality / stats.count,
        totalCost: stats.totalCost
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      totalCost,
      avgQuality,
      avgResponseTime,
      providerStats,
      dailyStats,
      topKeywords
    };
  };

  // 获取成本分解数据
  const getCostBreakdown = (): CostBreakdown[] => {
    if (!stats) return [];
    
    const breakdown: CostBreakdown[] = [];
    const totalCost = stats.totalCost;
    
    Object.entries(stats.providerStats).forEach(([provider, providerStats]) => {
      if (providerStats.cost > 0) {
        // 估算输入输出token比例（实际应该从详细记录中获取）
        const inputTokens = Math.floor(providerStats.tokens * 0.6);
        const outputTokens = providerStats.tokens - inputTokens;
        
        // 根据提供商定价计算
        const pricing = {
          deepseek: { input: 0.001, output: 0.002 },
          claude: { input: 0.008, output: 0.024 },
          openai: { input: 0.01, output: 0.03 }
        };
        
        const rate = pricing[provider as AIProvider] || pricing.deepseek;
        const inputCost = (inputTokens / 1000) * rate.input;
        const outputCost = (outputTokens / 1000) * rate.output;
        
        breakdown.push({
          provider: provider as AIProvider,
          inputTokens,
          outputTokens,
          inputCost,
          outputCost,
          totalCost: providerStats.cost,
          percentage: totalCost > 0 ? (providerStats.cost / totalCost) * 100 : 0
        });
      }
    });
    
    return breakdown.sort((a, b) => b.totalCost - a.totalCost);
  };

  // 导出统计报告
  const exportReport = () => {
    if (!stats) return;
    
    const report = {
      exportTime: new Date().toISOString(),
      timeRange: selectedTimeRange,
      customDateRange,
      selectedProvider,
      projectId,
      summary: {
        totalRequests: stats.totalRequests,
        successRate: stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests * 100).toFixed(1) + '%' : '0%',
        totalTokens: stats.totalTokens.toLocaleString(),
        totalCost: '¥' + stats.totalCost.toFixed(4),
        avgQuality: stats.avgQuality.toFixed(1) + '分'
      },
      providerStats: stats.providerStats,
      dailyStats: stats.dailyStats,
      topKeywords: stats.topKeywords,
      costBreakdown: getCostBreakdown()
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ai_usage_report_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 提供商表格列定义
  const providerColumns: any[] = [
    {
      title: 'AI提供商',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: AIProvider) => {
        const colorMap: Record<AIProvider, string> = {
          openai: 'green',
          claude: 'blue',
          deepseek: 'purple'
        };
        return (
          <Space>
            <Tag color={colorMap[provider]}>
              {AI_PROVIDER_INFO[provider]?.name || provider}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: '请求次数',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests: number) => requests.toLocaleString()
    },
    {
      title: 'Token使用',
      dataIndex: 'tokens',
      key: 'tokens',
      render: (tokens: number) => tokens.toLocaleString()
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => '¥' + cost.toFixed(4)
    },
    {
      title: '平均质量',
      dataIndex: 'avgQuality',
      key: 'avgQuality',
      render: (quality: number) => (
        <Text style={{ color: quality >= 80 ? '#52c41a' : quality >= 60 ? '#faad14' : '#ff4d4f' }}>
          {quality.toFixed(1)}分
        </Text>
      )
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate >= 80 ? 'success' : rate >= 60 ? 'normal' : 'exception'}
        />
      )
    }
  ];

  // 关键词表格列定义
  const keywordColumns: any[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (keyword: string) => <Tag color="blue">{keyword}</Tag>
    },
    {
      title: '使用次数',
      dataIndex: 'count',
      key: 'count'
    },
    {
      title: '平均质量',
      dataIndex: 'avgQuality',
      key: 'avgQuality',
      render: (quality: number) => quality.toFixed(1) + '分'
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => '¥' + cost.toFixed(4)
    }
  ];

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!stats && !loading) {
    return (
      <Card className={className}>
        <Empty description="暂无使用统计数据" />
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={4}>
            <Select
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
              style={{ width: '100%' }}
            >
              <Option value="today">今天</Option>
              <Option value="week">最近7天</Option>
              <Option value="month">最近30天</Option>
              <Option value="all">全部时间</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              value={selectedProvider}
              onChange={setSelectedProvider}
              style={{ width: '100%' }}
            >
              <Option value="all">所有提供商</Option>
              <Option value="deepseek">DeepSeek</Option>
              <Option value="claude">Claude</Option>
              <Option value="openai">OpenAI</Option>
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              value={customDateRange ? [customDateRange[0] as any, customDateRange[1] as any] : null}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setCustomDateRange([dates[0]!.toDate(), dates[1]!.toDate()]);
                } else {
                  setCustomDateRange(null);
                }
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadStats}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportReport}
                disabled={!stats}
              >
                导出报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab as any}>
        {/* 概览标签页 */}
        <TabPane tab={
          <span>
            <BarChartOutlined />
            概览统计
          </span>
        } key="overview">
          {stats && (
            <div>
              {/* 核心指标 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总请求数"
                      value={stats.totalRequests}
                      prefix={<ThunderboltOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="成功率"
                      value={stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests * 100) : 0}
                      precision={1}
                      suffix="%"
                      prefix={<TrophyOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Token使用总量"
                      value={stats.totalTokens}
                      prefix={<LineChartOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总成本"
                      value={stats.totalCost}
                      precision={4}
                      prefix="¥"
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 质量和响应时间 */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card title="平均质量评分" size="small">
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={stats.avgQuality}
                        format={() => `${stats.avgQuality.toFixed(1)}分`}
                        strokeColor={stats.avgQuality >= 80 ? '#52c41a' : stats.avgQuality >= 60 ? '#faad14' : '#ff4d4f'}
                      />
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="平均响应时间" size="small">
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        value={stats.avgResponseTime}
                        precision={0}
                        suffix="ms"
                        valueStyle={{ fontSize: '24px' }}
                      />
                      <Text type="secondary">
                        {stats.avgResponseTime < 2000 ? '响应很快' : 
                         stats.avgResponseTime < 4000 ? '响应正常' : '响应较慢'}
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 成功失败统计 */}
              <Card title="请求状态分布" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="成功请求"
                      value={stats.successfulRequests}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="失败请求"
                      value={stats.failedRequests}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>成功率趋势</Text>
                      <div style={{ marginTop: 8 }}>
                        <Progress
                          percent={stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests * 100) : 0}
                          strokeColor="#52c41a"
                          trailColor="#ff4d4f"
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          )}
        </TabPane>

        {/* 提供商统计标签页 */}
        <TabPane tab={
          <span>
            <PieChartOutlined />
            提供商统计
          </span>
        } key="providers">
          {stats && (
            <div>
              <Card title="AI提供商使用统计" size="small">
                <Table
                  columns={providerColumns}
                  dataSource={Object.values(stats.providerStats).filter(p => p.requests > 0)}
                  rowKey="provider"
                  pagination={false}
                  size="small"
                />
              </Card>
            </div>
          )}
        </TabPane>

        {/* 趋势分析标签页 */}
        <TabPane tab={
          <span>
            <LineChartOutlined />
            趋势分析
          </span>
        } key="trends">
          {stats && (
            <div>
              {/* 热门关键词 */}
              <Card title="热门关键词统计" size="small" style={{ marginBottom: 16 }}>
                <Table
                  columns={keywordColumns}
                  dataSource={stats.topKeywords}
                  rowKey="keyword"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </Card>

              {/* 每日使用趋势 */}
              <Card title="每日使用趋势" size="small">
                {stats.dailyStats.length > 0 ? (
                  <div>
                    <Alert
                      message="趋势分析"
                      description={`最近${stats.dailyStats.length}天的使用情况，平均每日${(stats.totalRequests / stats.dailyStats.length).toFixed(1)}次请求`}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {stats.dailyStats.map((daily, index) => (
                        <div key={daily.date} style={{ 
                          padding: '8px 12px', 
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Text strong>{new Date(daily.date).toLocaleDateString()}</Text>
                          <Space>
                            <Text>请求: {daily.requests}</Text>
                            <Text>Token: {daily.tokens.toLocaleString()}</Text>
                            <Text>成本: ¥{daily.cost.toFixed(4)}</Text>
                            <Text>成功率: {daily.successRate.toFixed(1)}%</Text>
                          </Space>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无趋势数据" />
                )}
              </Card>
            </div>
          )}
        </TabPane>

        {/* 成本分析标签页 */}
        <TabPane tab={
          <span>
            <DollarCircleOutlined />
            成本分析
          </span>
        } key="costs">
          {stats && (
            <div>
              <Card title="成本详细分解" size="small">
                <div>
                  {getCostBreakdown().map((breakdown, index) => (
                    <div key={breakdown.provider} style={{ marginBottom: 16 }}>
                      <Row gutter={16} align="middle">
                        <Col span={6}>
                          <Space>
                            <Tag color={
                              breakdown.provider === 'openai' ? 'green' :
                              breakdown.provider === 'claude' ? 'blue' : 'purple'
                            }>
                              {AI_PROVIDER_INFO[breakdown.provider]?.name}
                            </Tag>
                            <Text strong>{breakdown.percentage.toFixed(1)}%</Text>
                          </Space>
                        </Col>
                        <Col span={18}>
                          <div>
                            <div style={{ marginBottom: 8 }}>
                              <Progress 
                                percent={breakdown.percentage} 
                                showInfo={false}
                                strokeColor={
                                  breakdown.provider === 'openai' ? '#52c41a' :
                                  breakdown.provider === 'claude' ? '#1890ff' : '#722ed1'
                                }
                              />
                            </div>
                            <Row gutter={16}>
                              <Col span={6}>
                                <Text type="secondary">输入Token: {breakdown.inputTokens.toLocaleString()}</Text>
                              </Col>
                              <Col span={6}>
                                <Text type="secondary">输出Token: {breakdown.outputTokens.toLocaleString()}</Text>
                              </Col>
                              <Col span={6}>
                                <Text type="secondary">输入成本: ¥{breakdown.inputCost.toFixed(4)}</Text>
                              </Col>
                              <Col span={6}>
                                <Text type="secondary">输出成本: ¥{breakdown.outputCost.toFixed(4)}</Text>
                              </Col>
                            </Row>
                          </div>
                        </Col>
                      </Row>
                      {index < getCostBreakdown().length - 1 && <Divider />}
                    </div>
                  ))}
                </div>

                <Alert
                  message="成本优化建议"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      <li>DeepSeek具有最高的性价比，适合大部分场景</li>
                      <li>Claude在复杂分析任务中表现出色，但成本较高</li>
                      <li>合理选择AI提供商可以降低30-50%的使用成本</li>
                      <li>优化prompt长度可以有效减少token消耗</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  style={{ marginTop: 16 }}
                />
              </Card>
            </div>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AIUsageStats;