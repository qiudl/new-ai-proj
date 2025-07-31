import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Space, Typography, Switch, Tooltip, message } from 'antd';
import { 
    SettingOutlined, 
    FullscreenOutlined, 
    CompressOutlined,
    ReloadOutlined,
    DashboardOutlined,
    BarChartOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
// Temporarily disabled problematic components for build test
// import EnhancedTodayStats from './EnhancedTodayStats';
// import EnhancedTimerStats from './EnhancedTimerStats';
import './TimerOverviewDashboard.css';

const { Title, Text } = Typography;

interface TimerOverviewDashboardProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
  defaultLayout?: 'horizontal' | 'vertical' | 'grid';
  showControls?: boolean;
}

interface DashboardSettings {
  layout: 'horizontal' | 'vertical' | 'grid';
  showDetailedView: boolean;
  enableAnimations: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

const TimerOverviewDashboard: React.FC<TimerOverviewDashboardProps> = ({
  refreshTrigger,
  onRefresh,
  defaultLayout = 'grid',
  showControls = true
}) => {
  const [settings, setSettings] = useState<DashboardSettings>({
    layout: defaultLayout,
    showDetailedView: true,
    enableAnimations: true,
    autoRefresh: false,
    refreshInterval: 30000
  });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);

  // 自动刷新逻辑
  useEffect(() => {
    if (!settings.autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, settings.refreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval]);

  // 处理刷新
  const handleRefresh = useCallback(() => {
    setInternalRefreshTrigger(prev => prev + 1);
    setLastRefresh(new Date());
    onRefresh?.();
    message.success('数据已刷新', 1);
  }, [onRefresh]);

  // 切换布局
  const toggleLayout = () => {
    const layouts: Array<'horizontal' | 'vertical' | 'grid'> = ['horizontal', 'vertical', 'grid'];
    const currentIndex = layouts.indexOf(settings.layout);
    const nextLayout = layouts[(currentIndex + 1) % layouts.length];
    
    setSettings(prev => ({ ...prev, layout: nextLayout }));
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 更新设置
  const updateSetting = <K extends keyof DashboardSettings>(
    key: K, 
    value: DashboardSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 获取布局配置
  const getLayoutConfig = () => {
    switch (settings.layout) {
      case 'horizontal':
        return {
          todayStatsCol: { xs: 24, md: 12, lg: 8 },
          timerStatsCol: { xs: 24, md: 12, lg: 16 },
          direction: 'horizontal' as const
        };
      case 'vertical':
        return {
          todayStatsCol: { xs: 24 },
          timerStatsCol: { xs: 24 },
          direction: 'vertical' as const
        };
      case 'grid':
      default:
        return {
          todayStatsCol: { xs: 24, lg: 10 },
          timerStatsCol: { xs: 24, lg: 14 },
          direction: 'grid' as const
        };
    }
  };

  const layoutConfig = getLayoutConfig();

  return (
    <div className={`timer-overview-dashboard ${isFullscreen ? 'fullscreen' : ''} layout-${settings.layout}`}>
      {/* 控制面板 */}
      {showControls && (
        <Card 
          size="small" 
          className="dashboard-controls"
          style={{ marginBottom: '16px' }}
        >
          <div className="controls-content">
            <div className="controls-left">
              <Space>
                <DashboardOutlined />
                <Title level={5} style={{ margin: 0 }}>
                  计时统计仪表板
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  最后更新: {lastRefresh.toLocaleTimeString()}
                </Text>
              </Space>
            </div>
            
            <div className="controls-right">
              <Space>
                <Tooltip title="切换布局">
                  <Button
                    type="text"
                    icon={<BarChartOutlined />}
                    onClick={toggleLayout}
                    size="small"
                  />
                </Tooltip>
                
                <Tooltip title="详细视图">
                  <Switch
                    size="small"
                    checked={settings.showDetailedView}
                    onChange={(checked) => updateSetting('showDetailedView', checked)}
                  />
                </Tooltip>
                
                <Tooltip title="动画效果">
                  <Switch
                    size="small"
                    checked={settings.enableAnimations}
                    onChange={(checked) => updateSetting('enableAnimations', checked)}
                  />
                </Tooltip>
                
                <Tooltip title="自动刷新">
                  <Switch
                    size="small"
                    checked={settings.autoRefresh}
                    onChange={(checked) => updateSetting('autoRefresh', checked)}
                  />
                </Tooltip>
                
                <Tooltip title="手动刷新">
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    size="small"
                  />
                </Tooltip>
                
                <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
                  <Button
                    type="text"
                    icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
                    onClick={toggleFullscreen}
                    size="small"
                  />
                </Tooltip>
              </Space>
            </div>
          </div>
        </Card>
      )}

      {/* 主要内容区域 */}
      <div className="dashboard-content">
        <Row gutter={[16, 16]} className={`dashboard-layout layout-${settings.layout}`}>
          {/* 今日统计卡片 */}
          <Col {...layoutConfig.todayStatsCol} className="today-stats-column">
            <div className="dashboard-card-wrapper today-stats-wrapper">
              <div className="card-header-badge">
                <ClockCircleOutlined />
                <span>今日概览</span>
              </div>
              {/* Temporarily disabled for build test */}
              <Card title="今日统计" size="small">
                <p>今日统计组件暂时禁用中...</p>
              </Card>
            </div>
          </Col>

          {/* 时间统计卡片 */}
          <Col {...layoutConfig.timerStatsCol} className="timer-stats-column">
            <div className="dashboard-card-wrapper timer-stats-wrapper">
              <div className="card-header-badge">
                <BarChartOutlined />
                <span>时间分析</span>
              </div>
              {/* Temporarily disabled for build test */}
              <Card title="时间统计" size="small">
                <p>时间统计组件暂时禁用中...</p>
              </Card>
            </div>
          </Col>
        </Row>
      </div>

      {/* 性能统计（全屏模式下显示） */}
      {isFullscreen && (
        <div className="fullscreen-stats">
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Card 
                size="small" 
                title="实时性能监控"
                className="performance-monitor"
              >
                <Row gutter={16}>
                  <Col span={6}>
                    <div className="perf-metric">
                      <div className="perf-value">
                        {Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB
                      </div>
                      <div className="perf-label">内存使用</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="perf-metric">
                      <div className="perf-value">
                        {navigator.hardwareConcurrency || 4}
                      </div>
                      <div className="perf-label">CPU核心</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="perf-metric">
                      <div className="perf-value">
                        {settings.autoRefresh ? '启用' : '关闭'}
                      </div>
                      <div className="perf-label">自动刷新</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="perf-metric">
                      <div className="perf-value">
                        {Math.round(settings.refreshInterval / 1000)}s
                      </div>
                      <div className="perf-label">刷新间隔</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default TimerOverviewDashboard;