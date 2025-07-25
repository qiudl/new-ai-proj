import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Tag,
  Tooltip,
  Avatar,
  Typography,
  Divider,
  Empty,
  Badge,
  message,
  Popconfirm,
  Progress,
  List,
  Switch,
  Radio,
  Spin
} from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  UploadOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  StarOutlined,
  StarFilled,
  CopyOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { Document } from '../types/document';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Search } = Input;

// 类型定义
interface DocumentFileManagerProps {
  folderId?: number;
  showSearch?: boolean;
  onDocumentSelect?: (document: Document) => void;
  onDocumentUpdate?: () => void;
}

// 文档类型配置
const DOCUMENT_TYPES = {
  markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
  text: { label: 'Text', color: 'default', icon: '📄' },
  pdf: { label: 'PDF', color: 'red', icon: '📋' },
  word: { label: 'Word', color: 'blue', icon: '📘' },
  excel: { label: 'Excel', color: 'green', icon: '📊' },
  image: { label: 'Image', color: 'orange', icon: '🖼️' }
};

// 文档状态配置
const DOCUMENT_STATUS = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
};

// 可见性配置
const VISIBILITY_CONFIG = {
  private: { label: '私有', color: 'red', icon: '🔒' },
  team: { label: '团队', color: 'blue', icon: '👥' },
  public: { label: '公开', color: 'green', icon: '🌍' }
};

