import React, { useState, useMemo } from 'react';
import { Card, Typography, Space, Button, Switch, Divider, Row, Col } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { TaskTimelineEvent, TaskTimelineEventType } from '../../types/timeline';
import EnhancedTaskTimelineV2 from './EnhancedTaskTimelineV2';
import { EventRendererFactory } from './EventRenderers';

const { Title, Text, Paragraph } = Typography;

const TimelineDemo: React.FC = () => {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [demoEvents, setDemoEvents] = useState<TaskTimelineEvent[]>([]);

  // 示例事件数据
  const sampleEvents: TaskTimelineEvent[] = useMemo(() => [
    {
      id: 1,
      task_id: 123,
      event_type: 'created',
      event_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      description: '创建了新任务：实现时间线功能',
      username: 'developer',
      user_id: 1,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'user',
      metadata: {
        change_source: 'manual',
        priority: 'high'
      }
    },
    {
      id: 2,
      task_id: 123,
      event_type: 'status_changed',
      event_date: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      description: '将任务状态从待办更改为进行中',
      username: 'developer',
      user_id: 1,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'user',
      metadata: {
        old_value: 'todo',
        new_value: 'in_progress',
        change_source: 'manual'
      }
    },
    {
      id: 3,
      task_id: 123,
      event_type: 'assigned',
      event_date: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      description: '将任务分配给前端开发者',
      username: 'manager',
      user_id: 2,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'user',
      metadata: {
        old_value: null,
        new_value: 'frontend-dev',
        assignee_name: '前端开发者'
      }
    },
    {
      id: 4,
      task_id: 123,
      event_type: 'priority_changed',
      event_date: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      description: '调整任务优先级从中等到高',
      username: 'manager',
      user_id: 2,
      task_title: '实现时间线功能',
      severity: 'warning',
      category: 'user',
      metadata: {
        old_value: 'medium',
        new_value: 'high',
        change_reason: '紧急需求变更'
      }
    },
    {
      id: 5,
      task_id: 123,
      event_type: 'comment_added',
      event_date: new Date(Date.now() - 90 * 1000).toISOString(),
      description: '添加了新评论',
      username: 'reviewer',
      user_id: 3,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'user',
      metadata: {
        comment_content: '请确保时间线渲染性能良好，特别是在大量事件的情况下。'
      }
    },
    {
      id: 6,
      task_id: 123,
      event_type: 'time_logged',
      event_date: new Date(Date.now() - 60 * 1000).toISOString(),
      description: '记录工作时间',
      username: 'developer',
      user_id: 1,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'user',
      metadata: {
        duration_ms: 2 * 60 * 60 * 1000, // 2小时
        activity_type: '编码实现'
      }
    },
    {
      id: 7,
      task_id: 123,
      event_type: 'bulk_updated',
      event_date: new Date(Date.now() - 30 * 1000).toISOString(),
      description: '系统批量更新任务属性',
      username: null,
      user_id: null,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'system',
      metadata: {
        batch_id: 'BATCH_20230911_001',
        affected_tasks: [123, 124, 125],
        change_source: 'automation'
      }
    },
    {
      id: 8,
      task_id: 123,
      event_type: 'completed',
      event_date: new Date().toISOString(),
      description: '任务已完成',
      username: 'developer',
      user_id: 1,
      task_title: '实现时间线功能',
      severity: 'info',
      category: 'user',
      metadata: {
        completion_time: '2小时30分钟',
        quality_score: 95
      }
    }
  ], []);

  // 生成随机事件
  const generateRandomEvent = (): TaskTimelineEvent => {
    const eventTypes: TaskTimelineEventType[] = [
      'updated', 'comment_added', 'status_changed', 'assigned', 
      'priority_changed', 'deadline_changed', 'tag_added'
    ];
    
    const users = ['developer', 'manager', 'reviewer', 'tester'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    
    return {
      id: Date.now() + Math.random(),
      task_id: 123,
      event_type: eventType,
      event_date: new Date().toISOString(),
      description: `随机生成的${eventType}事件`,
      username: user,
      user_id: Math.floor(Math.random() * 4) + 1,
      task_title: '实现时间线功能',
      severity: Math.random() > 0.8 ? 'warning' : 'info',
      category: Math.random() > 0.9 ? 'system' : 'user',
      metadata: {
        // ✅ FIXED - Use custom_data for arbitrary demo data (TS2353)
        custom_data: {
          random_data: Math.random(),
          timestamp: new Date().toISOString()
        }
      }
    };
  };

  // 模拟实时事件
  React.useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      const newEvent = generateRandomEvent();
      setDemoEvents(prev => [newEvent, ...prev].slice(0, 20)); // 保持最新20个事件
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  // 初始化演示数据
  React.useEffect(() => {
    setDemoEvents(sampleEvents);
  }, [sampleEvents]);

  const handleRefresh = () => {
    setDemoEvents([...sampleEvents]);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>时间线渲染器系统演示</Title>
        <Paragraph>
          这是一个专门的事件类型渲染器系统演示，展示了如何为不同类型的时间线事件提供定制化的渲染效果。
          每种事件类型都有专门的渲染器，提供合适的图标、颜色、描述格式和元数据显示方式。
        </Paragraph>
        
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            重置演示数据
          </Button>
          <Space>
            <Text>实时模式：</Text>
            <Switch
              checked={isLiveMode}
              onChange={setIsLiveMode}
              checkedChildren={<PlayCircleOutlined />}
              unCheckedChildren={<PauseCircleOutlined />}
            />
          </Space>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="增强型时间线组件" style={{ height: '100%' }}>
            <EnhancedTaskTimelineV2
              events={demoEvents}
              onRefresh={handleRefresh}
              showFilters={true}
              enableGrouping={true}
              enableSearch={true}
              enableAdvancedSearch={true}
              showEventCount={true}
              compactMode={false}
              maxHeight={600}
              onEventClick={(event) => {
                console.log('Event clicked:', event);
              }}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card title="支持的事件类型" >
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {EventRendererFactory.getAvailableEventTypes().map(eventType => {
                  const renderer = EventRendererFactory.getRenderer(eventType);
                  return (
                    <div 
                      key={eventType}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: 8,
                        padding: '4px 8px',
                        backgroundColor: renderer.getBackgroundColor(),
                        borderRadius: 4,
                        border: `1px solid ${renderer.getColor()}30`
                      }}
                    >
                      <div 
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: renderer.getColor(),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 10,
                          marginRight: 8
                        }}
                      >
                        {renderer.getIcon()}
                      </div>
                      <Text style={{ fontSize: 12 }}>
                        {renderer.getTitle({ event_type: eventType } as TaskTimelineEvent)}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="功能特性" >
              <Space direction="vertical" size={8}>
                <Text>✅ 专门的事件类型渲染器</Text>
                <Text>✅ 智能元数据显示</Text>
                <Text>✅ 多维度过滤功能</Text>
                <Text>✅ 实时搜索</Text>
                <Text>✅ 事件分组和排序</Text>
                <Text>✅ 响应式设计</Text>
                <Text>✅ 用户头像和状态指示</Text>
                <Text>✅ 严重性和分类标签</Text>
                <Text>✅ 可扩展的渲染器系统</Text>
              </Space>
            </Card>

            <Card title="实时统计" >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>总事件数：</Text>
                  <Text strong>{demoEvents.length}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>用户事件：</Text>
                  <Text strong>{demoEvents.filter(e => e.category === 'user').length}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>系统事件：</Text>
                  <Text strong>{demoEvents.filter(e => e.category === 'system').length}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>警告级别：</Text>
                  <Text strong>{demoEvents.filter(e => e.severity === 'warning').length}</Text>
                </div>
                {isLiveMode && (
                  <Text type="success" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                    🔴 实时模式活跃
                  </Text>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default TimelineDemo;