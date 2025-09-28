import React, { useState, useMemo } from 'react';
import { Card, Typography, Space, Button, Divider, Row, Col, Alert, Tag } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { TaskTimelineEvent } from '../../types/timeline';
import EnhancedTaskTimelineV2 from './EnhancedTaskTimelineV2';
import { TimelineSearchUtils } from '../../utils/TimelineSearchUtils';

const { Title, Text, Paragraph } = Typography;

const AdvancedSearchDemo: React.FC = () => {
  const [demoEvents, setDemoEvents] = useState<TaskTimelineEvent[]>([]);

  // 生成更复杂的示例数据
  const complexSampleEvents: TaskTimelineEvent[] = useMemo(() => [
    // 错误聚集模式
    {
      id: 1,
      task_id: 100,
      event_type: 'error_occurred',
      event_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      description: '数据库连接超时错误',
      username: 'system',
      user_id: null,
      task_title: '系统监控任务',
      severity: 'error',
      category: 'system',
      metadata: { error_code: 'DB_TIMEOUT', batch_id: 'ERR_001' }
    },
    {
      id: 2,
      task_id: 101,
      event_type: 'error_occurred', 
      event_date: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      description: 'API调用失败',
      username: 'system',
      user_id: null,
      task_title: '接口监控任务',
      severity: 'error',
      category: 'system',
      metadata: { error_code: 'API_FAILED', batch_id: 'ERR_001' }
    },
    {
      id: 3,
      task_id: 102,
      event_type: 'error_occurred',
      event_date: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      description: '内存使用率过高',
      username: 'system',
      user_id: null,
      task_title: '资源监控任务',
      severity: 'warning',
      category: 'system',
      metadata: { error_code: 'HIGH_MEMORY', batch_id: 'ERR_001' }
    },

    // 自动化模式
    {
      id: 4,
      task_id: 200,
      event_type: 'bulk_updated',
      event_date: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      description: '自动批量更新任务状态',
      username: null,
      user_id: null,
      task_title: null,
      severity: 'info',
      category: 'system',
      metadata: { 
        change_source: 'automation',
        batch_id: 'AUTO_001',
        affected_tasks: [200, 201, 202, 203, 204],
        automation_type: 'scheduled'
      }
    },
    {
      id: 5,
      task_id: 201,
      event_type: 'status_changed',
      event_date: new Date(Date.now() - 119 * 60 * 1000).toISOString(),
      description: '状态自动更新为进行中',
      username: null,
      user_id: null,
      task_title: '自动化测试任务A',
      severity: 'info',
      category: 'system',
      metadata: { 
        change_source: 'automation',
        old_value: 'todo',
        new_value: 'in_progress',
        batch_id: 'AUTO_001'
      }
    },

    // 完成连击模式
    {
      id: 6,
      task_id: 300,
      event_type: 'completed',
      event_date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      description: '完成前端组件开发',
      username: 'frontend-dev',
      user_id: 10,
      task_title: '开发用户登录组件',
      severity: 'info',
      category: 'user',
      metadata: { completion_time: '2小时', quality_score: 95 }
    },
    {
      id: 7,
      task_id: 301,
      event_type: 'completed',
      event_date: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      description: '完成单元测试编写',
      username: 'frontend-dev',
      user_id: 10,
      task_title: '编写登录组件测试',
      severity: 'info',
      category: 'user',
      metadata: { completion_time: '1小时', quality_score: 88 }
    },
    {
      id: 8,
      task_id: 302,
      event_type: 'completed',
      event_date: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      description: '完成代码审查',
      username: 'frontend-dev',
      user_id: 10,
      task_title: '代码审查和优化',
      severity: 'info',
      category: 'user',
      metadata: { completion_time: '30分钟', quality_score: 92 }
    },

    // 活动激增模式
    {
      id: 9,
      task_id: 400,
      event_type: 'created',
      event_date: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      description: '创建紧急修复任务',
      username: 'project-manager',
      user_id: 5,
      task_title: '修复生产环境问题',
      severity: 'warning',
      category: 'user',
      metadata: { urgency: 'high', created_by_trigger: 'alert' }
    },
    {
      id: 10,
      task_id: 400,
      event_type: 'assigned',
      event_date: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      description: '分配给后端开发团队',
      username: 'project-manager',
      user_id: 5,
      task_title: '修复生产环境问题',
      severity: 'warning',
      category: 'user',
      metadata: { assignee_name: '后端开发团队', urgency: 'high' }
    },
    {
      id: 11,
      task_id: 400,
      event_type: 'priority_changed',
      event_date: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
      description: '优先级提升为最高',
      username: 'project-manager',
      user_id: 5,
      task_title: '修复生产环境问题',
      severity: 'error',
      category: 'user',
      metadata: { old_value: 'high', new_value: 'critical', reason: 'production_issue' }
    },
    {
      id: 12,
      task_id: 400,
      event_type: 'started',
      event_date: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      description: '开始处理生产问题',
      username: 'backend-dev',
      user_id: 15,
      task_title: '修复生产环境问题',
      severity: 'warning',
      category: 'user',
      metadata: { start_time: new Date().toISOString(), urgency: 'critical' }
    },

    // 常规用户活动
    {
      id: 13,
      task_id: 500,
      event_type: 'comment_added',
      event_date: new Date(Date.now() - 30 * 1000).toISOString(),
      description: '添加进度更新评论',
      username: 'tester',
      user_id: 20,
      task_title: '功能测试任务',
      severity: 'info',
      category: 'user',
      metadata: { comment_content: '已完成50%的测试用例，发现2个小问题' }
    },
    {
      id: 14,
      task_id: 500,
      event_type: 'time_logged',
      event_date: new Date(Date.now() - 20 * 1000).toISOString(),
      description: '记录测试工作时间',
      username: 'tester',
      user_id: 20,
      task_title: '功能测试任务',
      severity: 'info',
      category: 'user',
      metadata: { 
        duration_ms: 4 * 60 * 60 * 1000, // 4小时
        activity_type: '功能测试',
        break_time_ms: 30 * 60 * 1000 // 30分钟休息
      }
    },

    // 元数据丰富的事件
    {
      id: 15,
      task_id: 600,
      event_type: 'updated',
      event_date: new Date(Date.now() - 10 * 1000).toISOString(),
      description: '更新任务详细信息',
      username: 'analyst',
      user_id: 25,
      task_title: '需求分析任务',
      severity: 'info',
      category: 'user',
      metadata: {
        changed_fields: ['description', 'estimated_time', 'tags'],
        old_values: {
          description: '初步需求分析',
          estimated_time: '2小时',
          tags: ['分析']
        },
        new_values: {
          description: '深入需求分析，包含用户访谈和竞品分析',
          estimated_time: '8小时',
          tags: ['分析', '用户研究', '竞品分析']
        },
        change_reason: '需求范围扩大'
      }
    }
  ], []);

  // 初始化演示数据
  React.useEffect(() => {
    setDemoEvents(complexSampleEvents);
  }, [complexSampleEvents]);

  const handleRefresh = () => {
    setDemoEvents([...complexSampleEvents]);
  };

  // 搜索功能演示案例
  const searchExamples = [
    {
      title: '错误聚集检测',
      description: '查找系统中的错误集群，识别可能的系统性问题',
      filter: { patternType: 'error_clusters' as const },
      color: 'red'
    },
    {
      title: '自动化操作追踪',
      description: '显示所有自动化系统执行的操作',
      filter: { patternType: 'automation_patterns' as const },
      color: 'blue'
    },
    {
      title: '高效完成序列',
      description: '识别用户的高效工作模式',
      filter: { patternType: 'completion_streaks' as const },
      color: 'green'
    },
    {
      title: '紧急活动爆发',
      description: '检测短时间内的大量活动',
      filter: { patternType: 'activity_bursts' as const },
      color: 'orange'
    },
    {
      title: '最近1小时活动',
      description: '显示最近1小时内的所有事件',
      filter: { relativeDateRange: 'last_hour' as const },
      color: 'purple'
    },
    {
      title: '包含丰富元数据',
      description: '显示包含详细元数据的事件',
      filter: { hasMetadata: true },
      color: 'cyan'
    },
    {
      title: '高影响事件',
      description: '显示高影响级别的重要事件',
      filter: { impactLevel: 'high' as const },
      color: 'magenta'
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>高级搜索和过滤演示</Title>
        <Paragraph>
          这是一个完整的时间线高级搜索和过滤系统演示。展示了智能模式识别、复杂过滤条件、
          保存的搜索预设、以及多维度数据分析功能。
        </Paragraph>
        
        <Alert
          message="功能亮点"
          description={
            <ul>
              <li><strong>智能模式识别</strong>: 自动检测错误聚集、完成连击、活动爆发等模式</li>
              <li><strong>多维度过滤</strong>: 支持时间范围、用户、事件类型、元数据等复合过滤</li>
              <li><strong>保存的搜索</strong>: 支持保存和重用复杂的搜索条件</li>
              <li><strong>实时建议</strong>: 基于现有数据提供智能搜索建议</li>
              <li><strong>正则表达式</strong>: 支持高级文本搜索模式</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            重置演示数据
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={18}>
          <Card title="增强型时间线 (高级搜索版本)" style={{ height: '100%' }}>
            <EnhancedTaskTimelineV2
              events={demoEvents}
              onRefresh={handleRefresh}
              showFilters={true}
              enableGrouping={true}
              enableSearch={true}
              enableAdvancedSearch={true}
              showEventCount={true}
              compactMode={false}
              maxHeight={700}
              onEventClick={(event) => {
                console.log('Event clicked:', event);
              }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card title="搜索演示案例" >
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {searchExamples.map((example, index) => (
                  <div key={index} style={{ marginBottom: 12 }}>
                    <Tag color={example.color} style={{ marginBottom: 4 }}>
                      {example.title}
                    </Tag>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                      {example.description}
                    </div>
                    <div style={{ fontSize: 10, backgroundColor: '#f5f5f5', padding: 4, borderRadius: 4 }}>
                      过滤器: {JSON.stringify(example.filter)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="数据统计" >
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
                  <Text>错误事件：</Text>
                  <Text strong>{demoEvents.filter(e => e.severity === 'error').length}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>包含元数据：</Text>
                  <Text strong>{demoEvents.filter(e => e.metadata && Object.keys(e.metadata).length > 0).length}</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>独特用户：</Text>
                  <Text strong>{new Set(demoEvents.map(e => e.username).filter(Boolean)).size}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>事件类型：</Text>
                  <Text strong>{new Set(demoEvents.map(e => e.event_type)).size}</Text>
                </div>
              </Space>
            </Card>

            <Card title="技术特性" >
              <Space direction="vertical" size={8}>
                <Text>✅ 智能模式识别算法</Text>
                <Text>✅ 复合过滤条件支持</Text>
                <Text>✅ 正则表达式搜索</Text>
                <Text>✅ 时间范围灵活选择</Text>
                <Text>✅ 元数据深度搜索</Text>
                <Text>✅ 搜索结果持久化</Text>
                <Text>✅ 实时搜索建议</Text>
                <Text>✅ 多维度数据分析</Text>
                <Text>✅ 搜索性能优化</Text>
                <Text>✅ 响应式交互设计</Text>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default AdvancedSearchDemo;