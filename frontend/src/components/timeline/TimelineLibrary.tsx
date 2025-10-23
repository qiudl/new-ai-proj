import React from 'react';
import { Card, Typography, Row, Col, Space, Button, Alert, Tag, Divider, Tabs } from 'antd';
import { 
  RocketOutlined, 
  ThunderboltOutlined, 
  SearchOutlined,
  BarChartOutlined,
  WifiOutlined,
  BookOutlined,
  BugOutlined
} from '@ant-design/icons';

// 导入所有组件和演示
import TimelineDemo from './TimelineDemo';
import AdvancedSearchDemo from './AdvancedSearchDemo';
import PerformanceTestDemo from './PerformanceTestDemo';
import RealTimeDemo from './RealTimeDemo';
import { TIMELINE_LIBRARY_INFO } from './index';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

/**
 * 时间线组件库主界面
 * 展示所有功能和演示
 */
const TimelineLibrary: React.FC = () => {
  
  const featureCards = [
    {
      title: '基础时间线',
      description: '简单易用的时间线组件，支持基础事件展示和过滤',
      icon: <BookOutlined />,
      color: 'blue',
      features: ['事件列表展示', '基础过滤', '响应式设计', '事件点击处理']
    },
    {
      title: '高级搜索',
      description: '强大的搜索和过滤系统，支持复杂查询和模式识别',
      icon: <SearchOutlined />,
      color: 'green',
      features: ['多维度过滤', '正则表达式', '时间范围', '模式识别', '保存搜索']
    },
    {
      title: '性能优化',
      description: '虚拟滚动和缓存优化，支持大量数据高性能渲染',
      icon: <BarChartOutlined />,
      color: 'orange',
      features: ['虚拟滚动', '智能缓存', '分批处理', '内存管理', '性能监控']
    },
    {
      title: '实时更新',
      description: 'WebSocket实时通信，支持事件推送和自动更新',
      icon: <WifiOutlined />,
      color: 'purple',
      features: ['WebSocket连接', '事件推送', '自动重连', '音效通知', '桌面通知']
    }
  ];

  const componentStats = {
    totalComponents: TIMELINE_LIBRARY_INFO.components.core.length + 
                    TIMELINE_LIBRARY_INFO.components.demo.length,
    coreComponents: TIMELINE_LIBRARY_INFO.components.core.length,
    demoComponents: TIMELINE_LIBRARY_INFO.components.demo.length,
    utilityClasses: TIMELINE_LIBRARY_INFO.components.utils.length,
    realtimeFeatures: TIMELINE_LIBRARY_INFO.components.realtime.length
  };

  return (
    <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 头部介绍 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={1} style={{ marginBottom: 16 }}>
          <RocketOutlined style={{ marginRight: 12 }} />
          Timeline Component Library
        </Title>
        <Title level={4} type="secondary" style={{ fontWeight: 'normal', marginBottom: 24 }}>
          {TIMELINE_LIBRARY_INFO.description}
        </Title>
        
        <Space size={16}>
          <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
            版本 {TIMELINE_LIBRARY_INFO.version}
          </Tag>
          <Tag color="green" style={{ padding: '4px 12px', fontSize: 14 }}>
            {componentStats.totalComponents} 个组件
          </Tag>
          <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>
            26+ 事件类型
          </Tag>
          <Tag color="purple" style={{ padding: '4px 12px', fontSize: 14 }}>
            实时WebSocket支持
          </Tag>
        </Space>
      </div>

      {/* 功能特性卡片 */}
      <Row gutter={24} style={{ marginBottom: 40 }}>
        {featureCards.map((card, index) => (
          <Col span={6} key={index}>
            <Card
              hoverable
              style={{ 
                height: 280,
                border: `2px solid transparent`,
                transition: 'all 0.3s ease'
              }}
              styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column'  }}}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.color === 'blue' ? '#1890ff' : 
                  card.color === 'green' ? '#52c41a' :
                  card.color === 'orange' ? '#fa8c16' : '#722ed1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: card.color === 'blue' ? '#e6f7ff' : 
                    card.color === 'green' ? '#f6ffed' :
                    card.color === 'orange' ? '#fff7e6' : '#f9f0ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: 24,
                  color: card.color === 'blue' ? '#1890ff' : 
                    card.color === 'green' ? '#52c41a' :
                    card.color === 'orange' ? '#fa8c16' : '#722ed1'
                }}>
                  {card.icon}
                </div>
                <Title level={4} style={{ marginBottom: 8 }}>{card.title}</Title>
                <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {card.description}
                </Text>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <Divider style={{ margin: '16px 0' }} />
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {card.features.map((feature, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: '#666' }}>
                      ✓ {feature}
                    </div>
                  ))}
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 重要提示 */}
      <Alert
        message="开发提示"
        description="这是一个完整的时间线组件库演示。所有组件都是可重用的，可以直接复制到您的项目中使用。建议从 EnhancedTaskTimelineV2 开始，它包含了最完整的功能。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
        action={
          <Button  type="primary" ghost>
            查看文档
          </Button>
        }
      />

      {/* 组件演示标签页 */}
      <Card>
        <Tabs 
          defaultActiveKey="basic" 
          size="large"
          style={{ minHeight: 800 }}
        >
          <TabPane 
            tab={
              <span>
                <BookOutlined />
                基础演示
              </span>
            } 
            key="basic"
          >
            <div style={{ padding: '0 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={3}>基础时间线功能</Title>
                <Paragraph>
                  展示基础的时间线渲染、事件类型处理、智能分组等核心功能。
                  包含26种不同的事件类型，每种都有专门的图标、颜色和描述格式。
                </Paragraph>
              </div>
              <TimelineDemo />
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SearchOutlined />
                高级搜索
              </span>
            } 
            key="search"
          >
            <div style={{ padding: '0 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={3}>高级搜索和过滤</Title>
                <Paragraph>
                  演示复杂的搜索条件、模式识别、时间范围过滤等高级功能。
                  支持正则表达式搜索、保存过滤器、智能模式检测等。
                </Paragraph>
              </div>
              <AdvancedSearchDemo />
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                性能测试
              </span>
            } 
            key="performance"
          >
            <div style={{ padding: '0 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={3}>性能优化和虚拟滚动</Title>
                <Paragraph>
                  测试大量数据的处理能力，对比虚拟滚动和常规渲染的性能差异。
                  支持生成最多50K条测试数据，实时监控内存使用和渲染性能。
                </Paragraph>
              </div>
              <PerformanceTestDemo />
            </div>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <WifiOutlined />
                实时更新
              </span>
            } 
            key="realtime"
          >
            <div style={{ padding: '0 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={3}>WebSocket实时更新</Title>
                <Paragraph>
                  演示WebSocket实时通信、事件推送、自动重连等功能。
                  包含模拟WebSocket服务器，可以体验完整的实时更新流程。
                </Paragraph>
              </div>
              <RealTimeDemo />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 技术统计 */}
      <Card style={{ marginTop: 24 }} title="技术统计">
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>
                {componentStats.totalComponents}
              </div>
              <div style={{ color: '#666' }}>总组件数</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                26+
              </div>
              <div style={{ color: '#666' }}>事件类型</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#fa8c16' }}>
                {componentStats.utilityClasses}
              </div>
              <div style={{ color: '#666' }}>工具类</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#722ed1' }}>
                {TIMELINE_LIBRARY_INFO.features.length}
              </div>
              <div style={{ color: '#666' }}>核心特性</div>
            </div>
          </Col>
        </Row>

        <Divider />

        <div>
          <Title level={4}>核心特性列表</Title>
          <Row gutter={16}>
            {TIMELINE_LIBRARY_INFO.features.map((feature, index) => (
              <Col span={12} key={index} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13 }}>
                  <ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                  {feature}
                </Text>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space size={16}>
            <Button type="primary" size="large" icon={<BookOutlined />}>
              查看完整文档
            </Button>
            <Button size="large" icon={<BugOutlined />}>
              报告问题
            </Button>
            <Button size="large" icon={<RocketOutlined />}>
              开始使用
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default TimelineLibrary;