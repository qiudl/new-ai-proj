import React, { useState } from 'react';
import { Card, Button, Space, Switch, Typography, Divider, Progress, Badge } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  DashboardPageSkeleton,
  WeeklyCalendarSkeleton,
  DashboardStatsSkeleton,
  ProjectSelectorSkeleton,
  TaskListSkeleton,
  SmartLoading
} from './SkeletonLoaders';
import { useDashboardPreload } from '../hooks/useSmartPreload';

const { Title, Text, Paragraph } = Typography;

// 模拟数据加载演示组件
export const LoadingDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<'loading' | 'loaded' | 'error' | 'empty'>('loaded');
  const [showDemo, setShowDemo] = useState(false);
  const preloadManager = useDashboardPreload();

  const mockData = {
    stats: [
      { title: '本周任务总数', value: 42, color: '#1890ff' },
      { title: '已完成', value: 28, color: '#52c41a' },
      { title: '进行中', value: 12, color: '#fa8c16' },
      { title: '完成率', value: '67%', color: '#722ed1' },
    ],
    tasks: [
      { id: 1, title: '完成项目文档', status: 'completed', priority: 'high' },
      { id: 2, title: '代码审查', status: 'in_progress', priority: 'medium' },
      { id: 3, title: '功能测试', status: 'todo', priority: 'low' },
    ]
  };

  const simulateLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('loaded');
    }, 3000);
  };

  const SkeletonExample: React.FC<{ title: string; skeleton: React.ReactNode; children: React.ReactNode }> = ({
    title,
    skeleton,
    children
  }) => (
    <Card title={title} style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <Text strong>加载状态:</Text>
          <div style={{ marginTop: '8px', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '16px' }}>
            {skeleton}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Text strong>加载完成:</Text>
          <div style={{ marginTop: '8px', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '16px' }}>
            {children}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>🎭 加载体验优化演示</Title>
        <Paragraph>
          展示智能骨架屏和预加载机制如何提升用户体验。骨架屏提供即时的视觉反馈，
          而智能预加载则确保用户需要的数据已经准备就绪。
        </Paragraph>

        <Divider />

        {/* 预加载状态展示 */}
        <Card title="🚀 智能预加载状态" style={{ marginBottom: '24px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Text strong>预加载状态:</Text>
              <Badge 
                status={preloadManager.isPreloading ? 'processing' : 'success'} 
                text={preloadManager.isPreloading ? '预加载中...' : '预加载完成'}
              />
            </div>
            
            <div>
              <Text strong>已预加载策略:</Text>
              <div style={{ marginTop: '8px' }}>
                {preloadManager.availableStrategies.map(strategy => (
                  <Badge
                    key={strategy}
                    count={preloadManager.preloadedStrategies.includes(strategy) ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : '待加载'}
                    style={{ marginRight: '12px', marginBottom: '8px' }}
                  >
                    <Button size="small">{strategy}</Button>
                  </Badge>
                ))}
              </div>
            </div>

            <Space>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={() => preloadManager.preloadNow()}
                loading={preloadManager.isPreloading}
              >
                立即预加载
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => preloadManager.resetPreload()}
              >
                重置状态
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 骨架屏示例 */}
        <Title level={3}>📱 骨架屏组件示例</Title>
        
        <SkeletonExample 
          title="仪表板统计卡片"
          skeleton={<DashboardStatsSkeleton />}
          children={
            <div style={{ display: 'flex', gap: '16px' }}>
              {mockData.stats.map((stat, index) => (
                <Card key={index} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {stat.title}
                  </div>
                </Card>
              ))}
            </div>
          }
        />

        <SkeletonExample
          title="项目筛选器"
          skeleton={<ProjectSelectorSkeleton />}
          children={
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <Text type="secondary">项目筛选</Text>
                <div style={{ marginTop: '4px', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                  AI项目管理系统
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary">状态筛选</Text>
                <div style={{ marginTop: '4px', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                  全部状态
                </div>
              </div>
            </div>
          }
        />

        <SkeletonExample
          title="任务列表"
          skeleton={<TaskListSkeleton rows={3} />}
          children={
            <Space direction="vertical" style={{ width: '100%' }}>
              {mockData.tasks.map(task => (
                <div key={task.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px'
                }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: task.status === 'completed' ? '#52c41a' : '#1890ff',
                    marginRight: '12px'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                    <Text type="secondary">优先级: {task.priority}</Text>
                  </div>
                  <Badge status={task.status === 'completed' ? 'success' : 'processing'} text={task.status} />
                </div>
              ))}
            </Space>
          }
        />

        <Divider />

        {/* SmartLoading 演示 */}
        <Title level={3}>🧠 SmartLoading 智能组件演示</Title>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>当前状态: </Text>
              <Space>
                <Button 
                  type={demoState === 'loading' ? 'primary' : 'default'}
                  onClick={() => setDemoState('loading')}
                >
                  加载中
                </Button>
                <Button 
                  type={demoState === 'loaded' ? 'primary' : 'default'}
                  onClick={() => setDemoState('loaded')}
                >
                  已加载
                </Button>
                <Button 
                  type={demoState === 'error' ? 'primary' : 'default'}
                  onClick={() => setDemoState('error')}
                >
                  错误状态
                </Button>
                <Button 
                  type={demoState === 'empty' ? 'primary' : 'default'}
                  onClick={() => setDemoState('empty')}
                >
                  空数据
                </Button>
              </Space>
            </div>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: '6px', padding: '16px', minHeight: '200px' }}>
              <SmartLoading
                loading={demoState === 'loading'}
                error={demoState === 'error' ? new Error('模拟加载错误') : null}
                data={demoState === 'empty' ? [] : demoState === 'loaded' ? mockData.tasks : null}
                skeleton={<TaskListSkeleton rows={3} />}
                errorFallback={
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <Text type="danger">❌ 数据加载失败</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Button onClick={() => setDemoState('loaded')}>重试</Button>
                    </div>
                  </div>
                }
                emptyFallback={
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <Text type="secondary">📝 暂无数据</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Button onClick={() => setDemoState('loaded')}>加载数据</Button>
                    </div>
                  </div>
                }
              >
                <div>
                  <Title level={4}>📋 任务列表</Title>
                  {mockData.tasks.map(task => (
                    <Card key={task.id} size="small" style={{ marginBottom: '8px' }}>
                      <Text strong>{task.title}</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Badge status={task.status === 'completed' ? 'success' : 'processing'} text={task.status} />
                        <Text type="secondary" style={{ marginLeft: '12px' }}>优先级: {task.priority}</Text>
                      </div>
                    </Card>
                  ))}
                </div>
              </SmartLoading>
            </div>
          </Space>
        </Card>

        <Divider />

        {/* 完整页面演示 */}
        <Title level={3}>🖥️ 完整页面骨架屏演示</Title>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Switch
                checked={showDemo}
                onChange={setShowDemo}
                checkedChildren="显示内容"
                unCheckedChildren="显示骨架屏"
              />
              <Text>切换查看完整页面的骨架屏效果</Text>
              <Button onClick={simulateLoading} icon={<PlayCircleOutlined />}>
                模拟加载过程
              </Button>
            </div>

            <div style={{ 
              border: '1px solid #f0f0f0', 
              borderRadius: '6px', 
              minHeight: '400px',
              overflow: 'hidden'
            }}>
              {(demoState === 'loading' || !showDemo) ? (
                <DashboardPageSkeleton />
              ) : (
                <div style={{ padding: '16px' }}>
                  <Title level={4}>✅ 页面加载完成</Title>
                  <Paragraph>
                    这里展示的是加载完成后的实际内容。在真实应用中，
                    用户会看到骨架屏到实际内容的平滑过渡。
                  </Paragraph>
                </div>
              )}
            </div>
          </Space>
        </Card>

        <Divider />

        <Card>
          <Title level={4}>💡 优化效果说明</Title>
          <ul>
            <li><strong>骨架屏</strong>: 提供即时视觉反馈，减少用户等待焦虑</li>
            <li><strong>智能预加载</strong>: 根据用户行为和页面访问模式提前加载数据</li>
            <li><strong>分层加载</strong>: 按优先级分批加载，重要内容优先显示</li>
            <li><strong>错误处理</strong>: 优雅的错误状态和重试机制</li>
            <li><strong>空状态处理</strong>: 友好的空数据提示和引导</li>
          </ul>
        </Card>
      </Card>
    </div>
  );
};