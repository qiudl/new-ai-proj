/**
 * 高级文档管理器使用示例
 * 展示如何使用实时协作、智能搜索、虚拟化列表等高级功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Switch,
  Divider,
  Statistic,
  Alert,
  List,
  Tag,
  Avatar
} from 'antd';
import {
  TeamOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import UnifiedDocumentManager from '../components/UnifiedDocumentManager';
import { intelligentSearch } from '../utils/intelligentSearch';

const { Title, Text, Paragraph } = Typography;

const AdvancedDocumentManagerExamples: React.FC = () => {
  const [collaborationEnabled, setCollaborationEnabled] = useState(false);
  const [intelligentSearchEnabled, setIntelligentSearchEnabled] = useState(false);
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(false);
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null);

  // 获取搜索分析数据
  useEffect(() => {
    const analytics = intelligentSearch.getSearchAnalytics();
    setSearchAnalytics(analytics);
  }, []);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <Card style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <RocketOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            高级文档管理器功能演示
          </Title>
          <Paragraph type="secondary">
            展示统一文档管理器的高级功能，包括实时协作、智能搜索、虚拟化列表等企业级特性。
          </Paragraph>
        </Card>

        {/* 功能控制面板 */}
        <Card title="功能控制面板" style={{ marginBottom: '24px' }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={8}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TeamOutlined style={{ color: '#52c41a' }} />
                  <Text strong>实时协作</Text>
                </div>
                <Switch
                  checked={collaborationEnabled}
                  onChange={setCollaborationEnabled}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  启用多人实时协作编辑功能
                </Text>
              </Space>
            </Col>

            <Col xs={24} sm={8}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BulbOutlined style={{ color: '#1890ff' }} />
                  <Text strong>智能搜索</Text>
                </div>
                <Switch
                  checked={intelligentSearchEnabled}
                  onChange={setIntelligentSearchEnabled}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  启用AI驱动的智能搜索和推荐
                </Text>
              </Space>
            </Col>

            <Col xs={24} sm={8}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ThunderboltOutlined style={{ color: '#faad14' }} />
                  <Text strong>虚拟化列表</Text>
                </div>
                <Switch
                  checked={virtualizationEnabled}
                  onChange={setVirtualizationEnabled}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  启用大数据量高性能渲染
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 功能说明 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={8}>
            <Card title="🤝 实时协作功能" size="small">
              <Space direction="vertical" size="small">
                <Text>• 多用户同时在线编辑</Text>
                <Text>• 实时同步文档状态</Text>
                <Text>• 文档锁定机制</Text>
                <Text>• 在线用户显示</Text>
                <Text>• 操作历史追踪</Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="🧠 智能搜索功能" size="small">
              <Space direction="vertical" size="small">
                <Text>• 模糊匹配搜索</Text>
                <Text>• 语义搜索支持</Text>
                <Text>• 个性化推荐</Text>
                <Text>• 搜索行为分析</Text>
                <Text>• 智能搜索建议</Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="⚡ 虚拟化列表" size="small">
              <Space direction="vertical" size="small">
                <Text>• 万级数据渲染</Text>
                <Text>• 流畅滚动体验</Text>
                <Text>• 内存使用优化</Text>
                <Text>• 自适应高度</Text>
                <Text>• 性能监控</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 分析数据面板 */}
        {searchAnalytics && (
          <Card title="📊 智能搜索分析" style={{ marginBottom: '24px' }}>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={6}>
                <Statistic
                  title="总搜索次数"
                  value={searchAnalytics.totalSearches}
                  prefix={<BulbOutlined />}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic
                  title="唯一查询数"
                  value={searchAnalytics.uniqueQueries}
                  precision={0}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic
                  title="平均结果数"
                  value={searchAnalytics.averageResultsCount}
                  precision={1}
                />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic
                  title="点击率"
                  value={searchAnalytics.clickThroughRate * 100}
                  precision={1}
                  suffix="%"
                />
              </Col>
            </Row>

            {searchAnalytics.topCategories.length > 0 && (
              <>
                <Divider />
                <Title level={5}>热门搜索类别</Title>
                <Space wrap>
                  {searchAnalytics.topCategories.map((category: any, index: number) => (
                    <Tag key={index} color="blue">
                      {category.category} ({category.searches})
                    </Tag>
                  ))}
                </Space>
              </>
            )}
          </Card>
        )}

        {/* 示例1：基础企业级文档管理 */}
        <Card title="📋 示例1：企业级文档管理中心" style={{ marginBottom: '24px' }}>
          <Alert
            message="功能说明"
            description="这是一个完整的企业级文档管理界面，启用了所有高级功能。适用于需要多人协作、大量文档处理的企业环境。"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <UnifiedDocumentManager
            mode="advanced"
            defaultView="table"
            enableRealtimeCollaboration={collaborationEnabled}
            enableIntelligentSearch={intelligentSearchEnabled}
            enableVirtualization={virtualizationEnabled}
            allowUpload={true}
            allowBatch={true}
            showViewToggle={true}
            onDocumentSelect={(doc) => console.log('选择文档:', doc)}
            onDocumentUpdate={() => console.log('文档已更新')}
          />
        </Card>

        {/* 示例2：项目文档协作 */}
        <Card title="👥 示例2：项目文档协作空间" style={{ marginBottom: '24px' }}>
          <Alert
            message="协作场景"
            description="适用于项目团队协作，支持实时编辑、文档锁定、多人在线状态显示等协作功能。"
            type="success"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <UnifiedDocumentManager
            mode="advanced"
            projectId={1}
            projectName="AI项目开发"
            defaultView="grid"
            enableRealtimeCollaboration={true}
            enableIntelligentSearch={true}
            allowUpload={true}
            allowBatch={true}
            onDocumentSelect={(doc) => console.log('协作选择:', doc)}
          />
        </Card>

        {/* 示例3：大数据量文档浏览 */}
        <Card title="⚡ 示例3：大数据量文档浏览器" style={{ marginBottom: '24px' }}>
          <Alert
            message="性能优化"
            description="针对大量文档（1000+）的高性能浏览界面，启用虚拟化列表和智能搜索功能。"
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <UnifiedDocumentManager
            mode="advanced"
            defaultView="virtualized"
            enableVirtualization={true}
            enableIntelligentSearch={true}
            showViewToggle={true}
            allowBatch={true}
            onDocumentSelect={(doc) => console.log('高性能选择:', doc)}
          />
        </Card>

        {/* 示例4：简洁模式对比 */}
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={12}>
            <Card title="🎯 简洁模式" size="small">
              <Alert
                message="简洁高效"
                description="适用于日常文档浏览，界面简洁，功能精简。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              
              <UnifiedDocumentManager
                mode="simple"
                projectId={1}
                showViewToggle={false}
                allowBatch={false}
                onDocumentSelect={(doc) => console.log('简洁选择:', doc)}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="🚀 高级模式" size="small">
              <Alert
                message="功能完整"
                description="提供完整的文档管理功能，适用于专业文档管理场景。"
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              
              <UnifiedDocumentManager
                mode="advanced"
                projectId={1}
                enableIntelligentSearch={intelligentSearchEnabled}
                allowUpload={true}
                allowBatch={true}
                showViewToggle={true}
                onDocumentSelect={(doc) => console.log('高级选择:', doc)}
              />
            </Card>
          </Col>
        </Row>

        {/* 使用建议 */}
        <Card title="💡 使用建议" style={{ margin: '24px 0' }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} lg={12}>
              <Title level={5}>性能优化建议</Title>
              <List size="small">
                <List.Item>• 文档数量超过100时启用虚拟化</List.Item>
                <List.Item>• 启用缓存功能减少API调用</List.Item>
                <List.Item>• 使用防抖搜索避免频繁请求</List.Item>
                <List.Item>• 适当设置分页大小</List.Item>
              </List>
            </Col>
            <Col xs={24} lg={12}>
              <Title level={5}>功能配置建议</Title>
              <List size="small">
                <List.Item>• 团队协作场景启用实时协作</List.Item>
                <List.Item>• 大量文档时启用智能搜索</List.Item>
                <List.Item>• 根据用户权限控制功能开关</List.Item>
                <List.Item>• 移动端建议使用简洁模式</List.Item>
              </List>
            </Col>
          </Row>
        </Card>

        {/* 开发者工具 */}
        <Card title="🔧 开发者工具" style={{ marginBottom: '24px' }}>
          <Space wrap>
            <Button
              icon={<ExperimentOutlined />}
              onClick={() => {
                console.log('搜索分析:', intelligentSearch.getSearchAnalytics());
                console.log('热门搜索:', intelligentSearch.getTrendingSearches(5));
              }}
            >
              输出搜索分析
            </Button>
            <Button
              onClick={() => {
                // 模拟添加搜索历史
                for (let i = 0; i < 10; i++) {
                  intelligentSearch.recordDocumentView(Math.floor(Math.random() * 100));
                }
                setSearchAnalytics(intelligentSearch.getSearchAnalytics());
              }}
            >
              生成测试数据
            </Button>
            <Button
              type="dashed"
              onClick={() => {
                localStorage.removeItem('intelligentSearch_userBehavior');
                setSearchAnalytics({ totalSearches: 0, uniqueQueries: 0, averageResultsCount: 0, clickThroughRate: 0, topCategories: [] });
              }}
            >
              清除测试数据
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedDocumentManagerExamples;

// 导出配置预设
export const ADVANCED_PRESETS = {
  // 企业协作预设
  ENTERPRISE_COLLABORATION: {
    mode: 'advanced' as const,
    enableRealtimeCollaboration: true,
    enableIntelligentSearch: true,
    enableVirtualization: false,
    allowUpload: true,
    allowBatch: true,
    showViewToggle: true
  },

  // 高性能浏览预设
  HIGH_PERFORMANCE: {
    mode: 'advanced' as const,
    enableVirtualization: true,
    enableIntelligentSearch: true,
    enableRealtimeCollaboration: false,
    defaultView: 'virtualized' as const,
    showViewToggle: true
  },

  // 简洁查看预设
  SIMPLE_VIEWER: {
    mode: 'simple' as const,
    showToolbar: true,
    allowUpload: false,
    allowBatch: false,
    showViewToggle: false
  },

  // 移动端优化预设
  MOBILE_OPTIMIZED: {
    mode: 'simple' as const,
    defaultView: 'table' as const,
    showViewToggle: false,
    allowBatch: false,
    showToolbar: true
  }
};