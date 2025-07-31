/**
 * Google Docs 功能测试页面
 * 用于测试和演示 Google Docs 集成功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Typography,
  Divider,
  List,
  Avatar,
  Tag,
  message,
  Modal,
  Input,
  Row,
  Col,
  Statistic,
  Steps,
  Progress,
  Descriptions,
  Badge,
  Tooltip
} from 'antd';
import {
  GoogleOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  EditOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  HistoryOutlined,
  ShareAltOutlined,
  EyeOutlined
} from '@ant-design/icons';

import { googleDocsService } from '../services/googleDocsService';
import GoogleConfigChecker from '../components/GoogleConfigChecker';
import OnlineDocumentEditor from '../components/OnlineDocumentEditor';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TextArea } = Input;

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading' | 'waiting';
  message: string;
  details?: any;
  duration?: number;
}

interface GoogleDoc {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  owners: Array<{
    displayName: string;
    emailAddress: string;
  }>;
}

const GoogleDocsTestPage: React.FC = () => {
  // 状态管理
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [googleDocs, setGoogleDocs] = useState<GoogleDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GoogleDoc | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 模态框状态
  const [editorVisible, setEditorVisible] = useState(false);
  const [createDocVisible, setCreateDocVisible] = useState(false);
  const [importDocVisible, setImportDocVisible] = useState(false);

  // 初始化检查
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 检查认证状态
  const checkAuthStatus = async () => {
    try {
      const authenticated = googleDocsService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const user = await googleDocsService.getCurrentUser();
        setCurrentUser(user);
        loadGoogleDocs();
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
    }
  };

  // Google 认证
  const handleAuthenticate = async () => {
    try {
      setLoading(true);
      const success = await googleDocsService.authenticate();
      
      if (success) {
        setIsAuthenticated(true);
        const user = await googleDocsService.getCurrentUser();
        setCurrentUser(user);
        message.success('Google 认证成功！');
        loadGoogleDocs();
      } else {
        message.error('Google 认证失败');
      }
    } catch (error) {
      console.error('认证失败:', error);
      message.error(`认证失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 退出登录
  const handleSignOut = async () => {
    try {
      await googleDocsService.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setGoogleDocs([]);
      message.success('已退出 Google 账户');
    } catch (error) {
      console.error('退出登录失败:', error);
      message.error('退出登录失败');
    }
  };

  // 加载 Google Docs 列表
  const loadGoogleDocs = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const docs = await googleDocsService.listDocuments(10);
      setGoogleDocs(docs as GoogleDoc[]);
    } catch (error) {
      console.error('加载文档列表失败:', error);
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新文档
  const handleCreateDocument = async (title: string, content: string) => {
    try {
      setLoading(true);
      const newDoc = await googleDocsService.createDocument(title, content);
      message.success(`文档 "${title}" 创建成功！`);
      setCreateDocVisible(false);
      loadGoogleDocs();
      
      // 可选：直接编辑新文档
      Modal.confirm({
        title: '创建成功',
        content: '是否立即编辑新创建的文档？',
        onOk: () => {
          window.open(`https://docs.google.com/document/d/${newDoc.documentId}/edit`, '_blank');
        }
      });
    } catch (error) {
      console.error('创建文档失败:', error);
      message.error('创建文档失败');
    } finally {
      setLoading(false);
    }
  };

  // 导入文档
  const handleImportDocument = async (googleDocId: string) => {
    try {
      setLoading(true);
      const importedDoc = await googleDocsService.importDocument(googleDocId);
      message.success(`文档 "${importedDoc.title}" 导入成功！`);
      setImportDocVisible(false);
      
      // 显示导入结果
      Modal.info({
        title: '导入成功',
        width: 600,
        content: (
          <div>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="标题">{importedDoc.title}</Descriptions.Item>
              <Descriptions.Item label="内容长度">{importedDoc.content.length} 字符</Descriptions.Item>
              <Descriptions.Item label="来源">Google Docs</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Text strong>内容预览：</Text>
            <div style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto',
              marginTop: '8px'
            }}>
              <Text style={{ whiteSpace: 'pre-wrap' }}>
                {importedDoc.content.slice(0, 500)}
                {importedDoc.content.length > 500 && '...'}
              </Text>
            </div>
          </div>
        )
      });
    } catch (error) {
      console.error('导入文档失败:', error);
      message.error('导入文档失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出文档到 Google Docs
  const handleExportDocument = async () => {
    try {
      setLoading(true);
      const sampleContent = `# 测试导出文档

这是一个从系统导出到 Google Docs 的测试文档。

## 功能特性

- 文档管理
- 实时协作
- 版本控制
- Google Docs 集成

## 系统信息

- 创建时间: ${new Date().toLocaleString()}
- 用户: ${currentUser?.name || 'Unknown'}
- 邮箱: ${currentUser?.email || 'Unknown'}

---

此文档由企业级文档管理系统自动生成。`;

      const googleDocId = await googleDocsService.exportDocument('系统导出测试文档', sampleContent);
      const shareableLink = await googleDocsService.getShareableLink(googleDocId);
      
      message.success('文档导出成功！');
      
      // 显示导出结果
      Modal.success({
        title: '导出成功',
        content: (
          <div>
            <p>文档已成功导出到 Google Docs</p>
            <div style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                icon={<GoogleOutlined />}
                onClick={() => window.open(shareableLink, '_blank')}
              >
                在 Google Docs 中查看
              </Button>
            </div>
          </div>
        )
      });
      
      loadGoogleDocs();
    } catch (error) {
      console.error('导出文档失败:', error);
      message.error('导出文档失败');
    } finally {
      setLoading(false);
    }
  };

  // 运行综合测试
  const runComprehensiveTest = async () => {
    const tests: TestResult[] = [
      { name: '用户认证测试', status: 'waiting', message: '准备中...' },
      { name: '文档列表获取', status: 'waiting', message: '准备中...' },
      { name: '创建文档测试', status: 'waiting', message: '准备中...' },
      { name: '文档导入测试', status: 'waiting', message: '准备中...' },
      { name: '权限检查测试', status: 'waiting', message: '准备中...' }
    ];
    
    setTestResults(tests);
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const startTime = Date.now();
      
      // 更新为加载状态
      test.status = 'loading';
      test.message = '测试中...';
      setTestResults([...tests]);
      
      try {
        switch (i) {
          case 0: // 认证测试
            const user = await googleDocsService.getCurrentUser();
            test.status = user ? 'success' : 'error';
            test.message = user ? `认证成功: ${user.name}` : '用户未认证';
            test.details = user;
            break;
            
          case 1: // 文档列表
            const docs = await googleDocsService.listDocuments(5);
            test.status = 'success';
            test.message = `获取到 ${docs.length} 个文档`;
            test.details = docs;
            break;
            
          case 2: // 创建文档
            const newDoc = await googleDocsService.createDocument(
              `测试文档_${Date.now()}`,
              '这是一个测试文档内容'
            );
            test.status = 'success';
            test.message = '文档创建成功';
            test.details = newDoc;
            break;
            
          case 3: // 导入测试
            if (googleDocs.length > 0) {
              const firstDoc = googleDocs[0];
              const imported = await googleDocsService.importDocument(firstDoc.id);
              test.status = 'success';
              test.message = `导入成功: ${imported.title}`;
              test.details = imported;
            } else {
              test.status = 'success';
              test.message = '跳过导入测试（无可用文档）';
            }
            break;
            
          case 4: // 权限检查
            const permissions = googleDocs.length > 0 
              ? await googleDocsService.getCollaborators(googleDocs[0].id)
              : [];
            test.status = 'success';
            test.message = `权限检查完成`;
            test.details = permissions;
            break;
        }
      } catch (error) {
        test.status = 'error';
        test.message = `测试失败: ${error}`;
        test.details = error;
      }
      
      test.duration = Date.now() - startTime;
      setTestResults([...tests]);
      
      // 短暂延迟以显示进度
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // 渲染认证状态
  const renderAuthStatus = () => (
    <Card title="Google 认证状态" style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div style={{ textAlign: 'center' }}>
            <Avatar 
              size={64}
              src={currentUser?.picture}
              icon={<UserOutlined />}
              style={{ marginBottom: 16 }}
            />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {currentUser?.name || '未登录'}
              </Title>
              <Text type="secondary">
                {currentUser?.email || '请先进行 Google 认证'}
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="认证状态">
              <Badge 
                status={isAuthenticated ? 'success' : 'error'} 
                text={isAuthenticated ? '已认证' : '未认证'} 
              />
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">
              {currentUser?.id || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="账户类型">
              Google Workspace
            </Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
      
      <Divider />
      
      <Space>
        {!isAuthenticated ? (
          <Button 
            type="primary" 
            icon={<GoogleOutlined />}
            loading={loading}
            onClick={handleAuthenticate}
          >
            Google 认证
          </Button>
        ) : (
          <Button 
            icon={<GoogleOutlined />}
            onClick={handleSignOut}
          >
            退出登录
          </Button>
        )}
        
        <GoogleConfigChecker />
        
        <Button 
          type="dashed"
          icon={<SyncOutlined />}
          onClick={checkAuthStatus}
        >
          刷新状态
        </Button>
      </Space>
    </Card>
  );

  // 渲染文档列表
  const renderDocumentList = () => (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          Google Docs 文档列表
          <Badge count={googleDocs.length} />
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<SyncOutlined />}
            onClick={loadGoogleDocs}
            loading={loading}
            disabled={!isAuthenticated}
          >
            刷新
          </Button>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {!isAuthenticated ? (
        <Alert
          message="请先进行 Google 认证"
          description="需要 Google 认证后才能访问您的文档列表"
          type="warning"
          showIcon
        />
      ) : (
        <List
          loading={loading}
          dataSource={googleDocs}
          renderItem={(doc) => (
            <List.Item
              actions={[
                <Tooltip title="在 Google Docs 中查看">
                  <Button 
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => window.open(doc.webViewLink, '_blank')}
                  />
                </Tooltip>,
                <Tooltip title="导入到系统">
                  <Button 
                    icon={<CloudDownloadOutlined />}
                    size="small"
                    onClick={() => handleImportDocument(doc.id)}
                  />
                </Tooltip>,
                <Tooltip title="在线编辑">
                  <Button 
                    icon={<EditOutlined />}
                    size="small"
                    type="primary"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setEditorVisible(true);
                    }}
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: '16px', color: '#4285f4' }} />}
                title={doc.name}
                description={
                  <Space direction="vertical" size="small">
                    <div>
                      <Text type="secondary">
                        创建: {new Date(doc.createdTime).toLocaleString()}
                      </Text>
                      <Divider type="vertical" />
                      <Text type="secondary">
                        修改: {new Date(doc.modifiedTime).toLocaleString()}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">
                        所有者: {doc.owners?.[0]?.displayName || '未知'}
                      </Text>
                    </div>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );

  // 渲染功能测试区域
  const renderFunctionTests = () => (
    <Card title="功能测试" style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Button 
            block
            icon={<CloudUploadOutlined />}
            disabled={!isAuthenticated}
            onClick={() => setCreateDocVisible(true)}
          >
            创建文档
          </Button>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Button 
            block
            icon={<CloudDownloadOutlined />}
            disabled={!isAuthenticated}
            onClick={() => setImportDocVisible(true)}
          >
            导入文档
          </Button>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Button 
            block
            icon={<CloudUploadOutlined />}
            disabled={!isAuthenticated}
            loading={loading}
            onClick={handleExportDocument}
          >
            导出测试
          </Button>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Button 
            block
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={!isAuthenticated}
            onClick={runComprehensiveTest}
          >
            综合测试
          </Button>
        </Col>
      </Row>
    </Card>
  );

  // 渲染测试结果
  const renderTestResults = () => {
    if (testResults.length === 0) return null;
    
    return (
      <Card title="测试结果" style={{ marginBottom: 24 }}>
        <List
          dataSource={testResults}
          renderItem={(result) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  result.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  result.status === 'error' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                  result.status === 'loading' ? <SyncOutlined spin style={{ color: '#1890ff' }} /> :
                  <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />
                }
                title={
                  <Space>
                    {result.name}
                    <Tag color={
                      result.status === 'success' ? 'success' :
                      result.status === 'error' ? 'error' :
                      result.status === 'loading' ? 'processing' :
                      'default'
                    }>
                      {result.status === 'success' ? '通过' :
                       result.status === 'error' ? '失败' :
                       result.status === 'loading' ? '测试中' :
                       '等待'}
                    </Tag>
                    {result.duration && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ({result.duration}ms)
                      </Text>
                    )}
                  </Space>
                }
                description={result.message}
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <Space>
            <GoogleOutlined style={{ color: '#4285f4' }} />
            Google Docs 功能测试
          </Space>
        </Title>
        <Text type="secondary">
          测试和验证 Google Docs 集成功能是否正常工作
        </Text>
      </div>

      {/* 认证状态 */}
      {renderAuthStatus()}

      {/* 功能测试区域 */}
      {renderFunctionTests()}

      {/* 测试结果 */}
      {renderTestResults()}

      {/* 文档列表 */}
      {renderDocumentList()}

      {/* 创建文档模态框 */}
      <Modal
        title="创建新的 Google Docs 文档"
        open={createDocVisible}
        onCancel={() => setCreateDocVisible(false)}
        onOk={() => {
          const titleInput = document.getElementById('doc-title') as HTMLInputElement;
          const contentInput = document.getElementById('doc-content') as HTMLTextAreaElement;
          if (titleInput?.value) {
            handleCreateDocument(titleInput.value, contentInput?.value || '');
          }
        }}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>文档标题</Text>
            <Input
              id="doc-title"
              placeholder="输入文档标题..."
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Text strong>文档内容</Text>
            <TextArea
              id="doc-content"
              placeholder="输入文档内容..."
              rows={6}
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* 导入文档模态框 */}
      <Modal
        title="从 Google Docs 导入文档"
        open={importDocVisible}
        onCancel={() => setImportDocVisible(false)}
        onOk={() => {
          const docIdInput = document.getElementById('import-doc-id') as HTMLInputElement;
          if (docIdInput?.value) {
            const docId = docIdInput.value.includes('/document/d/') 
              ? docIdInput.value.split('/document/d/')[1].split('/')[0]
              : docIdInput.value;
            handleImportDocument(docId);
          }
        }}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>请输入 Google Docs 文档 ID 或完整 URL：</Text>
          <Input
            id="import-doc-id"
            placeholder="文档 ID 或 URL..."
          />
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              支持格式：<br />
              • 文档 ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms<br />
              • 完整 URL: https://docs.google.com/document/d/[文档ID]/edit
            </Text>
          </div>
        </Space>
      </Modal>

      {/* 在线编辑器 */}
      {selectedDoc && (
        <OnlineDocumentEditor
          document={{
            id: parseInt(selectedDoc.id),
            title: selectedDoc.name,
            content: '',
            type: 'text' as const,
            status: 'draft' as const,
            tags: [],
            owner_id: 1,
            visibility: 'private' as const,
            version: 1,
            is_template: false,
            created_at: selectedDoc.createdTime,
            updated_at: selectedDoc.modifiedTime,
            created_by: 1
          }}
          visible={editorVisible}
          onClose={() => setEditorVisible(false)}
          defaultEditor="google-docs"
          enableCollaboration={true}
        />
      )}
    </div>
  );
};

export default GoogleDocsTestPage;