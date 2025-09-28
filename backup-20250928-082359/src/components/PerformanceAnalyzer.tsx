import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Progress, Table, Tag, Alert, Tabs, Row, Col, Statistic } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import performanceMonitor from '../utils/PerformanceMonitor';
import performanceBenchmark from '../performance/benchmarks';
import { PERFORMANCE_THRESHOLDS } from '../performance/optimization-config';

const { TabPane } = Tabs;

/**
 * 性能分析器组件
 * 提供实时性能监控和分析功能
 */
const PerformanceAnalyzer: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<any>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 组件挂载时获取初始数据
  useEffect(() => {
    updateCurrentMetrics();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 更新当前指标
  const updateCurrentMetrics = () => {
    const metrics = performanceMonitor.getMetrics();
    const latest = metrics.slice(-1)[0];
    
    if (latest) {
      setCurrentMetrics({
        timestamp: latest.timestamp,
        memoryUsage: getMemoryUsage(),
        performanceScore: calculatePerformanceScore(metrics),
        totalMetrics: metrics.length,
        warningCount: metrics.filter(m => hasPerformanceWarning(m)).length,
      });
    }
  };

  // 获取内存使用情况
  const getMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  };

  // 计算性能分数
  const calculatePerformanceScore = (metrics: any[]) => {
    if (metrics.length === 0) return 0;
    
    const coreVitals = metrics.filter(m => ['LCP', 'FID', 'CLS'].includes(m.name));
    if (coreVitals.length === 0) return 50;
    
    let score = 100;
    coreVitals.forEach(metric => {
      const threshold = PERFORMANCE_THRESHOLDS[metric.name];
      if (threshold && metric.value > threshold) {
        score -= 20;
      }
    });
    
    return Math.max(score, 0);
  };

  // 检查性能警告
  const hasPerformanceWarning = (metric: any) => {
    const threshold = PERFORMANCE_THRESHOLDS[metric.name];
    return threshold ? metric.value > threshold : false;
  };

  // 开始监控
  const startMonitoring = () => {
    setIsMonitoring(true);
    performanceMonitor.startMonitoring();
    
    intervalRef.current = setInterval(() => {
      updateCurrentMetrics();
      collectPerformanceData();
      collectMemoryData();
    }, 1000);
  };

  // 停止监控
  const stopMonitoring = () => {
    setIsMonitoring(false);
    performanceMonitor.stopMonitoring();
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 收集性能数据
  const collectPerformanceData = () => {
    const metrics = performanceMonitor.getMetrics();
    const recentMetrics = metrics.slice(-60); // 最近60个数据点
    
    const timeSeriesData = recentMetrics.map((metric, index) => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      value: metric.value,
      name: metric.name,
      index,
    }));
    
    setPerformanceData(timeSeriesData);
  };

  // 收集内存数据
  const collectMemoryData = () => {
    const memoryUsage = getMemoryUsage();
    if (memoryUsage) {
      setMemoryData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString(),
          used: memoryUsage.used / 1024 / 1024, // 转换为MB
          percentage: memoryUsage.percentage,
        }];
        return newData.slice(-30); // 保持最近30个数据点
      });
    }
  };

  // 运行基准测试
  const runBenchmarks = async () => {
    try {
      const results = await performanceBenchmark.runAllBenchmarks();
      setBenchmarkResults(results);
    } catch (error) {
      console.error('基准测试失败:', error);
    }
  };

  // 导出性能报告
  const exportReport = () => {
    const report = performanceMonitor.exportReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清除数据
  const clearData = () => {
    performanceMonitor.clearMetrics();
    setPerformanceData([]);
    setMemoryData([]);
    setBenchmarkResults(null);
    updateCurrentMetrics();
  };

  // 性能指标表格列定义
  const metricsColumns = [
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: any) => {
        const hasWarning = hasPerformanceWarning(record);
        return (
          <span style={{ color: hasWarning ? '#ff4d4f' : '#52c41a' }}>
            {record.name.includes('memory') ? 
              `${(value / 1024 / 1024).toFixed(2)} MB` : 
              `${value.toFixed(2)} ${record.name.includes('percentage') ? '%' : 'ms'}`
            }
          </span>
        );
      },
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (_, record: any) => {
        const threshold = PERFORMANCE_THRESHOLDS[record.name];
        return threshold ? 
          `${threshold}${record.name.includes('percentage') ? '%' : 'ms'}` : 
          '-';
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record: any) => {
        const hasWarning = hasPerformanceWarning(record);
        return (
          <Tag color={hasWarning ? 'red' : 'green'}>
            {hasWarning ? '警告' : '正常'}
          </Tag>
        );
      },
    },
  ];

  const recentMetrics = performanceMonitor.getMetrics().slice(-10).map((metric, index) => ({
    key: index,
    ...metric,
  }));

  return (
    <div className="performance-analyzer">
      <Card title="🚀 性能分析器" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            style={{ marginRight: 8 }}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </Button>
          <Button onClick={runBenchmarks} style={{ marginRight: 8 }}>
            运行基准测试
          </Button>
          <Button onClick={exportReport} style={{ marginRight: 8 }}>
            导出报告
          </Button>
          <Button onClick={clearData}>
            清除数据
          </Button>
        </div>

        <Row gutter={16}>
          <Col span={6}>
            <Card >
              <Statistic
                title="性能评分"
                value={currentMetrics.performanceScore || 0}
                precision={0}
                suffix="/100"
                valueStyle={{ 
                  color: currentMetrics.performanceScore > 80 ? '#3f8600' : 
                         currentMetrics.performanceScore > 60 ? '#cf1322' : '#ff4d4f' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card >
              <Statistic
                title="内存使用"
                value={currentMetrics.memoryUsage?.percentage || 0}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: (currentMetrics.memoryUsage?.percentage || 0) > 80 ? '#ff4d4f' : '#3f8600' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card >
              <Statistic
                title="总指标数"
                value={currentMetrics.totalMetrics || 0}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card >
              <Statistic
                title="警告数量"
                value={currentMetrics.warningCount || 0}
                valueStyle={{ color: currentMetrics.warningCount > 0 ? '#ff4d4f' : '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="realtime">
        <TabPane tab="实时监控" key="realtime">
          <Card title="性能指标趋势">
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1890ff" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                暂无数据，请启动监控
              </div>
            )}
          </Card>

          <Card title="内存使用趋势" style={{ marginTop: 16 }}>
            {memoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={memoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="used" 
                    stroke="#52c41a" 
                    strokeWidth={2}
                    name="已使用 (MB)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#faad14" 
                    strokeWidth={2}
                    name="使用率 (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                暂无内存数据，请启动监控
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab="性能指标" key="metrics">
          <Card title="最近指标">
            <Table
              columns={metricsColumns}
              dataSource={recentMetrics}
              pagination={{ pageSize: 10 }}
              
            />
          </Card>
        </TabPane>

        <TabPane tab="基准测试" key="benchmark">
          <Card title="基准测试结果">
            {benchmarkResults ? (
              <div>
                <Alert
                  message={`测试完成: ${benchmarkResults.overall.testCount}个测试，耗时 ${benchmarkResults.overall.totalTime.toFixed(2)}ms`}
                  type="info"
                  style={{ marginBottom: 16 }}
                />
                
                <Tabs >
                  <TabPane tab="模拟功能" key="impersonation">
                    <Table
                      columns={[
                        { title: '测试名称', dataIndex: 'name' },
                        { title: '持续时间 (ms)', dataIndex: 'duration', render: v => v.toFixed(2) },
                        { title: '操作数', dataIndex: 'operations' },
                        { title: '每秒操作数', dataIndex: 'opsPerSecond', render: v => v.toFixed(0) },
                      ]}
                      dataSource={benchmarkResults.impersonation.results}
                      pagination={false}
                      
                    />
                  </TabPane>
                  
                  <TabPane tab="组件渲染" key="components">
                    <Table
                      columns={[
                        { title: '测试名称', dataIndex: 'name' },
                        { title: '持续时间 (ms)', dataIndex: 'duration', render: v => v.toFixed(2) },
                        { title: '操作数', dataIndex: 'operations' },
                        { title: '每秒操作数', dataIndex: 'opsPerSecond', render: v => v.toFixed(0) },
                      ]}
                      dataSource={benchmarkResults.components.results}
                      pagination={false}
                      
                    />
                  </TabPane>
                  
                  <TabPane tab="数据处理" key="dataProcessing">
                    <Table
                      columns={[
                        { title: '测试名称', dataIndex: 'name' },
                        { title: '持续时间 (ms)', dataIndex: 'duration', render: v => v.toFixed(2) },
                        { title: '操作数', dataIndex: 'operations' },
                        { title: '每秒操作数', dataIndex: 'opsPerSecond', render: v => v.toFixed(0) },
                      ]}
                      dataSource={benchmarkResults.dataProcessing.results}
                      pagination={false}
                      
                    />
                  </TabPane>
                  
                  <TabPane tab="内存测试" key="memory">
                    <Table
                      columns={[
                        { title: '测试名称', dataIndex: 'name' },
                        { title: '持续时间 (ms)', dataIndex: 'duration', render: v => v.toFixed(2) },
                        { title: '内存变化 (MB)', 
                          render: (_, record: any) => 
                            record && record.memoryUsage && typeof record.memoryUsage === 'object' ? 
                              ((record.memoryUsage.delta || 0) / 1024 / 1024).toFixed(2) : 
                              '-'
                        },
                      ]}
                      dataSource={benchmarkResults.memory.results}
                      pagination={false}
                      
                    />
                  </TabPane>
                </Tabs>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <p>点击"运行基准测试"开始性能测试</p>
                <Button type="primary" onClick={runBenchmarks}>
                  开始测试
                </Button>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab="优化建议" key="recommendations">
          <Card title="性能优化建议">
            <Alert
              message="基于当前性能指标的优化建议"
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            {currentMetrics.memoryUsage?.percentage > 80 && (
              <Alert
                message="高内存使用警告"
                description="当前内存使用率超过80%，建议：1) 清理未使用的缓存 2) 检查内存泄漏 3) 优化大对象处理"
                type="warning"
                style={{ marginBottom: 16 }}
              />
            )}
            
            {currentMetrics.warningCount > 5 && (
              <Alert
                message="性能警告过多"
                description="检测到多个性能警告，建议：1) 优化关键渲染路径 2) 实施代码分割 3) 使用性能分析工具定位瓶颈"
                type="error"
                style={{ marginBottom: 16 }}
              />
            )}
            
            <div>
              <h4>通用优化建议</h4>
              <ul>
                <li>实施图片懒加载和格式优化</li>
                <li>使用虚拟滚动处理大列表</li>
                <li>优化组件渲染性能</li>
                <li>实施合理的缓存策略</li>
                <li>监控和优化内存使用</li>
                <li>使用CDN加速资源加载</li>
                <li>实施服务端渲染优化</li>
              </ul>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PerformanceAnalyzer;