// Sortable Document Component
interface SortableDocumentProps {
  document: Document;
  viewMode: 'list' | 'grid';
  onSelect: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

const SortableDocument: React.FC<SortableDocumentProps> = ({
  document,
  viewMode,
  onSelect,
  onEdit,
  onDelete
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const DOCUMENT_TYPES = {
    markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
    text: { label: 'Text', color: 'default', icon: '📄' },
    pdf: { label: 'PDF', color: 'red', icon: '📋' },
    word: { label: 'Word', color: 'blue', icon: '📘' },
    excel: { label: 'Excel', color: 'green', icon: '📊' },
    image: { label: 'Image', color: 'orange', icon: '🖼️' }
  };

  const DOCUMENT_STATUS = {
    draft: { label: '草稿', color: 'default' },
    published: { label: '已发布', color: 'success' },
    archived: { label: '已归档', color: 'warning' }
  };

  if (viewMode === 'grid') {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <Card
          hoverable
          style={{
            marginBottom: 16,
            cursor: isDragging ? 'grabbing' : 'grab',
            border: isDragging ? '2px dashed #1890ff' : undefined,
          }}
          actions={[
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onSelect(document)}
            >
              查看
            </Button>,
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(document)}
            >
              编辑
            </Button>,
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => onDelete(document)}
            >
              删除
            </Button>
          ]}
          {...listeners}
        >
          <Card.Meta
            avatar={
              <div style={{ fontSize: '24px' }}>
                {DOCUMENT_TYPES[document.type]?.icon || '📄'}
              </div>
            }
            title={
              <Space>
                <Text strong style={{ fontSize: '16px' }}>
                  {document.title}
                </Text>
                {document.is_favorite && (
                  <StarFilled style={{ color: '#faad14' }} />
                )}
                {document.is_template && (
                  <Tag color="purple">模板</Tag>
                )}
              </Space>
            }
            description={
              <div>
                {document.description && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {document.description}
                    </Text>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color={DOCUMENT_TYPES[document.type]?.color}>
                      {DOCUMENT_TYPES[document.type]?.label}
                    </Tag>
                    <Badge 
                      status={DOCUMENT_STATUS[document.status]?.color as any} 
                      text={DOCUMENT_STATUS[document.status]?.label}
                    />
                  </Space>
                </div>
                {document.tags && document.tags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {document.tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // List view - return a table row-like structure
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        cursor: isDragging ? 'grabbing' : 'grab',
        backgroundColor: isDragging ? '#f0f2ff' : undefined,
        padding: '12px',
        marginBottom: '8px',
        border: isDragging ? '2px dashed #1890ff' : '1px solid #f0f0f0',
        borderRadius: '6px',
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ fontSize: '20px', marginRight: '12px' }}>
            {DOCUMENT_TYPES[document.type]?.icon || '📄'}
          </div>
          <div style={{ flex: 1 }}>
            <div>
              <Space>
                <Text strong>{document.title}</Text>
                {document.is_favorite && (
                  <StarFilled style={{ color: '#faad14' }} />
                )}
                {document.is_template && (
                  <Tag color="purple">模板</Tag>
                )}
              </Space>
            </div>
            {document.description && (
              <div style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {document.description}
                </Text>
              </div>
            )}
            <div style={{ marginTop: '8px' }}>
              <Space wrap>
                <Tag color={DOCUMENT_TYPES[document.type]?.color}>
                  {DOCUMENT_TYPES[document.type]?.label}
                </Tag>
                <Badge 
                  status={DOCUMENT_STATUS[document.status]?.color as any} 
                  text={DOCUMENT_STATUS[document.status]?.label}
                />
                {document.tags && document.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>
        <div>
          <Space>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onSelect(document)}
              size="small"
            >
              查看
            </Button>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(document)}
              size="small"
            >
              编辑
            </Button>
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => onDelete(document)}
              size="small"
            >
              删除
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

const DocumentFileManager: React.FC<DocumentFileManagerProps> = ({
  folderId,
  showSearch = true,
  onDocumentSelect,
  onDocumentUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchText, setSearchText] = useState('');
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFilteredDocuments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update the main documents array as well
        setDocuments(prevDocs => {
          const updatedDocs = [...prevDocs];
          const docToMove = updatedDocs.find(doc => doc.id === active.id);
          if (docToMove) {
            // Remove from old position
            const oldDocIndex = updatedDocs.findIndex(doc => doc.id === active.id);
            updatedDocs.splice(oldDocIndex, 1);
            
            // Insert at new position
            const newDocIndex = Math.min(newIndex, updatedDocs.length);
            updatedDocs.splice(newDocIndex, 0, docToMove);
          }
          return updatedDocs;
        });

        // Here you could call an API to save the new order
        // await documentService.updateDocumentOrder(folderId, newItems.map(item => item.id));
        console.log('Document order updated:', newItems.map(item => ({ id: item.id, title: item.title })));
        
        return newItems;
      });
    }
  };
  
  // 过滤和排序状态
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'title'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载文档列表
  useEffect(() => {
    loadDocuments();
  }, [folderId]);

  // 应用过滤和搜索
  useEffect(() => {
    let filtered = [...documents];

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchText.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === filterStatus);
    }

    // 类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchText, filterStatus, filterType, sortBy, sortOrder]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取文档列表
      // const response = await documentApi.getByFolder(folderId);
      // setDocuments(response.data.documents);
      
      // 临时模拟数据
      const mockDocuments: Document[] = [
        {
          id: 1,
          folder_id: folderId,
          title: 'API接口设计文档',
          content: '# API接口设计\n\n本文档描述了系统的API接口设计...',
          content_size: 2048,
          type: 'markdown',
          status: 'published',
          description: '详细描述了系统各个模块的API接口设计和调用方式',
          tags: ['API', '接口', '设计'],
          owner_id: 1,
          visibility: 'team',
          version: 2,
          is_template: false,
          is_favorite: true,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-15T14:30:00Z',
          created_by: 1,
          owner_name: 'Admin',
          folder_name: '技术文档'
        },
        {
          id: 2,
          folder_id: folderId,
          title: '项目需求分析报告.pdf',
          content_size: 2048576,
          type: 'pdf',
          status: 'published',
          file_url: '/files/requirement-analysis.pdf',
          file_size: 2048576,
          mime_type: 'application/pdf',
          description: '项目需求分析详细报告',
          tags: ['需求', '分析', '报告'],
          owner_id: 1,
          visibility: 'public',
          version: 1,
          is_template: false,
          is_favorite: false,
          created_at: '2024-01-02T09:00:00Z',
          updated_at: '2024-01-02T09:00:00Z',
          created_by: 1,
          owner_name: 'Admin'
        },
        {
          id: 3,
          folder_id: folderId,
          title: '数据库设计草稿',
          content: '# 数据库设计\n\n## 用户表\n- id: 主键\n- username: 用户名',
          content_size: 1024,
          type: 'markdown',
          status: 'draft',
          description: '数据库表结构设计草稿',
          tags: ['数据库', '设计', '草稿'],
          owner_id: 2,
          visibility: 'private',
          version: 1,
          is_template: false,
          is_favorite: false,
          created_at: '2024-01-10T16:20:00Z',
          updated_at: '2024-01-12T11:45:00Z',
          created_by: 2,
          owner_name: '张三'
        }
      ];
      setDocuments(mockDocuments);
    } catch (error) {
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理文档操作
  const handleCreateDocument = async (values: any) => {
    try {
      // TODO: 调用API创建文档
      // await documentApi.create({ ...values, folder_id: folderId });
      message.success('文档创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadDocuments();
      onDocumentUpdate?.();
    } catch (error) {
      message.error('创建文档失败');
    }
  };

  const handleEditDocument = async (values: any) => {
    try {
      if (!selectedDocument) return;
      // TODO: 调用API更新文档
      // await documentApi.update(selectedDocument.id, values);
      message.success('文档更新成功');
      setEditModalVisible(false);
      setSelectedDocument(null);
      editForm.resetFields();
      loadDocuments();
      onDocumentUpdate?.();
    } catch (error) {
      message.error('更新文档失败');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      // TODO: 调用API删除文档
      // await documentApi.delete(documentId);
      message.success('文档删除成功');
      loadDocuments();
      onDocumentUpdate?.();
    } catch (error) {
      message.error('删除文档失败');
    }
  };

  const handleToggleFavorite = async (document: Document) => {
    try {
      // TODO: 调用API切换收藏状态
      // await documentApi.toggleFavorite(document.id);
      message.success(document.is_favorite ? '已取消收藏' : '已添加收藏');
      loadDocuments();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDownloadDocument = (document: Document) => {
    if (document.file_url) {
      // TODO: 处理文件下载
      window.open(document.file_url, '_blank');
    } else {
      // 对于文本文档，生成并下载
      const content = document.content || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    action: '/api/v1/documents/upload', // TODO: 替换为实际上传接口
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} 上传成功`);
        loadDocuments();
        onDocumentUpdate?.();
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    },
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB!');
      }
      return isLt10M;
    }
  };

  // 表格列定义
  const columns: ColumnsType<Document> = [
    {
      title: '文档',
      key: 'document',
      render: (_, record) => (
        <Space>
          <span style={{ fontSize: '18px' }}>
            {DOCUMENT_TYPES[record.type]?.icon || '📄'}
          </span>
          <div>
            <Space>
              <Text 
                strong 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedDocument(record);
                  onDocumentSelect?.(record);
                }}
              >
                {record.title}
              </Text>
              {record.is_favorite && (
                <StarFilled style={{ color: '#faad14' }} />
              )}
              {record.is_template && (
                <Tag color="purple">模板</Tag>
              )}
            </Space>
            {record.description && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.description}
                </Text>
              </div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const config = DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES];
        return (
          <Tag color={config?.color || 'default'}>
            {config?.label || type}
          </Tag>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const config = DOCUMENT_STATUS[status as keyof typeof DOCUMENT_STATUS];
        return (
          <Badge 
            status={config?.color as any} 
            text={config?.label || status}
          />
        );
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space wrap>
          {tags.slice(0, 2).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags.length > 2 && (
            <Tag>+{tags.length - 2}</Tag>
          )}
        </Space>
      )
    },
    {
      title: '所有者',
      dataIndex: 'owner_name',
      key: 'owner_name',
      width: 100,
      render: (name) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{name}</Text>
        </Space>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (date) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(date).fromNow()}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedDocument(record);
                setPreviewModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedDocument(record);
                editForm.setFieldsValue({
                  title: record.title,
                  description: record.description,
                  tags: record.tags,
                  status: record.status,
                  visibility: record.visibility,
                  is_template: record.is_template
                });
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={record.is_favorite ? '取消收藏' : '收藏'}>
            <Button
              type="text"
              size="small"
              icon={record.is_favorite ? <StarFilled /> : <StarOutlined />}
              onClick={() => handleToggleFavorite(record)}
              style={{ color: record.is_favorite ? '#faad14' : undefined }}
            />
          </Tooltip>
          <Tooltip title="下载">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadDocument(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个文档吗？"
            onConfirm={() => handleDeleteDocument(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        {/* 工具栏 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 16 
        }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                createForm.resetFields();
                setCreateModalVisible(true);
              }}
            >
              新建文档
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传文件
            </Button>
          </Space>
          
          <Space>
            {/* 搜索 */}
            {showSearch && (
              <Search
                placeholder="搜索文档..."
                allowClear
                style={{ width: 200 }}
                onChange={(e) => setSearchText(e.target.value)}
              />
            )}
            
            {/* 过滤器 */}
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="all">全部状态</Option>
              {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
            
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="all">全部类型</Option>
              {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                <Option key={key} value={key}>{config.label}</Option>
              ))}
            </Select>
            
            {/* 排序 */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              style={{ width: 120 }}
              size="small"
            >
              <Option value="updated_at-desc">最近更新</Option>
              <Option value="created_at-desc">最近创建</Option>
              <Option value="title-asc">标题 A-Z</Option>
              <Option value="title-desc">标题 Z-A</Option>
            </Select>
            
            {/* 视图模式 */}
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              size="small"
            >
              <Radio.Button value="list">
                <UnorderedListOutlined />
              </Radio.Button>
              <Radio.Button value="grid">
                <AppstoreOutlined />
              </Radio.Button>
            </Radio.Group>
          </Space>
        </div>

        {/* 文档列表 - 支持拖拽排序 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredDocuments.map(doc => doc.id)}
            strategy={viewMode === 'list' ? verticalListSortingStrategy : horizontalListSortingStrategy}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">加载文档中...</Text>
                </div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <Empty description="暂无文档" />
            ) : viewMode === 'list' ? (
              <div style={{ minHeight: '200px' }}>
                {filteredDocuments.map(doc => (
                  <SortableDocument
                    key={doc.id}
                    document={doc}
                    viewMode="list"
                    onSelect={(document) => {
                      setSelectedDocument(document);
                      setPreviewModalVisible(true);
                      onDocumentSelect?.(document);
                    }}
                    onEdit={(document) => {
                      setSelectedDocument(document);
                      editForm.setFieldsValue({
                        title: document.title,
                        description: document.description,
                        tags: document.tags,
                        status: document.status,
                        visibility: document.visibility,
                        is_template: document.is_template
                      });
                      setEditModalVisible(true);
                    }}
                    onDelete={(document) => {
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定要删除文档"${document.title}"吗？此操作不可恢复。`,
                        onOk: () => handleDeleteDocument(document.id),
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: 16,
                minHeight: '200px'
              }}>
                {filteredDocuments.map(doc => (
                  <SortableDocument
                    key={doc.id}
                    document={doc}
                    viewMode="grid"
                    onSelect={(document) => {
                      setSelectedDocument(document);
                      setPreviewModalVisible(true);
                      onDocumentSelect?.(document);
                    }}
                    onEdit={(document) => {
                      setSelectedDocument(document);
                      editForm.setFieldsValue({
                        title: document.title,
                        description: document.description,
                        tags: document.tags,
                        status: document.status,
                        visibility: document.visibility,
                        is_template: document.is_template
                      });
                      setEditModalVisible(true);
                    }}
                    onDelete={(document) => {
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定要删除文档"${document.title}"吗？此操作不可恢复。`,
                        onOk: () => handleDeleteDocument(document.id),
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </Card>

      {/* 创建文档模态框 */}
      <Modal
        title="新建文档"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateDocument}
        >
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="文档类型"
            rules={[{ required: true, message: '请选择文档类型' }]}
            initialValue="markdown"
          >
            <Select placeholder="选择文档类型">
              {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="文档描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入文档描述（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
            initialValue="private"
          >
            <Select>
              {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="is_template"
            label="设为模板"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑文档模态框 */}
      <Modal
        title="编辑文档"
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedDocument(null);
          editForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditDocument}
        >
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="文档描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入文档描述（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
          >
            <Select>
              {Object.entries(DOCUMENT_STATUS).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="visibility"
            label="可见性"
          >
            <Select>
              {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span>{config.icon}</span>
                    {config.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="is_template"
            label="设为模板"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 文件上传模态框 */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={500}
      >
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传，文件大小限制 10MB 以内
          </p>
        </Upload.Dragger>
      </Modal>

      {/* 文档预览模态框 */}
      <Modal
        title={selectedDocument?.title}
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setSelectedDocument(null);
        }}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => selectedDocument && handleDownloadDocument(selectedDocument)}
          >
            下载
          </Button>,
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedDocument && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={DOCUMENT_TYPES[selectedDocument.type]?.color}>
                {DOCUMENT_TYPES[selectedDocument.type]?.label}
              </Tag>
              <Badge 
                status={DOCUMENT_STATUS[selectedDocument.status]?.color as any} 
                text={DOCUMENT_STATUS[selectedDocument.status]?.label}
              />
              <Text type="secondary">
                <ClockCircleOutlined /> {dayjs(selectedDocument.updated_at).fromNow()}
              </Text>
            </Space>
            
            {selectedDocument.description && (
              <Paragraph>{selectedDocument.description}</Paragraph>
            )}
            
            {selectedDocument.content ? (
              <div style={{ 
                border: '1px solid #f0f0f0', 
                borderRadius: '6px', 
                padding: '16px',
                backgroundColor: '#fafafa',
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedDocument.content}
                </pre>
              </div>
            ) : (
              <Empty description="无预览内容" />
            )}
            
            {selectedDocument.tags.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">标签：</Text>
                <Space wrap style={{ marginLeft: 8 }}>
                  {selectedDocument.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentFileManager;