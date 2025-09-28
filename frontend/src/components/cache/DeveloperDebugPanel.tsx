/**
 * 开发者调试面板
 * 提供综合的缓存调试、测试和监控功能
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tabs,
  Switch,
  Badge,
  Typography,
  Affix,
  Tooltip,
  Popover,
  Alert,
  Statistic,
  Progress,
  Tag,
  Timeline,
  Drawer,
  FloatButton
} from 'antd';
import {
  BugOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  EyeOutlined,
  CloseOutlined,
  ExpandOutlined,
  CompressOutlined,
  ReloadOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { CacheMonitorDashboard } from './CacheMonitorDashboard';
import { CacheDebugTools } from './CacheDebugTools';
import { PerformanceAnalyzer } from './PerformanceAnalyzer';
import { useCacheState, CacheMetricsReport } from '../../hooks/useCacheState';
import { cacheEventSystem, CacheEvent } from '../../utils/cacheEventSystem';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DevPanelConfig {
  autoOpen: boolean;
  position: 'left' | 'right' | 'bottom';
  defaultTab: string;
  enableHotkeys: boolean;
  enableNotifications: boolean;
  compactMode: boolean;
}

interface QuickStats {
  hitRate: number;
  memoryUsage: number;
  activeOperations: number;
  errorCount: number;
  lastUpdate: number;
}

interface Props {
  defaultVisible?: boolean;
  enableFloatingTrigger?: boolean;
  onConfigChange?: (config: DevPanelConfig) => void;
  initialConfig?: Partial<DevPanelConfig>;
}

const defaultConfig: DevPanelConfig = {
  autoOpen: false,
  position: 'right',
  defaultTab: 'dashboard',
  enableHotkeys: true,
  enableNotifications: true,
  compactMode: false
};

export const DeveloperDebugPanel: React.FC<Props> = ({
  defaultVisible = false,
  enableFloatingTrigger = true,
  onConfigChange,
  initialConfig = {}
}) => {
  // 配置状态
  const [config, setConfig] = useState<DevPanelConfig>({
    ...defaultConfig,
    ...initialConfig
  });

  // 面板状态
  const [visible, setVisible] = useState(defaultVisible);
  const [activeTab, setActiveTab] = useState(config.defaultTab);
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugToolsVisible, setDebugToolsVisible] = useState(false);
  const [quickStatsVisible, setQuickStatsVisible] = useState(false);

  // 缓存状态
  const {
    stats,
    realtimeMetrics,
    anomalies,
    actions,
    loading,
    recentEvents
  } = useCacheState();

  // 引用
  const eventListenerRef = useRef<(() => void) | null>(null);
  const notificationRef = useRef<number>(0);

  // 快速统计
  const [quickStats, setQuickStats] = useState<QuickStats>({
    hitRate: 0,
    memoryUsage: 0,
    activeOperations: 0,
    errorCount: 0,
    lastUpdate: Date.now()
  });

  // 更新配置
  const updateConfig = (newConfig: Partial<DevPanelConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  // 处理缓存事件
  const handleCacheEvent = (event: CacheEvent) => {
    // 更新通知计数
    if (config.enableNotifications && event.type === 'miss') {
      notificationRef.current += 1;
    }

    // 自动打开面板（如果启用）
    if (config.autoOpen && anomalies.highMissRate && !visible) {
      setVisible(true);
      setActiveTab('performance');
    }
  };

  // 快速操作
  const quickActions = {
    clearCache: async () => {
      await actions.clearCache();
    },
    refreshStats: () => {
      window.location.reload();
    },
    exportReport: () => {
      const report = actions.exportMetrics();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    if (!config.enableHotkeys) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+D 打开/关闭调试面板
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setVisible(prev => !prev);
      }
      
      // Ctrl+Shift+C 清空缓存
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        quickActions.clearCache();
      }
      
      // Ctrl+Shift+S 显示/隐藏快速统计
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        setQuickStatsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [config.enableHotkeys]);

  // 事件监听
  useEffect(() => {
    if (eventListenerRef.current) {
      eventListenerRef.current();
    }

    eventListenerRef.current = cacheEventSystem.onAll(handleCacheEvent);

    return () => {
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }
    };
  }, [config.enableNotifications, config.autoOpen, anomalies.highMissRate, visible]);

  // 更新快速统计
  useEffect(() => {
    setQuickStats({
      hitRate: realtimeMetrics.hitRate,
      memoryUsage: realtimeMetrics.memoryUsage,
      activeOperations: realtimeMetrics.activeOperations,
      errorCount: recentEvents.filter(e => e.error).length,
      lastUpdate: Date.now()
    });
  }, [realtimeMetrics, recentEvents]);

  // 计算告警状态
  const alertLevel = React.useMemo(() => {
    if (anomalies.highMissRate || anomalies.errorSpikes || realtimeMetrics.errorRate > 5) {
      return 'error';
    }
    if (anomalies.slowResponses || anomalies.memorySpikes || realtimeMetrics.hitRate < 70) {
      return 'warning';
    }
    return 'normal';
  }, [anomalies, realtimeMetrics]);

  // 快速统计弹出内容
  const QuickStatsContent = () => (
    <div style={{ width: '280px' }}>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Statistic
            title="命中率"
            value={quickStats.hitRate}
            precision={1}
            suffix="%"
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="内存"
            value={quickStats.memoryUsage}
            precision={1}
            suffix="MB"
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="活跃操作"
            value={quickStats.activeOperations}
            valueStyle={{ fontSize: '16px' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="错误数"
            value={quickStats.errorCount}
            valueStyle={{ fontSize: '16px', color: quickStats.errorCount > 0 ? '#ff4d4f' : '#52c41a' }}
          />
        </Col>
      </Row>
      
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
        <Space>
          <Button size="small" onClick={() => setVisible(true)}>
            打开面板
          </Button>
          <Button size="small" onClick={quickActions.clearCache}>
            清空缓存
          </Button>
        </Space>
      </div>
      
      <Text type="secondary" style={{ fontSize: '11px', display: 'block', textAlign: 'center', marginTop: '8px' }}>
        最后更新: {new Date(quickStats.lastUpdate).toLocaleTimeString()}
      </Text>
    </div>
  );

  // 浮动触发器
  const FloatingTrigger = () => (
    <>
      {enableFloatingTrigger && (
        <FloatButton.Group
          trigger="hover"
          type="primary"
          style={{ right: 24 }}
          icon={<BugOutlined />}
          tooltip="缓存调试工具"
          badge={{
            count: alertLevel === 'error' ? '!' : alertLevel === 'warning' ? '?' : 0,
            color: alertLevel === 'error' ? 'red' : 'orange'
          }}
        >
          <FloatButton
            icon={<DashboardOutlined />}
            tooltip="监控面板"
            onClick={() => {
              setVisible(true);
              setActiveTab('dashboard');
            }}
          />
          <FloatButton
            icon={<BugOutlined />}
            tooltip="调试工具"
            onClick={() => {
              setVisible(true);
              setActiveTab('debug');
            }}
          />
          <FloatButton
            icon={<ThunderboltOutlined />}
            tooltip="性能分析"
            onClick={() => {
              setVisible(true);
              setActiveTab('performance');
            }}
          />
          <Popover
            content={<QuickStatsContent />}
            title="快速统计"
            trigger="click"
            placement="leftTop"
          >
            <FloatButton
              icon={<EyeOutlined />}
              tooltip="快速统计"
              badge={{
                count: realtimeMetrics.hitRate < 70 ? 'Low' : '',
                color: 'orange'
              }}
            />
          </Popover>
        </FloatButton.Group>
      )}
    </>
  );

  // 面板头部
  const PanelHeader = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <Space>
        <BugOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
        <Title level={4} style={{ margin: 0 }}>
          缓存调试面板
        </Title>
        <Badge 
          status={alertLevel === 'error' ? 'error' : alertLevel === 'warning' ? 'warning' : 'success'} 
          text={alertLevel === 'error' ? '异常' : alertLevel === 'warning' ? '警告' : '正常'}
        />
      </Space>
      
      <Space>
        <Tooltip title="快速统计">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setQuickStatsVisible(!quickStatsVisible)}
          />
        </Tooltip>
        
        <Tooltip title={isExpanded ? '压缩模式' : '扩展模式'}>
          <Button
            type="text"
            icon={isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </Tooltip>
        
        <Tooltip title="设置">
          <Button
            type="text"
            icon={<SettingOutlined />}
          />
        </Tooltip>
        
        <Tooltip title="关闭">
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setVisible(false)}
          />
        </Tooltip>
      </Space>
    </div>
  );

  // 快速统计栏
  const QuickStatsBar = () => quickStatsVisible && (
    <Alert
      message={
        <Row gutter={16} style={{ alignItems: 'center' }}>
          <Col>
            <Text strong>命中率: </Text>
            <Text style={{ color: quickStats.hitRate >= 70 ? '#52c41a' : '#ff4d4f' }}>
              {quickStats.hitRate.toFixed(1)}%
            </Text>
          </Col>
          <Col>
            <Text strong>内存: </Text>
            <Text>{quickStats.memoryUsage.toFixed(1)}MB</Text>
          </Col>
          <Col>
            <Text strong>活跃: </Text>
            <Text>{quickStats.activeOperations}</Text>
          </Col>
          <Col>
            <Text strong>错误: </Text>
            <Text style={{ color: quickStats.errorCount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {quickStats.errorCount}
            </Text>
          </Col>
          <Col style={{ marginLeft: 'auto' }}>
            <Space size="small">
              <Button size="small" type="link" onClick={quickActions.clearCache}>
                清空缓存
              </Button>
              <Button size="small" type="link" onClick={quickActions.refreshStats}>
                刷新
              </Button>
              <Button size="small" type="link" onClick={quickActions.exportReport}>
                导出
              </Button>
            </Space>
          </Col>
        </Row>
      }
      type="info"
      showIcon={false}
      closable
      onClose={() => setQuickStatsVisible(false)}
      style={{ margin: '0 16px 16px 16px' }}
    />
  );

  // 主面板内容
  const PanelContent = () => (
    <div style={{ height: isExpanded ? '80vh' : '60vh', overflow: 'hidden' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          <Space>
            <Switch
              size="small"
              checked={config.enableNotifications}
              onChange={(checked) => updateConfig({ enableNotifications: checked })}
              checkedChildren="通知"
              unCheckedChildren="静音"
            />
            <Badge count={loading ? 1 : 0} dot>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={quickActions.refreshStats}
              />
            </Badge>
          </Space>
        }
      >
        <TabPane tab="监控面板" key="dashboard">
          <CacheMonitorDashboard
            height={isExpanded ? 600 : 400}
            onExportMetrics={(report: CacheMetricsReport) => {
              console.log('Metrics exported:', report);
            }}
            onConfigChange={(dashboardConfig) => {
              console.log('Dashboard config changed:', dashboardConfig);
            }}
          />
        </TabPane>
        
        <TabPane tab="调试工具" key="debug">
          <div style={{ padding: '16px' }}>
            <Button
              type="primary"
              icon={<BugOutlined />}
              onClick={() => setDebugToolsVisible(true)}
              block
            >
              打开调试工具
            </Button>
          </div>
        </TabPane>
        
        <TabPane tab="性能分析" key="performance">
          <div style={{ padding: '16px' }}>
            <PerformanceAnalyzer
              height={isExpanded ? 500 : 300}
              autoAnalyze={true}
              onIssueDetected={(issues) => {
                console.log('Performance issues detected:', issues);
              }}
              onRecommendationGenerated={(recommendations) => {
                console.log('Optimization recommendations:', recommendations);
              }}
            />
          </div>
        </TabPane>
        
        <TabPane tab="配置" key="config">
          <div style={{ padding: '16px' }}>
            <Card title="面板配置" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>自动打开: </Text>
                  <Switch
                    checked={config.autoOpen}
                    onChange={(checked) => updateConfig({ autoOpen: checked })}
                  />
                </div>
                <div>
                  <Text strong>启用快捷键: </Text>
                  <Switch
                    checked={config.enableHotkeys}
                    onChange={(checked) => updateConfig({ enableHotkeys: checked })}
                  />
                </div>
                <div>
                  <Text strong>显示通知: </Text>
                  <Switch
                    checked={config.enableNotifications}
                    onChange={(checked) => updateConfig({ enableNotifications: checked })}
                  />
                </div>
              </Space>
            </Card>
            
            <Card title="快捷键说明" size="small" style={{ marginTop: '16px' }}>
              <div>
                <Text code>Ctrl+Shift+D</Text> - 打开/关闭调试面板
              </div>
              <div>
                <Text code>Ctrl+Shift+C</Text> - 清空缓存
              </div>
              <div>
                <Text code>Ctrl+Shift+S</Text> - 显示/隐藏快速统计
              </div>
            </Card>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );

  return (
    <>
      {/* 浮动触发器 */}
      <FloatingTrigger />
      
      {/* 主调试面板 */}
      <Drawer
        title={null}
        placement={config.position}
        closable={false}
        onClose={() => setVisible(false)}
        open={visible}
        width={isExpanded ? '80%' : '60%'}
        height={isExpanded ? '90%' : '70%'}
        mask={false}
        getContainer={false}
        rootStyle={{ position: 'absolute' }}
      >
        <PanelHeader />
        <QuickStatsBar />
        <PanelContent />
      </Drawer>
      
      {/* 调试工具 */}
      <CacheDebugTools
        visible={debugToolsVisible}
        onClose={() => setDebugToolsVisible(false)}
        width={1000}
      />
      
      {/* 快速统计显示 */}
      {quickStatsVisible && config.compactMode && (
        <Affix offsetTop={10} style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
          <Card size="small" style={{ width: '200px' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: '12px' }}>命中率</Text>
                <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  {quickStats.hitRate.toFixed(1)}%
                </Text>
              </div>
              <Progress percent={quickStats.hitRate} size="small" showInfo={false} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: '12px' }}>内存</Text>
                <Text style={{ fontSize: '12px' }}>
                  {quickStats.memoryUsage.toFixed(1)}MB
                </Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button size="small" onClick={() => setVisible(true)}>
                  面板
                </Button>
                <Button size="small" onClick={() => setQuickStatsVisible(false)}>
                  隐藏
                </Button>
              </div>
            </Space>
          </Card>
        </Affix>
      )}
    </>
  );
};

export default DeveloperDebugPanel;