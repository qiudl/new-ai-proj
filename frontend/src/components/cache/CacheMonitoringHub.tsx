/**
 * 缓存监控中心
 * 统一的缓存监控和调试功能入口点
 */

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Space,
  Typography,
  Alert,
  Card,
  Row,
  Col,
  Statistic,
  Switch,
  Tooltip,
  Badge,
  notification
} from 'antd';
import {
  DashboardOutlined,
  BugOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { CacheMonitorDashboard } from './CacheMonitorDashboard';
import { CacheDebugTools } from './CacheDebugTools';
import { PerformanceAnalyzer } from './PerformanceAnalyzer';
import { DeveloperDebugPanel } from './DeveloperDebugPanel';
import { CacheProvider } from './CacheAwareComponent';
import { useCacheState } from '../../hooks/useCacheState';
import { cacheEventSystem, CacheEvent } from '../../utils/cacheEventSystem';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface MonitoringConfig {
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    hitRate: number;
    memoryUsage: number;
    errorRate: number;
  };
  autoAnalysisInterval: number;
  enableDebugMode: boolean;
}

interface Props {
  embedded?: boolean; // 是否作为嵌入式组件使用
  height?: number;
  onConfigChange?: (config: MonitoringConfig) => void;
  enableDeveloperPanel?: boolean;
}

const defaultConfig: MonitoringConfig = {
  enableRealTimeAlerts: true,
  alertThresholds: {
    hitRate: 70,
    memoryUsage: 100,
    errorRate: 5
  },
  autoAnalysisInterval: 300000, // 5分钟
  enableDebugMode: false
};

