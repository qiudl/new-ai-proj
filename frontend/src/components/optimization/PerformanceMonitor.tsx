import React, { useEffect, useRef, useState, memo, ReactNode } from 'react';
import { Card, Progress, Typography, Space, Tag, Tooltip, Alert } from 'antd';
import { 
  DashboardOutlined, 
  ThunderboltOutlined, 
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { errorLogger } from '../../utils/ErrorLogger';

const { Text, Title } = Typography;

interface PerformanceMetrics {
  renderTime: number;
  mountTime: number;
  updateCount: number;
  memoryUsage?: number;
  lastUpdate: number;
  avgRenderTime: number;
  maxRenderTime: number;
  reRenderCount: number;
}

interface PerformanceMonitorProps {
  children: ReactNode;
  componentName: string;
  enableDevMode?: boolean;
  thresholds?: {
    renderTime?: number;
    memoryUsage?: number;
    reRenderCount?: number;
  };
  onPerformanceIssue?: (issue: PerformanceIssue) => void;
}

interface PerformanceIssue {
  type: 'slow-render' | 'high-memory' | 'excessive-rerenders';
  componentName: string;
  severity: 'low' | 'medium' | 'high';
  details: any;
  timestamp: number;
}

/**
 * 性能监控组件
 * 
 * 功能：
 * 1. 实时监控组件性能
 * 2. 检测性能问题
 * 3. 提供优化建议
 * 4. 性能数据收集
 */
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = memo(({
  children,
  componentName,
  enableDevMode = process.env.NODE_ENV === 'development',
  thresholds = {
    renderTime: 16, // 16ms (60fps)
    memoryUsage: 50 * 1024 * 1024, // 50MB
    reRenderCount: 10
  },
  onPerformanceIssue
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    lastUpdate: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    reRenderCount: 0
  });

  const [showMonitor, setShowMonitor] = useState(false);
  const [issues, setIssues] = useState<PerformanceIssue[]>([]);

  const mountTimeRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastPropsRef = useRef<any>();
  const renderCountRef = useRef<number>(0);

  // 开始性能监控
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const mountTime = performance.now() - mountTimeRef.current;
      
      errorLogger.info('performance', 'PerformanceMonitor: 组件卸载', {
        componentName,
        mountTime,
        totalRenders: renderCountRef.current,
        avgRenderTime: metrics.avgRenderTime
      });
    };
  }, []);

  // 渲染时间监控
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      renderCountRef.current++;
      renderTimesRef.current.push(renderTime);
      
      // 保留最近50次渲染时间
      if (renderTimesRef.current.length > 50) {
        renderTimesRef.current = renderTimesRef.current.slice(-50);
      }

      const avgRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
      const maxRenderTime = Math.max(...renderTimesRef.current);

      setMetrics(prev => ({
        ...prev,
        renderTime,
        updateCount: renderCountRef.current,
        lastUpdate: Date.now(),
        avgRenderTime,
        maxRenderTime,
        reRenderCount: prev.reRenderCount + (renderCountRef.current > 1 ? 1 : 0)
      }));

      // 检测性能问题
      checkPerformanceIssues(renderTime, avgRenderTime, renderCountRef.current);
    };
  });

  // 内存使用监控
  useEffect(() => {
    if (!('memory' in performance)) return;

    const checkMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize;
        
        setMetrics(prev => ({ ...prev, memoryUsage }));
        
        if (thresholds.memoryUsage && memoryUsage > thresholds.memoryUsage) {
          reportPerformanceIssue({
            type: 'high-memory',
            componentName,
            severity: 'medium',
            details: { memoryUsage, threshold: thresholds.memoryUsage },
            timestamp: Date.now()
          });
        }
      }
    };

    const interval = setInterval(checkMemoryUsage, 5000); // 每5秒检查一次
    return () => clearInterval(interval);
  }, [componentName, thresholds.memoryUsage]);

  // 性能问题检测
  const checkPerformanceIssues = (renderTime: number, avgRenderTime: number, renderCount: number) => {
    // 渲染时间过长
    if (thresholds.renderTime && renderTime > thresholds.renderTime) {
      reportPerformanceIssue({
        type: 'slow-render',
        componentName,
        severity: renderTime > thresholds.renderTime * 2 ? 'high' : 'medium',
        details: { renderTime, threshold: thresholds.renderTime, avgRenderTime },
        timestamp: Date.now()
      });
    }

    // 重渲染次数过多
    if (thresholds.reRenderCount && renderCount > thresholds.reRenderCount && renderCount % 5 === 0) {
      reportPerformanceIssue({
        type: 'excessive-rerenders',
        componentName,
        severity: 'medium',
        details: { reRenderCount: renderCount, threshold: thresholds.reRenderCount },
        timestamp: Date.now()
      });
    }
  };

  // 报告性能问题
  const reportPerformanceIssue = (issue: PerformanceIssue) => {
    setIssues(prev => {
      const newIssues = [...prev, issue].slice(-10); // 保留最近10个问题
      return newIssues;
    });

    onPerformanceIssue?.(issue);

    errorLogger.warn('performance', 'PerformanceMonitor: 性能问题检测', {
      ...issue,
      componentName
    });
  };

  // 获取性能分数
  const getPerformanceScore = () => {
    let score = 100;
    
    if (metrics.avgRenderTime > 16) score -= Math.min(30, (metrics.avgRenderTime - 16) * 2);
    if (metrics.reRenderCount > 10) score -= Math.min(20, (metrics.reRenderCount - 10));
    if (metrics.memoryUsage && metrics.memoryUsage > 10 * 1024 * 1024) {
      score -= Math.min(25, (metrics.memoryUsage - 10 * 1024 * 1024) / (1024 * 1024));
    }
    
    return Math.max(0, Math.round(score));
  };

  // 获取性能等级
  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'excellent', color: '#52c41a' };
    if (score >= 70) return { level: 'good', color: '#1890ff' };
    if (score >= 50) return { level: 'fair', color: '#faad14' };
    return { level: 'poor', color: '#ff4d4f' };
  };

  // 格式化内存大小
  const formatMemorySize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // 开发模式下显示性能监控器
  const performanceScore = getPerformanceScore();
  const performanceLevel = getPerformanceLevel(performanceScore);

  if (!enableDevMode) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative' }}>
      {children}
      
      {/* 性能监控浮动按钮 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setShowMonitor(!showMonitor)}
      >
        <Tag 
          color={performanceLevel.color}
          style={{ margin: 0, borderRadius: '0 0 0 4px' }}
        >
          <DashboardOutlined /> {performanceScore}
        </Tag>
      </div>

      {/* 性能监控面板 */}
      {showMonitor && (
        <Card
          size="small"
          title={
            <Space>
              <DashboardOutlined />
              性能监控 - {componentName}
            </Space>
          }
          style={{
            position: 'absolute',
            top: '24px',
            right: 0,
            width: '300px',
            zIndex: 1001,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
          bodyStyle={{ padding: '12px' }}
        >
          {/* 性能分数 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <Text strong>性能分数</Text>
              <Text style={{ color: performanceLevel.color }}>
                {performanceScore}/100
              </Text>
            </div>
            <Progress
              percent={performanceScore}
              strokeColor={performanceLevel.color}
              size="small"
              showInfo={false}
            />
          </div>

          {/* 性能指标 */}
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">平均渲染时间</Text>
              <Text>
                {metrics.avgRenderTime.toFixed(2)}ms
                {metrics.avgRenderTime > 16 && (
                  <WarningOutlined style={{ color: '#faad14', marginLeft: '4px' }} />
                )}
              </Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">最大渲染时间</Text>
              <Text>{metrics.maxRenderTime.toFixed(2)}ms</Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">重渲染次数</Text>
              <Text>
                {metrics.reRenderCount}
                {metrics.reRenderCount > 10 && (
                  <WarningOutlined style={{ color: '#faad14', marginLeft: '4px' }} />
                )}
              </Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">内存使用</Text>
              <Text>{formatMemorySize(metrics.memoryUsage)}</Text>
            </div>
          </Space>

          {/* 性能问题 */}
          {issues.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <Text strong style={{ fontSize: '12px' }}>最近问题:</Text>
              {issues.slice(-3).map((issue, index) => (
                <Alert
                  key={index}
                  message={getIssueMessage(issue)}
                  type="warning"
                  size="small"
                  style={{ marginTop: '4px', fontSize: '11px' }}
                  showIcon={false}
                />
              ))}
            </div>
          )}

          {/* 优化建议 */}
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#666' }}>
            {getOptimizationSuggestions(metrics, issues)}
          </div>
        </Card>
      )}
    </div>
  );
});

