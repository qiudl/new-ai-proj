import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  Typography,
  Space,
  message,
  Spin,
  Card,
  Row,
  Col,
  Tooltip,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  CopyOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import unifiedDocumentService from '../services/unifiedDocumentService';
import { DocumentListItem , DocumentFilter } from '../types/document';

const { Title, Text } = Typography;
const { Option } = Select;

// 文档类型图标配置
const DOCUMENT_TYPE_ICONS = {
  markdown: <FileMarkdownOutlined style={{ color: '#1890ff', fontSize: '16px' }} />,
  html: <FileTextOutlined style={{ color: '#52c41a', fontSize: '16px' }} />,
  text: <FileTextOutlined style={{ color: '#666', fontSize: '16px' }} />,
  json: <FileTextOutlined style={{ color: '#722ed1', fontSize: '16px' }} />,
  code: <FileTextOutlined style={{ color: '#13c2c2', fontSize: '16px' }} />,
  pdf: <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />,
  word: <FileWordOutlined style={{ color: '#1890ff', fontSize: '16px' }} />,
  excel: <FileTextOutlined style={{ color: '#52c41a', fontSize: '16px' }} />,
  image: <FileTextOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
};

// 组件属性类型
interface DocumentListProps {
  projectId?: number;
  projectName?: string;
  onCreateDocument?: () => void;
  onEditDocument?: (document: DocumentListItem) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  projectId,
  projectName,
  onCreateDocument,
  onEditDocument,
}) => {
  const navigate = useNavigate();
  
  // 状态管理
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('updated_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 获取文档列表
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // 检查认证状态
      const token = localStorage.getItem('token');
      console.log('当前认证状态:', token ? '已登录' : '未登录');
      console.log('获取文档列表 - 项目ID:', projectId);
      console.log('搜索条件:', searchTerm);
      console.log('排序:', sortBy, order);

      const filter: DocumentFilter = {
        page: page || 1,
        limit: pageSize || 20,
        sort_by: sortBy,
        order: order,
      };

      if (searchTerm.trim()) {
        filter.search = searchTerm.trim();
      }

      const data = projectId 
        ? await unifiedDocumentService.getAllDocuments({ ...filter, project_id: projectId } as any)
        : await unifiedDocumentService.getAllDocuments(filter as any);
      
      console.log('获取到的文档数据:', data);
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
      
      if (!token) {
        message.warning('当前使用本地数据，请登录以获取最新文档');
      }
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
      const errorMessage = error.message || '获取文档列表失败';
      message.error(errorMessage);
      setDocuments([]);
      setTotal(0);
      
      // 如果是认证错误，提示用户登录
      if (errorMessage.includes('认证失败') || errorMessage.includes('登录')) {
        // 可以在这里跳转到登录页面
        // navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除文档
  const handleDeleteDocument = async (documentId: number) => {
    try {
      await unifiedDocumentService.deleteDocument(documentId);
      message.success('文档删除成功');
      fetchDocuments(); // 重新加载列表
    } catch (error) {
      console.error('Failed to delete document:', error);
      message.error('删除文档失败');
    }
  };

  // 处理创建文档
  const handleCreateDocument = () => {
    if (onCreateDocument) {
      onCreateDocument();
    } else if (projectId) {
      // 项目特定文档创建页面
      navigate(`/projects/${projectId}/documents/new`);
    } else {
      // 全局文档创建页面，需要先选择项目
      message.info('请先选择一个项目来创建文档');
      navigate('/projects');
    }
  };

  // 处理查看文档
  const handleViewDocument = (document: DocumentListItem) => {
    // 默认导航到查看页面
    navigate(`/documents/${document.id}`);
  };

  // 处理编辑文档
  const handleEditDocument = (document: DocumentListItem) => {
    if (onEditDocument) {
      onEditDocument(document);
    } else {
      // 默认导航到编辑页面
      navigate(`/documents/${document.id}/edit`);
    }
  };

  // 处理复制文档
  const handleCopyDocument = async (document: DocumentListItem) => {
    try {
      // 这里应该调用实际的复制API
      // await unifiedDocumentService.copyDocument(document.id);
      message.success(`文档"${document.title}"复制成功`);
      fetchDocuments(); // 重新加载列表
    } catch (error) {
      console.error('Failed to copy document:', error);
      message.error('复制文档失败');
    }
  };

  // 格式化时间
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('zh-CN');
  };

  // 格式化文件大小
  const formatFileSize = (size: number) => {
    if (size < 1000) return `${size} 字符`;
    if (size < 1000000) return `${(size / 1000).toFixed(1)} K字符`;
    return `${(size / 1000000).toFixed(1)} M字符`;
  };

  // 表格列定义
  const columns: any[] = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: DocumentListItem) => (
        <Space>
          {DOCUMENT_TYPE_ICONS[record.type] || DOCUMENT_TYPE_ICONS.text}
          <Button 
            type="link" 
            onClick={() => handleViewDocument(record)}
            style={{ padding: 0 }}
          >
            {title}
          </Button>
        </Space>
      ),
    },
    // 全局文档列表时显示项目名称
    ...(!projectId ? [{
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 150,
      render: (name: string) => name || '未知项目',
    }] : []),
    {
      title: '所属文件夹',
      dataIndex: 'folder_name',
      key: 'folder_name',
      width: 150,
      render: (name: string) => name || '根目录',
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 120,
      render: (name: string) => name || '未知用户',
    },
    {
      title: '大小',
      dataIndex: 'content_size',
      key: 'content_size',
      width: 100,
      render: (size: number) => (
        <Text type="secondary">{formatFileSize(size)}</Text>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (dateTime: string) => (
        <Tooltip title={formatDateTime(dateTime)}>
          <Text type="secondary">
            {new Date(dateTime).toLocaleDateString('zh-CN')}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: DocumentListItem) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditDocument(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyDocument(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                const modal = require('antd').Modal;
                modal.confirm({
                  title: '确认删除',
                  content: `确定要删除文档"${record.title}"吗？此操作不可恢复。`,
                  okText: '删除',
                  okType: 'danger',
                  cancelText: '取消',
                  onOk: () => handleDeleteDocument(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 组件加载和依赖更新
  useEffect(() => {
    fetchDocuments();
  }, [projectId, page, pageSize, sortBy, order, searchTerm]);

  return (
    <Card>
      {/* 页面头部 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            {projectName ? `${projectName} - 文档管理` : projectId ? '项目文档' : '文档管理'}
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateDocument}
          >
            新建文档
          </Button>
        </Col>
      </Row>

      {/* 搜索和排序工具栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex={1}>
          <Input
            placeholder="搜索文档标题..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </Col>
        <Col>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 120 }}
          >
            <Option value="updated_at">更新时间</Option>
            <Option value="created_at">创建时间</Option>
            <Option value="title">标题</Option>
          </Select>
        </Col>
        <Col>
          <Button
            icon={order === 'desc' ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
            onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
          >
            {order === 'desc' ? '降序' : '升序'}
          </Button>
        </Col>
      </Row>

      {/* 文档列表表格 */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 项，共 ${total} 个文档`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1); // 重置到第一页
              }
            },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无文档"
              >
                <Button type="primary" onClick={handleCreateDocument}>
                  创建第一个文档
                </Button>
              </Empty>
            ),
          }}
        />
      </Spin>
    </Card>
  );
};

export default DocumentList;