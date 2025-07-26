/**
 * 文档表格视图组件
 * 支持简洁和高级两种模式
 */

import React from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Typography,
  Tooltip,
  Badge,
  Checkbox,
  Popconfirm,
  Dropdown,
  message
} from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  UserOutlined,
  CopyOutlined,
  BookOutlined,
  ExportOutlined,
  ShareAltOutlined,
  StarFilled,
  FilePdfOutlined,
  FileWordOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { Document, DocumentListItem } from '../types/document';

const { Text } = Typography;

// 文档类型图标配置
const DOCUMENT_TYPE_ICONS = {
  markdown: <FileMarkdownOutlined style={{ color: '#1890ff', fontSize: '16px' }} />,
  text: <FileTextOutlined style={{ color: '#666', fontSize: '16px' }} />,
  pdf: <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />,
  word: <FileWordOutlined style={{ color: '#1890ff', fontSize: '16px' }} />,
  excel: <FileTextOutlined style={{ color: '#52c41a', fontSize: '16px' }} />,
  image: <FileTextOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
};

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

interface DocumentTableViewProps {
  documents: Document[] | DocumentListItem[];
  selectedDocuments: number[];
  isSelectMode: boolean;
  showProject: boolean;
  mode: 'simple' | 'advanced';
  page: number;
  pageSize: number;
  total: number;
  onDocumentSelect: (document: Document | DocumentListItem) => void;
  onDocumentEdit: (document: Document | DocumentListItem) => void;
  onDocumentDelete: (documentId: number) => void;
  onToggleSelection: (documentId: number) => void;
  onPageChange: (page: number, pageSize?: number) => void;
  
  // 高级功能
  enableVersionControl?: boolean;
  enableGoogleDocsIntegration?: boolean;
  onVersionControl?: (document: Document) => void;
  onExportToGoogleDocs?: (document: Document) => Promise<void>;
}

