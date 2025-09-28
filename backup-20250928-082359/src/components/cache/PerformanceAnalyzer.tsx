/**
 * 性能分析器
 * 提供深度性能分析、瓶颈检测和优化建议
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Table,
  Tag,
  Progress,
  Typography,
  Button,
  Space,
  Tooltip,
  Timeline,
  Divider,
  Select,
  DatePicker,
  Collapse,
  Badge,
  Modal,
  List,
  Rate
} from 'antd';
import {
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  BugOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { Line, Column, Pie, Area } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useCacheState } from '../../hooks/useCacheState';
import { cacheEventSystem } from '../../utils/cacheEventSystem';
import { enhancedCacheManager } from '../../utils/enhancedCacheManager';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;

interface PerformanceIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'performance' | 'memory' | 'reliability' | 'efficiency';
  title: string;
  description: string;
  impact: number; // 1-5, 5最严重
  frequency: number; // 出现频率
  suggestions: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedFixTime: string;
}

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'cache_strategy' | 'memory_optimization' | 'performance_tuning' | 'architecture';
  difficulty: 'easy' | 'medium' | 'hard';
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // 预期改善百分比
  implementation: string[];
  resources: string[];
}

interface Props {
  height?: number;
  autoAnalyze?: boolean;
  onIssueDetected?: (issues: PerformanceIssue[]) => void;
  onRecommendationGenerated?: (recommendations: OptimizationRecommendation[]) => void;
}

export const PerformanceAnalyzer: React.FC<Props> = ({
  height = 600,
  autoAnalyze = false,
  onIssueDetected,
  onRecommendationGenerated
}) => {
  // 状态管理
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [issues, setIssues] = useState<PerformanceIssue[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(1, 'hour'),
    dayjs()
  ]);
  const [selectedIssue, setSelectedIssue] = useState<PerformanceIssue | null>(null);
  const [issueDetailVisible, setIssueDetailVisible] = useState(false);

  // 缓存状态
  const {
    stats,
    realtimeMetrics,
    hotKeys,
    anomalies,
    recentEvents,
    performanceTrend
  } = useCacheState();

  // 性能分析核心逻辑
  const runDeepAnalysis = async () => {
    setAnalyzing(true);
    try {
      // 收集分析数据
      const performanceMetrics = cacheEventSystem.getPerformanceMetrics();
      const realtimeStats = cacheEventSystem.getRealTimeStats(3600000); // 最近1小时
      const detectedAnomalies = cacheEventSystem.detectAnomalies();
      
      // 分析性能问题
      const detectedIssues: PerformanceIssue[] = [];
      
      // 1. 命中率问题
      if (performanceMetrics.hitRate < 60) {
        detectedIssues.push({
          id: 'low-hit-rate-critical',
          type: 'critical',
          category: 'performance',
          title: '严重的缓存命中率过低',
          description: `当前缓存命中率仅为 ${performanceMetrics.hitRate.toFixed(1)}%，远低于推荐的 80% 标准`,
          impact: 5,
          frequency: 1.0,
          suggestions: [
            '检查缓存键的构建逻辑是否正确',
            '增加缓存的 TTL 时间',
            '实现预热策略',
            '优化数据访问模式'
          ],
          priority: 'high',
          estimatedFixTime: '2-4小时'
        });
      } else if (performanceMetrics.hitRate < 75) {
        detectedIssues.push({
          id: 'low-hit-rate-warning',
          type: 'warning',
          category: 'performance',
          title: '缓存命中率偏低',
          description: `当前缓存命中率为 ${performanceMetrics.hitRate.toFixed(1)}%，建议优化至 80% 以上`,
          impact: 3,
          frequency: 0.8,
          suggestions: [
            '分析热点数据访问模式',
            '调整缓存策略',
            '考虑实现智能预加载'
          ],
          priority: 'medium',
          estimatedFixTime: '1-2小时'
        });
      }

      // 2. 响应时间问题
      if (performanceMetrics.avgResponseTime > 1000) {
        detectedIssues.push({
          id: 'slow-response-critical',
          type: 'critical',
          category: 'performance',
          title: '响应时间过慢',
          description: `平均响应时间 ${performanceMetrics.avgResponseTime}ms 超过可接受范围`,
          impact: 4,
          frequency: 0.9,
          suggestions: [
            '优化数据获取逻辑',
            '减少序列化/反序列化开销',
            '实现分页或数据分块',
            '使用更高效的数据结构'
          ],
          priority: 'high',
          estimatedFixTime: '3-6小时'
        });
      } else if (performanceMetrics.avgResponseTime > 500) {
        detectedIssues.push({
          id: 'slow-response-warning',
          type: 'warning',
          category: 'performance',
          title: '响应时间偏慢',
          description: `平均响应时间 ${performanceMetrics.avgResponseTime}ms 建议优化`,
          impact: 2,
          frequency: 0.6,
          suggestions: [
            '检查数据获取链路',
            '优化关键路径',
            '考虑并发处理'
          ],
          priority: 'medium',
          estimatedFixTime: '1-3小时'
        });
      }

      // 3. 内存使用问题
      if (stats.memoryUsageMB > 200) {
        detectedIssues.push({
          id: 'high-memory-usage',
          type: 'warning',
          category: 'memory',
          title: '内存使用量过高',
          description: `当前内存使用 ${stats.memoryUsageMB.toFixed(1)}MB，可能存在内存泄漏风险`,
          impact: 3,
          frequency: 0.7,
          suggestions: [
            '设置合理的内存限制',
            '实现LRU清理策略',
            '监控大对象缓存',
            '定期执行内存清理'
          ],
          priority: 'medium',
          estimatedFixTime: '2-4小时'
        });
      }

      // 4. 错误率问题
      if (realtimeMetrics.errorRate > 5) {
        detectedIssues.push({
          id: 'high-error-rate',
          type: 'critical',
          category: 'reliability',
          title: '错误率过高',
          description: `当前错误率 ${realtimeMetrics.errorRate.toFixed(2)}% 存在稳定性问题`,
          impact: 5,
          frequency: 1.0,
          suggestions: [
            '检查错误日志',
            '增加异常处理',
            '实现重试机制',
            '添加熔断保护'
          ],
          priority: 'high',
          estimatedFixTime: '4-8小时'
        });
      }

      // 5. 热点键问题
      const topHotKey = hotKeys[0];
      if (topHotKey && topHotKey.accessCount > 1000) {
        detectedIssues.push({
          id: 'hot-key-bottleneck',
          type: 'warning',
          category: 'efficiency',
          title: '热点键访问瓶颈',
          description: `键 "${topHotKey.key}" 访问次数过高 (${topHotKey.accessCount} 次)，可能成为性能瓶颈`,
          impact: 3,
          frequency: 0.8,
          suggestions: [
            '考虑数据分片',
            '实现读写分离',
            '增加缓存副本',
            '优化数据结构'
          ],
          priority: 'medium',
          estimatedFixTime: '2-3小时'
        });
      }

      setIssues(detectedIssues);
      onIssueDetected?.(detectedIssues);

      // 生成优化建议
      const generatedRecommendations: OptimizationRecommendation[] = [
        {
          id: 'implement-tiered-caching',
          title: '实现分层缓存策略',
          description: '建立多级缓存体系，提高缓存效率和命中率',
          category: 'cache_strategy',
          difficulty: 'medium',
          impact: 'high',
          estimatedImprovement: 25,
          implementation: [
            '设计L1（内存）和L2（持久化）缓存层',
            '实现缓存提升和降级策略',
            '配置不同层级的TTL策略',
            '添加缓存层监控和指标'
          ],
          resources: [
            '缓存架构设计文档',
            '多级缓存实现案例',
            '性能基准测试工具'
          ]
        },
        {
          id: 'optimize-serialization',
          title: '优化序列化性能',
          description: '使用更高效的序列化方案，减少CPU和内存开销',
          category: 'performance_tuning',
          difficulty: 'easy',
          impact: 'medium',
          estimatedImprovement: 15,
          implementation: [
            '评估当前序列化方案',
            '测试高性能序列化库',
            '实现序列化缓存',
            '监控序列化性能指标'
          ],
          resources: [
            '序列化性能对比',
            'JSON vs MessagePack 基准测试',
            '内存使用分析工具'
          ]
        },
        {
          id: 'implement-smart-prefetching',
          title: '智能预取机制',
          description: '基于访问模式的智能数据预取，提高缓存命中率',
          category: 'cache_strategy',
          difficulty: 'hard',
          impact: 'high',
          estimatedImprovement: 30,
          implementation: [
            '分析历史访问模式',
            '建立预测模型',
            '实现异步预取逻辑',
            '添加预取效果监控'
          ],
          resources: [
            '机器学习预测模型',
            '访问模式分析算法',
            '异步处理框架'
          ]
        },
        {
          id: 'memory-optimization',
          title: '内存使用优化',
          description: '实现智能内存管理，降低内存占用和GC压力',
          category: 'memory_optimization',
          difficulty: 'medium',
          impact: 'medium',
          estimatedImprovement: 20,
          implementation: [
            '实现内存池管理',
            '优化大对象存储',
            '设置内存使用阈值',
            '实现渐进式清理'
          ],
          resources: [
            '内存分析工具',
            'GC优化指南',
            '内存泄漏检测工具'
          ]
        }
      ];

      setRecommendations(generatedRecommendations);
      onRecommendationGenerated?.(generatedRecommendations);
      setAnalysisComplete(true);

    } catch (error) {
      console.error('Performance analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // 自动分析
  useEffect(() => {
    if (autoAnalyze && !analysisComplete) {
      runDeepAnalysis();
    }
  }, [autoAnalyze]);

  // 计算性能评分
  const performanceScore = useMemo(() => {
    const hitRateScore = Math.min(realtimeMetrics.hitRate / 80 * 25, 25);
    const responseTimeScore = Math.max(25 - (realtimeMetrics.errorRate * 5), 0);
    const errorRateScore = Math.max(25 - (realtimeMetrics.errorRate * 5), 0);
    const memoryScore = Math.max(25 - (stats.memoryUsageMB / 100 * 25), 0);
    
    return Math.round(hitRateScore + responseTimeScore + errorRateScore + memoryScore);
  }, [realtimeMetrics, stats]);

  // 问题统计
  const issueStats = useMemo(() => {
    const critical = issues.filter(i => i.type === 'critical').length;
    const warning = issues.filter(i => i.type === 'warning').length;
    const info = issues.filter(i => i.type === 'info').length;
    
    return { critical, warning, info, total: issues.length };
  }, [issues]);

  // 性能趋势图表
  const renderPerformanceTrends = () => {
    const trendData = performanceTrend.hitRates.map((hitRate, index) => ({
      time: index,
      hitRate,
      responseTime: performanceTrend.responseTimes[index] || 0,
      memoryUsage: performanceTrend.memoryUsages[index] || 0
    }));

    const config = {
      data: trendData,
      xField: 'time',
      yField: 'hitRate',
      smooth: true,
      color: '#1890ff',
      point: { size: 3 },
      yAxis: { min: 0, max: 100 }
    };

    return <Line {...config} height={200} />;
  };

  // 问题分布图表
  const renderIssueDistribution = () => {
    const data = [
      { type: '性能', count: issues.filter(i => i.category === 'performance').length },
      { type: '内存', count: issues.filter(i => i.category === 'memory').length },
      { type: '可靠性', count: issues.filter(i => i.category === 'reliability').length },
      { type: '效率', count: issues.filter(i => i.category === 'efficiency').length }
    ].filter(item => item.count > 0);

    const config = {
      data,
      angleField: 'count',
      colorField: 'type',
      radius: 0.8,
      label: {
        type: 'outer',
        content: '{name} {percentage}'
      }
    };

    return data.length > 0 ? <Pie {...config} height={200} /> : (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
        <div style={{ marginTop: '16px' }}>
          <Text>未发现性能问题</Text>
        </div>
      </div>
    );
  };

  // 问题列表
  const renderIssuesList = () => {
    const columns = [
      {
        title: '严重程度',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: 'critical' | 'warning' | 'info') => {
          const configs = {
            critical: { color: 'red', icon: <WarningOutlined />, text: '严重' },
            warning: { color: 'orange', icon: <InfoCircleOutlined />, text: '警告' },
            info: { color: 'blue', icon: <InfoCircleOutlined />, text: '信息' }
          };
          const config = configs[type];
          return (
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
          );
        }
      },
      {
        title: '问题标题',
        dataIndex: 'title',
        key: 'title',
        render: (title: string, record: PerformanceIssue) => (
          <Button
            type="link"
            onClick={() => {
              setSelectedIssue(record);
              setIssueDetailVisible(true);
            }}
          >
            {title}
          </Button>
        )
      },
      {
        title: '类别',
        dataIndex: 'category',
        key: 'category',
        width: 100,
        render: (category: string) => {
          const categoryNames = {
            performance: '性能',
            memory: '内存',
            reliability: '可靠性',
            efficiency: '效率'
          };
          return <Tag>{categoryNames[category as keyof typeof categoryNames]}</Tag>;
        }
      },
      {
        title: '影响度',
        dataIndex: 'impact',
        key: 'impact',
        width: 100,
        render: (impact: number) => (
          <Rate disabled value={impact} count={5} style={{ fontSize: '14px' }} />
        )
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 80,
        render: (priority: 'high' | 'medium' | 'low') => {
          const colors = { high: 'red', medium: 'orange', low: 'green' };
          const texts = { high: '高', medium: '中', low: '低' };
          return <Tag color={colors[priority]}>{texts[priority]}</Tag>;
        }
      },
      {
        title: '预计修复时间',
        dataIndex: 'estimatedFixTime',
        key: 'estimatedFixTime',
        width: 120
      }
    ];

    return (
      <Table
        columns={columns}
        dataSource={issues}
        rowKey="id"
        size="small"
        pagination={false}
      />
    );
  };

  // 优化建议列表
  const renderRecommendationsList = () => (
    <List
      dataSource={recommendations}
      renderItem={(item) => (
        <List.Item>
          <Card size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Title level={5} style={{ margin: 0 }}>
                  {item.title}
                </Title>
                <Paragraph style={{ margin: '8px 0', color: '#666' }}>
                  {item.description}
                </Paragraph>
                <Space wrap>
                  <Tag color="blue">{item.category}</Tag>
                  <Tag color={item.difficulty === 'easy' ? 'green' : item.difficulty === 'medium' ? 'orange' : 'red'}>
                    难度: {item.difficulty}
                  </Tag>
                  <Tag color={item.impact === 'high' ? 'red' : item.impact === 'medium' ? 'orange' : 'green'}>
                    影响: {item.impact}
                  </Tag>
                  <Tag color="purple">
                    预期改善: {item.estimatedImprovement}%
                  </Tag>
                </Space>
              </div>
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <Progress
                  type="circle"
                  percent={item.estimatedImprovement}
                  width={60}
                  format={percent => `+${percent}%`}
                />
              </div>
            </div>
          </Card>
        </List.Item>
      )}
    />
  );

  // 问题详情模态框
  const IssueDetailModal = () => (
    <Modal
      title={selectedIssue?.title}
      open={issueDetailVisible}
      onCancel={() => setIssueDetailVisible(false)}
      footer={[
        <Button key="close" onClick={() => setIssueDetailVisible(false)}>
          关闭
        </Button>
      ]}
      width={800}
    >
      {selectedIssue && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message={selectedIssue.description}
            type={selectedIssue.type === 'critical' ? 'error' : 'warning'}
            showIcon
          />
          
          <div>
            <Title level={5}>问题详情</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="影响度" value={selectedIssue.impact} suffix="/ 5" />
              </Col>
              <Col span={12}>
                <Statistic title="出现频率" value={selectedIssue.frequency * 100} suffix="%" />
              </Col>
            </Row>
          </div>
          
          <div>
            <Title level={5}>解决建议</Title>
            <ol>
              {selectedIssue.suggestions.map((suggestion, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  <Text>{suggestion}</Text>
                </li>
              ))}
            </ol>
          </div>
        </Space>
      )}
    </Modal>
  );

  return (
    <div style={{ height, overflow: 'auto' }}>
      {/* 头部概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="性能评分"
              value={performanceScore}
              suffix="/ 100"
              valueStyle={{ 
                color: performanceScore >= 80 ? '#3f8600' : performanceScore >= 60 ? '#faad14' : '#cf1322' 
              }}
              prefix={performanceScore >= 80 ? <TrophyOutlined /> : <WarningOutlined />}
            />
            <Progress 
              percent={performanceScore} 
              strokeColor={performanceScore >= 80 ? '#52c41a' : performanceScore >= 60 ? '#faad14' : '#ff4d4f'}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="检测到的问题"
              value={issueStats.total}
              valueStyle={{ color: issueStats.critical > 0 ? '#cf1322' : '#1890ff' }}
              prefix={<BugOutlined />}
            />
            <Space size="small">
              {issueStats.critical > 0 && <Badge count={issueStats.critical} style={{ backgroundColor: '#ff4d4f' }} />}
              {issueStats.warning > 0 && <Badge count={issueStats.warning} style={{ backgroundColor: '#faad14' }} />}
              {issueStats.info > 0 && <Badge count={issueStats.info} style={{ backgroundColor: '#1890ff' }} />}
            </Space>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="优化建议"
              value={recommendations.length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RocketOutlined />}
            />
            <Text type="secondary">
              预期改善: {recommendations.reduce((sum, r) => sum + r.estimatedImprovement, 0) / recommendations.length || 0}%
            </Text>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Button
              type="primary"
              block
              icon={<ThunderboltOutlined />}
              loading={analyzing}
              onClick={runDeepAnalysis}
            >
              {analyzing ? '分析中...' : '开始分析'}
            </Button>
            {analysisComplete && (
              <Text type="success" style={{ fontSize: '12px', display: 'block', textAlign: 'center', marginTop: '8px' }}>
                <CheckCircleOutlined /> 分析完成
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      {analysisComplete && (
        <Collapse defaultActiveKey={['performance', 'issues']}>
          <Panel header="性能趋势分析" key="performance">
            <Row gutter={[16, 16]}>
              <Col span={16}>
                <Card title="命中率趋势" size="small">
                  {renderPerformanceTrends()}
                </Card>
              </Col>
              <Col span={8}>
                <Card title="问题分布" size="small">
                  {renderIssueDistribution()}
                </Card>
              </Col>
            </Row>
          </Panel>
          
          <Panel header={`性能问题列表 (${issueStats.total})`} key="issues">
            {issues.length > 0 ? (
              renderIssuesList()
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text>未发现性能问题，系统运行良好！</Text>
                </div>
              </div>
            )}
          </Panel>
          
          <Panel header={`优化建议 (${recommendations.length})`} key="recommendations">
            {renderRecommendationsList()}
          </Panel>
        </Collapse>
      )}

      <IssueDetailModal />
    </div>
  );
};

export default PerformanceAnalyzer;