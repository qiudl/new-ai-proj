import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Space,
  Tooltip,
  Switch,
  Spin,
  Alert,
  Typography,
  Progress,
  Statistic,
  Tag,
  Divider,
  Table,
  Badge
} from 'antd';
import {
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  SettingOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import * as d3 from 'd3';
import {
  Resource,
  ResourceAllocation,
  ResourceUtilizationStats,
  LoadBalancingResult,
  ResourceOptimizationConfig,
  LoadBalancingSuggestion,
  SuggestionType
} from '../../services/resourceManagementService';
import { LoadBalancingMetrics } from '../../algorithms/LoadBalancer';
import './ResourceVisualizationChart.css';

const { Title, Text } = Typography;
const { Option } = Select;

export interface ResourceVisualizationChartProps {
  resources: Resource[];
  allocations: ResourceAllocation[];
  loadBalancingResult?: LoadBalancingResult;
  config?: ResourceOptimizationConfig;
  onConfigChange?: (config: ResourceOptimizationConfig) => void;
  onRebalance?: (strategy: string) => void;
  loading?: boolean;
}

type ChartType = 'utilization_bar' | 'allocation_pie' | 'timeline' | 'load_balance';
type TimeRange = '1d' | '1w' | '1m' | '3m';

interface UtilizationData {
  resourceId: string;
  resourceName: string;
  utilization: number;
  capacity: number;
  allocated: number;
  available: number;
  efficiency: number;
  status: 'normal' | 'warning' | 'danger';
}

const ResourceVisualizationChart: React.FC<ResourceVisualizationChartProps> = ({
  resources = [],
  allocations = [],
  loadBalancingResult,
  config = {},
  onConfigChange,
  onRebalance,
  loading = false
}) => {
  // 状态管理
  const [chartType, setChartType] = useState<ChartType>('utilization_bar');
  const [timeRange, setTimeRange] = useState<TimeRange>('1w');
  const [showEfficiency, setShowEfficiency] = useState(true);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // 数据处理
  const utilizationData = useMemo<UtilizationData[]>(() => {
    return resources.map(resource => {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const allocated = resourceAllocations.reduce((sum, a) => sum + a.allocatedHours, 0);
      const capacity = resource.capacity * 40; // 假设每周40小时
      const utilization = capacity > 0 ? allocated / capacity : 0;
      const available = Math.max(0, capacity - allocated);
      
      // 计算状态
      let status: 'normal' | 'warning' | 'danger' = 'normal';
      if (utilization > 1.0) status = 'danger';
      else if (utilization > 0.8) status = 'warning';
      
      return {
        resourceId: resource.id,
        resourceName: resource.name,
        utilization,
        capacity,
        allocated,
        available,
        efficiency: 0.85, // 简化处理，实际应从loadBalancingResult获取
        status
      };
    });
  }, [resources, allocations]);

  // 渲染利用率柱状图
  const renderUtilizationBarChart = useCallback(() => {
    if (utilizationData.length === 0) return null;

    return (
      <div className="utilization-bar-chart">
        <Row gutter={[16, 16]}>
          {utilizationData.map(data => (
            <Col key={data.resourceId} span={24}>
              <Card  className={`resource-card ${data.status}`}>
                <Row align="middle" gutter={16}>
                  <Col span={6}>
                    <Text strong>{data.resourceName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {data.allocated}h / {data.capacity}h
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Progress
                      percent={Math.round(data.utilization * 100)}
                      status={data.utilization > 1 ? 'exception' : data.utilization > 0.8 ? 'active' : 'normal'}
                      strokeColor={
                        data.utilization > 1 ? '#ff4d4f' :
                        data.utilization > 0.8 ? '#fa8c16' : '#52c41a'
                      }
                      format={(percent) => `${percent}%`}
                    />
                  </Col>
                  <Col span={4}>
                    <Space>
                      <Tag color={data.status === 'danger' ? 'red' : data.status === 'warning' ? 'orange' : 'green'}>
                        {data.status === 'danger' ? '过载' : data.status === 'warning' ? '繁忙' : '正常'}
                      </Tag>
                      {showEfficiency && (
                        <Tooltip title="资源效率">
                          <Text type="secondary">{Math.round(data.efficiency * 100)}%</Text>
                        </Tooltip>
                      )}
                    </Space>
                  </Col>
                  <Col span={2}>
                    <Button
                      type="text"
                      
                      icon={<InfoCircleOutlined />}
                      onClick={() => setSelectedResource(data.resourceId)}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }, [utilizationData, showEfficiency]);

  // 渲染分配饼图
  const renderAllocationPieChart = useCallback(() => {
    if (utilizationData.length === 0) return null;

    const chartData = utilizationData.map(data => ({
      name: data.resourceName,
      value: data.allocated,
      utilization: data.utilization
    }));

    return (
      <div className="allocation-pie-chart">
        <Row gutter={16}>
          <Col span={16}>
            <div id="pie-chart-container" style={{ height: '400px' }}>
              {/* D3饼图将在这里渲染 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#999'
              }}>
                <PieChartOutlined style={{ fontSize: '48px', marginRight: '16px' }} />
                <span>资源分配饼图</span>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="pie-chart-legend">
              <Title level={5}>资源分配详情</Title>
              {chartData.map((item, index) => (
                <div key={index} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: d3.schemeCategory10[index % 10] }} />
                  <div className="legend-info">
                    <Text strong>{item.name}</Text>
                    <br />
                    <Text type="secondary">{item.value}h ({Math.round(item.utilization * 100)}%)</Text>
                  </div>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </div>
    );
  }, [utilizationData]);

  // 渲染负载均衡指标
  const renderLoadBalanceMetrics = useCallback(() => {
    if (!loadBalancingResult) {
      return (
        <Alert
          message="负载均衡数据不可用"
          description="请先执行负载均衡算法以查看详细指标"
          type="info"
          showIcon
        />
      );
    }

    const { utilizationStats, efficiency, totalCost } = loadBalancingResult;
    const avgUtilization = utilizationStats.reduce((sum, stat) => sum + stat.utilizationRate, 0) / utilizationStats.length;
    const maxUtilization = Math.max(...utilizationStats.map(stat => stat.utilizationRate));
    const minUtilization = Math.min(...utilizationStats.map(stat => stat.utilizationRate));
    const overloadedResources = utilizationStats.filter(stat => stat.utilizationRate > 1).length;

    return (
      <div className="load-balance-metrics">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均利用率"
                value={avgUtilization * 100}
                precision={1}
                suffix="%"
                prefix={
                  avgUtilization > 0.8 ? <RiseOutlined style={{ color: '#fa8c16' }} /> :
                  avgUtilization < 0.5 ? <FallOutlined style={{ color: '#1890ff' }} /> :
                  <MinusOutlined style={{ color: '#52c41a' }} />
                }
                valueStyle={{ 
                  color: avgUtilization > 0.8 ? '#fa8c16' : avgUtilization < 0.5 ? '#1890ff' : '#52c41a' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="负载方差"
                value={(maxUtilization - minUtilization) * 100}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: (maxUtilization - minUtilization) > 0.3 ? '#fa8c16' : '#52c41a' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="系统效率"
                value={efficiency * 100}
                precision={1}
                suffix="%"
                valueStyle={{ color: efficiency > 0.8 ? '#52c41a' : '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总成本"
                value={totalCost}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {overloadedResources > 0 && (
          <Alert
            message={`发现 ${overloadedResources} 个过载资源`}
            description="建议执行负载重新分配或增加资源容量"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
            action={
              <Button  onClick={() => onRebalance?.('LEAST_CONNECTIONS')}>
                重新平衡
              </Button>
            }
          />
        )}
      </div>
    );
  }, [loadBalancingResult, onRebalance]);

  // 渲染优化建议
  const renderOptimizationSuggestions = useCallback(() => {
    if (!loadBalancingResult?.suggestions || loadBalancingResult.suggestions.length === 0) {
      return (
        <Alert
          message="暂无优化建议"
          description="当前资源分配状态良好"
          type="success"
          showIcon
        />
      );
    }

    const columns: ColumnsType<LoadBalancingSuggestion> = [
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: SuggestionType) => {
          const typeConfig = {
            [SuggestionType.REBALANCE_ALLOCATION]: { color: 'blue', text: '重新分配' },
            [SuggestionType.ADD_RESOURCES]: { color: 'orange', text: '增加资源' },
            [SuggestionType.COST_OPTIMIZATION]: { color: 'green', text: '成本优化' },
            [SuggestionType.SKILL_OPTIMIZATION]: { color: 'purple', text: '技能匹配' },
            [SuggestionType.ADJUST_TIMELINE]: { color: 'red', text: '调度调整' }
          };
          const config = typeConfig[type];
          return <Tag color={config.color}>{config.text}</Tag>;
        }
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 80,
        render: (priority: string) => {
          const colors = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };
          return <Tag color={colors[priority as keyof typeof colors]}>{priority}</Tag>;
        }
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true
      },
      {
        title: '预期改善',
        dataIndex: 'expectedImprovement',
        key: 'expectedImprovement',
        width: 100,
        render: (improvement: number) => `${Math.round(improvement * 100)}%`
      },
      {
        title: '预估工作量',
        dataIndex: 'estimatedEffort',
        key: 'estimatedEffort',
        width: 100,
        render: (effort: number) => `${effort}h`
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Space>
            <Button 
               
              type="primary"
              onClick={() => {
                // 实施建议的逻辑
                console.log('Implementing suggestion:', record);
              }}
            >
              实施
            </Button>
          </Space>
        )
      }
    ];

    return (
      <Table
        columns={columns}
        dataSource={loadBalancingResult.suggestions}
        rowKey={(record, index) => `suggestion_${index}`}
        pagination={false}
        
      />
    );
  }, [loadBalancingResult?.suggestions]);

  // 主渲染函数
  const renderChartContent = useCallback(() => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="加载资源数据..." />
        </div>
      );
    }

    switch (chartType) {
      case 'utilization_bar':
        return renderUtilizationBarChart();
      case 'allocation_pie':
        return renderAllocationPieChart();
      case 'load_balance':
        return renderLoadBalanceMetrics();
      case 'timeline':
        return (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
            <LineChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>时间轴视图开发中...</div>
          </div>
        );
      default:
        return null;
    }
  }, [chartType, loading, renderUtilizationBarChart, renderAllocationPieChart, renderLoadBalanceMetrics]);

  return (
    <div className="resource-visualization-chart">
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>资源可视化分析</span>
            <Badge count={utilizationData.filter(d => d.status !== 'normal').length} >
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Badge>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={chartType}
              onChange={setChartType}
              style={{ width: 150 }}
              
            >
              <Option value="utilization_bar">利用率视图</Option>
              <Option value="allocation_pie">分配饼图</Option>
              <Option value="load_balance">负载均衡</Option>
              <Option value="timeline">时间轴视图</Option>
            </Select>
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 100 }}
              
            >
              <Option value="1d">1天</Option>
              <Option value="1w">1周</Option>
              <Option value="1m">1月</Option>
              <Option value="3m">3月</Option>
            </Select>
            <Switch
              checked={showEfficiency}
              onChange={setShowEfficiency}
              checkedChildren="效率"
              unCheckedChildren="效率"
              
            />
            <Button icon={<ReloadOutlined />}  loading={loading} />
            <Button icon={<DownloadOutlined />}  />
            <Button icon={<SettingOutlined />}  />
          </Space>
        }
      >
        {renderChartContent()}
      </Card>

      {/* 优化建议面板 */}
      {chartType === 'load_balance' && (
        <Card
          title="优化建议"
          style={{ marginTop: 16 }}
        >
          {renderOptimizationSuggestions()}
        </Card>
      )}

      {/* 资源详情模态框 - 可以后续添加 */}
    </div>
  );
};

export default ResourceVisualizationChart;