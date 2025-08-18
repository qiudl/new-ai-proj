import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Button,
  Space,
  Typography,
  Divider,
  Badge,
  Tooltip,
  Dropdown,
  Menu,
  Upload,
  Progress,
  List,
  Empty,
  Tag,
  Alert,
  Spin,
  Modal,
  Input,
  message
} from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  SettingOutlined,
  BarChartOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  SyncOutlined,
  PlusOutlined,
  MoreOutlined,
  FolderOutlined,
  DeleteOutlined,
  CopyOutlined,
  ShareAltOutlined,
  HistoryOutlined,
  LinkOutlined
} from '@ant-design/icons';

// 导入现有组件
import TaskDocumentEditor from './TaskDocumentEditor';
import TaskDocumentManager from './TaskDocumentManager';
import { documentService, UnifiedDocument } from '../services/documentService';

// 导入快捷键Hook
import { useKeyboardShortcuts, createDocumentShortcuts } from '../hooks/useKeyboardShortcuts';

// 导入拖拽Hook
import { useDragAndDrop } from '../hooks/useDragAndDrop';

// 导入样式
import '../styles/UnifiedTaskDocumentArea.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 视图模式类型
export type ViewMode = 'edit' | 'preview' | 'manage' | 'stats';

// 文档类型定义
export interface DocumentItem extends UnifiedDocument {
  loading?: boolean;
  selected?: boolean;
}

// 组件属性接口
export interface UnifiedTaskDocumentAreaProps {
  projectId: number;
  taskId: number;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  defaultViewMode?: ViewMode;
  showToolbar?: boolean;
  showDocumentList?: boolean;
  compactMode?: boolean;
  onDocumentChange?: (documents: DocumentItem[]) => void;
  onViewModeChange?: (mode: ViewMode) => void;
}

