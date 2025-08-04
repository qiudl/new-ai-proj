import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Tooltip,
  Modal,
  Typography,
  Divider,
  Alert,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import TaskDocumentUploader from './TaskDocumentUploader';
import { taskDocumentService } from '../services/taskDocumentService';

const { Text, Title } = Typography;

interface TaskDocumentManagerProps {
  projectId: number;
  taskId: number;
  visible?: boolean;
  onClose?: () => void;
  mode?: 'embedded' | 'modal'; // embedded for task detail page, modal for standalone
}

interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  uploadTypes: {
    manual: number;
    api: number;
  };
  mimeTypes: Record<string, number>;
}

const TaskDocumentManager: React.FC<TaskDocumentManagerProps> = ({
  projectId,
  taskId,
  visible = true,
  onClose,
  mode = 'embedded'
}) => {
  const [activeTab, setActiveTab] = useState('uploader');
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load document statistics
  const loadDocumentStats = async () => {
    setLoading(true);
    try {
      const response = await taskDocumentService.getTaskDocuments(projectId, taskId);
      const documents = response.documents;
      
      const stats: DocumentStats = {
        totalDocuments: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + doc.file_size, 0),
        uploadTypes: {
          manual: documents.filter(doc => doc.upload_type === 'manual').length,
          api: documents.filter(doc => doc.upload_type === 'api').length
        },
        mimeTypes: documents.reduce((acc, doc) => {
          acc[doc.mime_type] = (acc[doc.mime_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      setDocumentStats(stats);
    } catch (error) {
      console.error('Failed to load document stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadDocumentStats();
    }
  }, [visible, projectId, taskId, refreshKey]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    loadDocumentStats();
  };

  // Handle upload success
  const handleUploadSuccess = () => {
    handleRefresh();
  };

  // Handle upload error
  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  // Render statistics
  const renderStats = () => {
    if (!documentStats) return null;

    return (
      <Card size="small" className="mb-4">
        <Title level={5}>
          <InfoCircleOutlined className="mr-2" />
          文档统计
        </Title>
        <Space direction="vertical" size="small">
          <Text>
            <strong>总文档数:</strong> {documentStats.totalDocuments} 个
          </Text>
          <Text>
            <strong>总大小:</strong> {taskDocumentService.formatFileSize(documentStats.totalSize)}
          </Text>
          <Text>
            <strong>上传方式:</strong> 
            手工 {documentStats.uploadTypes.manual} 个，
            API {documentStats.uploadTypes.api} 个
          </Text>
          {Object.keys(documentStats.mimeTypes).length > 0 && (
            <Text>
              <strong>文件类型:</strong>{' '}
              {Object.entries(documentStats.mimeTypes).map(([type, count]) => (
                <span key={type}>
                  {type.split('/')[1]} ({count}) 
                </span>
              )).reduce((prev, curr, index) => 
                index === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[]
              )}
            </Text>
          )}
        </Space>
      </Card>
    );
  };

  // Render quick actions
  const renderQuickActions = () => (
    <Card size="small" className="mb-4">
      <Title level={5}>
        <CloudUploadOutlined className="mr-2" />
        快捷操作
      </Title>
      <Space wrap>
        <Tooltip title="刷新文档列表">
          <Button
            icon={<SyncOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Tooltip>
        <Tooltip title="下载任务文档的Markdown格式">
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const blob = await taskDocumentService.downloadTaskMarkdown(projectId, taskId);
                const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.md`;
                taskDocumentService.triggerDownload(blob, fileName);
              } catch (error) {
                console.error('Download failed:', error);
              }
            }}
          >
            导出 MD
          </Button>
        </Tooltip>
        <Tooltip title="下载任务文档的PDF格式">
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                const blob = await taskDocumentService.downloadTaskPDF(projectId, taskId);
                const fileName = `task-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
                taskDocumentService.triggerDownload(blob, fileName);
              } catch (error) {
                console.error('Download failed:', error);
              }
            }}
          >
            导出 PDF
          </Button>
        </Tooltip>
      </Space>
    </Card>
  );

  // Render help info
  const renderHelpInfo = () => (
    <Alert
      message="文档管理功能说明"
      description={
        <div>
          <p><strong>手工上传:</strong> 支持拖拽或点击上传，支持 .md, .pdf, .txt 格式，单文件最大 10MB</p>
          <p><strong>API上传:</strong> 通过接口方式上传文本内容，适合程序化操作</p>
          <p><strong>文档导出:</strong> 将任务文档和附件整合导出为 Markdown 或 PDF 格式</p>
          <p><strong>版本管理:</strong> 自动记录文档版本，支持历史版本查看</p>
        </div>
      }
      type="info"
      showIcon
      className="mb-4"
    />
  );

  // Tab items
  const tabItems = [
    {
      key: 'uploader',
      label: (
        <span>
          <FileTextOutlined />
          文档上传
        </span>
      ),
      children: (
        <TaskDocumentUploader
          projectId={projectId}
          taskId={taskId}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      )
    },
    {
      key: 'stats',
      label: (
        <span>
          <InfoCircleOutlined />
          统计信息
        </span>
      ),
      children: (
        <Spin spinning={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {renderStats()}
            {renderQuickActions()}
            {renderHelpInfo()}
          </Space>
        </Spin>
      )
    }
  ];

  // Render content
  const renderContent = () => (
    <div className="task-document-manager">
      <div className="mb-4">
        <Title level={3}>
          <FileTextOutlined className="mr-2" />
          任务文档管理 (任务 #{taskId})
        </Title>
        <Text type="secondary">
          管理任务相关的文档，支持手工上传、API上传和批量导出功能
        </Text>
      </div>

      <Divider />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );

  // Render based on mode
  if (mode === 'modal') {
    return (
      <Modal
        title={`任务 #${taskId} - 文档管理`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={900}
        destroyOnClose
      >
        {renderContent()}
      </Modal>
    );
  }

  // Embedded mode
  return renderContent();
};

export default TaskDocumentManager;