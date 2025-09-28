/**
 * 性能仪表板组件
 * 用于开发环境下监控和显示组件渲染性能
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Progress, List, Badge, Button, Collapse, Alert, Statistic, Row, Col } from 'antd';
import { BarChartOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { renderingPerformanceMonitor } from '../utils/renderingPerformanceMonitor';
import { taskDetailPerformanceMonitor } from '../utils/taskDetailPerformanceMonitor';

const { Panel } = Collapse;

interface PerformanceDashboardProps {
  visible?: boolean;
  onClose?: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  visible = true,
  onClose
}) => {
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<any>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateMetrics = () => {
    setStats(renderingPerformanceMonitor.getPerformanceStats());
    setAlerts(renderingPerformanceMonitor.getContinuousRenderingAlerts());
    setTaskMetrics(taskDetailPerformanceMonitor.getMetrics());
    setUpdateCount(prev => prev + 1);
  };

  useEffect(() => {
    if (visible) {
      updateMetrics();
      intervalRef.current = setInterval(updateMetrics, 2000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible]);

  const resetMetrics = () => {
    renderingPerformanceMonitor.reset();
    taskDetailPerformanceMonitor.cleanup();
    updateMetrics();
  };

  const generateReport = () => {
    const report = renderingPerformanceMonitor.generateReport();
    console.group('📊 完整性能报告');
    console.log(report);
    console.groupEnd();
    
    // 复制到剪贴板
    navigator.clipboard.writeText(report).then(() => {
      console.log('性能报告已复制到剪贴板');
    });
  };

  if (!visible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const hasIssues = alerts.length > 0 || (stats?.highFrequencyComponents.length > 0);

  return (
    <div 
      style={{
        position: 'fixed',
        top: '60px',
        right: '10px',
        width: '400px',
        zIndex: 10000,
        maxHeight: '80vh',
        overflow: 'auto'
      }}
    >
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChartOutlined />
            性能监控面板
            <Badge count={alerts.length} status={hasIssues ? 'error' : 'success'} />
          </div>
        }
        size="small"
        extra={
          <div>
            <Button size="small" icon={<ReloadOutlined />} onClick={resetMetrics}>
              重置
            </Button>
            {onClose && (
              <Button size="small" onClick={onClose} style={{ marginLeft: 8 }}>
                关闭
              </Button>
            )}
          </div>
        }
      >
        {/* 总体状态 */}
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Statistic
              title="总渲染次数"
              value={stats?.totalRenders || 0}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="监控组件"
              value={Object.keys(stats?.renderTimeDistribution || {}).length}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
        </Row>

        {/* 内存使用 */}
        {stats?.memoryUsage && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '12px', marginBottom: 4 }}>
              内存使用: {(stats.memoryUsage.used / 1024 / 1024).toFixed(1)}MB / {(stats.memoryUsage.total / 1024 / 1024).toFixed(1)}MB
            </div>
            <Progress 
              percent={stats.memoryUsage.percentage}
              size="small"
              status={stats.memoryUsage.percentage > 80 ? 'exception' : 'normal'}
            />
          </div>
        )}

        <Collapse size="small" defaultActiveKey={hasIssues ? ['alerts'] : []}>
          {/* 性能警告 */}
          {alerts.length > 0 && (
            <Panel header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <WarningOutlined style={{ color: '#fa8c16' }} />
                连续渲染警告
                <Badge count={alerts.length} />
              </div>
            } key="alerts">
              <List
                size="small"
                dataSource={alerts}
                renderItem={(alert: any) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontWeight: 500, fontSize: '12px' }}>
                        {alert.componentName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        {alert.renderCount}次渲染/{(alert.timeWindow/1000)}秒 
                        ({alert.frequency.toFixed(1)} 次/秒)
                      </div>
                      {alert.possibleCauses.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#fa8c16', marginTop: 4 }}>
                          可能原因: {alert.possibleCauses[0]}
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </Panel>
          )}

          {/* 高频组件 */}
          {stats?.highFrequencyComponents.length > 0 && (
            <Panel header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚡ 高频渲染组件
                <Badge count={stats.highFrequencyComponents.length} />
              </div>
            } key="highFrequency">
              <List
                size="small"
                dataSource={stats.highFrequencyComponents}
                renderItem={(comp: any) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontWeight: 500, fontSize: '12px' }}>
                        {comp.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        {comp.renderCount}次渲染 ({comp.frequency.toFixed(1)} 次/秒)
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Panel>
          )}

          {/* 渲染时间分布 */}
          <Panel header="渲染时间分布" key="renderTimes">
            <List
              size="small"
              dataSource={Object.entries(stats?.renderTimeDistribution || {})}
              renderItem={([name, time]: [string, number]) => (
                <List.Item>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px' }}>{name}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: time > 50 ? '#fa8c16' : time > 100 ? '#ff4d4f' : '#52c41a' 
                    }}>
                      {time.toFixed(1)}ms
                    </span>
                  </div>
                </List.Item>
              )}
            />
          </Panel>

          {/* 任务详情页指标 */}
          {taskMetrics && (
            <Panel header="任务页指标" key="taskMetrics">
              <div style={{ fontSize: '11px' }}>
                <div>API调用: {taskMetrics.apiMetrics?.length || 0}</div>
                <div>组件监控: {taskMetrics.componentMetrics?.length || 0}</div>
                <div>更新次数: {updateCount}</div>
              </div>
            </Panel>
          )}
        </Collapse>

        {/* 操作按钮 */}
        <div style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
          <Button size="small" onClick={generateReport}>
            生成报告
          </Button>
          <Button 
            size="small" 
            onClick={() => window.location.reload()}
          >
            刷新页面
          </Button>
        </div>

        {/* 状态提示 */}
        {!hasIssues && (
          <Alert
            message="性能状态良好"
            description="未发现连续渲染问题"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginTop: 12, fontSize: '12px' }}
          />
        )}
      </Card>
    </div>
  );
};

export default PerformanceDashboard;