export const CacheMonitoringHub: React.FC<Props> = ({
  embedded = false,
  height = 800,
  onConfigChange,
  enableDeveloperPanel = true
}) => {
  // 状态管理
  const [activeView, setActiveView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [config, setConfig] = useState<MonitoringConfig>(defaultConfig);
  const [debugToolsVisible, setDebugToolsVisible] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  
  // 缓存状态
  const {
    stats,
    realtimeMetrics,
    anomalies,
    actions,
    loading
  } = useCacheState();

  // 配置更新
  const updateConfig = (newConfig: Partial<MonitoringConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  // 实时告警系统
  useEffect(() => {
    if (!config.enableRealTimeAlerts || !alertsEnabled) return;

    const checkAlerts = () => {
      // 命中率过低告警
      if (realtimeMetrics.hitRate < config.alertThresholds.hitRate) {
        notification.warning({
          message: '缓存命中率过低',
          description: `当前命中率 ${realtimeMetrics.hitRate.toFixed(1)}%，低于阈值 ${config.alertThresholds.hitRate}%`,
          key: 'low-hit-rate',
          duration: 4.5,
          placement: 'topRight'
        });
      }

      // 内存使用过高告警
      if (realtimeMetrics.memoryUsage > config.alertThresholds.memoryUsage) {
        notification.error({
          message: '内存使用过高',
          description: `当前内存使用 ${realtimeMetrics.memoryUsage.toFixed(1)}MB，超过阈值 ${config.alertThresholds.memoryUsage}MB`,
          key: 'high-memory',
          duration: 4.5,
          placement: 'topRight'
        });
      }

      // 错误率过高告警
      if (realtimeMetrics.errorRate > config.alertThresholds.errorRate) {
        notification.error({
          message: '错误率过高',
          description: `当前错误率 ${realtimeMetrics.errorRate.toFixed(2)}%，超过阈值 ${config.alertThresholds.errorRate}%`,
          key: 'high-error-rate',
          duration: 4.5,
          placement: 'topRight'
        });
      }
    };

    const interval = setInterval(checkAlerts, 30000); // 30秒检查一次
    return () => clearInterval(interval);
  }, [config, realtimeMetrics, alertsEnabled]);

  // 异常检测告警
  useEffect(() => {
    if (!alertsEnabled) return;

    if (anomalies.highMissRate || anomalies.slowResponses || anomalies.memorySpikes || anomalies.errorSpikes) {
      const anomalyTypes = [];
      if (anomalies.highMissRate) anomalyTypes.push('命中率异常');
      if (anomalies.slowResponses) anomalyTypes.push('响应时间异常');
      if (anomalies.memorySpikes) anomalyTypes.push('内存激增');
      if (anomalies.errorSpikes) anomalyTypes.push('错误激增');

      notification.warning({
        message: '检测到性能异常',
        description: `发现异常: ${anomalyTypes.join(', ')}`,
        key: 'anomaly-detected',
        duration: 6,
        placement: 'topRight',
        btn: (
          <Button 
            type="primary" 
            size="small"
            onClick={() => setActiveView('performance')}
          >
            查看详情
          </Button>
        )
      });
    }
  }, [anomalies, alertsEnabled]);

  // 菜单项
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '监控面板',
    },
    {
      key: 'performance',
      icon: <ThunderboltOutlined />,
      label: '性能分析',
    },
    {
      key: 'debug',
      icon: <BugOutlined />,
      label: '调试工具',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    }
  ];

  // 状态概览
  const StatusOverview = () => {
    const overallStatus = anomalies.highMissRate || anomalies.errorSpikes ? 'error' :
                         anomalies.slowResponses || anomalies.memorySpikes ? 'warning' : 'success';
    
    return (
      <Alert
        message={
          <Row gutter={16} style={{ alignItems: 'center' }}>
            <Col>
              <Space>
                {overallStatus === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                {overallStatus === 'warning' && <WarningOutlined style={{ color: '#faad14' }} />}
                {overallStatus === 'error' && <WarningOutlined style={{ color: '#ff4d4f' }} />}
                <Text strong>
                  系统状态: {overallStatus === 'success' ? '正常' : overallStatus === 'warning' ? '警告' : '异常'}
                </Text>
              </Space>
            </Col>
            <Col>
              <Statistic
                title="命中率"
                value={realtimeMetrics.hitRate}
                precision={1}
                suffix="%"
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
            <Col>
              <Statistic
                title="内存"
                value={realtimeMetrics.memoryUsage}
                precision={1}
                suffix="MB"
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
            <Col>
              <Statistic
                title="活跃操作"
                value={realtimeMetrics.activeOperations}
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
            <Col style={{ marginLeft: 'auto' }}>
              <Space>
                <Tooltip title="启用/禁用告警">
                  <Switch
                    size="small"
                    checked={alertsEnabled}
                    onChange={setAlertsEnabled}
                    checkedChildren="告警"
                    unCheckedChildren="静音"
                  />
                </Tooltip>
                <Badge dot={loading}>
                  <Button 
                    size="small" 
                    icon={<ReloadOutlined />} 
                    onClick={() => window.location.reload()}
                    loading={loading}
                  />
                </Badge>
              </Space>
            </Col>
          </Row>
        }
        type={overallStatus === 'success' ? 'success' : overallStatus === 'warning' ? 'warning' : 'error'}
        showIcon={false}
        style={{ marginBottom: '16px' }}
      />
    );
  };

  // 渲染当前视图
  const renderCurrentView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <CacheMonitorDashboard
            height={height - 120}
            onExportMetrics={(report) => {
              console.log('Metrics report exported:', report);
            }}
          />
        );

      case 'performance':
        return (
          <Card>
            <PerformanceAnalyzer
              height={height - 180}
              autoAnalyze={true}
              onIssueDetected={(issues) => {
                console.log('Performance issues detected:', issues.length);
              }}
              onRecommendationGenerated={(recommendations) => {
                console.log('Optimization recommendations:', recommendations.length);
              }}
            />
          </Card>
        );

      case 'debug':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <BugOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={4}>调试工具</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                打开高级调试工具进行详细分析
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<BugOutlined />}
                onClick={() => setDebugToolsVisible(true)}
              >
                打开调试工具
              </Button>
            </div>
          </Card>
        );

      case 'settings':
        return (
          <Card title="监控配置">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Title level={5}>实时告警设置</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>启用实时告警</Text>
                    <Switch
                      checked={config.enableRealTimeAlerts}
                      onChange={(checked) => updateConfig({ enableRealTimeAlerts: checked })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>启用调试模式</Text>
                    <Switch
                      checked={config.enableDebugMode}
                      onChange={(checked) => updateConfig({ enableDebugMode: checked })}
                    />
                  </div>
                </Space>
              </div>

              <div>
                <Title level={5}>告警阈值</Title>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Text>命中率低于 (%)</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text strong>{config.alertThresholds.hitRate}%</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <Text>内存使用超过 (MB)</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text strong>{config.alertThresholds.memoryUsage}MB</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <Text>错误率超过 (%)</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text strong>{config.alertThresholds.errorRate}%</Text>
                    </div>
                  </Col>
                </Row>
              </div>

              <div>
                <Title level={5}>快速操作</Title>
                <Space wrap>
                  <Button onClick={actions.clearCache} danger>
                    清空所有缓存
                  </Button>
                  <Button onClick={actions.cleanup}>
                    执行清理
                  </Button>
                  <Button onClick={actions.resetStats}>
                    重置统计
                  </Button>
                  <Button onClick={() => {
                    const report = actions.exportMetrics();
                    console.log('Metrics exported:', report);
                  }}>
                    导出指标
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        );

      default:
        return <div>未知视图</div>;
    }
  };

  // 嵌入式模式
  if (embedded) {
    return (
      <CacheProvider debug={config.enableDebugMode}>
        <div style={{ height }}>
          <StatusOverview />
          {renderCurrentView()}
          {enableDeveloperPanel && (
            <DeveloperDebugPanel
              defaultVisible={false}
              enableFloatingTrigger={true}
            />
          )}
        </div>
      </CacheProvider>
    );
  }

  // 完整布局模式
  return (
    <CacheProvider debug={config.enableDebugMode}>
      <Layout style={{ height, overflow: 'hidden' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={200}
          style={{ backgroundColor: '#fff' }}
        >
          <div style={{ 
            padding: '16px', 
            textAlign: 'center', 
            borderBottom: '1px solid #f0f0f0' 
          }}>
            <EyeOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            {!collapsed && (
              <Title level={4} style={{ margin: '8px 0 0 0' }}>
                缓存监控
              </Title>
            )}
          </div>
          
          <Menu
            mode="inline"
            selectedKeys={[activeView]}
            items={menuItems}
            style={{ borderRight: 0 }}
            onClick={({ key }) => setActiveView(key)}
          />
        </Sider>

        <Layout style={{ backgroundColor: '#fff' }}>
          <Content style={{ padding: '16px', overflow: 'auto' }}>
            <StatusOverview />
            {renderCurrentView()}
          </Content>
        </Layout>

        {/* 调试工具 */}
        <CacheDebugTools
          visible={debugToolsVisible}
          onClose={() => setDebugToolsVisible(false)}
          width={1200}
        />

        {/* 开发者面板 */}
        {enableDeveloperPanel && (
          <DeveloperDebugPanel
            defaultVisible={false}
            enableFloatingTrigger={true}
          />
        )}
      </Layout>
    </CacheProvider>
  );
};

export default CacheMonitoringHub;