const DocumentTableView: React.FC<DocumentTableViewProps> = ({
  documents,
  selectedDocuments,
  isSelectMode,
  showProject,
  mode,
  page,
  pageSize,
  total,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onToggleSelection,
  onPageChange
}) => {
  
  // 格式化时间
  const formatDateTime = (dateTime: string) => {
    return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss');
  };

  // 格式化文件大小
  const formatFileSize = (size?: number) => {
    if (!size) return '-';
    if (size < 1000) return `${size} 字符`;
    if (size < 1000000) return `${(size / 1000).toFixed(1)} K字符`;
    return `${(size / 1000000).toFixed(1)} M字符`;
  };

  // 处理文档操作
  const handleCopyDocument = (document: Document | DocumentListItem) => {
    // 复制文档逻辑
    message.success(`文档"${document.title}"复制成功`);
  };

  const handleCreateTemplate = (document: Document | DocumentListItem) => {
    const doc = document as Document;
    const newStatus = doc.is_template ? '取消' : '设为';
    message.success(`${newStatus}模板"${document.title}"成功`);
  };

  const handleExportDocument = (document: Document | DocumentListItem, format: string) => {
    message.success(`文档"${document.title}"导出为${format}成功`);
  };

  const handleDownloadDocument = (document: Document | DocumentListItem) => {
    const doc = document as Document;
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    } else {
      // 生成并下载文本文档
      const content = doc.content || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 简洁模式的列配置
  const getSimpleColumns = (): ColumnsType<DocumentListItem> => [
    ...(isSelectMode ? [{
      title: (
        <Checkbox
          checked={selectedDocuments.length === documents.length && documents.length > 0}
          indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documents.length}
          onChange={(e) => {
            if (e.target.checked) {
              documents.forEach(doc => {
                if (!selectedDocuments.includes(doc.id)) {
                  onToggleSelection(doc.id);
                }
              });
            } else {
              selectedDocuments.forEach(id => onToggleSelection(id));
            }
          }}
        />
      ),
      width: 50,
      render: (_: any, record: DocumentListItem) => (
        <Checkbox
          checked={selectedDocuments.includes(record.id)}
          onChange={() => onToggleSelection(record.id)}
        />
      ),
    }] : []),
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
            onClick={() => onDocumentSelect(record)}
            style={{ padding: 0 }}
          >
            {title}
          </Button>
        </Space>
      ),
    },
    ...(showProject ? [{
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
            {dayjs(dateTime).fromNow()}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record: DocumentListItem) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onDocumentEdit(record)}
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
            <Popconfirm
              title="确认删除"
              description={`确定要删除文档"${record.title}"吗？`}
              onConfirm={() => onDocumentDelete(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 高级模式的列配置
  const getAdvancedColumns = (): ColumnsType<Document> => [
    ...(isSelectMode ? [{
      title: (
        <Checkbox
          checked={selectedDocuments.length === documents.length && documents.length > 0}
          indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documents.length}
          onChange={(e) => {
            if (e.target.checked) {
              documents.forEach(doc => {
                if (!selectedDocuments.includes(doc.id)) {
                  onToggleSelection(doc.id);
                }
              });
            } else {
              selectedDocuments.forEach(id => onToggleSelection(id));
            }
          }}
        />
      ),
      width: 50,
      render: (_: any, record: Document) => (
        <Checkbox
          checked={selectedDocuments.includes(record.id)}
          onChange={() => onToggleSelection(record.id)}
        />
      ),
    }] : []),
    {
      title: '文档',
      key: 'document',
      render: (_, record: Document) => (
        <Space>
          {DOCUMENT_TYPE_ICONS[record.type] || DOCUMENT_TYPE_ICONS.text}
          <div>
            <Space>
              <Button 
                type="link" 
                style={{ padding: 0, fontWeight: 'bold' }}
                onClick={() => onDocumentSelect(record)}
              >
                {record.title}
              </Button>
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
          {tags?.slice(0, 2).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags?.length > 2 && (
            <Tag>+{tags.length - 2}</Tag>
          )}
        </Space>
      )
    },
    ...(showProject ? [{
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 120,
      render: (projectName: string) => (
        projectName ? (
          <Tag color="blue">{projectName}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    }] : []),
    {
      title: '所属文件夹',
      dataIndex: 'folder_name',
      key: 'folder_name',
      width: 120,
      render: (folderName: string) => (
        folderName ? (
          <Tag color="green">{folderName}</Tag>
        ) : (
          <Text type="secondary">根目录</Text>
        )
      )
    },
    {
      title: '所有者',
      dataIndex: 'owner_name',
      key: 'owner_name',
      width: 100,
      render: (name: string) => (
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
      render: (date: string) => (
        <Tooltip title={formatDateTime(date)}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(date).fromNow()}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, record: Document) => {
        const moreActions: MenuProps['items'] = [
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
                onClick: () => handleExportDocument(record, 'PDF')
              },
              {
                key: 'export-word',
                label: '导出为 Word',
                icon: <FileWordOutlined />,
                onClick: () => handleExportDocument(record, 'Word')
              },
              {
                key: 'export-markdown',
                label: '导出为 Markdown',
                icon: <FileMarkdownOutlined />,
                onClick: () => handleExportDocument(record, 'Markdown')
              }
            ]
          },
          {
            key: 'share',
            label: '分享文档',
            icon: <ShareAltOutlined />,
            onClick: () => message.info('分享功能即将上线')
          }
        ];

        return (
          <Space size="small">
            <Tooltip title="查看">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onDocumentSelect(record)}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onDocumentEdit(record)}
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
            <Tooltip title="下载">
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadDocument(record)}
              />
            </Tooltip>
            <Dropdown
              menu={{ items: moreActions }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Tooltip title="更多">
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                />
              </Tooltip>
            </Dropdown>
            <Tooltip title="删除">
              <Popconfirm
                title="确认删除"
                description={`确定要删除文档"${record.title}"吗？`}
                onConfirm={() => onDocumentDelete(record.id)}
                okText="删除"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  const columns = mode === 'simple' 
    ? getSimpleColumns() as ColumnsType<Document>
    : getAdvancedColumns();

  return (
    <Table
      columns={columns as any}
      dataSource={documents as any}
      rowKey="id"
      pagination={{
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `第 ${range[0]}-${range[1]} 项，共 ${total} 个文档`,
        onChange: onPageChange,
      }}
      scroll={{ x: mode === 'advanced' ? 1200 : 800 }}
      size={mode === 'simple' ? 'middle' : 'small'}
    />
  );
};

export default DocumentTableView;