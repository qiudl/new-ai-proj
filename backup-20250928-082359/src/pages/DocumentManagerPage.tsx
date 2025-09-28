import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Tabs, 
  Row, 
  Col,
  Statistic,
  message
} from 'antd';
import { 
  FileAddOutlined, 
  FileOutlined, 
  CloudUploadOutlined,
  HistoryOutlined,
  BarChartOutlined,
  FileMarkdownOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons';
import WorkNotesManager from '../components/WorkNotesManager';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import DocumentViewer from '../components/DocumentViewer';
import DocumentVersionHistory from '../components/DocumentVersionHistory';
import DocumentImportExportModal from '../components/DocumentImportExportModal';
// import type { Document } from '../components/DocumentList'; // 移除未使用的导入
import type { ImportResult } from '../utils/documentImportExport';

const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

export interface DocumentDetail {
  id: number;
  title: string;
  description?: string;
  content: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  visibility: string;
  project_id: number;
  task_id: number;
  current_version: number;
  total_versions: number;
  download_count: number;
  checksum: string;
  uploaded_by: {
    id: number;
    username: string;
    avatar?: string;
  };
  updated_by?: {
    id: number;
    username: string;
    avatar?: string;
  };
  created_at: string;
  updated_at: string;
  published_at?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface DocumentManagerPageProps {
  projectId?: number;
  taskId?: number;
}

const DocumentManagerPage: React.FC<DocumentManagerPageProps> = ({
  projectId,
  taskId
}) => {
  // 如果没有提供projectId和taskId，则显示工作笔记管理
  if (!projectId || !taskId) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <Content style={{ margin: '24px', background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              <FileMarkdownOutlined style={{ marginRight: '8px' }} />
              工作笔记管理
            </Title>
            <div style={{ color: '#666', marginTop: '8px' }}>
              管理和编辑您的工作笔记文档
            </div>
          </div>
          <WorkNotesManager />
        </Content>
      </Layout>
    );
  }

  const [activeTab, setActiveTab] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyDocumentId, setHistoryDocumentId] = useState<number>(0);
  const [uploadMode, setUploadMode] = useState<'manual' | 'api'>('manual');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 导入导出状态
  const [importExportVisible, setImportExportVisible] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);

  // 统计数据状态
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSize: 0,
    totalDownloads: 0,
    publishedCount: 0
  });

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 处理文档上传成功
  const handleUploadSuccess = (document: any) => {
    message.success(`文档 "${document.title}" 上传成功`);
    setActiveTab('list'); // 切换到列表页面
    setRefreshTrigger(prev => prev + 1); // 触发列表刷新
  };

  // 处理文档上传错误
  const handleUploadError = (error: any) => {
    console.error('Document upload error:', error);
  };

  // 处理查看文档
  const handleViewDocument = (document: Document) => {
    // 转换类型并设置选中的文档
    const documentDetail: DocumentDetail = {
      ...(document as any),
      content: '', // 内容将在DocumentViewer中加载
      project_id: projectId,
      task_id: taskId
    };
    setSelectedDocument(documentDetail);
    setViewerVisible(true);
  };

  // 处理编辑文档
  const handleEditDocument = (document: Document | DocumentDetail) => {
    // 这里可以打开编辑模式或跳转到编辑页面
    message.info('编辑功能将在后续版本中实现');
  };

  // 处理删除文档
  const handleDeleteDocument = (documentId: number) => {
    setRefreshTrigger(prev => prev + 1); // 触发列表刷新
  };

  // 处理下载文档
  const handleDownloadDocument = (document: Document | DocumentDetail) => {
    // 下载完成后的处理逻辑
  };

  // 处理显示版本历史
  const handleShowHistory = (documentId: number) => {
    setHistoryDocumentId(documentId);
    setHistoryVisible(true);
  };

  // 处理版本恢复
  const handleVersionRestore = (versionId: number) => {
    setRefreshTrigger(prev => prev + 1); // 触发列表刷新
    message.success('版本恢复成功');
  };

  // 处理版本删除
  const handleVersionDelete = (versionId: number) => {
    message.success('版本删除成功');
  };

  // 处理导入成功
  const handleImportSuccess = (result: ImportResult) => {
    setRefreshTrigger(prev => prev + 1); // 触发列表刷新
    message.success(`成功导入 ${result.success} 个文档`);
    setImportExportVisible(false);
  };

  // 处理导出完成
  const handleExportComplete = () => {
    message.success('文档导出完成');
    setImportExportVisible(false);
  };

  // 打开导入导出模态框
  const handleOpenImportExport = () => {
    setImportExportVisible(true);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Title level={2} style={{ marginBottom: 24 }}>
            <Space>
              <FileOutlined />
              文档管理系统
            </Space>
          </Title>

          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="文档总数"
                  value={stats.totalDocuments}
                  prefix={<FileOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="存储使用"
                  value={formatFileSize(stats.totalSize)}
                  prefix={<CloudUploadOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="下载次数"
                  value={stats.totalDownloads}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已发布"
                  value={stats.publishedCount}
                  prefix={<FileOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* 主要内容区域 */}
          <Card>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              tabBarStyle={{ marginBottom: 24 }}
              tabBarExtraContent={
                <Space>
                  {activeTab === 'upload' && (
                    <>
                      <Button 
                        type={uploadMode === 'manual' ? 'primary' : 'default'}
                        
                        onClick={() => setUploadMode('manual')}
                      >
                        文件上传
                      </Button>
                      <Button 
                        type={uploadMode === 'api' ? 'primary' : 'default'}
                        
                        onClick={() => setUploadMode('api')}
                      >
                        内容创建
                      </Button>
                    </>
                  )}
                  {activeTab === 'list' && (
                    <>
                      <Button 
                        icon={<ImportOutlined />}
                        
                        onClick={handleOpenImportExport}
                      >
                        导入文档
                      </Button>
                      <Button 
                        icon={<ExportOutlined />}
                        
                        onClick={handleOpenImportExport}
                        disabled={documents.length === 0}
                      >
                        导出文档
                      </Button>
                    </>
                  )}
                </Space>
              }
            >
              <TabPane 
                tab={
                  <span>
                    <FileOutlined />
                    文档列表
                  </span>
                } 
                key="list"
              >
                {React.createElement(DocumentList as any, {
                  projectId: projectId,
                  taskId: taskId,
                  onView: handleViewDocument,
                  onEdit: handleEditDocument,
                  onDelete: handleDeleteDocument,
                  onDownload: handleDownloadDocument,
                  onDocumentsChange: setDocuments,
                  onSelectionChange: setSelectedDocuments,
                  key: refreshTrigger
                })}
              </TabPane>

              <TabPane 
                tab={
                  <span>
                    <FileAddOutlined />
                    上传文档
                  </span>
                } 
                key="upload"
              >
                <Row justify="center">
                  <Col xs={24} sm={20} md={16} lg={12}>
                    <DocumentUpload
                      projectId={projectId}
                      taskId={taskId}
                      uploadMode={uploadMode}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                    />
                  </Col>
                </Row>
              </TabPane>
            </Tabs>
          </Card>
        </div>

        {/* 文档查看器 */}
        <DocumentViewer
          visible={viewerVisible}
          documentId={selectedDocument?.id || 0}
          projectId={projectId}
          taskId={taskId}
          onClose={() => {
            setViewerVisible(false);
            setSelectedDocument(null);
          }}
          onEdit={handleEditDocument}
          onShowHistory={handleShowHistory}
          onDownload={handleDownloadDocument}
        />

        {/* 版本历史 */}
        <DocumentVersionHistory
          visible={historyVisible}
          documentId={historyDocumentId}
          projectId={projectId}
          taskId={taskId}
          currentVersion={selectedDocument?.current_version || 1}
          onClose={() => {
            setHistoryVisible(false);
            setHistoryDocumentId(0);
          }}
          onVersionRestore={handleVersionRestore}
          onVersionDelete={handleVersionDelete}
        />

        {/* 文档导入导出 */}
        <DocumentImportExportModal
          visible={importExportVisible}
          onCancel={() => setImportExportVisible(false)}
          documents={documents as any}
          selectedDocuments={selectedDocuments as any}
          onImportSuccess={handleImportSuccess}
          onExportComplete={handleExportComplete}
        />
      </Content>
    </Layout>
  );
};

export default DocumentManagerPage;