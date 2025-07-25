import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Space,
  Tag,
  Button,
  Tooltip,
  Typography,
  Avatar,
  Progress,
  Dropdown,
  Modal,
  message
} from 'antd';
import {
  FileOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  DragOutlined,
  FolderOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { Document } from '../types/document';

const { Text } = Typography;

interface DocumentListDraggableProps {
  documents: Document[];
  loading?: boolean;
  viewMode?: 'table' | 'grid';
  onDocumentSelect?: (document: Document) => void;
  onDocumentEdit?: (document: Document) => void;
  onDocumentDelete?: (document: Document) => void;
  onDocumentMove?: (documentId: number, targetFolderId: number | null) => void;
  onRefresh?: () => void;
  selectedDocuments?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  enableDragDrop?: boolean;
  style?: React.CSSProperties;
}

const DocumentListDraggable: React.FC<DocumentListDraggableProps> = ({
  documents,
  loading = false,
  viewMode = 'table',
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentMove,
  onRefresh,
  selectedDocuments = [],
  onSelectionChange,
  enableDragDrop = true,
  style
}) => {
  const [draggedDocument, setDraggedDocument] = useState<Document | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<number | null>(null);

  // 获取文档类型图标
  const getDocumentIcon = (document: Document) => {
    switch (document.type) {
      case 'markdown':
        return <FileMarkdownOutlined style={{ color: '#52c41a' }} />;
      case 'text':
        return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <FileOutlined style={{ color: '#666' }} />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (size: number, fileSize?: number) => {
    const displaySize = fileSize || size;
    if (displaySize < 1024) return `${displaySize}B`;
    if (displaySize < 1024 * 1024) return `${(displaySize / 1024).toFixed(1)}KB`;
    return `${(displaySize / (1024 * 1024)).toFixed(1)}MB`;
  };

  // 获取状态标签配置
  const getStatusConfig = (status: string) => {
    const configs = {
      'draft': { color: 'default', text: '草稿' },
      'published': { color: 'success', text: '已发布' },
      'archived': { color: 'warning', text: '已归档' }
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  // 获取可见性标签配置
  const getVisibilityConfig = (visibility: string) => {
    const configs = {
      'private': { color: 'red', text: '私有', icon: '🔒' },
      'team': { color: 'blue', text: '团队', icon: '👥' },
      'public': { color: 'green', text: '公开', icon: '🌍' }
    };
    return configs[visibility as keyof typeof configs] || configs.team;
  };

  // 获取操作菜单项
  const getActionMenuItems = (document: Document): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        label: '查看',
        icon: <EyeOutlined />
      },
      {
        key: 'download',
        label: '下载',
        icon: <DownloadOutlined />
      },
      {
        key: 'share',
        label: '分享',
        icon: <ShareAltOutlined />
      }
    ];

    if (document.can_edit) {
      items.unshift({
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />
      });
    }

    if (document.can_share !== false) { // 假设大多数文档可以删除
      items.push(
        { type: 'divider' },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true
        }
      );
    }

    return items;
  };

  // 处理操作菜单点击
  const handleActionMenuClick = (key: string, document: Document) => {
    switch (key) {
      case 'view':
        window.open(`/documents/${document.id}`, '_blank');
        break;
      case 'edit':
        onDocumentEdit?.(document);
        break;
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除文档 "${document.title}" 吗？此操作不可撤销。`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => onDocumentDelete?.(document)
        });
        break;
      case 'download':
        // TODO: 实现下载功能
        message.info('下载功能开发中...');
        break;
      case 'share':
        // TODO: 实现分享功能
        message.info('分享功能开发中...');
        break;
    }
  };

  // 拖拽开始
  const handleDragStart = (document: Document) => {
    if (!enableDragDrop) return;
    setDraggedDocument(document);
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedDocument(null);
    setDragOverFolder(null);
  };

  // 表格列定义
  const columns: ColumnsType<Document> = [
    {
      title: '文档名称',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text: string, record: Document) => (
        <div
          draggable={enableDragDrop}
          onDragStart={() => handleDragStart(record)}
          onDragEnd={handleDragEnd}
          style={{ cursor: enableDragDrop ? 'grab' : 'default' }}
        >
          <Space>
            {enableDragDrop && <DragOutlined style={{ color: '#ccc' }} />}
            {getDocumentIcon(record)}
            <a onClick={() => onDocumentSelect?.(record)}>{text}</a>
            {record.is_template && <Tag color="orange">模板</Tag>}
          </Space>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const typeMap = {
          'text': { color: 'blue', text: '文本' },
          'markdown': { color: 'green', text: 'MD' },
          'file': { color: 'purple', text: '文件' }
        };
        const config = typeMap[type as keyof typeof typeMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 80,
      render: (visibility: string) => {
        const config = getVisibilityConfig(visibility);
        return (
          <Tooltip title={config.text}>
            <span style={{ fontSize: '14px' }}>{config.icon}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space wrap size="small">
          {tags.slice(0, 2).map(tag => (
            <Tag key={tag} color="blue" style={{ margin: 0 }}>
              {tag}
            </Tag>
          ))}
          {tags.length > 2 && (
            <Tooltip title={tags.slice(2).join(', ')}>
              <Tag color="default" style={{ margin: 0 }}>
                +{tags.length - 2}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'content_size',
      key: 'content_size',
      width: 80,
      render: (size: number, record: Document) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {formatFileSize(size, record.file_size)}
        </Text>
      ),
    },
    {
      title: '关联',
      dataIndex: 'relation_count',
      key: 'relation_count',
      width: 60,
      render: (count: number) => (
        <Tooltip title={`${count} 个关联关系`}>
          <Tag color={count > 0 ? 'blue' : 'default'}>
            {count}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
      render: (name: string) => (
        <Tooltip title={name}>
          <Space size="small">
            <Avatar size="small" style={{ backgroundColor: '#87d068' }}>
              {name?.charAt(0)}
            </Avatar>
            <Text style={{ fontSize: '12px' }}>{name}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record: Document) => (
        <Dropdown
          menu={{
            items: getActionMenuItems(record),
            onClick: ({ key }) => handleActionMenuClick(key, record)
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // 网格视图渲染
  const renderGridView = () => (
    <Row gutter={[16, 16]}>
      {documents.map(doc => (
        <Col xs={24} sm={12} md={8} lg={6} xl={4} key={doc.id}>
          <Card
            hoverable
                        draggable={enableDragDrop}
            onDragStart={() => handleDragStart(doc)}
            onDragEnd={handleDragEnd}
            style={{ 
              cursor: enableDragDrop ? 'grab' : 'default',
              opacity: draggedDocument?.id === doc.id ? 0.5 : 1
            }}
            cover={
              <div style={{ 
                height: 80, 
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ fontSize: 32, color: '#999' }}>
                  {getDocumentIcon(doc)}
                </div>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  {formatFileSize(doc.content_size || 0, doc.file_size)}
                </Text>
              </div>
            }
            actions={[
              doc.can_edit ? (
                <Tooltip title="编辑" key="edit">
                  <EditOutlined onClick={() => onDocumentEdit?.(doc)} />
                </Tooltip>
              ) : (
                <Tooltip title="查看" key="view">
                  <EyeOutlined onClick={() => onDocumentSelect?.(doc)} />
                </Tooltip>
              ),
              <Tooltip title="分享" key="share">
                <ShareAltOutlined />
              </Tooltip>,
              <Dropdown
                key="more"
                menu={{
                  items: getActionMenuItems(doc),
                  onClick: ({ key }) => handleActionMenuClick(key, doc)
                }}
                trigger={['click']}
              >
                <MoreOutlined />
              </Dropdown>
            ]}
          >
            <Card.Meta
              title={
                <Tooltip title={doc.title}>
                  <div style={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '13px'
                  }}>
                    {doc.title}
                  </div>
                </Tooltip>
              }
              description={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    color: '#666'
                  }}>
                    {doc.description || '无描述'}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size="small">
                      <Tag color="blue">{doc.type}</Tag>
                      <Tag color={getStatusConfig(doc.status).color}>
                        {getStatusConfig(doc.status).text}
                      </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {getVisibilityConfig(doc.visibility).icon}
                    </Text>
                  </div>
                  
                  {doc.tags.length > 0 && (
                    <div>
                      {doc.tags.slice(0, 2).map(tag => (
                        <Tag key={tag} color="blue" style={{ fontSize: '10px', margin: '2px 2px 0 0' }}>
                          {tag}
                        </Tag>
                      ))}
                      {doc.tags.length > 2 && (
                        <Tag color="default" style={{ fontSize: '10px', margin: '2px 0 0 0' }}>
                          +{doc.tags.length - 2}
                        </Tag>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {doc.creator_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </Text>
                  </div>
                </Space>
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );

  return (
    <div style={style}>
      {viewMode === 'table' ? (
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
                    scroll={{ x: 1200 }}
          rowSelection={onSelectionChange ? {
            selectedRowKeys: selectedDocuments,
            onChange: (selectedRowKeys: React.Key[]) => {
              onSelectionChange(selectedRowKeys.map(key => Number(key)));
            }
          } : undefined}
          pagination={{
            total: documents.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `显示 ${range[0]}-${range[1]} 条记录，共 ${total} 条`
          }}
        />
      ) : (
        renderGridView()
      )}
    </div>
  );
};

export default DocumentListDraggable;