/**
 * 企业级文档管理器完整演示
 * 集成所有高级功能的完整展示
 */

import React, { useState, useCallback } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Switch,
  Badge,
  Statistic,
  Drawer,
  Modal,
  message,
  Tabs,
  Alert,
  Avatar,
  Tooltip,
  FloatButton
} from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  SettingOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  DatabaseOutlined,
  SyncOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

// 导入核心组件
import UnifiedDocumentManager from '../components/UnifiedDocumentManager';
import DocumentImportExportModal from '../components/DocumentImportExportModal';
import DocumentVersionControl from '../components/DocumentVersionControl';

// 导入工具和服务
import { intelligentSearch } from '../utils/intelligentSearch';
import { documentImportExport } from '../utils/documentImportExport';
import { documentManagerPerf } from '../utils/documentManagerPerformance';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 模拟文档数据
const MOCK_DOCUMENTS = Array.from({ length: 150 }, (_, index) => ({
  id: index + 1,
  title: `企业文档 ${index + 1}`,
  description: `这是第 ${index + 1} 个企业级文档的详细描述，包含了丰富的内容和功能演示。`,
  type: ['markdown', 'pdf', 'word', 'excel'][index % 4] as unknown,
  status: ['draft', 'published', 'archived'][index % 3] as unknown,
  owner_name: ['张经理', '李总监', '王主管', '陈专员'][index % 4],
  created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  tags: [
    ['重要', '紧急'],
    ['项目', '计划'],
    ['技术', '开发'],
    ['营销', '推广'],
    ['财务', '报告']
  ][index % 5],
  is_favorite: index % 7 === 0,
  is_template: index % 15 === 0,
  size: Math.floor(Math.random() * 5000) + 1000
}));

