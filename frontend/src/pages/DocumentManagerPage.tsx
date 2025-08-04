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
  BarChartOutlined
} from '@ant-design/icons';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import DocumentViewer from '../components/DocumentViewer';
import DocumentVersionHistory from '../components/DocumentVersionHistory';
import type { Document } from '../components/DocumentList';

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
  projectId: number;
  taskId: number;
}

const DocumentManagerPage: React.FC<DocumentManagerPageProps> = ({
  projectId,
  taskId
}) => {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyDocumentId, setHistoryDocumentId] = useState<number>(0);
  const [uploadMode, setUploadMode] = useState<'manual' | 'api'>('manual');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      ...document,
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
                activeTab === 'upload' ? (
                  <Space>
                    <Button 
                      type={uploadMode === 'manual' ? 'primary' : 'default'}
                      size="small"
                      onClick={() => setUploadMode('manual')}
                    >
                      文件上传
                    </Button>
                    <Button 
                      type={uploadMode === 'api' ? 'primary' : 'default'}
                      size="small"
                      onClick={() => setUploadMode('api')}
                    >
                      内容创建
                    </Button>
                  </Space>
                ) : null
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
                <DocumentList
                  projectId={projectId}
                  taskId={taskId}
                  onView={handleViewDocument}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  onDownload={handleDownloadDocument}
                  key={refreshTrigger} // 使用key来触发重新渲染
                />
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
      </Content>
    </Layout>
  );
};

export default DocumentManagerPage;