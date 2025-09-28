import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
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
  Popconfirm,
  Progress,
  List,
  Empty,
  Spin,
  Alert
} from 'antd';
import type { MenuProps, UploadFile } from 'antd';
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
  FolderOpenOutlined,
  LinkOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import TaskDocumentManager from '../TaskDocumentManager';
import { documentService, UnifiedDocument } from '../../services/documentService';
import { errorLogger } from '../../utils/ErrorLogger';
import { 
  useOptimizedMemo, 
  useOptimizedCallback,
  useMemoryMonitor
} from '../../utils/performanceOptimization';

const { Text, Title } = Typography;

interface TaskDocumentWidgetProps {
  projectId: number;
  taskId: number;
  compact?: boolean;
  showTitle?: boolean;
  maxDisplayCount?: number;
  allowUpload?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onDocumentChange?: (documents: UnifiedDocument[]) => void;
}

interface DocumentState {
  documents: UnifiedDocument[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  lastRefresh: Date | null;
}

/**
 * 重构后的任务文档组件
 * 
 * 改进点:
 * 1. 更好的状态管理和错误处理
 * 2. 支持批量操作
 * 3. 优化的性能（memo, callback优化）
 * 4. 增强的用户体验（进度条、错误恢复）
 * 5. 可配置的权限控制
 * 6. 改进的文件上传体验
 */
const TaskDocumentWidget: React.FC<TaskDocumentWidgetProps> = memo(({
  projectId,
  taskId,
  compact = false,
  showTitle = true,
  maxDisplayCount = compact ? 3 : 10,
  allowUpload = true,
  allowEdit = true,
  allowDelete = true,
  onDocumentChange
}) => {
  const [managerVisible, setManagerVisible] = useState(false);
  const [documentState, setDocumentState] = useState<DocumentState>({
    documents: [],
    loading: false,
    uploading: false,
    uploadProgress: 0,
    error: null,
    lastRefresh: null
  });
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);

  // 使用内存监控
  useMemoryMonitor('TaskDocumentWidget');

  // 加载文档列表
  const loadDocuments = useOptimizedCallback(async (showLoading = true) => {
    if (showLoading) {
      setDocumentState(prev => ({ ...prev, loading: true, error: null }));
    }
    
    try {
      const response = await documentService.getTaskDocuments(projectId, taskId);
      
      setDocumentState(prev => ({
        ...prev,
        documents: response.documents,
        loading: false,
        error: null,
        lastRefresh: new Date()
      }));
      
      onDocumentChange?.(response.documents);
      
      errorLogger.debug('ui', 'TaskDocumentWidget: 文档加载成功', {
        taskId,
        documentCount: response.documents.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载文档失败';
      
      setDocumentState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      errorLogger.error('ui', 'TaskDocumentWidget: 文档加载失败', {
        taskId,
        error: errorMessage
      });
      
      if (showLoading) {
        message.error(`加载文档失败: ${errorMessage}`);
      }
    }
  }, [projectId, taskId, onDocumentChange]);

  // 组件挂载时加载文档
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 文件上传处理
  const handleUploadDocument = useOptimizedCallback(async (file: File) => {
    if (!allowUpload) {
      message.warning('当前不允许上传文档');
      return;
    }

    setDocumentState(prev => ({ 
      ...prev, 
      uploading: true, 
      uploadProgress: 0,
      error: null 
    }));

    try {
      await documentService.uploadFile(file, {
        task_id: taskId,
        project_id: projectId,
        onProgress: (progress) => {
          setDocumentState(prev => ({ 
            ...prev, 
            uploadProgress: Math.round(progress) 
          }));
        }
      });
      
      message.success(`文档 "${file.name}" 上传成功`);
      await loadDocuments(false); // 刷新列表但不显示loading
      
      errorLogger.info('ui', 'TaskDocumentWidget: 文档上传成功', {
        taskId,
        fileName: file.name,
        fileSize: file.size
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setDocumentState(prev => ({ ...prev, error: errorMessage }));
      message.error(`文档上传失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'TaskDocumentWidget: 文档上传失败', {
        taskId,
        fileName: file.name,
        error: errorMessage
      });
    } finally {
      setDocumentState(prev => ({ 
        ...prev, 
        uploading: false, 
        uploadProgress: 0 
      }));
    }
  }, [allowUpload, taskId, projectId, loadDocuments]);

  // 删除文档处理
  const handleDeleteDocument = useOptimizedCallback(async (documentId: number, documentTitle: string) => {
    if (!allowDelete) {
      message.warning('当前不允许删除文档');
      return;
    }

    try {
      await documentService.deleteDocument(documentId);
      message.success(`文档 "${documentTitle}" 删除成功`);
      await loadDocuments(false);
      
      errorLogger.info('ui', 'TaskDocumentWidget: 文档删除成功', {
        taskId,
        documentId,
        documentTitle
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      message.error(`删除文档失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'TaskDocumentWidget: 文档删除失败', {
        taskId,
        documentId,
        error: errorMessage
      });
    }
  }, [allowDelete, taskId, loadDocuments]);

  // 批量删除文档
  const handleBatchDelete = useOptimizedCallback(async () => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }

    try {
      await Promise.all(
        selectedDocuments.map(id => documentService.deleteDocument(id))
      );
      
      message.success(`成功删除 ${selectedDocuments.length} 个文档`);
      setSelectedDocuments([]);
      await loadDocuments(false);
      
      errorLogger.info('ui', 'TaskDocumentWidget: 批量删除成功', {
        taskId,
        deletedCount: selectedDocuments.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除失败';
      message.error(`批量删除失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'TaskDocumentWidget: 批量删除失败', {
        taskId,
        error: errorMessage
      });
    }
  }, [selectedDocuments, taskId, loadDocuments]);

  // 下载文档
  const handleDownloadDocument = useOptimizedCallback(async (document: UnifiedDocument) => {
    try {
      await documentService.downloadDocument(document.id, document.title);
      message.success(`开始下载 "${document.title}"`);
      
      errorLogger.debug('ui', 'TaskDocumentWidget: 文档下载', {
        taskId,
        documentId: document.id,
        documentTitle: document.title
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败';
      message.error(`下载失败: ${errorMessage}`);
      
      errorLogger.error('ui', 'TaskDocumentWidget: 文档下载失败', {
        taskId,
        documentId: document.id,
        error: errorMessage
      });
    }
  }, [taskId]);

  // 重试加载
  const handleRetry = useOptimizedCallback(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 计算显示的文档
  const displayDocuments = useOptimizedMemo(() => {
    return documentState.documents.slice(0, maxDisplayCount);
  }, [documentState.documents, maxDisplayCount]);

  // 文档操作菜单
  const getDocumentActions = useOptimizedCallback((document: UnifiedDocument): MenuProps['items'] => [
    {
      key: 'view',
      label: '查看',
      icon: <EyeOutlined />,
      onClick: () => {
        // 实现查看逻辑
        errorLogger.debug('ui', 'TaskDocumentWidget: 查看文档', {
          documentId: document.id
        });
      }
    },
    ...(allowEdit ? [{
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => {
        // 实现编辑逻辑
        errorLogger.debug('ui', 'TaskDocumentWidget: 编辑文档', {
          documentId: document.id
        });
      }
    }] : []),
    {
      key: 'download',
      label: '下载',
      icon: <DownloadOutlined />,
      onClick: () => handleDownloadDocument(document)
    },
    { type: 'divider' },
    ...(allowDelete ? [{
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除文档 "${document.title}" 吗？`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => handleDeleteDocument(document.id, document.title)
        });
      }
    }] : [])
  ], [allowEdit, allowDelete, handleDownloadDocument, handleDeleteDocument]);

  // 上传配置
  const uploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: (file: File) => {
      handleUploadDocument(file);
      return false; // 阻止默认上传行为
    },
    disabled: !allowUpload || documentState.uploading
  };