// 获取问题描述
const getIssueMessage = (issue: PerformanceIssue): string => {
  switch (issue.type) {
    case 'slow-render':
      return `渲染耗时 ${issue.details.renderTime.toFixed(1)}ms`;
    case 'high-memory':
      return `内存使用过高 ${(issue.details.memoryUsage / 1024 / 1024).toFixed(1)}MB`;
    case 'excessive-rerenders':
      return `重渲染次数过多 ${issue.details.reRenderCount}次`;
    default:
      return '性能问题';
  }
};

// 获取优化建议
const getOptimizationSuggestions = (metrics: PerformanceMetrics, issues: PerformanceIssue[]): ReactNode => {
  const suggestions = [];

  if (metrics.avgRenderTime > 16) {
    suggestions.push('使用 React.memo 或 useMemo 优化渲染');
  }

  if (metrics.reRenderCount > 10) {
    suggestions.push('检查 useEffect 依赖项和 state 更新');
  }

  if (issues.some(issue => issue.type === 'high-memory')) {
    suggestions.push('检查内存泄漏和大对象引用');
  }

  if (suggestions.length === 0) {
    suggestions.push('性能表现良好！');
  }

  return suggestions.map((suggestion, index) => (
    <div key={index} style={{ marginBottom: '2px' }}>
      • {suggestion}
    </div>
  ));
};

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;