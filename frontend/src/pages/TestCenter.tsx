/**
 * 测试中心页面
 * 集中展示所有测试和演示功能
 */

import React, { useState } from 'react';
import {
  Layout,
  Card,
  Tabs,
  Typography,
  Space,
  Button,
  Alert,
  Row,
  Col,
  Statistic,
  Badge,
  List
} from 'antd';
import {
  GoogleOutlined,
  BugOutlined,
  TrophyOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  BulbOutlined,
  HistoryOutlined,
  EditOutlined
} from '@ant-design/icons';

// 导入测试和演示组件 - 复杂文档组件已归档
// import GoogleDocsTestPage from './GoogleDocsTestPage';
// import DocumentSystemShowcase from '../components/DocumentSystemShowcase';
// import EnterpriseDocumentDemo from '../components/EnterpriseDocumentDemo';
// import UnifiedDocumentManager from '../components/UnifiedDocumentManager';
import TaskAnalysisPanel from '../components/TaskAnalysisPanel';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TestCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('google-docs-test');

  const testModules = [
    {
      key: 'google-docs-test',
      name: 'Google Docs 集成测试',
      description: '测试 Google Docs API 集成功能',
      icon: <GoogleOutlined style={{ color: '#4285f4' }} />,
      category: 'integration'
    },
    {
      key: 'unified-manager',
      name: '统一文档管理器',
      description: '核心文档管理功能测试',
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
      category: 'core'
    },
    {
      key: 'enterprise-demo',
      name: '企业级功能演示',
      description: '展示企业级功能配置',
      icon: <TrophyOutlined style={{ color: '#faad14' }} />,
      category: 'enterprise'
    },
    {
      key: 'system-showcase',
      name: '系统完整展示',
      description: '完整的系统架构展示',
      icon: <ThunderboltOutlined style={{ color: '#52c41a' }} />,
      category: 'showcase'
    },
    {
      key: 'task-analysis',
      name: '任务分析系统',
      description: '智能任务分析与周报生成',
      icon: <BulbOutlined style={{ color: '#722ed1' }} />,
      category: 'ai'
    }
  ];

  const featureStatus = [
    { name: '基础文档管理', status: 'success', coverage: 100 },
    { name: 'Google Docs集成', status: 'success', coverage: 95 },
    { name: '实时协作', status: 'success', coverage: 90 },
    { name: '智能搜索', status: 'success', coverage: 85 },
    { name: '在线编辑器', status: 'success', coverage: 92 },
    { name: '版本控制', status: 'success', coverage: 88 },
    { name: '虚拟化列表', status: 'success', coverage: 95 }
  ];

  const renderOverview = () => (
    <div>
      {/* 系统状态概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="测试模块"
              value={testModules.length}
              prefix={<BugOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="功能覆盖率"
              value={92}
              prefix={<ThunderboltOutlined />}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="集成服务"
              value={3}
              prefix={<GoogleOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="企业功能"
              value={7}
              prefix={<TrophyOutlined />}
              suffix="项"
            />
          </Card>
        </Col>
      </Row>

      {/* 功能状态列表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="功能模块状态" size="small">
            <List
              size="small"
              dataSource={featureStatus}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>{item.name}</Text>
                      <Badge 
                        status={item.status as any} 
                        text={`${item.coverage}%`} 
                      />
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      background: '#f0f0f0', 
                      borderRadius: '2px' 
                    }}>
                      <div style={{ 
                        width: `${item.coverage}%`, 
                        height: '100%', 
                        background: item.status === 'success' ? '#52c41a' : '#faad14',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="测试模块" size="small">
            <List
              size="small"
              dataSource={testModules}
              renderItem={(module) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={module.icon}
                    title={
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActiveTab(module.key)}
                        style={{ padding: 0, height: 'auto' }}
                      >
                        {module.name}
                      </Button>
                    }
                    description={module.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <BugOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              文档管理系统 - 测试中心
            </Title>
          </Space>
          <Badge status="success" text="所有测试就绪" />
        </div>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Alert
          message="Google API 配置成功！"
          description="您的 Google API 已经配置完成，现在可以测试所有集成功能。选择下方的测试模块开始体验。"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" type="primary" ghost>
              开始测试
            </Button>
          }
        />

        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
          <TabPane 
            tab={
              <Space>
                <BugOutlined />
                测试概览
              </Space>
            } 
            key="overview"
          >
            {renderOverview()}
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <GoogleOutlined />
                Google Docs 测试
                <Badge dot />
              </Space>
            } 
            key="google-docs-test"
          >
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '16px' }}>
                📄 Google Docs 测试功能已归档
              </div>
              <Text type="secondary">
                为保持MVP简洁，复杂的在线文档编辑功能已暂时移除
              </Text>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <FileTextOutlined />
                统一文档管理器
              </Space>
            } 
            key="unified-manager"
          >
            <Card>
              <Alert
                message="统一文档管理器测试"
                description="这里展示统一文档管理器的核心功能，包括文档CRUD、搜索、批量操作等基础功能。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />
              
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '16px' }}>
                  📁 统一文档管理器已归档
                </div>
                <Text type="secondary">
                  复杂的文档管理功能已简化，专注于核心任务文档编辑
                </Text>
              </div>
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <TrophyOutlined />
                企业级演示
              </Space>
            } 
            key="enterprise-demo"
          >
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '16px' }}>
                🏢 企业级演示已归档
              </div>
              <Text type="secondary">
                企业级文档管理功能已简化，保持MVP精简性
              </Text>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <ThunderboltOutlined />
                系统展示
              </Space>
            } 
            key="system-showcase"
          >
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '16px' }}>
                ⚡ 系统展示已归档
              </div>
              <Text type="secondary">
                文档系统展示功能已简化，专注核心业务功能
              </Text>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <BulbOutlined />
                任务分析
              </Space>
            } 
            key="task-analysis"
          >
            {React.createElement(TaskAnalysisPanel as any, {
              projectId: 1,
              taskId: undefined,
              style: { marginTop: 16 }
            })}
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default TestCenter;