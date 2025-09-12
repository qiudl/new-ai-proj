/**
 * 文档表格视图组件
 * 支持简洁和高级两种模式
 */

import React, { useState } from 'react';
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
  message,
  Spin,
  Alert,
  Empty
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
import dayjs from '../utils/dayjs';
import { Document, DocumentListItem } from '../types/document';

const { Text } = Typography;

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
  loading?: boolean;
  error?: string | null;
  onDocumentSelect: (document: Document | DocumentListItem) => void;
  onDocumentEdit: (document: Document | DocumentListItem) => void;
  onDocumentDelete: (documentId: number) => Promise<void>;
  onDocumentCopy?: (documentId: number) => Promise<void>;
  onToggleTemplate?: (documentId: number) => Promise<void>;
  onToggleSelection: (documentId: number) => void;
  onPageChange: (page: number, pageSize?: number) => void;
  onRetry?: () => void;
  
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
  loading = false,
  error = null,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentCopy,
  onToggleTemplate,
  onToggleSelection,
  onPageChange,
  onRetry
}) => {
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  
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

  // 设置操作加载状态
  const setOperationLoadingState = (key: string, loading: boolean) => {
    setOperationLoading(prev => ({ ...prev, [key]: loading }));
  };

  // 处理文档操作
  const handleCopyDocument = async (document: Document | DocumentListItem) => {
    if (!onDocumentCopy) {
      message.error('复制功能不可用');
      return;
    }

    const loadingKey = `copy-${document.id}`;
    setOperationLoadingState(loadingKey, true);
    
    try {
      await onDocumentCopy(document.id);
      message.success(`文档"${document.title}"复制成功`);
    } catch (error: Error | unknown) {
      console.error('复制文档失败:', error);
      message.error(`复制文档失败: ${error.message || '未知错误'}`);
    } finally {
      setOperationLoadingState(loadingKey, false);
    }
  };

  const handleCreateTemplate = async (document: Document | DocumentListItem) => {
    if (!onToggleTemplate) {
      message.error('模板功能不可用');
      return;
    }

    const doc = document as Document;
    const newStatus = doc.is_template ? '取消' : '设为';
    const loadingKey = `template-${document.id}`;
    setOperationLoadingState(loadingKey, true);
    
    try {
      await onToggleTemplate(document.id);
      message.success(`${newStatus}模板"${document.title}"成功`);
    } catch (error: Error | unknown) {
      console.error('切换模板状态失败:', error);
      message.error(`${newStatus}模板失败: ${error.message || '未知错误'}`);
    } finally {
      setOperationLoadingState(loadingKey, false);
    }
  };

  const handleExportDocument = async (document: Document | DocumentListItem, format: string) => {
    const loadingKey = `export-${document.id}-${format}`;
    setOperationLoadingState(loadingKey, true);
    
    try {
      // 模拟导出延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(`文档"${document.title}"导出为${format}成功`);
    } catch (error: Error | unknown) {
      console.error('导出文档失败:', error);
      message.error(`导出文档失败: ${error.message || '未知错误'}`);
    } finally {
      setOperationLoadingState(loadingKey, false);
    }
  };

  const handleDownloadDocument = async (document: Document | DocumentListItem) => {
    const loadingKey = `download-${document.id}`;
    setOperationLoadingState(loadingKey, true);
    
    try {
      const doc = document as Document;
      if (doc.file_url) {
        // 检查文件URL是否有效
        const response = await fetch(doc.file_url, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error('文件不存在或无法访问');
        }
        window.open(doc.file_url, '_blank');
      } else {
        // 生成并下载文本文档
        const content = doc.content || '';
        if (!content.trim()) {
          message.warning('文档内容为空，无法下载');
          return;
        }
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${document.title}.txt`;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      message.success(`文档"${document.title}"下载成功`);
    } catch (error: Error | unknown) {
      console.error('下载文档失败:', error);
      message.error(`下载文档失败: ${error.message || '未知错误'}`);
    } finally {
      setOperationLoadingState(loadingKey, false);
    }
  };

  // 简洁模式的列配置
  const getSimpleColumns = (): any[] => [
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
      render: (_: unknown, record: DocumentListItem) => (
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
      render: (_: unknown, record: DocumentListItem) => (
        <Space >
          <Tooltip title="编辑">
            <Button
              type="text"
              
              icon={<EditOutlined />}
              onClick={() => onDocumentEdit(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              
              icon={<CopyOutlined />}
              loading={operationLoading[`copy-${record.id}`]}
              onClick={() => handleCopyDocument(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除"
              description={`确定要删除文档"${record.title}"吗？此操作不可恢复。`}
              onConfirm={async () => {
                const loadingKey = `delete-${record.id}`;
                setOperationLoadingState(loadingKey, true);
                try {
                  await onDocumentDelete(record.id);
                } catch (error: Error | unknown) {
                  console.error('删除文档失败:', error);
                  message.error(`删除文档失败: ${error.message || '未知错误'}`);
                } finally {
                  setOperationLoadingState(loadingKey, false);
                }
              }}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                
                danger
                icon={<DeleteOutlined />}
                loading={operationLoading[`delete-${record.id}`]}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 高级模式的列配置
  const getAdvancedColumns = (): any[] => [
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
      render: (_: unknown, record: Document) => (
        <Checkbox
          checked={selectedDocuments.includes(record.id)}
          onChange={() => onToggleSelection(record.id)}
        />
      ),
    }] : []),
    {
      title: '文档',
      key: 'document',
      render: (_: unknown, record: Document) => (
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
            status={config?.color as unknown} 
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
          <Avatar  icon={<UserOutlined />} />
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
      render: (_: unknown, record: Document) => {
        const moreActions: MenuProps['items'] = [
          {
            key: 'template',
            label: record.is_template ? '取消模板' : '创建模板',
            icon: operationLoading[`template-${record.id}`] ? <Spin  /> : <BookOutlined />,
            disabled: operationLoading[`template-${record.id}`],
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
                icon: operationLoading[`export-${record.id}-PDF`] ? <Spin  /> : <FilePdfOutlined />,
                disabled: operationLoading[`export-${record.id}-PDF`],
                onClick: () => handleExportDocument(record, 'PDF')
              },
              {
                key: 'export-word',
                label: '导出为 Word',
                icon: operationLoading[`export-${record.id}-Word`] ? <Spin  /> : <FileWordOutlined />,
                disabled: operationLoading[`export-${record.id}-Word`],
                onClick: () => handleExportDocument(record, 'Word')
              },
              {
                key: 'export-markdown',
                label: '导出为 Markdown',
                icon: operationLoading[`export-${record.id}-Markdown`] ? <Spin  /> : <FileMarkdownOutlined />,
                disabled: operationLoading[`export-${record.id}-Markdown`],
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
          <Space >
            <Tooltip title="查看">
              <Button
                type="text"
                
                icon={<EyeOutlined />}
                onClick={() => onDocumentSelect(record)}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="text"
                
                icon={<EditOutlined />}
                onClick={() => onDocumentEdit(record)}
              />
            </Tooltip>
            <Tooltip title="复制">
              <Button
                type="text"
                
                icon={<CopyOutlined />}
                loading={operationLoading[`copy-${record.id}`]}
                onClick={() => handleCopyDocument(record)}
              />
            </Tooltip>
            <Tooltip title="下载">
              <Button
                type="text"
                
                icon={<DownloadOutlined />}
                loading={operationLoading[`download-${record.id}`]}
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
                  
                  icon={<MoreOutlined />}
                />
              </Tooltip>
            </Dropdown>
            <Tooltip title="删除">
              <Popconfirm
                title="确认删除"
                description={`确定要删除文档"${record.title}"吗？此操作不可恢复。`}
                onConfirm={async () => {
                  const loadingKey = `delete-${record.id}`;
                  setOperationLoadingState(loadingKey, true);
                  try {
                    await onDocumentDelete(record.id);
                  } catch (error: Error | unknown) {
                    console.error('删除文档失败:', error);
                    message.error(`删除文档失败: ${error.message || '未知错误'}`);
                  } finally {
                    setOperationLoadingState(loadingKey, false);
                  }
                }}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  
                  danger
                  icon={<DeleteOutlined />}
                  loading={operationLoading[`delete-${record.id}`]}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  const columns = mode === 'simple' 
    ? getSimpleColumns() as unknown[]
    : getAdvancedColumns();

  // 错误状态处理
  if (error) {
    return (
      <Alert
        message="加载文档失败"
        description={error}
        type="error"
        showIcon
        action={
          onRetry && (
            <Button  danger onClick={onRetry}>
              重试
            </Button>
          )
        }
        style={{ marginBottom: 16 }}
      />
    );
  }

  // 空状态处理
  if (!loading && documents.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无文档"
        style={{ margin: '40px 0' }}
      >
        {onRetry && (
          <Button type="primary" onClick={onRetry}>
            刷新列表
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <Spin spinning={loading} tip="加载文档列表...">
      <Table
        columns={columns as unknown}
        dataSource={documents as unknown}
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
          disabled: loading
        }}
        scroll={{ x: mode === 'advanced' ? 1200 : 800 }}
        size={mode === 'simple' ? 'middle' : 'small'}
        loading={false} // 使用外层 Spin 组件控制加载状态
      />
    </Spin>
  );
};

export default DocumentTableView;