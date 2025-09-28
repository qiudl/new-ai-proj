/**
 * 缓存监控仪表板
 * 提供实时缓存性能监控和可视化分析
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Alert,
  Switch,
  Tabs,
  Button,
  Space,
  Tooltip,
  Badge,
  Typography,
  Select,
  DatePicker,
  Modal
} from 'antd';
import {
  DashboardOutlined,
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { Line, Area, Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import { useCacheState, CacheMetricsReport } from '../../hooks/useCacheState';
import { cacheEventSystem, CacheEvent } from '../../utils/cacheEventSystem';
import { enhancedCacheManager } from '../../utils/enhancedCacheManager';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface DashboardConfig {
  refreshInterval: number;
  showAlerts: boolean;
  enableAutoRefresh: boolean;
  metricsRetentionDays: number;
  alertThresholds: {
    lowHitRate: number;
    highMemoryUsage: number;
    slowResponseTime: number;
  };
}

interface Props {
  height?: number;
  onExportMetrics?: (report: CacheMetricsReport) => void;
  onConfigChange?: (config: DashboardConfig) => void;
  initialConfig?: Partial<DashboardConfig>;
}

const defaultConfig: DashboardConfig = {
  refreshInterval: 5000,
  showAlerts: true,
  enableAutoRefresh: true,
  metricsRetentionDays: 7,
  alertThresholds: {
    lowHitRate: 70,
    highMemoryUsage: 80,
    slowResponseTime: 1000
  }
};

export const CacheMonitorDashboard: React.FC<Props> = ({
  height = 800,
  onExportMetrics,
  onConfigChange,
  initialConfig = {}
}) => {
  // 配置状态
  const [config, setConfig] = useState<DashboardConfig>({
    ...defaultConfig,
    ...initialConfig
  });
  
  // 组件状态
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  
  // 缓存状态和指标
  const {
    stats,
    realtimeMetrics,
    hotKeys,
    anomalies,
    actions,
    loading,
    recentEvents,
    performanceTrend
  } = useCacheState();

  // 配置更新处理
  const handleConfigChange = (newConfig: Partial<DashboardConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  // 导出指标报告
  const handleExportMetrics = () => {
    const report = actions.exportMetrics();
    onExportMetrics?.(report);
    
    // 默认下载为JSON文件
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-metrics-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 计算告警状态
  const alertStatus = useMemo(() => {
    const alerts = [];
    
    if (realtimeMetrics.hitRate < config.alertThresholds.lowHitRate) {
      alerts.push({
        type: 'warning' as const,
        message: `缓存命中率过低: ${realtimeMetrics.hitRate.toFixed(1)}%`,
        key: 'low-hit-rate'
      });
    }
    
    if (realtimeMetrics.memoryUsage > config.alertThresholds.highMemoryUsage) {
      alerts.push({
        type: 'error' as const,
        message: `内存使用率过高: ${realtimeMetrics.memoryUsage.toFixed(1)}MB`,
        key: 'high-memory'
      });
    }
    
    if (performanceTrend.responseTimes.length > 0) {
      const avgResponseTime = performanceTrend.responseTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (avgResponseTime > config.alertThresholds.slowResponseTime) {
        alerts.push({
          type: 'warning' as const,
          message: `响应时间过慢: ${avgResponseTime.toFixed(0)}ms`,
          key: 'slow-response'
        });
      }
    }
    
    return alerts;
  }, [realtimeMetrics, performanceTrend, config.alertThresholds]);

  // 概览指标卡片
  const OverviewCards = () => (
    <Row gutter={[16, 16]}>
      <Col span={6}>
        <Card>
          <Statistic
            title="缓存命中率"
            value={realtimeMetrics.hitRate}
            precision={1}
            suffix="%"
            valueStyle={{ 
              color: realtimeMetrics.hitRate >= 70 ? '#3f8600' : '#cf1322' 
            }}
            prefix={<ThunderboltOutlined />}
          />
          <Progress 
            percent={realtimeMetrics.hitRate} 
            strokeColor={realtimeMetrics.hitRate >= 70 ? '#52c41a' : '#ff4d4f'}
            showInfo={false}
            size="small"
          />
        </Card>
      </Col>
      
      <Col span={6}>
        <Card>
          <Statistic
            title="内存使用"
            value={realtimeMetrics.memoryUsage}
            precision={1}
            suffix="MB"
            valueStyle={{ 
              color: realtimeMetrics.memoryUsage < 50 ? '#3f8600' : '#cf1322' 
            }}
            prefix={<DatabaseOutlined />}
          />
          <Progress 
            percent={Math.min(realtimeMetrics.memoryUsage, 100)} 
            strokeColor={realtimeMetrics.memoryUsage < 50 ? '#52c41a' : '#ff4d4f'}
            showInfo={false}
            size="small"
          />
        </Card>
      </Col>
      
      <Col span={6}>
        <Card>
          <Statistic
            title="活跃操作"
            value={realtimeMetrics.activeOperations}
            valueStyle={{ color: '#1890ff' }}
            prefix={<ClockCircleOutlined />}
          />
          <Text type="secondary">
            最近1分钟: {realtimeMetrics.recentOperations} 次
          </Text>
        </Card>
      </Col>
      
      <Col span={6}>
        <Card>
          <Statistic
            title="错误率"
            value={realtimeMetrics.errorRate}
            precision={2}
            suffix="%"
            valueStyle={{ 
              color: realtimeMetrics.errorRate < 1 ? '#3f8600' : '#cf1322' 
            }}
            prefix={<WarningOutlined />}
          />
          <Text type="secondary">
            总条目: {stats.totalEntries}
          </Text>
        </Card>
      </Col>
    </Row>
  );

  // 性能趋势图表
  const PerformanceTrends = () => {
    const trendData = performanceTrend.hitRates.map((hitRate, index) => ({
      time: index,
      hitRate,
      memoryUsage: performanceTrend.memoryUsages[index] || 0,
      responseTime: performanceTrend.responseTimes[index] || 0
    }));

    const hitRateConfig = {
      data: trendData,
      xField: 'time',
      yField: 'hitRate',
      smooth: true,
      color: '#1890ff',
      point: { size: 3 },
      yAxis: { min: 0, max: 100 }
    };

    const memoryConfig = {
      data: trendData,
      xField: 'time',
      yField: 'memoryUsage',
      smooth: true,
      color: '#52c41a',
      point: { size: 3 }
    };

    const responseTimeConfig = {
      data: trendData,
      xField: 'time',
      yField: 'responseTime',
      smooth: true,
      color: '#faad14',
      point: { size: 3 }
    };

    return (
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="命中率趋势" size="small">
            <Line {...hitRateConfig} height={200} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="内存使用趋势" size="small">
            <Line {...memoryConfig} height={200} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="响应时间趋势" size="small">
            <Line {...responseTimeConfig} height={200} />
          </Card>
        </Col>
      </Row>
    );
  };

  // 热点键分析
  const HotKeysAnalysis = () => {
    const columns = [
      {
        title: '缓存键',
        dataIndex: 'key',
        key: 'key',
        render: (key: string) => (
          <Text code style={{ fontSize: '12px' }}>
            {key.length > 50 ? `${key.substring(0, 50)}...` : key}
          </Text>
        )
      },
      {
        title: '访问次数',
        dataIndex: 'accessCount',
        key: 'accessCount',
        render: (count: number) => (
          <Badge count={count} overflowCount={9999} />
        ),
        sorter: (a: any, b: any) => a.accessCount - b.accessCount
      },
      {
        title: '热度',
        key: 'popularity',
        render: (_: any, record: any) => {
          const maxCount = Math.max(...hotKeys.map(k => k.accessCount));
          const percent = (record.accessCount / maxCount) * 100;
          return (
            <Progress 
              percent={percent} 
              size="small" 
              strokeColor={percent > 80 ? '#ff4d4f' : percent > 50 ? '#faad14' : '#52c41a'}
            />
          );
        }
      }
    ];

    return (
      <Card title="热点键分析" extra={
        <Tooltip title="显示访问频率最高的缓存键">
          <InfoCircleOutlined />
        </Tooltip>
      }>
        <Table
          columns={columns}
          dataSource={hotKeys.slice(0, 10)}
          rowKey="key"
          size="small"
          pagination={false}
        />
      </Card>
    );
  };

  // 最近事件日志
  const RecentEventsLog = () => {
    const eventColumns = [
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 120,
        render: (timestamp: number) => (
          <Text type="secondary">
            {dayjs(timestamp).format('HH:mm:ss')}
          </Text>
        )
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 80,
        render: (type: CacheEvent['type']) => {
          const colors = {
            hit: 'green',
            miss: 'orange',
            set: 'blue',
            delete: 'red',
            invalidate: 'purple',
            cleanup: 'gray',
            get: 'cyan'
          };
          return <Tag color={colors[type] || 'default'}>{type}</Tag>;
        }
      },
      {
        title: '键',
        dataIndex: 'key',
        key: 'key',
        render: (key: string) => (
          <Text code style={{ fontSize: '11px' }}>
            {key.length > 30 ? `${key.substring(0, 30)}...` : key}
          </Text>
        )
      },
      {
        title: '来源',
        dataIndex: 'source',
        key: 'source',
        width: 120,
        render: (source: string) => (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {source}
          </Text>
        )
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        key: 'duration',
        width: 60,
        render: (duration?: number) => {
          if (!duration) return '-';
          return (
            <Text style={{ 
              color: duration > 500 ? '#ff4d4f' : duration > 200 ? '#faad14' : '#52c41a' 
            }}>
              {duration}ms
            </Text>
          );
        }
      }
    ];

    return (
      <Card title="最近事件" extra={
        <Button 
          size="small" 
          icon={<ReloadOutlined />} 
          onClick={() => window.location.reload()}
        >
          刷新
        </Button>
      }>
        <Table
          columns={eventColumns}
          dataSource={recentEvents}
          rowKey={(record) => `${record.timestamp}-${record.key}`}
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
          scroll={{ y: 300 }}
        />
      </Card>
    );
  };

  // 异常检测面板
  const AnomaliesPanel = () => {
    if (!config.showAlerts || alertStatus.length === 0) {
      return (
        <Alert
          message="系统运行正常"
          description="未检测到性能异常"
          type="success"
          icon={<CheckCircleOutlined />}
          showIcon
        />
      );
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {alertStatus.map(alert => (
          <Alert
            key={alert.key}
            message={alert.message}
            type={alert.type}
            showIcon
            action={
              <Button size="small" type="text">
                处理
              </Button>
            }
          />
        ))}
      </Space>
    );
  };

  // 配置模态框
  const ConfigModal = () => (
    <Modal
      title="监控配置"
      open={isConfigModalVisible}
      onOk={() => setIsConfigModalVisible(false)}
      onCancel={() => setIsConfigModalVisible(false)}
      footer={[
        <Button key="cancel" onClick={() => setIsConfigModalVisible(false)}>
          取消
        </Button>,
        <Button 
          key="reset" 
          onClick={() => {
            setConfig(defaultConfig);
            actions.resetStats();
          }}
        >
          重置
        </Button>,
        <Button 
          key="ok" 
          type="primary" 
          onClick={() => setIsConfigModalVisible(false)}
        >
          确定
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>刷新间隔 (毫秒):</Text>
          <Select
            value={config.refreshInterval}
            onChange={(value) => handleConfigChange({ refreshInterval: value })}
            style={{ width: '100%', marginTop: 8 }}
          >
            <Select.Option value={1000}>1秒</Select.Option>
            <Select.Option value={5000}>5秒</Select.Option>
            <Select.Option value={10000}>10秒</Select.Option>
            <Select.Option value={30000}>30秒</Select.Option>
          </Select>
        </div>
        
        <div>
          <Text strong>低命中率阈值 (%):</Text>
          <Select
            value={config.alertThresholds.lowHitRate}
            onChange={(value) => handleConfigChange({ 
              alertThresholds: { ...config.alertThresholds, lowHitRate: value }
            })}
            style={{ width: '100%', marginTop: 8 }}
          >
            <Select.Option value={50}>50%</Select.Option>
            <Select.Option value={70}>70%</Select.Option>
            <Select.Option value={80}>80%</Select.Option>
            <Select.Option value={90}>90%</Select.Option>
          </Select>
        </div>
        
        <div>
          <Space>
            <Switch
              checked={config.showAlerts}
              onChange={(checked) => handleConfigChange({ showAlerts: checked })}
            />
            <Text>显示告警</Text>
          </Space>
        </div>
        
        <div>
          <Space>
            <Switch
              checked={config.enableAutoRefresh}
              onChange={(checked) => handleConfigChange({ enableAutoRefresh: checked })}
            />
            <Text>自动刷新</Text>
          </Space>
        </div>
      </Space>
    </Modal>
  );

  return (
    <div style={{ height, overflow: 'auto', padding: '16px' }}>
      {/* 头部工具栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <Title level={3} style={{ margin: 0 }}>
          <DashboardOutlined /> 缓存监控仪表板
        </Title>
        
        <Space>
          <Button 
            icon={<ExportOutlined />} 
            onClick={handleExportMetrics}
          >
            导出报告
          </Button>
          <Button 
            icon={<SettingOutlined />} 
            onClick={() => setIsConfigModalVisible(true)}
          >
            配置
          </Button>
          <Badge dot={loading}>
            <Button 
              icon={<ReloadOutlined />} 
              loading={loading}
              onClick={() => window.location.reload()}
            >
              刷新
            </Button>
          </Badge>
        </Space>
      </div>

      {/* 异常告警 */}
      {config.showAlerts && (
        <div style={{ marginBottom: '16px' }}>
          <AnomaliesPanel />
        </div>
      )}

      {/* 主要内容标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="概览" key="overview">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <OverviewCards />
            <PerformanceTrends />
          </Space>
        </TabPane>
        
        <TabPane tab="热点分析" key="hotkeys">
          <HotKeysAnalysis />
        </TabPane>
        
        <TabPane tab="事件日志" key="events">
          <RecentEventsLog />
        </TabPane>
        
        <TabPane tab="详细统计" key="details">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="基础统计">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>总条目数:</Text>
                    <Text strong>{stats.totalEntries}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>命中次数:</Text>
                    <Text strong>{stats.hits}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>错过次数:</Text>
                    <Text strong>{stats.misses}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>设置次数:</Text>
                    <Text strong>{stats.sets}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>删除次数:</Text>
                    <Text strong>{stats.deletes}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="性能指标">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>平均响应时间:</Text>
                    <Text strong>
                      {performanceTrend.responseTimes.length > 0 
                        ? `${Math.round(performanceTrend.responseTimes.slice(-1)[0])}ms`
                        : '-'
                      }
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>内存使用率:</Text>
                    <Text strong>{realtimeMetrics.memoryUsage.toFixed(1)}MB</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>当前活跃键:</Text>
                    <Text strong>{realtimeMetrics.activeOperations}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* 配置模态框 */}
      <ConfigModal />
    </div>
  );
};

export default CacheMonitorDashboard;