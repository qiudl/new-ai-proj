import React, { useState, useEffect } from 'react';
import { Card, Tooltip, Progress, Badge, Alert, Statistic, Row, Col } from 'antd';
import { 
  DashboardOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  DatabaseOutlined as MemoryIcon
} from '@ant-design/icons';

interface PerformanceStats {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
    limit: number;
  } | null;
  refreshStats: {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    cacheHits: number;
    averageResponseTime: number;
  };
  activeTimers: number;
  lastUpdate: Date;
}

interface PerformanceMonitorProps {
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 是否在性能异常时显示警告 */
  showAlerts?: boolean;
  /** 更新间隔（毫秒） */
  updateInterval?: number;
  /** 样式 */
  style?: React.CSSProperties;
  /** 大小 */
  size?: 'small' | 'default';
}

/**
 * 性能监控组件
 * 用于显示页面的性能指标，包括内存使用情况、刷新统计、缓存命中率等
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  showAlerts = true,
  updateInterval = 5000,
  style,
  size = 'small'
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    memoryUsage: null,
    refreshStats: {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      cacheHits: 0,
      averageResponseTime: 0
    },
    activeTimers: 0,
    lastUpdate: new Date()
  });

  const [alerts, setAlerts] = useState<{
    highMemory: boolean;
    highFailureRate: boolean;
    slowResponse: boolean;
  }>({
    highMemory: false,
    highFailureRate: false,
    slowResponse: false
  });

  // 获取内存统计
  const getMemoryStats = (): PerformanceStats['memoryUsage'] => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  };

  // 获取刷新统计（从全局对象中收集）
  const getRefreshStats = (): PerformanceStats['refreshStats'] => {
    // 这里需要从各个使用了 useAutoRefreshOptimized 的组件中收集统计数据
    // 由于React的限制，我们使用全局对象来收集这些统计
    const globalStats = (window as any).__refreshStats || {
      totalRefreshes: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      cacheHits: 0,
      responseTimes: []
    };

    const averageResponseTime = globalStats.responseTimes.length > 0
      ? globalStats.responseTimes.reduce((a: number, b: number) => a + b, 0) / globalStats.responseTimes.length
      : 0;

    return {
      totalRefreshes: globalStats.totalRefreshes,
      successfulRefreshes: globalStats.successfulRefreshes,
      failedRefreshes: globalStats.failedRefreshes,
      cacheHits: globalStats.cacheHits,
      averageResponseTime: Math.round(averageResponseTime)
    };
  };

  // 获取活动定时器数量
  const getActiveTimersCount = (): number => {
    // 这也需要从全局对象收集
    return (window as any).__activeTimersCount || 0;
  };

  // 更新统计数据
  const updateStats = () => {
    const memoryUsage = getMemoryStats();
    const refreshStats = getRefreshStats();
    const activeTimers = getActiveTimersCount();

    setStats({
      memoryUsage,
      refreshStats,
      activeTimers,
      lastUpdate: new Date()
    });

    // 检查警告条件
    const newAlerts = {
      highMemory: memoryUsage ? memoryUsage.percentage > 80 : false,
      highFailureRate: refreshStats.totalRefreshes > 0 
        ? (refreshStats.failedRefreshes / refreshStats.totalRefreshes) > 0.2 
        : false,
      slowResponse: refreshStats.averageResponseTime > 3000
    };

    setAlerts(newAlerts);
  };

  useEffect(() => {
    updateStats(); // 立即更新一次
    
    const interval = setInterval(updateStats, updateInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [updateInterval]);

  // 获取内存使用状态
  const getMemoryStatus = () => {
    if (!stats.memoryUsage) return { status: 'normal', color: '#52c41a' };
    
    const percentage = stats.memoryUsage.percentage;
    if (percentage > 90) return { status: 'critical', color: '#ff4d4f' };
    if (percentage > 80) return { status: 'warning', color: '#faad14' };
    if (percentage > 60) return { status: 'caution', color: '#fa8c16' };
    return { status: 'normal', color: '#52c41a' };
  };

  // 获取性能等级
  const getPerformanceGrade = () => {
    if (!stats.memoryUsage) return 'N/A';
    
    const memoryScore = Math.max(0, 100 - stats.memoryUsage.percentage);
    const responseScore = Math.max(0, 100 - Math.min(100, stats.refreshStats.averageResponseTime / 50));
    const reliabilityScore = stats.refreshStats.totalRefreshes > 0
      ? (stats.refreshStats.successfulRefreshes / stats.refreshStats.totalRefreshes) * 100
      : 100;
    
    const totalScore = (memoryScore + responseScore + reliabilityScore) / 3;
    
    if (totalScore >= 90) return 'A';
    if (totalScore >= 80) return 'B';
    if (totalScore >= 70) return 'C';
    if (totalScore >= 60) return 'D';
    return 'F';
  };

  const memoryStatus = getMemoryStatus();
  const performanceGrade = getPerformanceGrade();
  const successRate = stats.refreshStats.totalRefreshes > 0
    ? (stats.refreshStats.successfulRefreshes / stats.refreshStats.totalRefreshes * 100).toFixed(1)
    : '100.0';

  if (!showDetails) {
    // 简化显示模式
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
        {/* 性能等级徽章 */}
        <Badge 
          count={performanceGrade} 
          style={{ 
            backgroundColor: memoryStatus.color,
            fontSize: '10px',
            minWidth: '18px',
            height: '18px',
            lineHeight: '18px'
          }}
        />
        
        {/* 内存使用指示器 */}
        {stats.memoryUsage && (
          <Tooltip title={`内存使用: ${stats.memoryUsage.percentage.toFixed(1)}% (${(stats.memoryUsage.used / 1024 / 1024).toFixed(1)}MB)`}>
            <div style={{
              width: '30px',
              height: '4px',
              backgroundColor: '#f0f0f0',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, stats.memoryUsage.percentage)}%`,
                height: '100%',
                backgroundColor: memoryStatus.color,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </Tooltip>
        )}

        {/* 缓存命中指示器 */}
        {stats.refreshStats.cacheHits > 0 && (
          <Tooltip title={`缓存命中: ${stats.refreshStats.cacheHits} 次`}>
            <ThunderboltOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
          </Tooltip>
        )}

        {/* 警告指示器 */}
        {showAlerts && (alerts.highMemory || alerts.highFailureRate || alerts.slowResponse) && (
          <Tooltip title={
            <div>
              {alerts.highMemory && <div>⚠️ 内存使用过高</div>}
              {alerts.highFailureRate && <div>⚠️ 刷新失败率过高</div>}
              {alerts.slowResponse && <div>⚠️ 响应时间过长</div>}
            </div>
          }>
            <WarningOutlined style={{ fontSize: '12px', color: '#faad14' }} />
          </Tooltip>
        )}
      </div>
    );
  }

  // 详细显示模式
  return (
    <Card 
      size={size}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DashboardOutlined />
          <span>性能监控</span>
          <Badge 
            count={performanceGrade} 
            style={{ backgroundColor: memoryStatus.color }}
          />
        </div>
      }
      style={style}
    >
      {/* 警告信息 */}
      {showAlerts && (alerts.highMemory || alerts.highFailureRate || alerts.slowResponse) && (
        <Alert
          message="性能警告"
          description={
            <div>
              {alerts.highMemory && <div>• 内存使用率过高，可能影响页面性能</div>}
              {alerts.highFailureRate && <div>• 刷新失败率过高，请检查网络连接</div>}
              {alerts.slowResponse && <div>• 响应时间过长，建议优化网络或服务器</div>}
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* 内存使用 */}
        {stats.memoryUsage && (
          <Col xs={12} sm={6}>
            <Statistic
              title="内存使用"
              value={stats.memoryUsage.percentage}
              precision={1}
              suffix="%"
              valueStyle={{ color: memoryStatus.color, fontSize: '16px' }}
              prefix={
                <Progress
                  type="circle"
                  size={24}
                  percent={stats.memoryUsage.percentage}
                  strokeColor={memoryStatus.color}
                  showInfo={false}
                />
              }
            />
            <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '4px' }}>
              {(stats.memoryUsage.used / 1024 / 1024).toFixed(1)}MB / {(stats.memoryUsage.total / 1024 / 1024).toFixed(1)}MB
            </div>
          </Col>
        )}

        {/* 刷新成功率 */}
        <Col xs={12} sm={6}>
          <Statistic
            title="成功率"
            value={successRate}
            suffix="%"
            valueStyle={{ 
              color: parseFloat(successRate) >= 95 ? '#52c41a' : parseFloat(successRate) >= 80 ? '#faad14' : '#ff4d4f',
              fontSize: '16px' 
            }}
            prefix={<CheckCircleOutlined />}
          />
          <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '4px' }}>
            {stats.refreshStats.successfulRefreshes}/{stats.refreshStats.totalRefreshes} 成功
          </div>
        </Col>

        {/* 平均响应时间 */}
        <Col xs={12} sm={6}>
          <Statistic
            title="响应时间"
            value={stats.refreshStats.averageResponseTime}
            suffix="ms"
            valueStyle={{ 
              color: stats.refreshStats.averageResponseTime < 1000 ? '#52c41a' : 
                     stats.refreshStats.averageResponseTime < 3000 ? '#faad14' : '#ff4d4f',
              fontSize: '16px' 
            }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>

        {/* 缓存命中 */}
        <Col xs={12} sm={6}>
          <Statistic
            title="缓存命中"
            value={stats.refreshStats.cacheHits}
            valueStyle={{ color: '#1890ff', fontSize: '16px' }}
            prefix={<ThunderboltOutlined />}
          />
        </Col>
      </Row>

      <div style={{ 
        marginTop: '12px', 
        fontSize: '10px', 
        color: '#8c8c8c',
        textAlign: 'center'
      }}>
        最后更新: {stats.lastUpdate.toLocaleTimeString()}
      </div>
    </Card>
  );
};

export default PerformanceMonitor;