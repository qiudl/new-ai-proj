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
  Tag,
  Modal,
  Popconfirm
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  PlusOutlined,
  MoreOutlined,
  SyncOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ExpandOutlined,
  ShrinkOutlined
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
  const [expandedDocIds, setExpandedDocIds] = useState<Set<number>>(new Set()); // 记录哪些文档是展开状态

  // Use memory monitoring for component lifecycle tracking
  useMemoryMonitor('TaskDocumentWidget');

  // Load documents using unified service
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentService.getTaskDocuments(projectId, taskId);
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

  // Delete document handler
  const handleDeleteDocument = async (documentId: number, documentTitle: string) => {
    try {
      await documentService.deleteDocument(documentId);
      message.success(`文档 "${documentTitle}" 删除成功`);
      await loadDocuments(); // Refresh the list
    } catch (error) {
      console.error('删除失败:', error);
      message.error('文档删除失败');
    }
  };

  // Toggle document expand/collapse
  const toggleDocExpand = (docId: number) => {
    setExpandedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
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
<span key="md" className="ant-typography ant-typography-secondary">
            MD: {stats.byType['text/markdown']}
          </span>
        );
      }
      if (stats.byType['application/pdf']) {
        typeComponents.push(
<span key="pdf" className="ant-typography ant-typography-secondary">
            PDF: {stats.byType['application/pdf']}
          </span>
        );
      }
      if (stats.byType['text/plain']) {
        typeComponents.push(
<span key="txt" className="ant-typography ant-typography-secondary">
            TXT: {stats.byType['text/plain']}
          </span>
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
        <Space >
          <Badge count={stats.total}  color="#1890ff">
            <Tooltip title={badgeTooltip}>
              <Button
                type="text"
                icon={<FileTextOutlined />}
                
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
                
                loading={uploading}
              />
            </Tooltip>
          </Upload>

          <Dropdown menu={{ items: moreActions }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />}  />
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
            <Badge count={stats.total}  color="#1890ff" />
          </Space>
        ) : null}
        
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button
                type="text"
                icon={<SyncOutlined />}
                onClick={loadDocuments}
                loading={loading}
                
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
                  
                />
              </Tooltip>
            </Upload>

            <Dropdown menu={{ items: moreActions }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />}  />
            </Dropdown>
          </Space>
        }
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Space direction="vertical"  style={{ width: '100%' }}>
          {stats.total === 0 ? (
            <Text type="secondary">暂无上传文档</Text>
          ) : (
            <>
              <Space split="|" >
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
                    backgroundColor: '#fafafa',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <Text strong>{doc.title}</Text>
                        <Tag style={{ marginLeft: '8px' }}>{doc.type}</Tag>
                        {/* 质量检查指示 */}
                        {(() => {
                          const qc = (doc as any)?.metadata?.quality_check;
                          if (!qc) return null;
                          const passed = !!qc.passed;
                          return passed ? (
                            <Tag color="green" style={{ marginLeft: 8 }}>达标</Tag>
                          ) : (
                            <Tooltip title={(qc.issues || []).join('\n')}>
                              <Tag color="red" style={{ marginLeft: 8 }}>需完善</Tag>
                            </Tooltip>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Tooltip title={expandedDocIds.has(doc.id) ? "收起" : "展开"}>
                          <Button
                            type="text"
                            size="small"
                            icon={expandedDocIds.has(doc.id) ? <ShrinkOutlined /> : <ExpandOutlined />}
                            onClick={() => toggleDocExpand(doc.id)}
                            style={{ padding: '0 4px' }}
                          />
                        </Tooltip>
                        <Tooltip title="预览文档">
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => setManagerVisible(true)}
                            style={{ padding: '0 4px' }}
                          />
                        </Tooltip>
                        <Tooltip title="编辑文档">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setManagerVisible(true)}
                            style={{ padding: '0 4px' }}
                          />
                        </Tooltip>
                        <Popconfirm
                          title={`确定删除文档 "${doc.title}"？`}
                          description="删除后无法恢复，请确认操作"
                          onConfirm={() => handleDeleteDocument(doc.id, doc.title)}
                          okText="删除"
                          cancelText="取消"
                          okType="danger"
                        >
                          <Tooltip title="删除文档">
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              danger
                              style={{ padding: '0 4px' }}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                    {doc.description && (
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{doc.description}</Text>
                      </div>
                    )}
                    {doc.content && (
                      <div style={{
                        maxHeight: expandedDocIds.has(doc.id) ? 'none' : '300px',
                        overflow: expandedDocIds.has(doc.id) ? 'visible' : 'auto',
                        padding: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #e8e8e8',
                        borderRadius: '4px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        position: 'relative'
                      }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {doc.content}
                        </pre>
                        {!expandedDocIds.has(doc.id) && doc.content.split('\n').length > 15 && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '40px',
                            background: 'linear-gradient(to bottom, transparent, white)',
                            pointerEvents: 'none'
                          }} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          
          <Space >
            <Button
              
              onClick={handleOpenManager}
              icon={<FileTextOutlined />}
            >
              管理文档
            </Button>
            
            {stats.total > 0 && (
              <>
                <Button
                  
                  onClick={handleDownloadMarkdown}
                  icon={<DownloadOutlined />}
                >
                  导出 MD
                </Button>
                <Button
                  
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