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
}> = ({ document, selected, onSelect, onEdit, onDelete, onDownload }) => {
  
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
        className={`document-list-item ${selected ? 'selected' : ''}`}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          backgroundColor: selected ? '#e6f7ff' : 'transparent',
          borderLeft: selected ? '3px solid #1890ff' : '3px solid transparent',
          transition: 'all 0.3s ease'
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

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 切换视图模式
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

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