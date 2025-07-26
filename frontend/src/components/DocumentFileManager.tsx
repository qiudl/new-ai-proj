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
  Spin,
  Dropdown,
  MenuProps
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
  UserOutlined,
  FileTextOutlined,
  ExportOutlined,
  MoreOutlined,
  BookOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { Document } from '../types/document';
import unifiedDocumentService from '../services/unifiedDocumentService';

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
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                // 触发复制操作
                const event = new CustomEvent('copyDocument', { detail: document });
                window.dispatchEvent(event);
              }}
            >
              复制
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
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                // 触发复制操作
                const event = new CustomEvent('copyDocument', { detail: document });
                window.dispatchEvent(event);
              }}
              size="small"
            >
              复制
            </Button>
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: 显示更多操作菜单
              }}
              size="small"
            />
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
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  
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
        // await unifiedDocumentService.updateDocumentOrder(folderId, newItems.map(item => item.id));
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

  // 监听自定义复制文档事件
  useEffect(() => {
    const handleCopyDocumentEvent = (event: any) => {
      const document = event.detail;
      if (document) {
        handleCopyDocument(document);
      }
    };

    window.addEventListener('copyDocument', handleCopyDocumentEvent);
    return () => {
      window.removeEventListener('copyDocument', handleCopyDocumentEvent);
    };
  }, []);

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
      
      const documents = await unifiedDocumentService.getDocuments(folderId);
      setDocuments(documents);
    } catch (error) {
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理文档操作
  const handleCreateDocument = async (values: any) => {
    try {
      const request = {
        folder_id: folderId,
        title: values.title,
        content: values.content,
        type: values.type,
        status: values.status || 'draft',
        description: values.description,
        tags: values.tags || [],
        visibility: values.visibility || 'team',
        is_template: values.is_template || false,
        project_id: values.project_id,
        customer_id: values.customer_id,
        category: values.category
      };

      await unifiedDocumentService.createDocument(request);
      
      message.success('文档创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      onDocumentUpdate?.();
      
      // 重新加载文档列表
      loadDocuments();
    } catch (error: any) {
      console.error('创建文档失败:', error);
      message.error(error.message || '创建文档失败');
    }
  };

  const handleEditDocument = async (values: any) => {
    try {
      if (!selectedDocument) return;
      
      const request = {
        title: values.title,
        content: values.content,
        status: values.status,
        description: values.description,
        tags: values.tags || [],
        visibility: values.visibility,
        is_template: values.is_template
      };

      await unifiedDocumentService.updateDocument(selectedDocument.id, request);
      
      message.success('文档更新成功');
      setEditModalVisible(false);
      setSelectedDocument(null);
      editForm.resetFields();
      onDocumentUpdate?.();
      
      // 重新加载文档列表
      loadDocuments();
    } catch (error: any) {
      console.error('更新文档失败:', error);
      message.error(error.message || '更新文档失败');
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await unifiedDocumentService.deleteDocument(documentId);
      
      // 清除选中状态
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
      
      message.success('文档删除成功');
      onDocumentUpdate?.();
      
      // 重新加载文档列表
      loadDocuments();
    } catch (error: any) {
      console.error('删除文档失败:', error);
      message.error(error.message || '删除文档失败');
    }
  };

  // 批量删除文档
  const handleBatchDelete = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedDocuments.length} 个文档吗？此操作不可撤销。`,
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 从本地状态中删除选中的文档
          setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)));
          
          message.success(`成功删除 ${selectedDocuments.length} 个文档`);
          setSelectedDocuments([]);
          setIsSelectMode(false);
          onDocumentUpdate?.();
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  // 批量移动文档
  const handleBatchMove = async (targetFolderId: number) => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要移动的文档');
      return;
    }

    try {
      // 更新选中文档的文件夹ID
      setDocuments(prev => prev.map(doc => 
        selectedDocuments.includes(doc.id) 
          ? { ...doc, folder_id: targetFolderId, updated_at: new Date().toISOString() }
          : doc
      ));
      
      message.success(`成功移动 ${selectedDocuments.length} 个文档`);
      setSelectedDocuments([]);
      setIsSelectMode(false);
      onDocumentUpdate?.();
    } catch (error) {
      message.error('批量移动失败');
    }
  };

  // 批量复制文档
  const handleBatchCopy = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要复制的文档');
      return;
    }

    try {
      // TODO: 调用批量复制API
      // await documentApi.batchCopy(selectedDocuments);
      message.success(`成功复制 ${selectedDocuments.length} 个文档`);
      setSelectedDocuments([]);
      setIsSelectMode(false);
      loadDocuments();
      onDocumentUpdate?.();
    } catch (error) {
      message.error('批量复制失败');
    }
  };

  // 批量导出文档
  const handleBatchExport = async (format: 'pdf' | 'word' | 'zip') => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要导出的文档');
      return;
    }

    try {
      // TODO: 调用批量导出API
      // const blob = await documentApi.batchExport(selectedDocuments, format);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `documents_export.${format}`;
      // a.click();
      message.success(`成功导出 ${selectedDocuments.length} 个文档`);
    } catch (error) {
      message.error('批量导出失败');
    }
  };

  // 批量设置为模板
  const handleBatchTemplate = async (isTemplate: boolean) => {
    if (selectedDocuments.length === 0) {
      message.warning('请选择要操作的文档');
      return;
    }

    try {
      // TODO: 调用批量设置模板API
      // await documentApi.batchSetTemplate(selectedDocuments, isTemplate);
      message.success(`成功${isTemplate ? '设置' : '取消'} ${selectedDocuments.length} 个文档为模板`);
      setSelectedDocuments([]);
      setIsSelectMode(false);
      loadDocuments();
      onDocumentUpdate?.();
    } catch (error) {
      message.error('批量操作失败');
    }
  };

  // 切换选择模式
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedDocuments([]);
  };

  // 选择/取消选择文档
  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  // 获取选中的文档信息
  const getSelectedDocumentsInfo = () => {
    const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
    return {
      total: selectedDocs.length,
      templates: selectedDocs.filter(doc => doc.is_template).length,
      drafts: selectedDocs.filter(doc => doc.status === 'draft').length,
      published: selectedDocs.filter(doc => doc.status === 'published').length
    };
  };

  const handleToggleFavorite = async (document: Document) => {
    try {
      // 更新文档的收藏状态
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, is_favorite: !doc.is_favorite, updated_at: new Date().toISOString() }
          : doc
      ));
      
      message.success(document.is_favorite ? '已取消收藏' : '已添加收藏');
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 复制文档
  const handleCopyDocument = async (document: Document) => {
    try {
      // 创建文档副本
      const copiedDocument: Document = {
        ...document,
        id: Date.now(),
        title: `${document.title} - 副本`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        is_favorite: false
      };

      // 添加到本地状态
      setDocuments(prev => [...prev, copiedDocument]);
      
      message.success(`文档"${document.title}"复制成功`);
      onDocumentUpdate?.();
    } catch (error) {
      message.error('复制文档失败');
    }
  };

  // 创建模板
  const handleCreateTemplate = async (document: Document) => {
    try {
      // 更新文档的模板状态
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, is_template: !doc.is_template, updated_at: new Date().toISOString() }
          : doc
      ));
      
      if (document.is_template) {
        message.success(`已取消"${document.title}"的模板状态`);
      } else {
        message.success(`模板"${document.title}"创建成功`);
      }
      
      onDocumentUpdate?.();
    } catch (error) {
      message.error(document.is_template ? '取消模板失败' : '创建模板失败');
    }
  };

  // 导出文档
  const handleExportDocument = async (document: Document, format: 'pdf' | 'word' | 'markdown') => {
    try {
      // TODO: 调用API导出文档
      // const blob = await documentApi.export(document.id, format);
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `${document.title}.${format}`;
      // a.click();
      message.success(`文档"${document.title}"导出成功`);
    } catch (error) {
      message.error('导出文档失败');
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

  // 上传状态
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    action: '/api/v1/documents/upload', // TODO: 替换为实际上传接口
    data: {
      folder_id: folderId
    },
    onChange(info) {
      const { status, uid, name } = info.file;
      
      if (status === 'uploading') {
        setUploadingFiles(prev => prev.includes(uid) ? prev : [...prev, uid]);
        const progress = info.file.percent || 0;
        setUploadProgress(prev => ({ ...prev, [uid]: progress }));
      } else if (status === 'done') {
        message.success(`${name} 上传成功`);
        setUploadingFiles(prev => prev.filter(id => id !== uid));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uid];
          return newProgress;
        });
        loadDocuments();
        onDocumentUpdate?.();
      } else if (status === 'error') {
        message.error(`${name} 上传失败`);
        setUploadingFiles(prev => prev.filter(id => id !== uid));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uid];
          return newProgress;
        });
      }
    },
    beforeUpload: (file) => {
      // 文件大小限制（可配置）
      const maxSize = 50; // 50MB
      const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
      if (!isLtMaxSize) {
        message.error(`文件大小不能超过 ${maxSize}MB!`);
        return false;
      }

      // 文件类型限制（可配置）
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/markdown',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        message.error('不支持的文件类型!');
        return false;
      }

      return true;
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
    showUploadList: true,
    listType: 'text'
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
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 120,
      render: (projectName) => (
        projectName ? (
          <Tag color="blue">{projectName}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name', 
      width: 120,
      render: (customerName) => (
        customerName ? (
          <Tag color="green">{customerName}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => {
        const categoryMap = {
          contract: { label: '合同', color: 'red' },
          requirement: { label: '需求', color: 'blue' },
          design: { label: '设计', color: 'purple' },
          technical: { label: '技术', color: 'orange' },
          report: { label: '报告', color: 'cyan' },
          other: { label: '其他', color: 'gray' }
        };
        
        if (category && categoryMap[category as keyof typeof categoryMap]) {
          const config = categoryMap[category as keyof typeof categoryMap];
          return <Tag color={config.color}>{config.label}</Tag>;
        }
        
        return <Text type="secondary">-</Text>;
      }
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
      width: 200,
      render: (_, record) => {
        const moreActions: MenuProps['items'] = [
          {
            key: 'copy',
            label: '复制文档',
            icon: <CopyOutlined />,
            onClick: () => handleCopyDocument(record)
          },
          {
            key: 'template',
            label: record.is_template ? '取消模板' : '创建模板',
            icon: <BookOutlined />,
            onClick: () => handleCreateTemplate(record)
          },
          {
            type: 'divider'
          },
          {
            key: 'export',
            label: '导出',
            icon: <ExportOutlined />,
            children: [
              {
                key: 'export-pdf',
                label: '导出为 PDF',
                icon: <FilePdfOutlined />,
                onClick: () => handleExportDocument(record, 'pdf')
              },
              {
                key: 'export-word',
                label: '导出为 Word',
                icon: <FileWordOutlined />,
                onClick: () => handleExportDocument(record, 'word')
              },
              {
                key: 'export-markdown',
                label: '导出为 Markdown',
                icon: <FileMarkdownOutlined />,
                onClick: () => handleExportDocument(record, 'markdown')
              }
            ]
          },
          {
            key: 'share',
            label: '分享文档',
            icon: <ShareAltOutlined />,
            onClick: () => {
              // TODO: 实现分享功能
              message.info('分享功能即将上线');
            }
          }
        ];

        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                // 导航到文档详情页面
                window.open(`/documents/${record.id}`, '_blank');
              }}
            >
              查看
            </Button>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                // 导航到文档编辑页面
                window.open(`/documents/${record.id}/edit`, '_blank');
              }}
            >
              编辑
            </Button>
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadDocument(record)}
            >
              下载
            </Button>
            <Dropdown
              menu={{ items: moreActions }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
              >
                更多
              </Button>
            </Dropdown>
            <Popconfirm
              title="确认删除"
              description="确定要删除这个文档吗？"
              onConfirm={() => handleDeleteDocument(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      }
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
            
            <Divider type="vertical" />
            
            {/* 批量操作 */}
            <Button
              type={isSelectMode ? 'primary' : 'default'}
              icon={isSelectMode ? <EyeOutlined /> : <AppstoreOutlined />}
              onClick={toggleSelectMode}
            >
              {isSelectMode ? '退出选择' : '批量操作'}
            </Button>
            
            {isSelectMode && (
              <>
                <Button
                  onClick={toggleSelectAll}
                  size="small"
                >
                  {selectedDocuments.length === filteredDocuments.length ? '取消全选' : '全选'}
                </Button>
                <Badge count={selectedDocuments.length} showZero>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDelete}
                    disabled={selectedDocuments.length === 0}
                  >
                    批量删除
                  </Button>
                </Badge>
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleBatchCopy}
                  disabled={selectedDocuments.length === 0}
                >
                  批量复制
                </Button>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'batch-template-set',
                        label: '设为模板',
                        icon: <BookOutlined />,
                        onClick: () => handleBatchTemplate(true),
                        disabled: selectedDocuments.length === 0
                      },
                      {
                        key: 'batch-template-unset',
                        label: '取消模板',
                        icon: <FileTextOutlined />,
                        onClick: () => handleBatchTemplate(false),
                        disabled: selectedDocuments.length === 0
                      },
                      {
                        type: 'divider'
                      },
                      {
                        key: 'batch-export',
                        label: '批量导出',
                        icon: <ExportOutlined />,
                        children: [
                          {
                            key: 'batch-export-pdf',
                            label: '导出为 PDF',
                            onClick: () => handleBatchExport('pdf')
                          },
                          {
                            key: 'batch-export-word',
                            label: '导出为 Word',
                            onClick: () => handleBatchExport('word')
                          },
                          {
                            key: 'batch-export-zip',
                            label: '打包下载',
                            onClick: () => handleBatchExport('zip')
                          }
                        ],
                        disabled: selectedDocuments.length === 0
                      }
                    ]
                  }}
                  trigger={['click']}
                  disabled={selectedDocuments.length === 0}
                >
                  <Button
                    icon={<MoreOutlined />}
                    disabled={selectedDocuments.length === 0}
                  >
                    更多操作
                  </Button>
                </Dropdown>
              </>
            )}
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
                      // 导航到文档详情页面
                      window.open(`/documents/${document.id}`, '_blank');
                      onDocumentSelect?.(document);
                    }}
                    onEdit={(document) => {
                      // 导航到文档编辑页面
                      window.open(`/documents/${document.id}/edit`, '_blank');
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
                      // 导航到文档详情页面
                      window.open(`/documents/${document.id}`, '_blank');
                      onDocumentSelect?.(document);
                    }}
                    onEdit={(document) => {
                      // 导航到文档编辑页面
                      window.open(`/documents/${document.id}/edit`, '_blank');
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
            name="project_id"
            label="关联项目"
          >
            <Select
              placeholder="选择项目（可选）"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {/* TODO: 动态加载项目选项 */}
              <Option value={1}>示例项目1</Option>
              <Option value={2}>示例项目2</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="customer_id"
            label="关联客户"
          >
            <Select
              placeholder="选择客户（可选）"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {/* TODO: 动态加载客户选项 */}
              <Option value={1}>示例客户1</Option>
              <Option value={2}>示例客户2</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="category"
            label="文档分类"
          >
            <Select
              placeholder="选择文档分类（可选）"
              allowClear
            >
              <Option value="contract">合同文档</Option>
              <Option value="requirement">需求文档</Option>
              <Option value="design">设计文档</Option>
              <Option value="technical">技术文档</Option>
              <Option value="report">报告文档</Option>
              <Option value="other">其他</Option>
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
        onCancel={() => {
          if (uploadingFiles.length === 0) {
            setUploadModalVisible(false);
          } else {
            Modal.confirm({
              title: '确认关闭',
              content: '有文件正在上传中，关闭将取消上传，确定要关闭吗？',
              onOk: () => {
                setUploadModalVisible(false);
                setUploadingFiles([]);
                setUploadProgress({});
              }
            });
          }
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => setUploadModalVisible(false)}
            disabled={uploadingFiles.length > 0}
          >
            关闭
          </Button>
        ]}
        width={600}
        maskClosable={uploadingFiles.length === 0}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>支持的文件类型：</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最大 50MB
            </Text>
          </div>
          <Space wrap>
            <Tag color="blue">PDF</Tag>
            <Tag color="green">Word</Tag>
            <Tag color="orange">Excel</Tag>
            <Tag color="purple">Markdown</Tag>
            <Tag color="default">Text</Tag>
            <Tag color="pink">图片</Tag>
          </Space>
        </div>
        
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传，支持 PDF、Word、Excel、Markdown、文本和图片文件
          </p>
        </Upload.Dragger>
        
        {/* 上传进度显示 */}
        {uploadingFiles.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>上传进度</Title>
            {uploadingFiles.map(fileId => {
              const progress = uploadProgress[fileId] || 0;
              return (
                <div key={fileId} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>文件 {fileId.slice(-8)}</Text>
                    <Text>{Math.round(progress)}%</Text>
                  </div>
                  <Progress 
                    percent={progress} 
                    status={progress === 100 ? 'success' : 'active'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
        
        {/* 上传提示 */}
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            📝 提示：上传后的文件将保存在当前文件夹中，您可以在文件列表中管理和编辑这些文件。
          </Text>
        </div>
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
            key="view-detail"
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => {
              if (selectedDocument) {
                window.open(`/documents/${selectedDocument.id}`, '_blank');
              }
            }}
          >
            详细查看
          </Button>,
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