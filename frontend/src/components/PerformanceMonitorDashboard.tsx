import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Progress,
  Tag,
  Typography,
  Select,
  DatePicker,
  Space,
  Button,
  Alert,
  Tabs,
  List,
  Tooltip,
  Modal,
  Timeline,
  message,
} from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BugOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  ComponentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  usePerformanceMonitor,
  type PerformanceMetric,
  type PerformanceStats,
  type ErrorStats,
  type ApiMetric,
} from '../services/performanceMonitor';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface PerformanceMonitorDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export const PerformanceMonitorDashboard: React.FC<PerformanceMonitorDashboardProps> = ({
  visible,
  onClose,
}) => {
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'hour'),
    dayjs(),
  ]);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30秒
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null);

  const {
    getPerformanceStats,
    getErrorStats,
    getMetrics,
    addListener,
    removeListener,
    exportData,
  } = usePerformanceMonitor();

  // 实时数据
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<PerformanceMetric[]>([]);

  // 刷新数据
  const refreshData = () => {
    const range = {
      start: timeRange[0].toISOString(),
      end: timeRange[1].toISOString(),
    };

    setPerformanceStats(getPerformanceStats(range));
    setErrorStats(getErrorStats(range));
    setRecentMetrics(getMetrics({
      timeRange: range,
      limit: 100,
    }));
  };

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !visible) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, visible, timeRange]);

  // 实时监听新指标
  useEffect(() => {
    if (!visible) return;

    const handleNewMetric = (metric: PerformanceMetric) => {
      const metricTime = dayjs(metric.timestamp);
      if (metricTime.isAfter(timeRange[0]) && metricTime.isBefore(timeRange[1])) {
        refreshData();
      }
    };

    addListener(handleNewMetric);
    return () => removeListener(handleNewMetric);
  }, [visible, timeRange]);

  // 初始加载
  useEffect(() => {
    if (visible) {
      refreshData();
    }
  }, [visible, timeRange]);

  // API性能表格列
  const apiColumns = [
    {
      title: 'API端点',
      dataIndex: 'url',
      key: 'url',
      render: (url: string, record: ApiMetric) => (
        <Space>
          <Tag color={record.method === 'GET' ? 'blue' : record.method === 'POST' ? 'green' : 'orange'}>
            {record.method}
          </Tag>
          <Text code style={{ fontSize: '12px' }}>
            {url.length > 50 ? `...${url.slice(-50)}` : url}
          </Text>
        </Space>
      ),
      width: '40%',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number, record: ApiMetric) => (
        <Tag color={record.success ? 'success' : 'error'}>
          {status}
        </Tag>
      ),
      width: '10%',
    },
    {
      title: '响应时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => (
        <Text type={duration > 2000 ? 'danger' : duration > 1000 ? 'warning' : undefined}>
          {Math.round(duration)}ms
        </Text>
      ),
      width: '15%',
      sorter: (a: ApiMetric, b: ApiMetric) => (a.duration || 0) - (b.duration || 0),
    },
    {
      title: '响应大小',
      dataIndex: 'responseSize',
      key: 'responseSize',
      render: (size: number) => (
        <Text>{size ? `${(size / 1024).toFixed(1)}KB` : '-'}</Text>
      ),
      width: '15%',
    },
    {
      title: '缓存',
      dataIndex: 'cacheHit',
      key: 'cacheHit',
      render: (cacheHit: boolean) => (
        <Tag color={cacheHit ? 'success' : 'default'}>
          {cacheHit ? '命中' : '未命中'}
        </Tag>
      ),
      width: '10%',
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {dayjs(timestamp).format('HH:mm:ss')}
        </Text>
      ),
      width: '10%',
    },
  ];

  // 性能等级计算
  const getPerformanceGrade = (stats: PerformanceStats): { grade: string; color: string } => {
    const { averageResponseTime, errorRate } = stats;
    
    if (averageResponseTime < 200 && errorRate < 1) {
      return { grade: 'A+', color: '#52c41a' };
    } else if (averageResponseTime < 500 && errorRate < 2) {
      return { grade: 'A', color: '#1890ff' };
    } else if (averageResponseTime < 1000 && errorRate < 5) {
      return { grade: 'B', color: '#faad14' };
    } else if (averageResponseTime < 2000 && errorRate < 10) {
      return { grade: 'C', color: '#fa8c16' };
    } else {
      return { grade: 'D', color: '#ff4d4f' };
    }
  };

  // 过滤API指标
  const apiMetrics = useMemo(() => {
    return recentMetrics
      .filter(m => m.type === 'api')
      .map(m => ({ ...m, key: m.id })) as (ApiMetric & { key: string })[];
  }, [recentMetrics]);

  if (!performanceStats || !errorStats) {
    return null;
  }

  const performanceGrade = getPerformanceGrade(performanceStats);

  return (
    <Modal
      title={
        <Space>
          <DashboardOutlined />
          性能监控仪表板
          <Tag color={performanceGrade.color}>{performanceGrade.grade}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="export" icon={<DownloadOutlined />} onClick={() => exportData('json')}>
          导出数据
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={refreshData}>
          刷新
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 控制面板 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 8]} align="middle">
            <Col flex="auto">
              <Space>
                <Text strong>时间范围:</Text>
                <RangePicker
                  size="small"
                  value={timeRange}
                  onChange={(dates) => dates && setTimeRange(dates)}
                  showTime
                  format="MM-DD HH:mm"
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <Text>自动刷新:</Text>
                <Select
                  size="small"
                  value={autoRefresh ? refreshInterval : 0}
                  onChange={(value) => {
                    setAutoRefresh(value > 0);
                    if (value > 0) setRefreshInterval(value);
                  }}
                  style={{ width: '100px' }}
                >
                  <Option value={0}>关闭</Option>
                  <Option value={10000}>10秒</Option>
                  <Option value={30000}>30秒</Option>
                  <Option value={60000}>1分钟</Option>
                </Select>
              </Space>
            </Col>
          </Row>
        </Card>

        <Tabs defaultActiveKey="overview">
          {/* 概览标签页 */}
          <TabPane tab={<><DashboardOutlined /> 概览</>} key="overview">
            {/* 关键指标 */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总请求数"
                    value={performanceStats.totalRequests}
                    prefix={<ApiOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均响应时间"
                    value={performanceStats.averageResponseTime}
                    suffix="ms"
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ 
                      color: performanceStats.averageResponseTime > 1000 ? '#ff4d4f' : '#3f8600' 
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="错误率"
                    value={performanceStats.errorRate}
                    suffix="%"
                    prefix={<ExclamationCircleOutlined />}
                    valueStyle={{ 
                      color: performanceStats.errorRate > 5 ? '#ff4d4f' : '#3f8600' 
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="缓存命中率"
                    value={performanceStats.cacheHitRate}
                    suffix="%"
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 响应时间分布 */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Card title="响应时间分布" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text>P50 (中位数): </Text>
                      <Text strong>{performanceStats.p50ResponseTime}ms</Text>
                    </div>
                    <Progress 
                      percent={Math.min((performanceStats.p50ResponseTime / 2000) * 100, 100)}
                      status={performanceStats.p50ResponseTime > 1000 ? 'exception' : 'success'}
                      size="small"
                    />
                    
                    <div>
                      <Text>P95: </Text>
                      <Text strong>{performanceStats.p95ResponseTime}ms</Text>
                    </div>
                    <Progress 
                      percent={Math.min((performanceStats.p95ResponseTime / 5000) * 100, 100)}
                      status={performanceStats.p95ResponseTime > 2000 ? 'exception' : 'success'}
                      size="small"
                    />
                    
                    <div>
                      <Text>P99: </Text>
                      <Text strong>{performanceStats.p99ResponseTime}ms</Text>
                    </div>
                    <Progress 
                      percent={Math.min((performanceStats.p99ResponseTime / 10000) * 100, 100)}
                      status={performanceStats.p99ResponseTime > 5000 ? 'exception' : 'success'}
                      size="small"
                    />
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="系统健康状态" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                      message={`系统性能等级: ${performanceGrade.grade}`}
                      type={performanceGrade.grade.startsWith('A') ? 'success' : 
                            performanceGrade.grade === 'B' ? 'warning' : 'error'}
                      showIcon
                    />
                    
                    <div>
                      <Text>慢请求数量 (&gt;2s): </Text>
                      <Text strong type={performanceStats.slowRequestsCount > 0 ? 'danger' : undefined}>
                        {performanceStats.slowRequestsCount}
                      </Text>
                    </div>
                    
                    <div>
                      <Text>成功请求: </Text>
                      <Text strong style={{ color: '#52c41a' }}>
                        {performanceStats.successfulRequests}
                      </Text>
                      <Text> / 失败请求: </Text>
                      <Text strong style={{ color: '#ff4d4f' }}>
                        {performanceStats.failedRequests}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* API监控标签页 */}
          <TabPane tab={<><ApiOutlined /> API监控</>} key="api">
            <Table
              columns={apiColumns}
              dataSource={apiMetrics}
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ y: 400 }}
              onRow={(record) => ({
                onClick: () => setSelectedMetric(record),
              })}
            />
          </TabPane>

          {/* 错误监控标签页 */}
          <TabPane tab={<><BugOutlined /> 错误监控</>} key="errors">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="错误统计" size="small">
                  <Statistic
                    title="总错误数"
                    value={errorStats.totalErrors}
                    prefix={<ExclamationCircleOutlined />}
                    style={{ marginBottom: '16px' }}
                  />
                  
                  <Title level={5}>按类型统计:</Title>
                  <List
                    size="small"
                    dataSource={Object.entries(errorStats.errorsByType)}
                    renderItem={([errorType, count]) => (
                      <List.Item>
                        <Text>{errorType}</Text>
                        <Tag color="error">{count}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="最常见错误" size="small">
                  <List
                    size="small"
                    dataSource={errorStats.topErrors}
                    renderItem={(error) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Text ellipsis style={{ maxWidth: '200px' }}>
                              {error.error}
                            </Text>
                          }
                          description={
                            <Space>
                              <Tag color="error">次数: {error.count}</Tag>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                最后出现: {dayjs(error.lastOccurred).format('HH:mm:ss')}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 实时监控标签页 */}
          <TabPane tab={<><GlobalOutlined /> 实时监控</>} key="realtime">
            <Card title="最近活动" size="small">
              <Timeline mode="left">
                {recentMetrics.slice(0, 20).map((metric) => (
                  <Timeline.Item
                    key={metric.id}
                    color={metric.success ? 'green' : 'red'}
                    label={dayjs(metric.timestamp).format('HH:mm:ss')}
                  >
                    <Space>
                      <Tag color={
                        metric.type === 'api' ? 'blue' :
                        metric.type === 'component' ? 'purple' :
                        metric.type === 'user-action' ? 'orange' : 'default'
                      }>
                        {metric.type}
                      </Tag>
                      <Text>{metric.name}</Text>
                      {metric.duration && (
                        <Text type="secondary">
                          {Math.round(metric.duration)}ms
                        </Text>
                      )}
                    </Space>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </TabPane>
        </Tabs>

        {/* 指标详情模态框 */}
        <Modal
          title="指标详情"
          open={!!selectedMetric}
          onCancel={() => setSelectedMetric(null)}
          footer={[
            <Button key="close" onClick={() => setSelectedMetric(null)}>
              关闭
            </Button>,
          ]}
        >
          {selectedMetric && (
            <div>
              <Row gutter={[16, 8]}>
                <Col span={8}><Text strong>ID:</Text></Col>
                <Col span={16}><Text code>{selectedMetric.id}</Text></Col>
                
                <Col span={8}><Text strong>类型:</Text></Col>
                <Col span={16}>
                  <Tag color={
                    selectedMetric.type === 'api' ? 'blue' :
                    selectedMetric.type === 'component' ? 'purple' :
                    selectedMetric.type === 'user-action' ? 'orange' : 'default'
                  }>
                    {selectedMetric.type}
                  </Tag>
                </Col>
                
                <Col span={8}><Text strong>名称:</Text></Col>
                <Col span={16}><Text>{selectedMetric.name}</Text></Col>
                
                <Col span={8}><Text strong>状态:</Text></Col>
                <Col span={16}>
                  <Tag color={selectedMetric.success ? 'success' : 'error'}>
                    {selectedMetric.success ? '成功' : '失败'}
                  </Tag>
                </Col>
                
                {selectedMetric.duration && (
                  <>
                    <Col span={8}><Text strong>耗时:</Text></Col>
                    <Col span={16}><Text>{Math.round(selectedMetric.duration)}ms</Text></Col>
                  </>
                )}
                
                <Col span={8}><Text strong>时间:</Text></Col>
                <Col span={16}><Text>{dayjs(selectedMetric.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Text></Col>
                
                {selectedMetric.error && (
                  <>
                    <Col span={8}><Text strong>错误:</Text></Col>
                    <Col span={16}><Text type="danger">{selectedMetric.error}</Text></Col>
                  </>
                )}
                
                {selectedMetric.type === 'api' && (
                  <>
                    <Col span={8}><Text strong>URL:</Text></Col>
                    <Col span={16}><Text code>{(selectedMetric as ApiMetric).url}</Text></Col>
                    
                    <Col span={8}><Text strong>方法:</Text></Col>
                    <Col span={16}>
                      <Tag color={(selectedMetric as ApiMetric).method === 'GET' ? 'blue' : 'green'}>
                        {(selectedMetric as ApiMetric).method}
                      </Tag>
                    </Col>
                    
                    <Col span={8}><Text strong>状态码:</Text></Col>
                    <Col span={16}><Text>{(selectedMetric as ApiMetric).status}</Text></Col>
                  </>
                )}
                
                {selectedMetric.metadata && (
                  <>
                    <Col span={8}><Text strong>元数据:</Text></Col>
                    <Col span={16}>
                      <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
                        {JSON.stringify(selectedMetric.metadata, null, 2)}
                      </pre>
                    </Col>
                  </>
                )}
              </Row>
            </div>
          )}
        </Modal>
      </div>
    </Modal>
  );
};