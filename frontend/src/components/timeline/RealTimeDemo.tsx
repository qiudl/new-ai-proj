import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Row, 
  Col, 
  Alert, 
  Statistic,
  Select,
  Divider,
  Tag,
  Progress,
  Modal,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  WifiOutlined,
  BarChartOutlined,
  SettingOutlined,
  BugOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { TaskTimelineEvent, TaskTimelineEventType } from '../../types/timeline';
import RealTimeTimeline from './RealTimeTimeline';
import { getMockWebSocketServer } from '../../utils/MockWebSocketServer';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const RealTimeDemo: React.FC = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [eventStats, setEventStats] = useState({
    totalEvents: 0,
    eventsPerMinute: 0,
    lastEventTime: null as Date | null
  });
  const [selectedEventType, setSelectedEventType] = useState<TaskTimelineEventType>('created');
  const [manualEventCount, setManualEventCount] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  
  const mockServerRef = useRef(getMockWebSocketServer(8081));
  const eventCounterRef = useRef(0);
  const lastMinuteEventsRef = useRef<number[]>([]);

  // 模拟WebSocket URL（在实际应用中这会是真实的WebSocket服务器）
  const websocketUrl = 'ws://localhost:8081/ws/timeline';

  // 支持的事件类型
  const eventTypes: { value: TaskTimelineEventType; label: string; color: string }[] = [
    { value: 'created', label: '创建任务', color: 'blue' },
    { value: 'updated', label: '更新任务', color: 'cyan' },
    { value: 'completed', label: '完成任务', color: 'green' },
    { value: 'started', label: '开始任务', color: 'orange' },
    { value: 'paused', label: '暂停任务', color: 'purple' },
    { value: 'assigned', label: '分配任务', color: 'geekblue' },
    { value: 'status_changed', label: '状态变更', color: 'magenta' },
    { value: 'priority_changed', label: '优先级调整', color: 'volcano' },
    { value: 'comment_added', label: '添加评论', color: 'gold' },
    { value: 'time_logged', label: '记录时间', color: 'lime' },
    { value: 'error_occurred', label: '发生错误', color: 'red' },
    { value: 'bulk_updated', label: '批量更新', color: 'default' }
  ];

  // 启动/停止模拟服务器
  const toggleMockServer = () => {
    const mockServer = mockServerRef.current;
    
    if (isServerRunning) {
      mockServer.stop();
      setIsServerRunning(false);
      message.info('模拟WebSocket服务器已停止');
    } else {
      mockServer.start();
      setIsServerRunning(true);
      message.success('模拟WebSocket服务器已启动');
    }
  };

  // 手动触发事件
  const triggerManualEvent = () => {
    if (!isServerRunning) {
      message.warning('请先启动模拟服务器');
      return;
    }
    
    const mockServer = mockServerRef.current;
    mockServer.triggerEvent(selectedEventType, manualEventCount);
    
    message.success(`已触发 ${manualEventCount} 个 ${selectedEventType} 事件`);
  };

  // 处理新事件
  const handleNewEvent = (event: TaskTimelineEvent) => {
    eventCounterRef.current += 1;
    const now = Date.now();
    
    // 更新统计信息
    setEventStats(prev => ({
      totalEvents: eventCounterRef.current,
      eventsPerMinute: calculateEventsPerMinute(),
      lastEventTime: new Date(event.event_date)
    }));
    
    // 记录最近一分钟的事件时间
    lastMinuteEventsRef.current.push(now);
    
    // 清理超过1分钟的记录
    const oneMinuteAgo = now - 60 * 1000;
    lastMinuteEventsRef.current = lastMinuteEventsRef.current.filter(
      time => time > oneMinuteAgo
    );
  };

  // 计算每分钟事件数
  const calculateEventsPerMinute = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    return lastMinuteEventsRef.current.filter(time => time > oneMinuteAgo).length;
  };

  // 定期更新统计
  useEffect(() => {
    const interval = setInterval(() => {
      setEventStats(prev => ({
        ...prev,
        eventsPerMinute: calculateEventsPerMinute()
      }));
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 实时功能特性列表
  const realtimeFeatures = [
    { title: 'WebSocket连接', description: '实时双向通信', icon: <WifiOutlined /> },
    { title: '事件缓冲', description: '优化频繁更新', icon: <BarChartOutlined /> },
    { title: '自动重连', description: '网络断开自动恢复', icon: <ReloadOutlined /> },
    { title: '音效通知', description: '新事件声音提醒', icon: <ThunderboltOutlined /> },
    { title: '桌面通知', description: '浏览器原生通知', icon: <BugOutlined /> },
    { title: '事件过滤', description: '按任务ID过滤事件', icon: <SettingOutlined /> }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <RocketOutlined /> 实时时间线演示
        </Title>
        <Paragraph>
          这是一个完整的实时时间线系统演示，展示了WebSocket实时通信、事件缓冲、自动重连、
          音效通知等功能。你可以启动模拟服务器来体验实时事件推送效果。
        </Paragraph>
        
        <Alert
          message="功能亮点"
          description={
            <ul>
              <li><strong>WebSocket实时通信</strong>: 支持双向实时数据传输</li>
              <li><strong>智能事件缓冲</strong>: 批量处理频繁事件，优化性能</li>
              <li><strong>自动重连机制</strong>: 网络断开时自动重连，保证数据连续性</li>
              <li><strong>多种通知方式</strong>: 音效、桌面通知、视觉指示</li>
              <li><strong>事件过滤</strong>: 支持按任务ID过滤，减少无关事件干扰</li>
              <li><strong>暂停/恢复</strong>: 用户可控的事件接收状态</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </div>

      <Row gutter={24}>
        <Col span={18}>
          <Card
            title="实时时间线"
            style={{ minHeight: 700 }}
          >
            {/* 使用模拟的WebSocket URL，在实际应用中会连接到真实服务器 */}
            <RealTimeTimeline
              taskId={123}
              websocketUrl={websocketUrl}
              enableSound={true}
              enableNotifications={true}
              maxEvents={200}
              autoScroll={true}
              onNewEvent={handleNewEvent}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {/* 服务器控制 */}
            <Card title="模拟服务器控制" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Button
                    type={isServerRunning ? 'danger' : 'primary'}
                    size="large"
                    icon={isServerRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={toggleMockServer}
                    style={{ width: '100%', height: 50 }}
                  >
                    {isServerRunning ? '停止服务器' : '启动服务器'}
                  </Button>
                </div>
                
                <Divider style={{ margin: '12px 0' }} />
                
                <div>
                  <Text strong style={{ fontSize: 12 }}>手动触发事件:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={selectedEventType}
                    onChange={setSelectedEventType}
                    size="small"
                  >
                    {eventTypes.map(type => (
                      <Option key={type.value} value={type.value}>
                        <Tag color={type.color} style={{ margin: 0 }}>
                          {type.label}
                        </Tag>
                      </Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <Text strong style={{ fontSize: 12 }}>事件数量:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={manualEventCount}
                    onChange={setManualEventCount}
                    size="small"
                  >
                    <Option value={1}>1个事件</Option>
                    <Option value={3}>3个事件</Option>
                    <Option value={5}>5个事件</Option>
                    <Option value={10}>10个事件</Option>
                  </Select>
                </div>
                
                <Button
                  block
                  type="default"
                  icon={<ThunderboltOutlined />}
                  onClick={triggerManualEvent}
                  disabled={!isServerRunning}
                >
                  触发事件
                </Button>
              </Space>
            </Card>

            {/* 实时统计 */}
            <Card title="实时统计" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="总事件数"
                    value={eventStats.totalEvents}
                    prefix={<BarChartOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="每分钟"
                    value={eventStats.eventsPerMinute}
                    suffix="事件"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
              
              {eventStats.lastEventTime && (
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ fontSize: 12 }}>最后事件时间:</Text>
                  <br />
                  <Text style={{ fontSize: 11, color: '#666' }}>
                    {eventStats.lastEventTime.toLocaleString()}
                  </Text>
                </div>
              )}
              
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ fontSize: 12 }}>事件频率:</Text>
                <Progress
                  percent={Math.min(eventStats.eventsPerMinute * 10, 100)}
                  size="small"
                  status={eventStats.eventsPerMinute > 5 ? 'active' : 'normal'}
                  strokeColor={eventStats.eventsPerMinute > 10 ? '#ff4d4f' : '#1890ff'}
                />
              </div>
            </Card>

            {/* 实时功能特性 */}
            <Card title="实时功能特性" size="small">
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {realtimeFeatures.map((feature, index) => (
                  <div key={index} style={{ 
                    marginBottom: 12,
                    padding: '8px 0',
                    borderBottom: index < realtimeFeatures.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}>
                    <Space align="start">
                      <div style={{ 
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 12,
                        flexShrink: 0
                      }}>
                        {feature.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13 }}>{feature.title}</Text>
                        <br />
                        <Text style={{ fontSize: 11, color: '#666' }}>{feature.description}</Text>
                      </div>
                    </Space>
                  </div>
                ))}
              </div>
            </Card>

            {/* 技术说明 */}
            <Card title="技术实现" size="small">
              <Space direction="vertical" size={8} style={{ fontSize: 11 }}>
                <Text>• 基于原生WebSocket API</Text>
                <Text>• React Hooks状态管理</Text>
                <Text>• 事件防抖和节流优化</Text>
                <Text>• 自定义重连算法</Text>
                <Text>• AudioContext音效系统</Text>
                <Text>• Notification API通知</Text>
                <Text>• TypeScript类型安全</Text>
                <Text>• 内存使用优化</Text>
              </Space>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <Button
                block
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(true)}
              >
                查看详细配置
              </Button>
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 设置弹窗 */}
      <Modal
        title="实时时间线配置详情"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Text strong>WebSocket连接配置:</Text>
            <ul style={{ marginTop: 8, fontSize: 12 }}>
              <li>服务器地址: {websocketUrl}</li>
              <li>重连策略: 指数退避算法</li>
              <li>最大重连次数: 5次</li>
              <li>心跳间隔: 30秒</li>
              <li>连接超时: 10秒</li>
            </ul>
          </div>
          
          <div>
            <Text strong>事件处理配置:</Text>
            <ul style={{ marginTop: 8, fontSize: 12 }}>
              <li>事件缓冲时间: 500ms</li>
              <li>最大事件数量: 200条</li>
              <li>自动滚动: 启用</li>
              <li>音效通知: 启用</li>
              <li>桌面通知: 可选</li>
            </ul>
          </div>
          
          <div>
            <Text strong>性能优化:</Text>
            <ul style={{ marginTop: 8, fontSize: 12 }}>
              <li>虚拟滚动: 大量数据时自动启用</li>
              <li>事件去重: 防止重复事件</li>
              <li>内存管理: 自动清理过期事件</li>
              <li>渲染节流: 避免频繁DOM更新</li>
            </ul>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default RealTimeDemo;