  // 渲染文档列表项
  const renderDocumentItem = (document: UnifiedDocument) => (
    <List.Item
      key={document.id}
      actions={compact ? [
        <Dropdown
          key="more"
          menu={{ items: getDocumentActions(document) }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ] : [
        <Button
          key="view"
          type="text"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => {
            errorLogger.debug('ui', 'TaskDocumentWidget: 查看文档', {
              documentId: document.id
            });
          }}
        />,
        ...(allowEdit ? [
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              errorLogger.debug('ui', 'TaskDocumentWidget: 编辑文档', {
                documentId: document.id
              });
            }}
          />
        ] : []),
        <Button
          key="download"
          type="text"
          icon={<DownloadOutlined />}
          size="small"
          onClick={() => handleDownloadDocument(document)}
        />
      ]}
    >
      <List.Item.Meta
        avatar={<FileTextOutlined style={{ color: '#1890ff' }} />}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text ellipsis style={{ maxWidth: compact ? '120px' : '200px' }}>
              {document.title}
            </Text>
            {document.status && (
              <Tag size="small" color={document.status === 'published' ? 'green' : 'orange'}>
                {document.status}
              </Tag>
            )}
          </div>
        }
        description={
          compact ? null : (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {document.updated_at ? new Date(document.updated_at).toLocaleString() : ''}
            </Text>
          )
        }
      />
    </List.Item>
  );

  // 渲染错误状态
  if (documentState.error) {
    return (
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Alert
          message="文档加载失败"
          description={documentState.error}
          type="error"
          action={
            <Button size="small" onClick={handleRetry}>
              重试
            </Button>
          }
          closable
        />
      </Card>
    );
  }

  return (
    <>
      <Card
        size="small"
        title={showTitle ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <FolderOpenOutlined style={{ marginRight: '8px' }} />
              任务文档
              <Badge count={documentState.documents.length} style={{ marginLeft: '8px' }} />
            </div>
            {!compact && (
              <Space>
                {selectedDocuments.length > 0 && allowDelete && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDelete}
                  >
                    删除选中({selectedDocuments.length})
                  </Button>
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => loadDocuments()}
                  loading={documentState.loading}
                />
              </Space>
            )}
          </div>
        ) : false}
        extra={compact ? (
          <Space>
            <Badge count={documentState.documents.length} />
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => setManagerVisible(true)}
            >
              管理
            </Button>
          </Space>
        ) : null}
        style={{ marginBottom: '16px' }}
      >
        {/* 上传进度 */}
        {documentState.uploading && (
          <div style={{ marginBottom: '16px' }}>
            <Progress
              percent={documentState.uploadProgress}
              size="small"
              status="active"
              format={percent => `上传中 ${percent}%`}
            />
          </div>
        )}

        {/* 文档列表 */}
        <Spin spinning={documentState.loading}>
          {displayDocuments.length > 0 ? (
            <List
              size="small"
              dataSource={displayDocuments}
              renderItem={renderDocumentItem}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无文档"
              style={{ margin: '20px 0' }}
            >
              {allowUpload && (
                <Upload {...uploadProps}>
                  <Button type="primary" icon={<CloudUploadOutlined />} size="small">
                    上传文档
                  </Button>
                </Upload>
              )}
            </Empty>
          )}
        </Spin>

        {/* 底部操作区 */}
        {!compact && displayDocuments.length > 0 && (
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Space>
              {allowUpload && (
                <Upload {...uploadProps}>
                  <Button 
                    icon={<CloudUploadOutlined />} 
                    size="small"
                    disabled={documentState.uploading}
                  >
                    上传文档
                  </Button>
                </Upload>
              )}
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setManagerVisible(true)}
              >
                文档管理
              </Button>
            </Space>
            
            {documentState.documents.length > maxDisplayCount && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                显示前 {maxDisplayCount} 个，共 {documentState.documents.length} 个文档
              </Text>
            )}
          </div>
        )}

        {/* 最后刷新时间 */}
        {documentState.lastRefresh && !compact && (
          <div style={{ 
            marginTop: '8px', 
            textAlign: 'right',
            fontSize: '11px',
            color: '#bfbfbf'
          }}>
            最后刷新: {documentState.lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </Card>

      {/* 文档管理器 */}
      <TaskDocumentManager
        visible={managerVisible}
        taskId={taskId}
        projectId={projectId}
        onClose={() => setManagerVisible(false)}
        onDocumentChange={(documents) => {
          setDocumentState(prev => ({ ...prev, documents }));
          onDocumentChange?.(documents);
        }}
      />
    </>
  );
});

TaskDocumentWidget.displayName = 'TaskDocumentWidget';

export default TaskDocumentWidget;