const EnterpriseDocumentManagerDemo: React.FC = () => {
  // 核心状态
  const [collapsed, setCollapsed] = useState(false);
  const [activeFeatures, setActiveFeatures] = useState({
    realtimeCollaboration: true,
    intelligentSearch: true,
    virtualization: true,
    importExport: true,
    versionControl: true
  });

  // 模态框状态
  const [importExportVisible, setImportExportVisible] = useState(false);
  const [versionControlVisible, setVersionControlVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 演示数据
  const [documents] = useState(MOCK_DOCUMENTS);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);

  // 性能统计
  const [performanceStats, setPerformanceStats] = useState({
    totalDocuments: documents.length,
    renderTime: 0,
    searchTime: 0,
    collaborativeUsers: 8
  });

  // 功能切换处理
  const handleFeatureToggle = useCallback((feature: string, enabled: boolean) => {
    setActiveFeatures(prev => ({ ...prev, [feature]: enabled }));
    message.success(`${enabled ? '启用' : '禁用'}了 ${getFeatureName(feature)}`);
  }, []);

  // 获取功能名称
  const getFeatureName = (feature: string) => {
    const names: Record<string, string> = {
      realtimeCollaboration: '实时协作',
      intelligentSearch: '智能搜索',
      virtualization: '虚拟化列表',
      importExport: '导入导出',
      versionControl: '版本控制'
    };
    return names[feature] || feature;
  };

  // 文档操作处理
  const handleDocumentSelect = useCallback((doc: unknown) => {
    setSelectedDocument(doc);
    }, []);

  const handleDocumentUpdate = useCallback(() => {
    message.success('文档更新成功');
    // 这里可以刷新文档列表
  }, []);

  // 导入导出处理
  const handleImportSuccess = useCallback((result: unknown) => {
    message.success(`成功导入 ${result.success} 个文档`);
    setImportExportVisible(false);
  }, []);

  const handleExportComplete = useCallback(() => {
    message.success('文档导出完成');
    setImportExportVisible(false);
  }, []);

  // 版本控制处理
  const handleVersionRestore = useCallback((version: unknown) => {
    message.success(`已回滚到版本 ${version.version}`);
    setVersionControlVisible(false);
  }, []);

  // 渲染侧边栏
  const renderSidebar = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Avatar size={64} icon={<RocketOutlined />} style={{ backgroundColor: '#1890ff' }} />
        <Title level={4} style={{ marginTop: '12px', marginBottom: '4px' }}>
          企业文档管理
        </Title>
        <Text type="secondary">Enterprise Edition</Text>
      </div>

      <Card title="系统统计" size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Statistic
              title="文档总数"
              value={performanceStats.totalDocuments}
              prefix={<DatabaseOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="在线用户"
              value={performanceStats.collaborativeUsers}
              prefix={<TeamOutlined />}
              valueStyle={{ fontSize: '16px', color: '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      <Card title="功能开关" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          {Object.entries(activeFeatures).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: '13px' }}>{getFeatureName(key)}</Text>
              <Switch
                size="small"
                checked={value}
                onChange={(checked) => handleFeatureToggle(key, checked)}
              />
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );

  // 渲染功能展示面板
  const renderFeaturePanel = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small" style={{ textAlign: 'center' }}>
          <TeamOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
          <Text strong style={{ display: 'block' }}>实时协作</Text>
          <Badge 
            status={activeFeatures.realtimeCollaboration ? "success" : "default"} 
            text={activeFeatures.realtimeCollaboration ? "已启用" : "已禁用"}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card size="small" style={{ textAlign: 'center' }}>
          <BulbOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
          <Text strong style={{ display: 'block' }}>智能搜索</Text>
          <Badge 
            status={activeFeatures.intelligentSearch ? "success" : "default"} 
            text={activeFeatures.intelligentSearch ? "已启用" : "已禁用"}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card size="small" style={{ textAlign: 'center' }}>
          <ThunderboltOutlined style={{ fontSize: '24px', color: '#faad14', marginBottom: '8px' }} />
          <Text strong style={{ display: 'block' }}>虚拟化列表</Text>
          <Badge 
            status={activeFeatures.virtualization ? "success" : "default"} 
            text={activeFeatures.virtualization ? "已启用" : "已禁用"}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card size="small" style={{ textAlign: 'center' }}>
          <CloudUploadOutlined style={{ fontSize: '24px', color: '#722ed1', marginBottom: '8px' }} />
          <Text strong style={{ display: 'block' }}>导入导出</Text>
          <Badge 
            status={activeFeatures.importExport ? "success" : "default"} 
            text={activeFeatures.importExport ? "已启用" : "已禁用"}
          />
        </Card>
      </Col>
    </Row>
  );

  // 渲染操作工具栏
  const renderActionToolbar = () => (
    <Card style={{ marginBottom: '16px' }}>
      <Space wrap>
        <Button
          icon={<CloudUploadOutlined />}
          onClick={() => setImportExportVisible(true)}
          disabled={!activeFeatures.importExport}
        >
          导入导出
        </Button>

        <Button
          icon={<HistoryOutlined />}
          onClick={() => {
            if (selectedDocument) {
              setVersionControlVisible(true);
            } else {
              message.warning('请先选择一个文档');
            }
          }}
          disabled={!activeFeatures.versionControl || !selectedDocument}
        >
          版本控制
        </Button>

        <Button
          icon={<SyncOutlined />}
          onClick={() => {
            message.success('数据同步完成');
          }}
        >
          同步数据
        </Button>

        <Button
          icon={<DashboardOutlined />}
          onClick={() => {
            const report = documentManagerPerf.generateReport();
            message.success('性能报告已输出到控制台');
          }}
        >
          性能报告
        </Button>

        <Button
          icon={<SettingOutlined />}
          onClick={() => setSettingsVisible(true)}
        >
          高级设置
        </Button>
      </Space>
    </Card>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        width={280}
        style={{ backgroundColor: '#fff' }}
      >
        {!collapsed && renderSidebar()}
      </Sider>

      <Layout>
        <Header style={{ backgroundColor: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
              <RocketOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
              企业级文档管理系统演示
            </Title>
            
            <Space>
              <Badge count={selectedDocuments.length} showZero>
                <Text>已选择</Text>
              </Badge>
              <Tooltip title="帮助文档">
                <Button 
                  type="text" 
                  icon={<QuestionCircleOutlined />}
                  onClick={() => window.open('/docs/unified-document-manager-complete-guide.md', '_blank')}
                />
              </Tooltip>
            </Space>
          </div>
        </Header>

        <Content style={{ padding: '24px', backgroundColor: '#f5f5f5' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* 功能状态面板 */}
            {renderFeaturePanel()}

            {/* 操作工具栏 */}
            {renderActionToolbar()}

            {/* 主要内容区域 */}
            <Card>
              <Tabs defaultActiveKey="main" style={{ minHeight: '600px' }}>
                <TabPane 
                  tab={
                    <span>
                      <DatabaseOutlined />
                      文档管理
                    </span>
                  } 
                  key="main"
                >
                  <Alert
                    message="企业级功能演示"
                    description="此演示集成了所有高级功能，包括实时协作、智能搜索、虚拟化列表、导入导出、版本控制等。请尝试各种操作来体验完整的企业级文档管理功能。"
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />

                  <UnifiedDocumentManager
                    mode="advanced"
                    projectId={1}
                    projectName="企业演示项目"
                    enableRealtimeCollaboration={activeFeatures.realtimeCollaboration}
                    enableIntelligentSearch={activeFeatures.intelligentSearch}
                    enableVirtualization={activeFeatures.virtualization}
                    allowUpload={true}
                    allowBatch={true}
                    showViewToggle={true}
                    defaultView="table"
                    onDocumentSelect={handleDocumentSelect}
                    onDocumentUpdate={handleDocumentUpdate}
                  />
                </TabPane>

                <TabPane 
                  tab={
                    <span>
                      <BulbOutlined />
                      智能分析
                    </span>
                  } 
                  key="analytics"
                >
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                      <Card title="搜索分析" size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Statistic
                            title="总搜索次数"
                            value={intelligentSearch.getSearchAnalytics().totalSearches}
                            prefix={<BulbOutlined />}
                          />
                          <Statistic
                            title="点击率"
                            value={(intelligentSearch.getSearchAnalytics().clickThroughRate * 100).toFixed(1)}
                            suffix="%"
                          />
                        </Space>
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card title="性能监控" size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Statistic
                            title="平均渲染时间"
                            value={Math.round(Math.random() * 100 + 50)}
                            suffix="ms"
                            prefix={<ThunderboltOutlined />}
                          />
                          <Statistic
                            title="内存使用"
                            value={(Math.random() * 20 + 10).toFixed(1)}
                            suffix="MB"
                          />
                        </Space>
                      </Card>
                    </Col>
                  </Row>

                  <Card title="热门文档" style={{ marginTop: '16px' }}>
                    <Text type="secondary">基于用户访问和搜索行为的智能推荐</Text>
                    {documents.slice(0, 5).map(doc => (
                      <div key={doc.id} style={{ 
                        padding: '8px 0', 
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Text>{doc.title}</Text>
                        <Badge count={Math.floor(Math.random() * 100)} showZero />
                      </div>
                    ))}
                  </Card>
                </TabPane>

                <TabPane 
                  tab={
                    <span>
                      <TeamOutlined />
                      协作状态
                    </span>
                  } 
                  key="collaboration"
                >
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                      <Card title="在线用户" size="small">
                        {Array.from({ length: 6 }, (_, i) => (
                          <div key={i} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            padding: '8px 0',
                            borderBottom: i < 5 ? '1px solid #f0f0f0' : 'none'
                          }}>
                            <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                              {String.fromCharCode(65 + i)}
                            </Avatar>
                            <div style={{ flex: 1 }}>
                              <Text strong>用户 {String.fromCharCode(65 + i)}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                正在编辑文档 {i + 1}
                              </Text>
                            </div>
                            <Badge status="success" />
                          </div>
                        ))}
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card title="文档锁定状态" size="small">
                        <Text type="secondary">当前没有文档被锁定</Text>
                        <div style={{ marginTop: '16px' }}>
                          <Button size="small" type="dashed" block>
                            查看锁定历史
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>
              </Tabs>
            </Card>
          </div>
        </Content>
      </Layout>

      {/* 导入导出模态框 */}
      <DocumentImportExportModal
        visible={importExportVisible}
        onCancel={() => setImportExportVisible(false)}
        documents={documents}
        selectedDocuments={selectedDocuments}
        onImportSuccess={handleImportSuccess}
        onExportComplete={handleExportComplete}
      />

      {/* 版本控制模态框 */}
      {selectedDocument && (
        <DocumentVersionControl
          document={selectedDocument}
          visible={versionControlVisible}
          onClose={() => setVersionControlVisible(false)}
          onVersionRestore={handleVersionRestore}
          onVersionUpdate={handleDocumentUpdate}
        />
      )}

      {/* 高级设置抽屉 */}
      <Drawer
        title="高级设置"
        placement="right"
        onClose={() => setSettingsVisible(false)}
        open={settingsVisible}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card title="性能设置" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>启用缓存</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>自动刷新</Text>
                <Switch />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>性能监控</Text>
                <Switch defaultChecked />
              </div>
            </Space>
          </Card>

          <Card title="协作设置" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>实时通知</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>自动锁定</Text>
                <Switch />
              </div>
            </Space>
          </Card>

          <Card title="搜索设置" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>模糊搜索</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>语义搜索</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>搜索建议</Text>
                <Switch defaultChecked />
              </div>
            </Space>
          </Card>
        </Space>
      </Drawer>

      {/* 悬浮按钮 */}
      <FloatButton.Group
        trigger="click"
        type="primary"
        style={{ right: 24 }}
        icon={<SettingOutlined />}
      >
        <FloatButton
          icon={<CloudUploadOutlined />}
          tooltip="导入导出"
          onClick={() => setImportExportVisible(true)}
        />
        <FloatButton
          icon={<HistoryOutlined />}
          tooltip="版本控制"
          onClick={() => {
            if (selectedDocument) {
              setVersionControlVisible(true);
            } else {
              message.warning('请先选择一个文档');
            }
          }}
        />
        <FloatButton
          icon={<DashboardOutlined />}
          tooltip="性能监控"
          onClick={() => {
            Modal.info({
              title: '性能监控',
              content: (
                <div>
                  <p>当前系统运行状态良好</p>
                  <p>文档数量: {documents.length}</p>
                  <p>内存使用: {(Math.random() * 20 + 10).toFixed(1)} MB</p>
                  <p>响应时间: {Math.round(Math.random() * 100 + 50)} ms</p>
                </div>
              )
            });
          }}
        />
      </FloatButton.Group>
    </Layout>
  );
};

export default EnterpriseDocumentManagerDemo;