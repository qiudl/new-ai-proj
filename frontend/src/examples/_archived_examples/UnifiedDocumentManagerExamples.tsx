/**
 * UnifiedDocumentManager 使用示例
 * 展示各种使用场景和配置选项
 */

import React, { useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Divider,
  Button,
  Switch,
  Row,
  Col,
  Tag,
  Alert
} from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined
} from '@ant-design/icons';
import UnifiedDocumentManager from '../components/UnifiedDocumentManager';

const { Title, Paragraph, Text } = Typography;

const UnifiedDocumentManagerExamples: React.FC = () => {
  const [currentExample, setCurrentExample] = useState('simple');
  const [mockProjectId] = useState(1);
  const [mockFolderId] = useState(2);

  const examples = [
    {
      key: 'simple',
      title: '简洁模式 - 项目文档列表',
      description: '适用于项目页面中的文档展示，功能简洁清晰',
      component: (
        <UnifiedDocumentManager
          mode="simple"
          projectId={mockProjectId}
          projectName="示例项目"
          showViewToggle={false}
          allowBatch={false}
          onDocumentSelect={(doc) => }
          onCreateDocument={() => }
        />
      )
    },
    {
      key: 'advanced',
      title: '高级模式 - 完整文档管理',
      description: '适用于专门的文档管理页面，提供所有功能',
      component: (
        <UnifiedDocumentManager
          mode="advanced"
          folderId={mockFolderId}
          allowUpload={true}
          allowBatch={true}
          defaultView="grid"
          onDocumentUpdate={() => }
        />
      )
    },
    {
      key: 'selector',
      title: '文档选择器',
      description: '用于模态框或侧边栏中的文档选择',
      component: (
        <div style={{ height: '400px', overflow: 'auto' }}>
          <UnifiedDocumentManager
            mode="simple"
            showToolbar={false}
            showSearch={true}
            allowUpload={false}
            allowBatch={false}
            onDocumentSelect={(doc) => {
              // 在实际使用中，这里会关闭模态框并返回选中的文档
            }}
          />
        </div>
      )
    },
    {
      key: 'readonly',
      title: '只读模式',
      description: '只展示文档列表，不允许任何修改操作',
      component: (
        <UnifiedDocumentManager
          mode="simple"
          projectId={mockProjectId}
          showToolbar={false}
          allowUpload={false}
          allowBatch={false}
          onDocumentSelect={(doc) => window.open(`/documents/${doc.id}`, '_blank')}
        />
      )
    },
    {
      key: 'custom',
      title: '自定义配置',
      description: '展示各种配置选项的组合使用',
      component: (
        <CustomConfigExample />
      )
    }
  ];

  const currentExampleData = examples.find(ex => ex.key === currentExample);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <FileTextOutlined style={{ marginRight: '8px' }} />
          UnifiedDocumentManager 使用示例
        </Title>
        <Paragraph>
          展示 UnifiedDocumentManager 组件的各种使用场景和配置选项。
          该组件合并了 DocumentFileManager 和 DocumentList 的功能，
          提供简洁和高级两种模式。
        </Paragraph>
      </div>

      {/* 示例选择器 */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>选择示例</Title>
        <Space wrap>
          {examples.map(example => (
            <Button
              key={example.key}
              type={currentExample === example.key ? 'primary' : 'default'}
              onClick={() => setCurrentExample(example.key)}
            >
              {example.title}
            </Button>
          ))}
        </Space>
      </Card>

      {/* 当前示例展示 */}
      {currentExampleData && (
        <Card>
          <div style={{ marginBottom: '16px' }}>
            <Title level={4}>{currentExampleData.title}</Title>
            <Paragraph type="secondary">
              {currentExampleData.description}
            </Paragraph>
          </div>
          
          <Divider />
          
          <div style={{ minHeight: '400px' }}>
            {currentExampleData.component}
          </div>
        </Card>
      )}

      {/* 功能说明 */}
      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>功能特性</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small">
              <Title level={5}>
                <SettingOutlined style={{ marginRight: '8px' }} />
                简洁模式
              </Title>
              <ul>
                <li>基础表格视图</li>
                <li>搜索和排序功能</li>
                <li>适用于项目页面</li>
                <li>代码简洁，性能优化</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small">
              <Title level={5}>
                <FolderOutlined style={{ marginRight: '8px' }} />
                高级模式
              </Title>
              <ul>
                <li>表格和网格双视图</li>
                <li>批量操作功能</li>
                <li>文件上传管理</li>
                <li>完整的CRUD操作</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 迁移提示 */}
      <Alert
        style={{ marginTop: '24px' }}
        message="迁移提示"
        description={
          <div>
            <Paragraph>
              如果您正在使用 <Text code>DocumentList</Text> 或 <Text code>DocumentFileManager</Text> 组件，
              可以无缝迁移到 <Text code>UnifiedDocumentManager</Text>：
            </Paragraph>
            <ul>
              <li><Text code>DocumentList</Text> → <Text code>mode="simple"</Text></li>
              <li><Text code>DocumentFileManager</Text> → <Text code>mode="advanced"</Text></li>
            </ul>
            <Paragraph>
              所有原有的 props 和回调函数都保持兼容。
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  );
};

