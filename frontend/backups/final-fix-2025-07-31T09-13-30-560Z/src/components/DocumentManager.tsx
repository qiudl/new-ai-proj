// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Dropdown, 
  Modal, 
  message,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import { 
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MoreOutlined,
  FileTextOutlined,
  PictureOutlined,
  FilePdfOutlined,
  FolderOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import unifiedDocumentService from '../services/unifiedDocumentService';
import { documentTypes, documentCategories } from './DocumentTypeSelector';
import { DocumentType, DocumentStats, DocumentListItem } from '../types/document';
import { DocumentFilter as DocumentListParams } from '../types/document';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

interface DocumentManagerProps {
  projectId?: number;
  showProjectFilter?: boolean;
  className?: string;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  projectId,
  showProjectFilter = false,
  className
}) => {
  const navigate = useNavigate();
  
  // 状态管理
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 筛选和搜索状态
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 获取文档统计信息
  const loadStats = useCallback(async () => {
    try {
      // Stats functionality not implemented in unified service yet
      const statsData: DocumentStats = { 
        total_documents: 0, 
        documents_by_type: {
          markdown: 0,
          html: 0,
          text: 0,
          json: 0,
          code: 0,
          pdf: 0,
          word: 0,
          excel: 0,
          image: 0
        }, 
        by_type: {
          markdown: 0,
          html: 0,
          text: 0,
          json: 0,
          code: 0,
          pdf: 0,
          word: 0,
          excel: 0,
          image: 0
        },
        documents_by_status: {
          draft: 0,
          published: 0,
          archived: 0
        }, 
        recent_documents: [] 
      };
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [projectId]);

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params: DocumentListParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        type: filterType !== 'all' ? [filterType] : undefined,
        status: filterStatus !== 'all' ? filterStatus as any : undefined,
        sort_by: sortBy,
        order: sortOrder,
        project_id: projectId
      };

      const response = projectId 
        ? await unifiedDocumentService.getAllDocuments({ ...params, project_id: projectId })
        : await unifiedDocumentService.getAllDocuments(params);
      
      setDocuments(response.documents);
      setPagination(prev => ({
        ...prev,
        total: response.total
      }));
    } catch (error) {
      console.error('Failed to load documents:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, pagination.current, pagination.pageSize, searchText, filterType, filterCategory, filterStatus, sortBy, sortOrder]);

  // 初始化和刷新数据
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [loadDocuments, loadStats]);

  // 获取文档类型图标和颜色
  const getTypeDisplay = (type: DocumentType) => {
    const config = documentTypes[type as keyof typeof documentTypes];
    return {
      icon: config.icon,
      color: config.color,
      name: config.name
    };
  };

  // 获取分类显示
  const getCategoryDisplay = (tags?: string[]) => {
    if (!tags || tags.length === 0) return null;
    
    const [categoryId, subcategoryId] = tags;
    const category = documentCategories[categoryId as keyof typeof documentCategories];
    if (!category) return null;

    const subcategory = subcategoryId 
      ? category.subcategories.find((sub: any) => sub.id === subcategoryId)
      : null;

    return (
      <Space size={4}>
        <Tag color={category.color} style={{ margin: 0 }}>
          {category.icon} {category.name}
        </Tag>
        {subcategory && (
          <Tag style={{ margin: 0 }}>
            {subcategory.name}
          </Tag>
        )}
      </Space>
    );
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理筛选
  const handleFilter = (key: string, value: any) => {
    switch (key) {
      case 'type':
        setFilterType(value);
        break;
      case 'category':
        setFilterCategory(value);
        break;
      case 'status':
        setFilterStatus(value);
        break;
    }
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 创建新文档
  const handleCreateDocument = () => {
    navigate(projectId ? `/projects/${projectId}/documents/new` : '/documents/new');
  };

  // 查看文档
  const handleViewDocument = (record: DocumentListItem) => {
    if (record.type === 'markdown') {
      navigate(`/documents/${record.id}`);
    } else {
      // 对于图片和PDF，打开预览
      window.open(record.file_url, '_blank');
    }
  };

  // 编辑文档
  const handleEditDocument = (record: DocumentListItem) => {
    if (record.type === 'markdown') {
      navigate(`/documents/${record.id}/edit`);
    } else {
      message.info('图片和PDF文件暂不支持在线编辑');
    }
  };

  // 删除文档
  const handleDeleteDocument = (record: DocumentListItem) => {
    confirm({
      title: '确认删除',
      content: `确定要删除文档"${record.title}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unifiedDocumentService.deleteDocument(record.id);
          message.success('文档已删除');
          loadDocuments();
          loadStats();
        } catch (error) {
          console.error('Failed to delete document:', error);
          message.error('删除文档失败');
        }
      }
    });
  };

  // 下载文档
  const handleDownloadDocument = (record: DocumentListItem) => {
    if (record.file_url) {
      const link = document.createElement('a');
      link.href = record.file_url;
      link.download = record.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // 对于Markdown文档，跳转到查看页面进行下载
      message.info('请先打开文档查看页面进行下载');
      handleViewDocument(record);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的文档');
      return;
    }

    confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个文档吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(id => unifiedDocumentService.deleteDocument(Number(id)))
          );
          message.success(`已删除 ${selectedRowKeys.length} 个文档`);
          setSelectedRowKeys([]);
          loadDocuments();
          loadStats();
        } catch (error) {
          console.error('Failed to batch delete:', error);
          message.error('批量删除失败');
        }
      }
    });
  };

  // 表格列定义
  const columns: any[] = [
    {
      title: '文档',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: DocumentListItem) => {
        const typeDisplay = getTypeDisplay(record.type);
        return (
          <Space>
            <span style={{ color: typeDisplay.color, fontSize: '16px' }}>
              {typeDisplay.icon}
            </span>
            <div>
              <div style={{ fontWeight: 'bold' }}>{title}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {typeDisplay.name}
              </Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: '分类',
      dataIndex: 'tags',
      key: 'category',
      width: 200,
      render: (tags: string[]) => getCategoryDisplay(tags)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'orange', text: '草稿' },
          published: { color: 'green', text: '已发布' },
          archived: { color: 'default', text: '已归档' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
        </Space>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space>
            <CalendarOutlined />
            <span>{new Date(date).toLocaleDateString()}</span>
          </Space>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: DocumentListItem) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDocument(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditDocument(record)}
              disabled={record.type !== 'markdown'}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'download',
                  icon: <DownloadOutlined />,
                  label: '下载',
                  onClick: () => handleDownloadDocument(record)
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除',
                  danger: true,
                  onClick: () => handleDeleteDocument(record)
                }
              ]
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <div className={className}>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总文档数"
                value={stats.total_documents}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Markdown文档"
                value={stats.by_type.markdown || 0}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="图片文件"
                value={stats.by_type.image || 0}
                prefix={<PictureOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="PDF文档"
                value={stats.by_type.pdf || 0}
                prefix={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 工具栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <Input.Search
                placeholder="搜索文档..."
                allowClear
                style={{ width: 250 }}
                onSearch={handleSearch}
                prefix={<SearchOutlined />}
              />
              
              <Select
                value={filterType}
                onChange={(value) => handleFilter('type', value)}
                style={{ width: 120 }}
                placeholder="文档类型"
              >
                <Option value="all">全部类型</Option>
                {Object.values(documentTypes).map(type => (
                  <Option key={type.type} value={type.type}>
                    <Space>
                      <span style={{ color: type.color }}>{type.icon}</span>
                      {type.name}
                    </Space>
                  </Option>
                ))}
              </Select>
              
              <Select
                value={filterCategory}
                onChange={(value) => handleFilter('category', value)}
                style={{ width: 120 }}
                placeholder="文档分类"
              >
                <Option value="all">全部分类</Option>
                {Object.values(documentCategories).map(category => (
                  <Option key={category.id} value={category.id}>
                    <Space>
                      <span style={{ color: category.color }}>{category.icon}</span>
                      {category.name}
                    </Space>
                  </Option>
                ))}
              </Select>
              
              <Select
                value={filterStatus}
                onChange={(value) => handleFilter('status', value)}
                style={{ width: 100 }}
                placeholder="状态"
              >
                <Option value="all">全部状态</Option>
                <Option value="draft">草稿</Option>
                <Option value="published">已发布</Option>
                <Option value="archived">已归档</Option>
              </Select>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {selectedRowKeys.length > 0 && (
                <Button 
                  danger 
                  onClick={handleBatchDelete}
                  icon={<DeleteOutlined />}
                >
                  删除选中 ({selectedRowKeys.length})
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateDocument}
              >
                新建文档
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 文档列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            selections: [
              Table.SELECTION_ALL,
              Table.SELECTION_INVERT,
              Table.SELECTION_NONE,
            ]}}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            }
          }}
          locale={{
            emptyText: (
              <Empty 
                description="暂无文档"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleCreateDocument}
                >
                  创建第一个文档
                </Button>
              </Empty>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default DocumentManager;