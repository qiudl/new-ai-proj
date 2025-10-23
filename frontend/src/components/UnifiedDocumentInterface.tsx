import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Tag,
  Modal,
  Upload,
  message,
  Tooltip,
  Popconfirm,
  Badge,
  Tabs,
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { documentService } from '../services/unifiedDocumentService';
import { Document } from '../types/document';
import ModernWorkNoteEditor from './ModernWorkNoteEditor';
import ModernWorkNoteViewer from './ModernWorkNoteViewer';
import DocumentVersionControl from './DocumentVersionControl';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface DocumentInterfaceProps {
  projectId?: number;
  taskId?: number;
  mode?: 'standalone' | 'embedded';
  title?: string;
  showProjectFilter?: boolean;
  showTaskFilter?: boolean;
}

const DocumentInterface: React.FC<DocumentInterfaceProps> = ({
  projectId,
  taskId,
  mode = 'standalone',
  title = '文档管理',
  showProjectFilter = true,
  showTaskFilter = true
}) => {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [versionControlVisible, setVersionControlVisible] = useState(false);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  // Load documents
  const loadDocuments = async () => {
    setLoading(true);
    try {
      let response;
      
      if (taskId && projectId) {
        // Load task-specific documents
        response = await documentService.getTaskDocuments(projectId, taskId);
      } else {
        // Load all documents with filters
        const filter = {
          search: searchText || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          visibility: visibilityFilter !== 'all' ? visibilityFilter : undefined,
          project_id: projectId,
          task_id: taskId
        };
        
        response = await documentService.searchDocuments(filter);
      }
      
      setDocuments(response.documents);
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDocuments();
  }, [projectId, taskId, searchText, statusFilter, typeFilter, visibilityFilter]);

  // Document operations
  const handleCreateDocument = () => {
    setSelectedDocument(null);
    setEditorVisible(true);
  };

  const handleEditDocument = (document: Document) => {
    setSelectedDocument(document);
    setEditorVisible(true);
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setViewerVisible(true);
  };

  const handleViewVersions = (document: Document) => {
    setSelectedDocument(document);
    setVersionControlVisible(true);
  };

  const handleDeleteDocument = async (document: Document) => {
    try {
      await documentService.deleteDocument(document.id);
      message.success('文档删除成功');
      loadDocuments();
    } catch (error) {
      message.error('文档删除失败');
    }
  };

  const handleDownloadDocument = (doc: Document) => {
    const blob = new Blob([doc.content], { 
      type: doc.mime_type 
    });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${doc.title}.${getFileExtension(doc.type)}`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleUploadDocument = async (file: File) => {
    try {
      await documentService.uploadFile(file, {
        task_id: taskId,
        project_id: projectId
      });
      message.success('文档上传成功');
      loadDocuments();
      setUploadVisible(false);
    } catch (error) {
      message.error('文档上传失败');
    }
  };

  // Helper functions
  const getFileExtension = (type: string): string => {
    switch (type) {
      case 'markdown': return 'md';
      case 'pdf': return 'pdf';
      case 'text': return 'txt';
      default: return 'md';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'markdown': return <FileMarkdownOutlined style={{ color: '#1890ff' }} />;
      case 'pdf': return <FilePdfOutlined style={{ color: '#f5222d' }} />;
      case 'text': return <FileOutlined style={{ color: '#52c41a' }} />;
      default: return <FileTextOutlined />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'gray';
      default: return 'default';
    }
  };

  const getVisibilityColor = (visibility: string): string => {
    switch (visibility) {
      case 'public': return 'blue';
      case 'team': return 'cyan';
      case 'private': return 'red';
      default: return 'default';
    }
  };

  // Table columns
  const columns: ColumnsType<Document> = [
    {
      title: '文档',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Document) => (
        <Space>
          {getTypeIcon(record.type)}
          <span style={{ fontWeight: 500 }}>{title}</span>
          {record.is_template && <Tag color="purple">模板</Tag>}
          {record.is_favorite && <Tag color="gold">收藏</Tag>}
        </Space>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'published' ? '已发布' : 
           status === 'draft' ? '草稿' : 
           status === 'archived' ? '已归档' : status}
        </Tag>
      ),
      filters: [
        { text: '已发布', value: 'published' },
        { text: '草稿', value: 'draft' },
        { text: '已归档', value: 'archived' },
      ],
      width: 100,
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility: string) => (
        <Tag color={getVisibilityColor(visibility)}>
          {visibility === 'public' ? '公开' : 
           visibility === 'team' ? '团队' : 
           visibility === 'private' ? '私有' : visibility}
        </Tag>
      ),
      width: 100,
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number) => (
        <Text type="secondary">
          {size > 1024 ? `${Math.round(size / 1024)}KB` : `${size}B`}
        </Text>
      ),
      sorter: (a, b) => a.file_size - b.file_size,
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleDateString('zh-CN')}
        </Text>
      ),
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      width: 120,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Document) => (
        <Space >
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              
              onClick={() => handleViewDocument(record)}
            />
          </Tooltip>
          {record.can_edit && (
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                
                onClick={() => handleEditDocument(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="下载">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              
              onClick={() => handleDownloadDocument(record)}
            />
          </Tooltip>
          <Tooltip title="版本历史">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              
              onClick={() => handleViewVersions(record)}
            />
          </Tooltip>
          {record.can_delete && (
            <Popconfirm
              title="确定要删除这个文档吗？"
              onConfirm={() => handleDeleteDocument(record)}
              okText="删除"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
      width: 150,
    },
  ];

  // Calculate statistics
  const stats = {
    total: documents.length,
    published: documents.filter(d => d.status === 'published').length,
    drafts: documents.filter(d => d.status === 'draft').length,
    templates: documents.filter(d => d.is_template).length,
    totalSize: documents.reduce((sum, d) => sum + d.file_size, 0),
  };

  return (
    <div style={{ padding: mode === 'standalone' ? 24 : 0 }}>
      {/* Header */}
      {mode === 'standalone' && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总文档数" value={stats.total} prefix={<FileTextOutlined />} />
            </Col>
            <Col span={6}>
              <Statistic title="已发布" value={stats.published} valueStyle={{ color: '#3f8600' }} />
            </Col>
            <Col span={6}>
              <Statistic title="草稿" value={stats.drafts} valueStyle={{ color: '#cf1322' }} />
            </Col>
            <Col span={6}>
              <Statistic 
                title="总大小" 
                value={stats.totalSize > 1024 ? Math.round(stats.totalSize / 1024) : stats.totalSize} 
                suffix={stats.totalSize > 1024 ? 'KB' : 'B'}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Main Content */}
      <Card
        title={title}
        extra={
          <Space>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={loadDocuments}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateDocument}
            >
              新建文档
            </Button>
            <Button
              icon={<CloudUploadOutlined />}
              onClick={() => setUploadVisible(true)}
            >
              上传文档
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索文档标题或内容..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部状态</Option>
              <Option value="published">已发布</Option>
              <Option value="draft">草稿</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="类型"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部类型</Option>
              <Option value="markdown">Markdown</Option>
              <Option value="pdf">PDF</Option>
              <Option value="text">文本</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="可见性"
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部</Option>
              <Option value="public">公开</Option>
              <Option value="team">团队</Option>
              <Option value="private">私有</Option>
            </Select>
          </Col>
        </Row>

        {/* Documents Table */}
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{
            total: documents.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title="上传文档"
        open={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        footer={null}
      >
        <Upload.Dragger
          accept=".md,.pdf,.txt"
          beforeUpload={handleUploadDocument}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 Markdown (.md)、PDF (.pdf) 和文本 (.txt) 文件
          </p>
        </Upload.Dragger>
      </Modal>

      {/* Document Editor */}
      <ModernWorkNoteEditor
        visible={editorVisible}
        note={selectedDocument ? {
          id: selectedDocument.id,
          title: selectedDocument.title,
          content: selectedDocument.content,
          description: selectedDocument.description,
          status: selectedDocument.status,
          visibility: selectedDocument.visibility,
          tags: selectedDocument.tags,
          is_template: selectedDocument.is_template,
          created_at: selectedDocument.created_at,
          updated_at: selectedDocument.updated_at,
          type: 'markdown' as const,
          owner_id: 1,
          version: 1,
          created_by: 1
        } : null}
        onClose={() => {
          setEditorVisible(false);
          setSelectedDocument(null);
        }}
        onSave={async (noteData: any) => {
          try {
            if (selectedDocument) {
              // Update existing document
              await documentService.updateDocument(selectedDocument.id, {
                title: noteData.title,
                content: noteData.content,
                description: noteData.description,
                status: noteData.status,
                visibility: noteData.visibility,
                tags: noteData.tags,
                is_template: noteData.is_template
              });
              message.success('文档更新成功');
            } else {
              // Create new document
              await documentService.createDocument(
                noteData.title,
                noteData.content,
                {
                  description: noteData.description,
                  status: noteData.status,
                  visibility: noteData.visibility,
                  tags: noteData.tags,
                  is_template: noteData.is_template,
                  task_id: taskId,
                  project_id: projectId
                }
              );
              message.success('文档创建成功');
            }
            loadDocuments();
            setEditorVisible(false);
            setSelectedDocument(null);
          } catch (error) {
            message.error('保存文档失败');
          }
        }}
      />

      {/* Document Viewer */}
      <ModernWorkNoteViewer
        visible={viewerVisible}
        note={selectedDocument ? {
          id: selectedDocument.id,
          title: selectedDocument.title,
          content: selectedDocument.content,
          description: selectedDocument.description,
          status: selectedDocument.status,
          visibility: selectedDocument.visibility,
          tags: selectedDocument.tags,
          is_template: selectedDocument.is_template,
          created_at: selectedDocument.created_at,
          updated_at: selectedDocument.updated_at,
          type: 'markdown' as const,
          owner_id: 1,
          version: 1,
          created_by: 1
        } : null}
        onClose={() => {
          setViewerVisible(false);
          setSelectedDocument(null);
        }}
        onEdit={(note) => {
          setViewerVisible(false);
          setSelectedDocument({
            ...selectedDocument!,
            title: note.title,
            content: note.content,
            description: note.description
          });
          setEditorVisible(true);
        }}
      />

      {/* Document Version Control */}
      {selectedDocument && (
        <DocumentVersionControl
          documentId={selectedDocument.id}
          visible={versionControlVisible}
          onClose={() => {
            setVersionControlVisible(false);
            setSelectedDocument(null);
          }}
          title={`版本控制 - ${selectedDocument.title}`}
        />
      )}
    </div>
  );
};

export default DocumentInterface;