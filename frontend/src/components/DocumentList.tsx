import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  message, 
  Tooltip, 
  Input, 
  Select, 
  Card, 
  Typography,
  Popconfirm,
  Badge
} from 'antd';
import { 
  FileOutlined, 
  DownloadOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

export interface Document {
  id: number;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  visibility: 'private' | 'team' | 'public';
  uploaded_by: {
    id: number;
    username: string;
    avatar?: string;
  };
  updated_by?: {
    id: number;
    username: string;
    avatar?: string;
  };
  current_version: number;
  total_versions: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  tags: string[];
  description?: string;
  checksum: string;
}

export interface DocumentListProps {
  projectId: number;
  taskId: number;
  onEdit?: (document: Document) => void;
  onView?: (document: Document) => void;
  onDelete?: (documentId: number) => void;
  onDownload?: (document: Document) => void;
  className?: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  projectId,
  taskId,
  onEdit,
  onView,
  onDelete,
  onDownload,
  className
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('');

  // 文件类型图标映射
  const getFileTypeIcon = (fileType: string) => {
    const iconMap: Record<string, string> = {
      'markdown': '📝',
      'pdf': '📄',
      'text': '📃',
      'html': '🌐',
      'json': '⚙️',
      'xml': '📋',
      'docx': '📘',
      'image': '🖼️'
    };
    return iconMap[fileType] || '📄';
  };

  // 状态标签颜色映射
  const getStatusTagColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'draft': 'default',
      'published': 'success',
      'archived': 'warning',
      'deleted': 'error'
    };
    return colorMap[status] || 'default';
  };

  // 可见性标签颜色映射
  const getVisibilityTagColor = (visibility: string) => {
    const colorMap: Record<string, string> = {
      'private': 'red',
      'team': 'blue',
      'public': 'green'
    };
    return colorMap[visibility] || 'default';
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(statusFilter && { status: statusFilter }),
        ...(visibilityFilter && { visibility: visibilityFilter }),
        ...(fileTypeFilter && { file_type: fileTypeFilter })
      });

      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDocuments(result.data.data || []);
        setTotal(result.data.pagination?.total || 0);
      } else {
        throw new Error(result.message || '加载失败');
      }
    } catch (error: any) {
      message.error(`加载文档列表失败: ${error.message}`);
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, currentPage, pageSize, searchText, statusFilter, visibilityFilter, fileTypeFilter]);

  // 删除文档
  const handleDelete = async (documentId: number) => {
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        message.success('文档删除成功');
        loadDocuments(); // 重新加载列表
        onDelete?.(documentId);
      } else {
        throw new Error(result.message || '删除失败');
      }
    } catch (error: any) {
      message.error(`删除文档失败: ${error.message}`);
    }
  };

  // 下载文档
  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/tasks/${taskId}/documents/${document.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 创建下载链接
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('文档下载成功');
      onDownload?.(document);
    } catch (error: any) {
      message.error(`下载文档失败: ${error.message}`);
    }
  };

  // 表格列定义
  const columns: ColumnsType<Document> = [
    {
      title: '文档',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (title: string, record: Document) => (
        <Space direction="vertical" size={2}>
          <Space>
            <span style={{ fontSize: '16px' }}>{getFileTypeIcon(record.file_type)}</span>
            <Button 
              type="link" 
              onClick={() => onView?.(record)}
              style={{ padding: 0, height: 'auto', fontWeight: 500 }}
            >
              {title}
            </Button>
          </Space>
          <Space wrap>
            <Tag color={getStatusTagColor(record.status)}>
              {record.status}
            </Tag>
            <Tag color={getVisibilityTagColor(record.visibility)}>
              {record.visibility}
            </Tag>
            {record.tags.map(tag => (
              <Tag key={tag} size="small">{tag}</Tag>
            ))}
          </Space>
        </Space>
      )
    },
    {
      title: '版本信息',
      key: 'version',
      width: 120,
      render: (_, record: Document) => (
        <Space direction="vertical" size={2}>
          <Badge 
            count={record.current_version} 
            overflowCount={999}
            style={{ backgroundColor: '#52c41a' }}
          />
          <span style={{ fontSize: '12px', color: '#999' }}>
            共{record.total_versions}版
          </span>
        </Space>
      )
    },
    {
      title: '文件信息',
      key: 'fileInfo',
      width: 150,
      render: (_, record: Document) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontSize: '13px' }}>{record.file_name}</span>
          <span style={{ fontSize: '12px', color: '#999' }}>
            {formatFileSize(record.file_size)}
          </span>
          <span style={{ fontSize: '12px', color: '#999' }}>
            下载{record.download_count}次
          </span>
        </Space>
      )
    },
    {
      title: '创建者',
      dataIndex: ['uploaded_by', 'username'],
      key: 'uploaded_by',
      width: 100,
      render: (username: string) => (
        <span style={{ fontSize: '13px' }}>{username}</span>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (updated_at: string) => (
        <Tooltip title={dayjs(updated_at).format('YYYY-MM-DD HH:mm:ss')}>
          <span style={{ fontSize: '13px' }}>
            {dayjs(updated_at).format('MM-DD HH:mm')}
          </span>
        </Tooltip>
      ),
      sorter: true
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record: Document) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => onView?.(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => onEdit?.(record)}
            />
          </Tooltip>
          <Tooltip title="下载">
            <Button 
              type="text" 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个文档吗？此操作不可恢复。"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
            okType="danger"
          >
            <Tooltip title="删除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 初始加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1); // 重置到第一页
  };

  // 过滤器变更处理
  const handleFilterChange = (type: string, value: string) => {
    setCurrentPage(1); // 重置到第一页
    switch (type) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'visibility':
        setVisibilityFilter(value);
        break;
      case 'fileType':
        setFileTypeFilter(value);
        break;
    }
  };

  return (
    <Card 
      className={className}
      title={
        <Space>
          <FileOutlined />
          <Title level={4} style={{ margin: 0 }}>
            文档列表 ({total})
          </Title>
        </Space>
      }
      extra={
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          onClick={loadDocuments}
          loading={loading}
        >
          刷新
        </Button>
      }
    >
      {/* 搜索和过滤器 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Search
          placeholder="搜索文档标题或内容"
          allowClear
          style={{ width: 250 }}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
        />
        
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 120 }}
          value={statusFilter || undefined}
          onChange={(value) => handleFilterChange('status', value || '')}
        >
          <Option value="draft">草稿</Option>
          <Option value="published">已发布</Option>
          <Option value="archived">已归档</Option>
        </Select>
        
        <Select
          placeholder="可见性"
          allowClear
          style={{ width: 120 }}
          value={visibilityFilter || undefined}
          onChange={(value) => handleFilterChange('visibility', value || '')}
        >
          <Option value="private">私有</Option>
          <Option value="team">团队</Option>
          <Option value="public">公开</Option>
        </Select>
        
        <Select
          placeholder="文件类型"
          allowClear
          style={{ width: 120 }}
          value={fileTypeFilter || undefined}
          onChange={(value) => handleFilterChange('fileType', value || '')}
        >
          <Option value="markdown">Markdown</Option>
          <Option value="pdf">PDF</Option>
          <Option value="text">Text</Option>
          <Option value="html">HTML</Option>
          <Option value="json">JSON</Option>
          <Option value="xml">XML</Option>
        </Select>
      </Space>

      {/* 文档表格 */}
      <Table
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }
        }}
      />
    </Card>
  );
};

export default DocumentList;