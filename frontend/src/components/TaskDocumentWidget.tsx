import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Badge,
  Tooltip,
  Dropdown,
  Typography,
  Upload,
  message,
  Tag
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  PlusOutlined,
  MoreOutlined,
  SyncOutlined
} from '@ant-design/icons';
import TaskDocumentManager from './TaskDocumentManager';
import { documentService, UnifiedDocument } from '../services/documentService';
import { 
  useOptimizedMemo, 
  useOptimizedCallback,
  useMemoryMonitor
} from '../utils/performanceOptimization';

const { Text } = Typography;

interface TaskDocumentWidgetProps {
  projectId: number;
  taskId: number;
  compact?: boolean; // Display mode: compact for task cards, full for task detail
  showTitle?: boolean;
}

const TaskDocumentWidget: React.FC<TaskDocumentWidgetProps> = ({
  projectId,
  taskId,
  compact = false,
  showTitle = true
}) => {
  const [managerVisible, setManagerVisible] = useState(false);
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Use memory monitoring for component lifecycle tracking
  useMemoryMonitor('TaskDocumentWidget');

  // Load documents using unified service
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentService.getTaskDocuments(projectId, taskId);
      console.log('🔍 DEBUG TaskDocumentWidget: API Response', response);
      console.log('🔍 DEBUG TaskDocumentWidget: Documents count', response.documents?.length);
      setDocuments(response.documents);
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [projectId, taskId]);

  // Upload document handler
  const handleUploadDocument = async (file: File) => {
    setUploading(true);
    try {
      await documentService.uploadFile(file, {
        task_id: taskId,
        project_id: projectId,
        onProgress: (progress) => {
          // You can add progress tracking here if needed
        }
      });
      message.success('文档上传成功');
      await loadDocuments(); // Refresh the list
    } catch (error) {
      console.error('上传失败:', error);
      message.error('文档上传失败');
    } finally {
      setUploading(false);
    }
  };

  // Calculate document statistics
  const stats = useOptimizedMemo(
    () => {
      const total = documents.length;
      const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
      const byType = documents.reduce((acc, doc) => {
        acc[doc.mime_type] = (acc[doc.mime_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return { total, totalSize, byType };
    },
    [documents],
    'documentStats'
  );

  // Badge tooltip memoization (moved to top level)
  const badgeTooltip = useOptimizedMemo(
    () => `${stats.total} 个文档，${stats.totalSize > 0 ? `总大小 ${Math.round(stats.totalSize / 1024)}KB` : '无文档'}`,
    [stats.total, stats.totalSize],
    'badgeTooltip'
  );

  // Document type stats memoization (moved to top level)
  const documentTypeStats = useOptimizedMemo(
    () => {
      const typeComponents = [];
      if (stats.byType['text/markdown']) {
        typeComponents.push(
          <Text key="md" type="secondary">
            MD: {stats.byType['text/markdown']}
          </Text>
        );
      }
      if (stats.byType['application/pdf']) {
        typeComponents.push(
          <Text key="pdf" type="secondary">
            PDF: {stats.byType['application/pdf']}
          </Text>
        );
      }
      if (stats.byType['text/plain']) {
        typeComponents.push(
          <Text key="txt" type="secondary">
            TXT: {stats.byType['text/plain']}
          </Text>
        );
      }
      return typeComponents;
    },
    [stats.byType],
    'documentTypeStats'
  );

  // Handle quick upload with performance tracking
  const handleQuickUpload = useOptimizedCallback(
    async (file: File) => {
      try {
        await handleUploadDocument(file);
        return false; // Prevent default upload behavior
      } catch (error) {
        return false;
      }
    },
    [handleUploadDocument],
    'quickUpload'
  );

  // Optimized callback for opening document manager
  const handleOpenManager = useOptimizedCallback(
    () => setManagerVisible(true),
    [],
    'openManager'
  );

  // Download handlers
  const handleDownloadMarkdown = useOptimizedCallback(
    async () => {
      try {
        // Get main task document for download
        const taskDoc = await documentService.getTaskDocument(projectId, taskId);
        if (taskDoc) {
          const blob = new Blob([taskDoc.content], { type: 'text/markdown' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `task-${taskId}-document.md`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          message.info('该任务没有主文档可导出');
        }
      } catch (error) {
        message.error('导出Markdown失败');
      }
    },
    [projectId, taskId],
    'downloadMarkdown'
  );

  const handleDownloadPDF = useOptimizedCallback(
    async () => {
      message.info('PDF导出功能正在开发中');
    },
    [],
    'downloadPDF'
  );

  // More actions menu with optimized memoization
  const moreActions: MenuProps['items'] = useOptimizedMemo(
    () => [
      {
        key: 'refresh',
        label: '刷新文档列表',
        icon: <SyncOutlined />,
        onClick: loadDocuments
      },
      {
        key: 'manager',
        label: '打开文档管理器',
        icon: <FileTextOutlined />,
        onClick: handleOpenManager
      },
      {
        type: 'divider'
      },
      {
        key: 'download-md',
        label: '导出 Markdown',
        icon: <DownloadOutlined />,
        onClick: handleDownloadMarkdown
      },
      {
        key: 'download-pdf',
        label: '导出 PDF',
        icon: <DownloadOutlined />,
        onClick: handleDownloadPDF
      }
    ],
    [loadDocuments, handleOpenManager, handleDownloadMarkdown, handleDownloadPDF],
    'moreActions'
  );

  // Compact mode for task cards
  if (compact) {
    return (
      <>
        <Space size="small">
          <Badge count={stats.total} size="small" color="#1890ff">
            <Tooltip title={badgeTooltip}>
              <Button
                type="text"
                icon={<FileTextOutlined />}
                size="small"
                onClick={handleOpenManager}
                loading={loading}
              >
                文档
              </Button>
            </Tooltip>
          </Badge>
          
          <Upload
            accept=".md,.pdf,.txt"
            showUploadList={false}
            beforeUpload={handleQuickUpload}
            disabled={uploading}
          >
            <Tooltip title="快速上传文档">
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                loading={uploading}
              />
            </Tooltip>
          </Upload>

          <Dropdown menu={{ items: moreActions }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>

        <TaskDocumentManager
          projectId={projectId}
          taskId={taskId}
          visible={managerVisible}
          onClose={() => setManagerVisible(false)}
          mode="modal"
        />
      </>
    );
  }

  // Full mode for task detail pages
  return (
    <>
      <Card
        title={showTitle ? (
          <Space>
            <FileTextOutlined />
            <span>任务文档</span>
            <Badge count={stats.total} size="small" color="#1890ff" />
          </Space>
        ) : null}
        size="small"
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button
                type="text"
                icon={<SyncOutlined />}
                onClick={loadDocuments}
                loading={loading}
                size="small"
              />
            </Tooltip>
            
            <Upload
              accept=".md,.pdf,.txt"
              showUploadList={false}
              beforeUpload={handleQuickUpload}
              disabled={uploading}
            >
              <Tooltip title="快速上传">
                <Button
                  type="text"
                  icon={<CloudUploadOutlined />}
                  loading={uploading}
                  size="small"
                />
              </Tooltip>
            </Upload>

            <Dropdown menu={{ items: moreActions }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        }
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {stats.total === 0 ? (
            <Text type="secondary">暂无上传文档</Text>
          ) : (
            <>
              <Space split="|" size="small">
                <Text type="secondary">
                  {stats.total} 个文档
                </Text>
                <Text type="secondary">
                  {stats.totalSize > 0 && `总大小 ${Math.round(stats.totalSize / 1024)}KB`}
                </Text>
                {documentTypeStats}
              </Space>
              
              {/* 显示文档列表 */}
              <div style={{ marginTop: '8px' }}>
                {documents.map((doc, index) => (
                  <div key={doc.id} style={{ 
                    padding: '8px', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '4px',
                    marginBottom: index < documents.length - 1 ? '8px' : '0',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{ marginBottom: '4px' }}>
                      <Text strong>{doc.title}</Text>
                      <Tag size="small" style={{ marginLeft: '8px' }}>{doc.type}</Tag>
                    </div>
                    {doc.description && (
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{doc.description}</Text>
                      </div>
                    )}
                    {doc.content && (
                      <div style={{ 
                        maxHeight: '200px', 
                        overflow: 'auto',
                        padding: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #e8e8e8',
                        borderRadius: '4px',
                        fontSize: '13px',
                        lineHeight: '1.5'
                      }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {doc.content.substring(0, 500)}{doc.content.length > 500 ? '...' : ''}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          
          <Space size="small">
            <Button
              size="small"
              onClick={handleOpenManager}
              icon={<FileTextOutlined />}
            >
              管理文档
            </Button>
            
            {stats.total > 0 && (
              <>
                <Button
                  size="small"
                  onClick={handleDownloadMarkdown}
                  icon={<DownloadOutlined />}
                >
                  导出 MD
                </Button>
                <Button
                  size="small"
                  onClick={handleDownloadPDF}
                  icon={<DownloadOutlined />}
                >
                  导出 PDF
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>

      <TaskDocumentManager
        projectId={projectId}
        taskId={taskId}
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        mode="modal"
      />
    </>
  );
};

// Export with React memo
export default React.memo(TaskDocumentWidget, (prevProps, nextProps) => {
  // Custom memo comparison - only re-render if essential props change
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.taskId === nextProps.taskId &&
    prevProps.compact === nextProps.compact &&
    prevProps.showTitle === nextProps.showTitle
  );
});