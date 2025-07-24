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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { documentService, DocumentListItem } from '../services/documentService';
import { DocumentFilter } from '../types/document';

const { Title, Text } = Typography;
const { Option } = Select;

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
        ? await documentService.getProjectDocuments(projectId, filter as any)
        : await documentService.getAllDocuments(filter as any);
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      message.error('获取文档列表失败');
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 删除文档
  const handleDeleteDocument = async (documentId: number) => {
    try {
      await documentService.deleteDocument(documentId);
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
  const columns: ColumnsType<DocumentListItem> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: DocumentListItem) => (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
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
      width: 120,
      render: (_, record: DocumentListItem) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditDocument(record)}
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