// 自定义配置示例组件
const CustomConfigExample: React.FC = () => {
  const [config, setConfig] = useState({
    mode: 'simple' as 'simple' | 'advanced',
    showSearch: true,
    showToolbar: true,
    allowUpload: true,
    allowBatch: false,
    showViewToggle: true,
    defaultView: 'table' as 'table' | 'grid'
  });

  const handleConfigChange = (key: string, value: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      {/* 配置面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Title level={5}>配置选项</Title>
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text>模式:</Text>
              <Switch
                checked={config.mode === 'advanced'}
                onChange={(checked) => handleConfigChange('mode', checked ? 'advanced' : 'simple')}
                checkedChildren="高级"
                unCheckedChildren="简洁"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text>显示搜索:</Text>
              <Switch
                checked={config.showSearch}
                onChange={(checked) => handleConfigChange('showSearch', checked)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text>显示工具栏:</Text>
              <Switch
                checked={config.showToolbar}
                onChange={(checked) => handleConfigChange('showToolbar', checked)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text>允许上传:</Text>
              <Switch
                checked={config.allowUpload}
                onChange={(checked) => handleConfigChange('allowUpload', checked)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text>批量操作:</Text>
              <Switch
                checked={config.allowBatch}
                onChange={(checked) => handleConfigChange('allowBatch', checked)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text>视图切换:</Text>
              <Switch
                checked={config.showViewToggle}
                onChange={(checked) => handleConfigChange('showViewToggle', checked)}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 当前配置显示 */}
      <div style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Tag color="blue">模式: {config.mode}</Tag>
          <Tag color={config.showSearch ? 'green' : 'red'}>
            搜索: {config.showSearch ? '开' : '关'}
          </Tag>
          <Tag color={config.showToolbar ? 'green' : 'red'}>
            工具栏: {config.showToolbar ? '开' : '关'}
          </Tag>
          <Tag color={config.allowUpload ? 'green' : 'red'}>
            上传: {config.allowUpload ? '开' : '关'}
          </Tag>
          <Tag color={config.allowBatch ? 'green' : 'red'}>
            批量: {config.allowBatch ? '开' : '关'}
          </Tag>
        </Space>
      </div>

      {/* 组件实例 */}
      <UnifiedDocumentManager
        mode={config.mode}
        showSearch={config.showSearch}
        showToolbar={config.showToolbar}
        allowUpload={config.allowUpload}
        allowBatch={config.allowBatch}
        showViewToggle={config.showViewToggle}
        defaultView={config.defaultView}
        projectId={1}
        projectName="自定义配置示例"
        onDocumentSelect={(doc) => }
        onDocumentUpdate={() => }
      />
    </div>
  );
};

export default UnifiedDocumentManagerExamples;