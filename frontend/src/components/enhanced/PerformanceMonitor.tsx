import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Statistic, Progress, Typography, Space, Tag, Button, Tooltip } from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import './PerformanceMonitor.css';

const { Text } = Typography;

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  documentSize: number;
  chunkCount: number;
  cacheHitRate: number;
  scrollPerformance: number;
  lastUpdate: number;
}

export interface PerformanceMonitorProps {
  documentId: string;
  onOptimize?: () => void;
  onClearCache?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  documentId,
  onOptimize,
  onClearCache,
  className = '',
  style = {}
}) => {
  // 状态管理
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    documentSize: 0,
    chunkCount: 0,
    cacheHitRate: 0,
    scrollPerformance: 60,
    lastUpdate: Date.now()
  });
  
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);
  
  // Refs
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const performanceObserverRef = useRef<PerformanceObserver>();
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  // 获取内存使用情况
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }, []);

  // 测量渲染性能
  const measureRenderPerformance = useCallback(() => {
    return new Promise<number>((resolve) => {
      const startTime = performance.now();
      
      // 使用 requestAnimationFrame 来测量实际渲染时间
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const endTime = performance.now();
          resolve(endTime - startTime);
        });
      });
    });
  }, []);

  // 监控滚动性能
  const monitorScrollPerformance = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrames = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, scrollPerformance: fps }));
        setPerformanceHistory(prev => [...prev.slice(-19), fps]); // 保持20个数据点
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (isMonitoring) {
        requestAnimationFrame(countFrames);
      }
    };
    
    requestAnimationFrame(countFrames);
  }, [isMonitoring]);

  // 收集性能指标
  const collectMetrics = useCallback(async () => {
    const memory = getMemoryUsage();
    const renderTime = await measureRenderPerformance();
    
    // 模拟文档相关指标
    const documentElement = document.querySelector('.virtualized-document-renderer');
    const documentSize = documentElement?.textContent?.length || 0;
    
    // 模拟缓存命中率
    const cacheHitRate = Math.min(95, 60 + Math.random() * 35);
    
    // 模拟块数量
    const chunkElements = document.querySelectorAll('.chunk-item');
    const chunkCount = chunkElements.length;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      memoryUsage: memory.used,
      documentSize: Math.round(documentSize / 1024), // KB
      chunkCount,
      cacheHitRate,
      lastUpdate: Date.now()
    }));
  }, [getMemoryUsage, measureRenderPerformance]);

  // 启动性能监控
  useEffect(() => {
    if (isMonitoring) {
      // 立即收集一次指标
      collectMetrics();
      
      // 设置定期收集
      metricsIntervalRef.current = setInterval(collectMetrics, 2000);
      
      // 启动滚动性能监控
      monitorScrollPerformance();
      
      // 设置 Performance Observer（如果支持）
      if ('PerformanceObserver' in window) {
        try {
          performanceObserverRef.current = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.entryType === 'measure' && entry.name.includes('document-render')) {
                setMetrics(prev => ({ 
                  ...prev, 
                  renderTime: entry.duration 
                }));
              }
            });
          });
          
          performanceObserverRef.current.observe({ 
            entryTypes: ['measure', 'navigation', 'paint'] 
          });
        } catch (error) {
          console.warn('Performance Observer not supported:', error);
        }
      }
    }

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, [isMonitoring, collectMetrics, monitorScrollPerformance]);

  // 清理
  useEffect(() => {
    return () => {
      setIsMonitoring(false);
    };
  }, []);

  // 获取性能等级
  const getPerformanceLevel = useCallback((value: number, type: 'render' | 'memory' | 'fps' | 'cache') => {
    switch (type) {
      case 'render':
        if (value < 16) return { level: 'excellent', color: '#52c41a' };
        if (value < 33) return { level: 'good', color: '#1890ff' };
        if (value < 50) return { level: 'fair', color: '#faad14' };
        return { level: 'poor', color: '#f5222d' };
        
      case 'memory':
        if (value < 50) return { level: 'excellent', color: '#52c41a' };
        if (value < 100) return { level: 'good', color: '#1890ff' };
        if (value < 200) return { level: 'fair', color: '#faad14' };
        return { level: 'poor', color: '#f5222d' };
        
      case 'fps':
        if (value >= 55) return { level: 'excellent', color: '#52c41a' };
        if (value >= 45) return { level: 'good', color: '#1890ff' };
        if (value >= 30) return { level: 'fair', color: '#faad14' };
        return { level: 'poor', color: '#f5222d' };
        
      case 'cache':
        if (value >= 90) return { level: 'excellent', color: '#52c41a' };
        if (value >= 80) return { level: 'good', color: '#1890ff' };
        if (value >= 70) return { level: 'fair', color: '#faad14' };
        return { level: 'poor', color: '#f5222d' };
        
      default:
        return { level: 'unknown', color: '#8c8c8c' };
    }
  }, []);

  // 优化建议
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = [];
    
    if (metrics.renderTime > 33) {
      suggestions.push('渲染时间较长，建议启用虚拟滚动');
    }
    
    if (metrics.memoryUsage > 150) {
      suggestions.push('内存使用较高，建议清理缓存');
    }
    
    if (metrics.scrollPerformance < 45) {
      suggestions.push('滚动性能不佳，建议减少DOM元素');
    }
    
    if (metrics.cacheHitRate < 80) {
      suggestions.push('缓存命中率较低，建议优化缓存策略');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('性能表现良好，无需优化');
    }
    
    return suggestions;
  }, [metrics]);

  const renderLevel = getPerformanceLevel(metrics.renderTime, 'render');
  const memoryLevel = getPerformanceLevel(metrics.memoryUsage, 'memory');
  const fpsLevel = getPerformanceLevel(metrics.scrollPerformance, 'fps');
  const cacheLevel = getPerformanceLevel(metrics.cacheHitRate, 'cache');

  return (
    <div className={`performance-monitor ${className}`} style={style}>
      <Card
        title={
          <Space>
            <DashboardOutlined />
            性能监控
            <Tag color={isMonitoring ? 'green' : 'default'}>
              {isMonitoring ? '监控中' : '已停止'}
            </Tag>
          </Space>
        }
        size="small"
        extra={
          <Space>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => collectMetrics()}
              title="刷新指标"
            />
            <Button
              type="text"
              size="small"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? '停止' : '开始'}
            </Button>
          </Space>
        }
      >
        {/* 核心性能指标 */}
        <div className="performance-metrics">
          <div className="metric-row">
            <div className="metric-item">
              <Statistic
                title={
                  <Space>
                    <ThunderboltOutlined style={{ color: renderLevel.color }} />
                    渲染时间
                  </Space>
                }
                value={metrics.renderTime}
                suffix="ms"
                valueStyle={{ color: renderLevel.color, fontSize: '16px' }}
              />
              <Progress
                percent={Math.min(100, (metrics.renderTime / 50) * 100)}
                strokeColor={renderLevel.color}
                showInfo={false}
                size="small"
              />
            </div>
            
            <div className="metric-item">
              <Statistic
                title={
                  <Space>
                    <DatabaseOutlined style={{ color: memoryLevel.color }} />
                    内存使用
                  </Space>
                }
                value={metrics.memoryUsage}
                suffix="MB"
                valueStyle={{ color: memoryLevel.color, fontSize: '16px' }}
              />
              <Progress
                percent={Math.min(100, (metrics.memoryUsage / 200) * 100)}
                strokeColor={memoryLevel.color}
                showInfo={false}
                size="small"
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-item">
              <Statistic
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: fpsLevel.color }} />
                    滚动性能
                  </Space>
                }
                value={metrics.scrollPerformance}
                suffix="FPS"
                valueStyle={{ color: fpsLevel.color, fontSize: '16px' }}
              />
              <Progress
                percent={(metrics.scrollPerformance / 60) * 100}
                strokeColor={fpsLevel.color}
                showInfo={false}
                size="small"
              />
            </div>
            
            <div className="metric-item">
              <Tooltip title="缓存命中率反映了数据重用效率">
                <Statistic
                  title={
                    <Space>
                      <ToolOutlined style={{ color: cacheLevel.color }} />
                      缓存命中率
                    </Space>
                  }
                  value={metrics.cacheHitRate}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: cacheLevel.color, fontSize: '16px' }}
                />
              </Tooltip>
              <Progress
                percent={metrics.cacheHitRate}
                strokeColor={cacheLevel.color}
                showInfo={false}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* 文档统计 */}
        <div className="document-stats">
          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <Text type="secondary">
              文档大小: {metrics.documentSize} KB
            </Text>
            <Text type="secondary">
              内容块: {metrics.chunkCount}
            </Text>
            <Text type="secondary">
              更新: {new Date(metrics.lastUpdate).toLocaleTimeString()}
            </Text>
          </Space>
        </div>

        {/* 性能趋势 */}
        {performanceHistory.length > 1 && (
          <div className="performance-trend">
            <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
              FPS 趋势 (最近 20 次测量)
            </Text>
            <div className="trend-chart">
              {performanceHistory.map((fps, index) => (
                <div
                  key={index}
                  className="trend-bar"
                  style={{
                    height: `${(fps / 60) * 100}%`,
                    backgroundColor: getPerformanceLevel(fps, 'fps').color
                  }}
                  title={`${fps} FPS`}
                />
              ))}
            </div>
          </div>
        )}

        {/* 优化建议 */}
        <div className="optimization-suggestions">
          <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
            优化建议
          </Text>
          <div className="suggestions-list">
            {getOptimizationSuggestions().map((suggestion, index) => (
              <div key={index} className="suggestion-item">
                <Text style={{ fontSize: '12px' }}>{suggestion}</Text>
              </div>
            ))}
          </div>
          
          {onOptimize && (
            <div style={{ marginTop: '8px' }}>
              <Button
                size="small"
                type="primary"
                icon={<ToolOutlined />}
                onClick={onOptimize}
                style={{ marginRight: '8px' }}
              >
                应用优化
              </Button>
              {onClearCache && (
                <Button
                  size="small"
                  onClick={onClearCache}
                >
                  清理缓存
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;