// 文档列表项组件
const DocumentListItem: React.FC<{
  document: DocumentItem;
  selected?: boolean;
  onSelect?: (doc: DocumentItem) => void;
  onEdit?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  onDownload?: (doc: DocumentItem) => void;
  draggableProps?: any;
  isDragOver?: boolean;
  isDraggedItem?: boolean;
}> = ({ document, selected, onSelect, onEdit, onDelete, onDownload, draggableProps, isDragOver, isDraggedItem }) => {
  
  // 右键菜单
  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑文档',
      icon: <EditOutlined />,
      onClick: () => onEdit?.(document)
    },
    {
      key: 'copy',
      label: '复制链接',
      icon: <CopyOutlined />,
      onClick: () => {
        navigator.clipboard.writeText(`/projects/${document.project_id}/tasks/${document.task_id}/documents/${document.id}`);
        message.success('文档链接已复制');
      }
    },
    {
      key: 'download',
      label: '下载文档',
      icon: <DownloadOutlined />,
      onClick: () => onDownload?.(document)
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '删除文档',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete?.(document)
    }
  ];

  // 获取文档类型图标
  const getDocumentIcon = () => {
    switch (document.type) {
      case 'markdown': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'pdf': return <FileTextOutlined style={{ color: '#ff4d4f' }} />;
      case 'text': return <FileTextOutlined style={{ color: '#52c41a' }} />;
      default: return <FileTextOutlined />;
    }
  };

  return (
    <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
      <List.Item
        {...draggableProps}
        className={`document-list-item ${selected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
        style={{
          padding: '12px 16px',
          cursor: draggableProps?.draggable ? 'move' : 'pointer',
          backgroundColor: selected ? '#e6f7ff' : isDragOver ? '#f0f9ff' : 'transparent',
          borderLeft: selected ? '3px solid #1890ff' : isDragOver ? '3px solid #52c41a' : '3px solid transparent',
          transition: 'all 0.3s ease',
          opacity: isDraggedItem ? 0.5 : 1,
          transform: isDragOver ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isDragOver ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
        }}
        onClick={() => onSelect?.(document)}
        actions={[
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(document);
              }}
            />
          </Tooltip>,
          <Tooltip title="下载">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(document);
              }}
            />
          </Tooltip>
        ]}
      >
        <List.Item.Meta
          avatar={getDocumentIcon()}
          title={
            <Space>
              <Text strong>{document.title}</Text>
              <Tag size="small">{document.type.toUpperCase()}</Tag>
              {document.is_template && <Tag color="purple" size="small">模板</Tag>}
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              {document.description && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {document.description}
                </Text>
              )}
              <Space size={8}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {Math.round(document.file_size / 1024)}KB
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  v{document.version}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {new Date(document.updated_at).toLocaleDateString()}
                </Text>
              </Space>
            </Space>
          }
        />
      </List.Item>
    </Dropdown>
  );
};

// 主组件
const UnifiedTaskDocumentArea: React.FC<UnifiedTaskDocumentAreaProps> = ({
  projectId,
  taskId,
  height = 600,
  className = '',
  style = {},
  defaultViewMode = 'edit',
  showToolbar = true,
  showDocumentList = true,
  compactMode = false,
  onDocumentChange,
  onViewModeChange
}) => {
  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);

  // 切换视图模式
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentService.getTaskDocuments(projectId, taskId);
      const docs = response.documents.map((doc: UnifiedDocument) => ({ ...doc, selected: false }));
      setDocuments(docs);
      
      // 如果没有选中文档且有文档列表，选中第一个
      if (!selectedDocument && docs.length > 0) {
        setSelectedDocument(docs[0]);
      }
      
      onDocumentChange?.(docs);
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, selectedDocument, onDocumentChange]);

  // 快捷键回调函数
  const shortcutCallbacks = useMemo(() => ({
    save: () => {
      if (selectedDocument && viewMode === 'edit') {
        // 这里应该调用保存文档的函数
        message.success('文档保存中...');
      } else {
        message.warning('请先选择要保存的文档');
      }
    },
    toggleEditMode: () => {
      const modes: ViewMode[] = ['edit', 'preview', 'manage', 'stats'];
      const currentIndex = modes.indexOf(viewMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      handleViewModeChange(nextMode);
      message.info(`切换到${nextMode === 'edit' ? '编辑' : nextMode === 'preview' ? '预览' : nextMode === 'manage' ? '管理' : '统计'}模式`);
    },
    focusSearch: () => {
      if (searchInputRef) {
        searchInputRef.focus();
        message.info('聚焦搜索框');
      }
    },
    upload: () => {
      // 触发文件上传
      message.info('打开文件上传对话框');
    },
    refresh: () => {
      loadDocuments();
      message.success('刷新文档列表');
    },
    newDocument: () => {
      // 创建新文档
      message.info('创建新文档功能待实现');
    },
    copyDocument: () => {
      if (selectedDocument) {
        // 复制选中文档
        message.info(`复制文档: ${selectedDocument.title}`);
      } else {
        message.warning('请先选择要复制的文档');
      }
    },
    deleteDocument: () => {
      if (selectedDocument) {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除文档 "${selectedDocument.title}" 吗？`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => {
            message.success(`删除文档: ${selectedDocument.title}`);
          }
        });
      } else {
        message.warning('请先选择要删除的文档');
      }
    },
    switchTab: (direction: 'next' | 'prev') => {
      const modes: ViewMode[] = ['edit', 'preview', 'manage', 'stats'];
      const currentIndex = modes.indexOf(viewMode);
      const nextIndex = direction === 'next' 
        ? (currentIndex + 1) % modes.length
        : (currentIndex - 1 + modes.length) % modes.length;
      handleViewModeChange(modes[nextIndex]);
    },
    showHelp: () => {
      Modal.info({
        title: '快捷键帮助',
        width: 600,
        content: (
          <div style={{ lineHeight: '1.8' }}>
            <div><strong>文档编辑：</strong></div>
            <div>• Ctrl+S - 保存文档</div>
            <div>• Ctrl+E - 切换编辑/预览模式</div>
            <div>• Ctrl+N - 新建文档</div>
            <br />
            <div><strong>文档操作：</strong></div>
            <div>• Ctrl+U - 上传文件</div>
            <div>• Ctrl+R - 刷新数据</div>
            <div>• Ctrl+Shift+C - 复制文档</div>
            <div>• Delete - 删除选中文档</div>
            <br />
            <div><strong>导航操作：</strong></div>
            <div>• Ctrl+F - 聚焦搜索框</div>
            <div>• Ctrl+Tab - 切换到下一个标签页</div>
            <div>• Ctrl+Shift+Tab - 切换到上一个标签页</div>
            <br />
            <div><strong>帮助：</strong></div>
            <div>• Ctrl+? - 显示快捷键帮助</div>
          </div>
        )
      });
    }
  }), [selectedDocument, viewMode, handleViewModeChange, loadDocuments, searchInputRef]);

  // 配置快捷键
  const shortcutGroups = useMemo(() => createDocumentShortcuts(shortcutCallbacks), [shortcutCallbacks]);
  
  // 注册快捷键
  const { showShortcutHelp, registeredCount } = useKeyboardShortcuts(shortcutGroups, true);

  // 配置拖拽功能
  const dragDropConfig = useMemo(() => ({
    enableFileDrop: true,
    enableItemReorder: true,
    acceptedFileTypes: ['.pdf', '.md', '.txt', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    onFilesDrop: async (files: FileList, dropZone?: string) => {
      console.log(`文件拖放到区域: ${dropZone || '默认区域'}`);
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`上传文件: ${file.name}`);
          // 这里应该调用实际的文件上传API
          await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟上传延迟
        }
        message.success(`成功上传 ${files.length} 个文件`);
        loadDocuments(); // 重新加载文档列表
      } catch (error) {
        console.error('文件上传失败:', error);
        message.error('文件上传失败');
      } finally {
        setUploading(false);
      }
    },
    onItemDrop: (draggedItem: DocumentItem, targetItem: DocumentItem, dropZone: string) => {
      console.log('文档拖拽重排:', draggedItem.title, '->', targetItem.title);
      // 重新排序文档列表
      setDocuments(prev => {
        const draggedIndex = prev.findIndex(doc => doc.id === draggedItem.id);
        const targetIndex = prev.findIndex(doc => doc.id === targetItem.id);
        
        if (draggedIndex === -1 || targetIndex === -1) return prev;
        
        const newDocs = [...prev];
        const [removed] = newDocs.splice(draggedIndex, 1);
        newDocs.splice(targetIndex, 0, removed);
        
        message.success('文档顺序已更新');
        return newDocs;
      });
    },
    onItemReorder: (items: DocumentItem[], fromIndex: number, toIndex: number) => {
      console.log('文档重排序:', fromIndex, '->', toIndex);
      setDocuments(items);
      message.success('文档顺序已更新');
    }
  }), [loadDocuments]);

  // 初始化拖拽功能
  const { dragState, createDropZoneProps, createDraggableProps, isDragActive } = useDragAndDrop(dragDropConfig);

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 文档选择
  const handleDocumentSelect = useCallback((doc: DocumentItem) => {
    setSelectedDocument(doc);
    // 更新文档列表中的选中状态
    setDocuments(prev => prev.map(d => ({ ...d, selected: d.id === doc.id })));
  }, []);

  // 文档上传
  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      await documentService.uploadFile(file, {
        task_id: taskId,
        project_id: projectId,
        onProgress: (progress) => {
          // 可以添加进度显示
        }
      });
      message.success('文档上传成功');
      await loadDocuments();
      return false; // 阻止默认上传行为
    } catch (error) {
      console.error('上传失败:', error);
      message.error('文档上传失败');
      return false;
    } finally {
      setUploading(false);
    }
  }, [taskId, projectId, loadDocuments]);

  // 文档操作
  const handleDocumentEdit = useCallback((doc: DocumentItem) => {
    setSelectedDocument(doc);
    setViewMode('edit');
  }, []);

  const handleDocumentDelete = useCallback(async (doc: DocumentItem) => {
    try {
      await documentService.deleteDocument(doc.id);
      message.success('文档删除成功');
      await loadDocuments();
      if (selectedDocument?.id === doc.id) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('文档删除失败');
    }
  }, [loadDocuments, selectedDocument]);

  const handleDocumentDownload = useCallback(async (doc: DocumentItem) => {
    try {
      const blob = new Blob([doc.content], { type: doc.mime_type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title}.${doc.type === 'markdown' ? 'md' : 'txt'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('文档下载成功');
    } catch (error) {
      console.error('下载失败:', error);
      message.error('文档下载失败');
    }
  }, []);

  // 工具栏按钮
  const toolbarItems: MenuProps['items'] = [
    {
      key: 'refresh',
      label: '刷新列表',
      icon: <SyncOutlined />,
      onClick: loadDocuments
    },
    {
      key: 'new-doc',
      label: '新建文档',
      icon: <PlusOutlined />,
      onClick: () => setManagerVisible(true)
    },
    { type: 'divider' },
    {
      key: 'export-all',
      label: '导出全部',
      icon: <DownloadOutlined />,
      onClick: () => message.info('批量导出功能开发中')
    },
    {
      key: 'manage',
      label: '高级管理',
      icon: <SettingOutlined />,
      onClick: () => setManagerVisible(true)
    }
  ];

  // 文档统计
  const documentStats = useMemo(() => {
    const total = documents.length;
    const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
    const byType = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, totalSize, byType };
  }, [documents]);

  // 渲染主要内容区域
  const renderContentArea = () => {
    switch (viewMode) {
      case 'edit':
        return selectedDocument ? (
          <TaskDocumentEditor
            key={selectedDocument.id}
            taskId={taskId}
            projectId={projectId}
            onSave={() => loadDocuments()}
          />
        ) : (
          <Empty
            description="请选择一个文档进行编辑"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
        
      case 'preview':
        return selectedDocument ? (
          <Card>
            <Title level={3}>{selectedDocument.title}</Title>
            <Divider />
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {selectedDocument.content}
            </div>
          </Card>
        ) : (
          <Empty
            description="请选择一个文档进行预览"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
        
      case 'manage':
        return (
          <Card title="文档管理">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert message="文档管理功能已集成到统一界面中" type="info" />
              <Button onClick={() => setManagerVisible(true)}>
                打开高级管理器
              </Button>
            </Space>
          </Card>
        );
        
      case 'stats':
        return (
          <Card title="文档统计">
            <Row gutter={16}>
              <Col span={8}>
                <Card.Grid style={{ width: '100%', textAlign: 'center' }}>
                  <Statistic title="文档总数" value={documentStats.total} />
                </Card.Grid>
              </Col>
              <Col span={8}>
                <Card.Grid style={{ width: '100%', textAlign: 'center' }}>
                  <Statistic 
                    title="总大小" 
                    value={Math.round(documentStats.totalSize / 1024)} 
                    suffix="KB" 
                  />
                </Card.Grid>
              </Col>
              <Col span={8}>
                <Card.Grid style={{ width: '100%', textAlign: 'center' }}>
                  <Statistic title="类型数量" value={Object.keys(documentStats.byType).length} />
                </Card.Grid>
              </Col>
            </Row>
            <Divider />
            <Title level={4}>文档类型分布</Title>
            <Space wrap>
              {Object.entries(documentStats.byType).map(([type, count]) => (
                <Tag key={type} color="blue">
                  {type.toUpperCase()}: {count}
                </Tag>
              ))}
            </Space>
          </Card>
        );
        
      default:
        return <Empty description="未知视图模式" />;
    }
  };

  const Statistic = ({ title, value, suffix }: any) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}{suffix}</div>
      <div style={{ color: '#666' }}>{title}</div>
    </div>
  );

  return (
    <div className={`unified-task-document-area ${className}`} style={style}>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>任务文档</span>
            <Badge count={documentStats.total} size="small" color="#1890ff" />
          </Space>
        }
        extra={
          showToolbar && (
            <Space>
              {/* 视图模式切换 */}
              <Button.Group>
                <Button
                  type={viewMode === 'edit' ? 'primary' : 'default'}
                  icon={<EditOutlined />}
                  onClick={() => handleViewModeChange('edit')}
                >
                  编辑
                </Button>
                <Button
                  type={viewMode === 'preview' ? 'primary' : 'default'}
                  icon={<EyeOutlined />}
                  onClick={() => handleViewModeChange('preview')}
                >
                  预览
                </Button>
                <Button
                  type={viewMode === 'manage' ? 'primary' : 'default'}
                  icon={<SettingOutlined />}
                  onClick={() => handleViewModeChange('manage')}
                >
                  管理
                </Button>
                <Button
                  type={viewMode === 'stats' ? 'primary' : 'default'}
                  icon={<BarChartOutlined />}
                  onClick={() => handleViewModeChange('stats')}
                >
                  统计
                </Button>
              </Button.Group>

              {/* 快速操作 */}
              <Divider type="vertical" />
              <Tooltip title="刷新">
                <Button
                  icon={<SyncOutlined />}
                  onClick={loadDocuments}
                  loading={loading}
                />
              </Tooltip>
              
              <Upload
                accept=".md,.pdf,.txt"
                showUploadList={false}
                beforeUpload={handleFileUpload}
                disabled={uploading}
              >
                <Tooltip title="上传文档">
                  <Button
                    icon={<CloudUploadOutlined />}
                    loading={uploading}
                  />
                </Tooltip>
              </Upload>

              <Dropdown menu={{ items: toolbarItems }} trigger={['click']}>
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          )
        }
        bodyStyle={{ padding: 0 }}
        style={{ height }}
      >
        <Row style={{ height: 'calc(100% - 60px)' }}>
          {/* 左侧文档列表 */}
          {showDocumentList && (
            <Col 
              span={compactMode ? 24 : 7} 
              style={{ 
                borderRight: compactMode ? 'none' : '1px solid #f0f0f0',
                height: '100%'
              }}
            >
              <div style={{ padding: '16px 0' }}>
                <Title level={5} style={{ margin: '0 16px 16px' }}>
                  文档列表 ({documentStats.total})
                </Title>
                
                <Spin spinning={loading}>
                  {documents.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无文档"
                      style={{ margin: '40px 0' }}
                    />
                  ) : (
                    <List
                      size="small"
                      dataSource={documents}
                      renderItem={(doc) => (
                        <DocumentListItem
                          key={doc.id}
                          document={doc}
                          selected={selectedDocument?.id === doc.id}
                          onSelect={handleDocumentSelect}
                          onEdit={handleDocumentEdit}
                          onDelete={handleDocumentDelete}
                          onDownload={handleDocumentDownload}
                        />
                      )}
                    />
                  )}
                </Spin>
              </div>
            </Col>
          )}

          {/* 右侧内容区域 */}
          <Col span={showDocumentList ? (compactMode ? 24 : 17) : 24}>
            <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
              {renderContentArea()}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 高级文档管理器模态框 */}
      <TaskDocumentManager
        projectId={projectId}
        taskId={taskId}
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        mode="modal"
      />
    </div>
  );
};

export default UnifiedTaskDocumentArea;