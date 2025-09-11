import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Slider, 
  Switch, 
  Alert, 
  Row, 
  Col,
  Progress,
  Statistic,
  Divider,
  Tag
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { TaskTimelineEvent, TaskTimelineEventType } from '../../types/timeline';
import VirtualizedTimeline from './VirtualizedTimeline';
import EnhancedTaskTimelineV2 from './EnhancedTaskTimelineV2';
import { TimelinePerformanceUtils } from '../../utils/TimelinePerformanceUtils';
import { GroupingStrategy } from './EventGrouping';

const { Title, Text, Paragraph } = Typography;

const PerformanceTestDemo: React.FC = () => {
  const [eventCount, setEventCount] = useState(1000);
  const [useVirtualization, setUseVirtualization] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [events, setEvents] = useState<TaskTimelineEvent[]>([]);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [renderTime, setRenderTime] = useState(0);
  
  const generationStartRef = useRef<number>(0);

  // 事件类型池
  const eventTypes: TaskTimelineEventType[] = [
    'created', 'updated', 'deleted', 'completed', 'started', 'paused',
    'assigned', 'status_changed', 'priority_changed', 'comment_added',
    'time_logged', 'deadline_changed', 'tag_added', 'tag_removed',
    'bulk_updated', 'restored', 'cancelled', 'error_occurred'
  ];

  const users = [
    'alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace', 'henry',
    'ivy', 'jack', 'kelly', 'liam', 'maya', 'noah', 'olivia', 'peter'
  ];

  const taskTitles = [
    '开发用户认证模块', '修复登录页面bug', '实现文件上传功能', '优化数据库查询',
    '编写单元测试', '更新API文档', '部署到生产环境', '重构代码结构',
    '添加错误处理', '集成第三方服务', '优化页面加载速度', '实现权限管理',
    '修复内存泄漏', '添加日志记录', '实现数据备份', '优化算法性能'
  ];

  // 生成大量测试数据
  const generateTestEvents = useCallback(async (count: number) => {
    setIsGenerating(true);
    generationStartRef.current = performance.now();

    const generateBatch = (batchSize: number, offset: number): TaskTimelineEvent[] => {
      const batch: TaskTimelineEvent[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        const eventIndex = offset + i;
        const event: TaskTimelineEvent = {
          id: eventIndex + 1,
          task_id: Math.floor(Math.random() * 100) + 1,
          event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          event_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: `${eventTypes[Math.floor(Math.random() * eventTypes.length)]}操作 #${eventIndex + 1}`,
          username: Math.random() > 0.1 ? users[Math.floor(Math.random() * users.length)] : null,
          user_id: Math.random() > 0.1 ? Math.floor(Math.random() * 100) + 1 : null,
          task_title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
          severity: Math.random() > 0.7 ? 
            (Math.random() > 0.5 ? 'warning' : 'error') : 'info',
          category: Math.random() > 0.2 ? 'user' : 'system',
          metadata: Math.random() > 0.3 ? {
            change_source: Math.random() > 0.8 ? 'automation' : 'manual',
            batch_id: Math.random() > 0.7 ? `BATCH_${Math.floor(Math.random() * 10)}` : undefined,
            duration_ms: Math.random() > 0.5 ? Math.floor(Math.random() * 3600000) : undefined,
            old_value: Math.random() > 0.6 ? 'old_state' : undefined,
            new_value: Math.random() > 0.6 ? 'new_state' : undefined
          } : undefined
        };
        batch.push(event);
      }
      
      return batch;
    };

    // 分批生成以避免阻塞UI
    const allEvents: TaskTimelineEvent[] = [];
    const batchSize = 500;
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const currentBatchSize = Math.min(batchSize, count - i * batchSize);
      const batch = generateBatch(currentBatchSize, i * batchSize);
      allEvents.push(...batch);

      // 每处理几个批次就让出控制权
      if (i % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // 使用性能工具预处理数据
    const preprocessStart = performance.now();
    const { events: processedEvents } = TimelinePerformanceUtils.preprocessEvents(allEvents);
    const preprocessTime = performance.now() - preprocessStart;

    const totalTime = performance.now() - generationStartRef.current;
    
    setEvents(processedEvents);
    setIsGenerating(false);

    // 更新性能统计
    setPerformanceStats({
      generationTime: totalTime,
      preprocessTime,
      eventCount: processedEvents.length,
      memoryUsage: TimelinePerformanceUtils.getMemoryUsage(),
      cacheStats: TimelinePerformanceUtils.getPerformanceStats()
    });
  }, []);

  // 测量渲染性能
  const measureRenderPerformance = useCallback(() => {
    const start = performance.now();
    
    // 使用requestAnimationFrame来测量实际渲染时间
    requestAnimationFrame(() => {
      const end = performance.now();
      setRenderTime(end - start);
    });
  }, []);

  // 当events变化时测量渲染性能
  React.useEffect(() => {
    if (events.length > 0) {
      measureRenderPerformance();
    }
  }, [events, measureRenderPerformance]);

  // 清理缓存
  const clearCache = useCallback(() => {
    TimelinePerformanceUtils.clearAllCache();
    TimelinePerformanceUtils.resetStats();
    setPerformanceStats(null);
  }, []);

  // 性能建议
  const getPerformanceRecommendations = useMemo(() => {
    if (!performanceStats) return [];

    const recommendations = [];
    
    if (eventCount > 5000 && !useVirtualization) {
      recommendations.push({
        type: 'warning',
        message: '大量数据建议启用虚拟滚动以获得更好的性能'
      });
    }
    
    if (performanceStats.memoryUsage.estimatedMemoryMB > 10) {
      recommendations.push({
        type: 'error',
        message: '内存使用过高，建议清理缓存或减少数据量'
      });
    }
    
    if (performanceStats.generationTime > 1000) {
      recommendations.push({
        type: 'info',
        message: '数据生成时间较长，实际应用中应考虑分页或懒加载'
      });
    }
    
    return recommendations;
  }, [performanceStats, eventCount, useVirtualization]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <ThunderboltOutlined /> 时间线性能测试
        </Title>
        <Paragraph>
          这是一个专门的性能测试演示，用于测试时间线组件在处理大量数据时的表现。
          可以生成不同数量的测试事件，比较虚拟化和非虚拟化的性能差异。
        </Paragraph>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card
            title={
              <Space>
                <span>时间线性能演示</span>
                <Tag color={useVirtualization ? 'green' : 'orange'}>
                  {useVirtualization ? '虚拟滚动' : '常规渲染'}
                </Tag>
                <Tag color="blue">
                  {events.length} 事件
                </Tag>
              </Space>
            }
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={isGenerating}
                  onClick={() => generateTestEvents(eventCount)}
                >
                  生成测试数据
                </Button>
              </Space>
            }
          >
            {events.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: '#fafafa',
                borderRadius: 8
              }}>
                <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <Title level={4} type="secondary">还没有测试数据</Title>
                <Text type="secondary">点击"生成测试数据"按钮开始性能测试</Text>
              </div>
            ) : useVirtualization ? (
              <VirtualizedTimeline
                events={events}
                height={600}
                itemHeight={90}
                overscanCount={10}
                enableGrouping={true}
                groupingStrategy={GroupingStrategy.BY_DATE}
                compactMode={true}
                onEventClick={(event) => console.log('虚拟化事件点击:', event)}
              />
            ) : (
              <div style={{ maxHeight: 600, overflow: 'auto' }}>
                <EnhancedTaskTimelineV2
                  events={events.slice(0, Math.min(500, events.length))} // 限制非虚拟化的数量
                  showFilters={false}
                  enableGrouping={false}
                  enableSearch={false}
                  enableAdvancedSearch={false}
                  compactMode={true}
                  maxHeight={600}
                  onEventClick={(event) => console.log('常规事件点击:', event)}
                />
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {/* 控制面板 */}
            <Card title="测试控制" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>事件数量: {eventCount.toLocaleString()}</Text>
                  <Slider
                    min={100}
                    max={50000}
                    step={100}
                    value={eventCount}
                    onChange={setEventCount}
                    marks={{
                      100: '100',
                      1000: '1K',
                      5000: '5K',
                      10000: '10K',
                      25000: '25K',
                      50000: '50K'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>虚拟滚动:</Text>
                  <Switch
                    checked={useVirtualization}
                    onChange={setUseVirtualization}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                  />
                </div>
                
                <Button
                  block
                  type="dashed"
                  icon={<ReloadOutlined />}
                  onClick={clearCache}
                >
                  清理缓存
                </Button>
              </Space>
            </Card>

            {/* 性能统计 */}
            {performanceStats && (
              <Card title={<><BarChartOutlined /> 性能统计</>} size="small">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="生成时间"
                      value={performanceStats.generationTime}
                      suffix="ms"
                      precision={0}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="渲染时间"
                      value={renderTime}
                      suffix="ms"
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="内存使用"
                      value={performanceStats.memoryUsage.estimatedMemoryMB}
                      suffix="MB"
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="缓存条目"
                      value={performanceStats.memoryUsage.cacheEntries}
                      suffix="个"
                    />
                  </Col>
                </Row>
                
                <Divider style={{ margin: '12px 0' }} />
                
                <div>
                  <Text strong style={{ fontSize: 12 }}>缓存命中率: </Text>
                  <Text style={{ fontSize: 12 }}>
                    {performanceStats.cacheStats.cache.hitRate}
                  </Text>
                </div>
                
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ fontSize: 12 }}>预处理时间: </Text>
                  <Text style={{ fontSize: 12 }}>
                    {performanceStats.preprocessTime.toFixed(2)}ms
                  </Text>
                </div>
              </Card>
            )}

            {/* 性能建议 */}
            {getPerformanceRecommendations.length > 0 && (
              <Card title="性能建议" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {getPerformanceRecommendations.map((rec, index) => (
                    <Alert
                      key={index}
                      message={rec.message}
                      type={rec.type as any}
                      showIcon
                      style={{ fontSize: 12 }}
                    />
                  ))}
                </Space>
              </Card>
            )}

            {/* 对比分析 */}
            <Card title="虚拟化 vs 常规渲染" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div>
                  <Text strong style={{ fontSize: 12, color: '#52c41a' }}>
                    虚拟滚动优势:
                  </Text>
                  <ul style={{ fontSize: 11, margin: '4px 0 0 16px', paddingLeft: 0 }}>
                    <li>支持大量数据 (50K+ 事件)</li>
                    <li>内存使用恒定</li>
                    <li>滚动流畅不卡顿</li>
                    <li>首次渲染快</li>
                  </ul>
                </div>
                
                <div>
                  <Text strong style={{ fontSize: 12, color: '#faad14' }}>
                    常规渲染特点:
                  </Text>
                  <ul style={{ fontSize: 11, margin: '4px 0 0 16px', paddingLeft: 0 }}>
                    <li>适合少量数据 (&lt;1K 事件)</li>
                    <li>功能完整 (搜索、过滤)</li>
                    <li>内存随数据增长</li>
                    <li>DOM 节点多</li>
                  </ul>
                </div>
              </Space>
            </Card>

            {/* 技术细节 */}
            <Card title="技术特性" size="small">
              <Space direction="vertical" size={8}>
                <Text style={{ fontSize: 11 }}>✅ React Window 虚拟滚动</Text>
                <Text style={{ fontSize: 11 }}>✅ 智能缓存管理</Text>
                <Text style={{ fontSize: 11 }}>✅ 分批数据处理</Text>
                <Text style={{ fontSize: 11 }}>✅ 性能监控装饰器</Text>
                <Text style={{ fontSize: 11 }}>✅ 内存使用估算</Text>
                <Text style={{ fontSize: 11 }}>✅ 防抖/节流优化</Text>
                <Text style={{ fontSize: 11 }}>✅ 自动缓存清理</Text>
                <Text style={{ fontSize: 11 }}>✅ 渲染性能追踪</Text>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default PerformanceTestDemo;