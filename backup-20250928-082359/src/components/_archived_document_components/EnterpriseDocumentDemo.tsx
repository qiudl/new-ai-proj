/**
 * 企业级文档管理解决方案演示组件
 * 展示统一文档管理系统的所有高级功能
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Alert,
  Tabs,
  Divider,
  Tag,
  Badge,
  Statistic,
  Switch,
  Tooltip
} from 'antd';
import {
  FileTextOutlined,
  CloudOutlined,
  TeamOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  GoogleOutlined,
  HistoryOutlined,
  EditOutlined,
  ShareAltOutlined,
  SettingOutlined,
  StarOutlined,
  TrophyOutlined,
  RocketOutlined
} from '@ant-design/icons';

// 导入统一文档管理组件
import UnifiedDocumentManager from './UnifiedDocumentManager';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 演示配置
interface DemoConfig {
  name: string;
  description: string;
  features: string[];
  props: Record<string, unknown>;
  highlight?: boolean;
}

const DEMO_CONFIGS: Record<string, DemoConfig> = {
  basic: {
    name: '基础模式',
    description: '简洁的文档列表，适合轻量级使用场景',
    features: ['文档列表', '基础搜索', '文档操作'],
    props: {
      mode: 'simple',
      showSearch: true,
      showToolbar: true,
      allowUpload: true,
      defaultView: 'table'
    }
  },
  advanced: {
    name: '高级模式',
    description: '完整功能的文档管理系统',
    features: ['多视图模式', '高级搜索', '批量操作', '文件夹管理'],
    props: {
      mode: 'advanced',
      showSearch: true,
      showToolbar: true,
      allowUpload: true,
      allowBatch: true,
      showViewToggle: true,
      defaultView: 'table'
    }
  },
  collaboration: {
    name: '实时协作',
    description: '支持多人实时协作的文档管理',
    features: ['实时协作', '在线状态', '协作编辑', '变更通知'],
    props: {
      mode: 'advanced',
      enableRealtimeCollaboration: true,
      showSearch: true,
      showToolbar: true,
      allowUpload: true,
      allowBatch: true
    },
    highlight: true
  },
  intelligent: {
    name: '智能搜索',
    description: '基于AI的智能文档搜索和推荐',
    features: ['智能搜索', '语义匹配', '个性化推荐', '搜索分析'],
    props: {
      mode: 'advanced',
      enableIntelligentSearch: true,
      showSearch: true,
      showToolbar: true,
      allowUpload: true
    },
    highlight: true
  },
  virtualized: {
    name: '大数据处理',
    description: '虚拟化列表，支持处理海量文档',
    features: ['虚拟化列表', '性能优化', '大数据支持', '流畅滚动'],
    props: {
      mode: 'advanced',
      enableVirtualization: true,
      defaultView: 'virtualized',
      showSearch: true,
      showToolbar: true
    }
  },
  onlineEditor: {
    name: '在线编辑',
    description: '集成多种在线编辑器的文档编辑',
    features: ['多编辑器支持', '在线编辑', '格式兼容', '协作编辑'],
    props: {
      mode: 'advanced',
      enableOnlineEditor: true,
      enableRealtimeCollaboration: true,
      showSearch: true,
      showToolbar: true
    },
    highlight: true
  },
  versionControl: {
    name: '版本控制',
    description: 'Git风格的文档版本管理系统',
    features: ['版本历史', '版本比较', '版本回滚', '变更追踪'],
    props: {
      mode: 'advanced',
      enableVersionControl: true,
      showSearch: true,
      showToolbar: true
    }
  },
  googleDocs: {
    name: 'Google Docs集成',
    description: '与Google Docs无缝集成的文档管理',
    features: ['Google Docs导入', '实时同步', '权限管理', '协作编辑'],
    props: {
      mode: 'advanced',
      enableGoogleDocsIntegration: true,
      enableOnlineEditor: true,
      showSearch: true,
      showToolbar: true
    },
    highlight: true
  },
  enterprise: {
    name: '企业级完整版',
    description: '包含所有功能的企业级文档管理解决方案',
    features: [
      '实时协作', '智能搜索', '在线编辑', '版本控制', 
      'Google Docs集成', '大数据支持', '权限管理', '审计日志'
    ],
    props: {
      mode: 'advanced',
      enableRealtimeCollaboration: true,
      enableIntelligentSearch: true,
      enableVirtualization: true,
      enableOnlineEditor: true,
      enableVersionControl: true,
      enableGoogleDocsIntegration: true,
      showSearch: true,
      showToolbar: true,
      allowUpload: true,
      allowBatch: true,
      showViewToggle: true,
      defaultView: 'table'
    },
    highlight: true
  }
};

const EnterpriseDocumentDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<string>('enterprise');
  const [showFeatures, setShowFeatures] = useState(true);

  const renderFeatureOverview = () => (
    <Card 
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>企业级文档管理解决方案特性</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>实时协作</div>
              <div style={{ fontSize: '12px', color: '#666' }}>多人同时编辑</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <BulbOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>智能搜索</div>
              <div style={{ fontSize: '12px', color: '#666' }}>AI驱动搜索</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <EditOutlined style={{ fontSize: '32px', color: '#722ed1', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>在线编辑</div>
              <div style={{ fontSize: '12px', color: '#666' }}>多编辑器支持</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <HistoryOutlined style={{ fontSize: '32px', color: '#fa541c', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>版本控制</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Git风格版本管理</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <GoogleOutlined style={{ fontSize: '32px', color: '#4285f4', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>Google Docs</div>
              <div style={{ fontSize: '12px', color: '#666' }}>无缝集成</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <ThunderboltOutlined style={{ fontSize: '32px', color: '#faad14', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>高性能</div>
              <div style={{ fontSize: '12px', color: '#666' }}>虚拟化大数据</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <CloudOutlined style={{ fontSize: '32px', color: '#13c2c2', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>云端存储</div>
              <div style={{ fontSize: '12px', color: '#666' }}>安全可靠</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card  hoverable>
            <div style={{ textAlign: 'center' }}>
              <SettingOutlined style={{ fontSize: '32px', color: '#8c8c8c', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>权限管理</div>
              <div style={{ fontSize: '12px', color: '#666' }}>细粒度控制</div>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );

  const renderDemoSelector = () => (
    <Card 
      title={
        <Space>
          <RocketOutlined style={{ color: '#1890ff' }} />
          <span>演示模式选择</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
      extra={
        <Space>
          <Text type="secondary">显示功能介绍</Text>
          <Switch
            
            checked={showFeatures}
            onChange={setShowFeatures}
          />
        </Space>
      }
    >
      <Tabs
        activeKey={currentDemo}
        onChange={setCurrentDemo}
        type="card"
        
      >
        {Object.entries(DEMO_CONFIGS).map(([key, config]) => (
          <TabPane
            key={key}
            tab={
              <Space>
                {config.highlight && <StarOutlined style={{ color: '#faad14' }} />}
                <span>{config.name}</span>
                {config.highlight && <Badge dot />}
              </Space>
            }
          >
            <div style={{ minHeight: '120px' }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <div>
                    <Title level={5} style={{ marginBottom: 8 }}>
                      {config.name}
                      {config.highlight && (
                        <Tag color="gold" style={{ marginLeft: 8 }}>
                          推荐
                        </Tag>
                      )}
                    </Title>
                    <Paragraph style={{ marginBottom: 16 }}>
                      {config.description}
                    </Paragraph>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      主要功能：
                    </Text>
                    <Space wrap>
                      {config.features.slice(0, 4).map(feature => (
                        <Tag key={feature} color="blue">
                          {feature}
                        </Tag>
                      ))}
                      {config.features.length > 4 && (
                        <Tooltip title={config.features.slice(4).join(', ')}>
                          <Tag color="default">
                            +{config.features.length - 4}更多
                          </Tag>
                        </Tooltip>
                      )}
                    </Space>
                  </div>
                </Col>
              </Row>
            </div>
          </TabPane>
        ))}
      </Tabs>
    </Card>
  );

  const renderStats = () => {
    const config = DEMO_CONFIGS[currentDemo];
    return (
      <Card  style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="当前模式"
              value={config.name}
              prefix={config.highlight ? <StarOutlined /> : <FileTextOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="功能数量"
              value={config.features.length}
              prefix={<SettingOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="高级功能"
              value={Object.values(config.props).filter(v => v === true).length}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="企业级"
              value={config.highlight ? '是' : '否'}
              prefix={config.highlight ? <TrophyOutlined /> : <FileTextOutlined />}
              valueStyle={{ color: config.highlight ? '#52c41a' : '#8c8c8c' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  const currentConfig = DEMO_CONFIGS[currentDemo];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <Space>
            <TrophyOutlined style={{ color: '#faad14' }} />
            企业级文档管理解决方案演示
          </Space>
        </Title>
        <Text type="secondary">
          展示从基础文档管理到企业级完整解决方案的各种配置模式
        </Text>
      </div>

      {/* 功能概览 */}
      {showFeatures && renderFeatureOverview()}

      {/* 演示模式选择 */}
      {renderDemoSelector()}

      {/* 当前配置统计 */}
      {renderStats()}

      {/* 当前演示模式提示 */}
      <Alert
        message={`当前演示：${currentConfig.name}`}
        description={currentConfig.description}
        type={currentConfig.highlight ? 'success' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
        action={
          currentConfig.highlight && (
            <Button  type="primary" ghost>
              企业级推荐
            </Button>
          )
        }
      />

      {/* 统一文档管理组件演示 */}
      <UnifiedDocumentManager
        {...currentConfig.props}
        projectId={1}
        projectName="演示项目"
        onDocumentSelect={(doc) => {
          }}
        onDocumentUpdate={() => {
          }}
        onCreateDocument={() => {
          }}
        onEditDocument={(doc) => {
          }}
      />

      {/* 底部说明 */}
      <Card style={{ marginTop: 24 }}>
        <Title level={4}>
          <Space>
            <ShareAltOutlined />
            实施建议
          </Space>
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card  title="🚀 快速开始">
              <Paragraph>
                推荐从<strong>基础模式</strong>开始，逐步启用高级功能。
                企业用户可直接使用<strong>企业级完整版</strong>。
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card  title="⚡ 性能优化">
              <Paragraph>
                大数据场景启用<strong>虚拟化列表</strong>，
                协作场景启用<strong>实时协作</strong>功能。
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card  title="🔧 定制开发">
              <Paragraph>
                所有组件均支持高度自定义，
                可根据具体业务需求调整功能配置。
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default EnterpriseDocumentDemo;