/**
 * 文档缩略图画廊组件
 * 以网格形式显示文档缩略图
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Spin,
  Empty,
  Input,
  Select,
  Tooltip,
  Badge,
  message,
  Dropdown,
  Modal
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  BarsOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Document, DocumentType } from '../types/document';
import DocumentPreview from './DocumentPreview';
import documentPreviewService, { ThumbnailResult } from '../services/documentPreviewService';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface DocumentThumbnailGalleryProps {
  documents: Document[];
  loading?: boolean;
  columns?: number;
  showSearch?: boolean;
  showFilter?: boolean;
  showControls?: boolean;
  thumbnailSize?: 'small' | 'medium' | 'large';
  onDocumentClick?: (document: Document) => void;
  onDocumentEdit?: (document: Document) => void;
  onDocumentDelete?: (document: Document) => void;
  onDocumentDownload?: (document: Document) => void;
}

interface ThumbnailState {
  thumbnails: Map<number, ThumbnailResult>;
  generating: Set<number>;
  errors: Set<number>;
}

const DocumentThumbnailGallery: React.FC<DocumentThumbnailGalleryProps> = ({
  documents,
  loading = false,
  columns = 4,
  showSearch = true,
  showFilter = true,
  showControls = true,
  thumbnailSize = 'medium',
  onDocumentClick,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentDownload
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>({
    thumbnails: new Map(),
    generating: new Set(),
    errors: new Set()
  });

  // 缩略图尺寸配置
  const thumbnailSizes = {
    small: { width: 150, height: 110, cardHeight: 200 },
    medium: { width: 200, height: 150, cardHeight: 260 },
    large: { width: 250, height: 190, cardHeight: 320 }
  };

  const currentSize = thumbnailSizes[thumbnailSize];

  // 过滤文档
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchText || 
        doc.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesType = selectedType === 'all' || doc.type === selectedType;
      
      return matchesSearch && matchesType;
    });
  }, [documents, searchText, selectedType]);

  // 获取文档类型列表
  const documentTypes = useMemo(() => {
    const types = new Set(documents.map(doc => doc.type));
    return Array.from(types).sort();
  }, [documents]);

  // 生成缩略图
  const generateThumbnail = async (document: Document) => {
    if (thumbnailState.thumbnails.has(document.id) || 
        thumbnailState.generating.has(document.id)) {
      return;
    }

    setThumbnailState(prev => ({
      ...prev,
      generating: new Set([...prev.generating, document.id]),
      errors: new Set([...prev.errors].filter(id => id !== document.id))
    }));

    try {
      const thumbnail = await documentPreviewService.generateThumbnail(document, {
        width: currentSize.width,
        height: currentSize.height,
        quality: 0.8,
        format: 'png'
      });

      setThumbnailState(prev => ({
        ...prev,
        thumbnails: new Map([...prev.thumbnails, [document.id, thumbnail]]),
        generating: new Set([...prev.generating].filter(id => id !== document.id))
      }));
    } catch (error) {
      console.error(`生成文档 ${document.id} 缩略图失败:`, error);
      setThumbnailState(prev => ({
        ...prev,
        generating: new Set([...prev.generating].filter(id => id !== document.id)),
        errors: new Set([...prev.errors, document.id])
      }));
    }
  };

  // 批量生成缩略图
  const generateAllThumbnails = async () => {
    const documentsToGenerate = filteredDocuments.filter(doc => 
      !thumbnailState.thumbnails.has(doc.id) && 
      !thumbnailState.generating.has(doc.id)
    );

    if (documentsToGenerate.length === 0) {
      message.info('所有缩略图已生成');
      return;
    }

    message.loading({ content: '正在生成缩略图...', key: 'thumbnail-generation' });

    try {
      const results = await documentPreviewService.generateThumbnailsBatch(
        documentsToGenerate,
        {
          width: currentSize.width,
          height: currentSize.height,
          quality: 0.8,
          format: 'png'
        },
        (completed, total) => {
          message.loading({ 
            content: `正在生成缩略图... ${completed}/${total}`, 
            key: 'thumbnail-generation' 
          });
        }
      );

      setThumbnailState(prev => ({
        ...prev,
        thumbnails: new Map([...prev.thumbnails, ...results])
      }));

      message.success({ 
        content: `成功生成 ${results.size} 个缩略图`, 
        key: 'thumbnail-generation' 
      });
    } catch (error) {
      console.error('批量生成缩略图失败:', error);
      message.error({ 
        content: '批量生成缩略图失败', 
        key: 'thumbnail-generation' 
      });
    }
  };

  // 组件挂载时生成可见文档的缩略图
  useEffect(() => {
    const visibleDocuments = filteredDocuments.slice(0, 12); // 只生成前12个
    visibleDocuments.forEach(doc => {
      generateThumbnail(doc);
    });
  }, [filteredDocuments]);

  // 渲染文档操作菜单
  const renderDocumentMenu = (document: Document) => {
    const menuItems = [
      {
        key: 'preview',
        icon: <EyeOutlined />,
        label: '预览',
        onClick: () => setPreviewDocument(document)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => onDocumentEdit?.(document)
      },
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: '下载',
        onClick: () => onDocumentDownload?.(document)
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => onDocumentDelete?.(document)
      }
    ];

    return {
      items: menuItems,
      onClick: ({ key }: any) => {
        const item = menuItems.find(item => item.key === key);
        item?.onClick();
      }
    };
  };

  // 渲染缩略图卡片
  const renderThumbnailCard = (document: Document) => {
    const thumbnail = thumbnailState.thumbnails.get(document.id);
    const isGenerating = thumbnailState.generating.has(document.id);
    const hasError = thumbnailState.errors.has(document.id);

    return (
      <Card
        key={document.id}
        hoverable
        style={{ 
          height: currentSize.cardHeight,
          marginBottom: 16
        }}
        cover={
          <div 
            style={{ 
              height: currentSize.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fafafa',
              cursor: 'pointer'
            }}
            onClick={() => onDocumentClick?.(document)}
          >
            {isGenerating ? (
              <Spin size="large" />
            ) : thumbnail ? (
              <img
                src={thumbnail.url}
                alt={document.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : hasError ? (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
                <div style={{ fontSize: '12px' }}>预览失败</div>
                <Button 
                   
                  type="link"
                  onClick={(e) => {
                    e.stopPropagation();
                    generateThumbnail(document);
                  }}
                >
                  重试
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '12px' }}>点击生成预览</div>
              </div>
            )}
          </div>
        }
        actions={showControls ? [
          <Tooltip key="preview" title="预览">
            <EyeOutlined onClick={() => setPreviewDocument(document)} />
          </Tooltip>,
          <Tooltip key="edit" title="编辑">
            <EditOutlined onClick={() => onDocumentEdit?.(document)} />
          </Tooltip>,
          <Dropdown key="more" menu={renderDocumentMenu(document)} trigger={['click']}>
            <MoreOutlined />
          </Dropdown>
        ] : undefined}
      >
        <Card.Meta
          title={
            <Tooltip title={document.title}>
              <Text ellipsis style={{ fontSize: '14px' }}>
                {document.title}
              </Text>
            </Tooltip>
          }
          description={
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Badge 
                color={getDocumentTypeColor(document.type)} 
                text={document.type.toUpperCase()}
                style={{ fontSize: '11px' }}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {new Date(document.updated_at).toLocaleDateString()}
              </Text>
              {document.description && (
                <Tooltip title={document.description}>
                  <Text 
                    type="secondary" 
                    ellipsis 
                    style={{ fontSize: '11px', height: '16px' }}
                  >
                    {document.description}
                  </Text>
                </Tooltip>
              )}
            </Space>
          }
        />
      </Card>
    );
  };

  // 渲染列表项
  const renderListItem = (document: Document) => {
    const thumbnail = thumbnailState.thumbnails.get(document.id);
    const isGenerating = thumbnailState.generating.has(document.id);

    return (
      <Card 
        key={document.id}
        style={{ marginBottom: 8 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 小缩略图 */}
          <div 
            style={{ 
              width: 60,
              height: 45,
              background: '#fafafa',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isGenerating ? (
              <Spin  />
            ) : thumbnail ? (
              <img
                src={thumbnail.url}
                alt={document.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 4
                }}
              />
            ) : (
              <Text style={{ fontSize: '16px' }}>📄</Text>
            )}
          </div>

          {/* 文档信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong ellipsis style={{ flex: 1 }}>
                {document.title}
              </Text>
              <Badge 
                color={getDocumentTypeColor(document.type)} 
                text={document.type.toUpperCase()}
                style={{ fontSize: '10px' }}
              />
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              更新于 {new Date(document.updated_at).toLocaleString()}
            </Text>
          </div>

          {/* 操作按钮 */}
          {showControls && (
            <Space>
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                
                onClick={() => setPreviewDocument(document)}
              />
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                
                onClick={() => onDocumentEdit?.(document)}
              />
              <Dropdown menu={renderDocumentMenu(document)} trigger={['click']}>
                <Button type="text" icon={<MoreOutlined />}  />
              </Dropdown>
            </Space>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* 工具栏 */}
      {(showSearch || showFilter || showControls) && (
        <div style={{ 
          marginBottom: 16, 
          padding: '16px 0',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Row gutter={[16, 16]} align="middle">
            {/* 搜索 */}
            {showSearch && (
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="搜索文档标题或描述..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
              </Col>
            )}

            {/* 类型过滤 */}
            {showFilter && (
              <Col xs={12} sm={6} md={4}>
                <Select
                  style={{ width: '100%' }}
                  value={selectedType}
                  onChange={setSelectedType}
                  placeholder="类型"
                >
                  <Option value="all">所有类型</Option>
                  {documentTypes.map(type => (
                    <Option key={type} value={type}>
                      {type.toUpperCase()}
                    </Option>
                  ))}
                </Select>
              </Col>
            )}

            {/* 控制按钮 */}
            {showControls && (
              <Col xs={12} sm={6} md={12} style={{ textAlign: 'right' }}>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={generateAllThumbnails}
                    
                  >
                    生成缩略图
                  </Button>
                  <Button.Group >
                    <Button
                      icon={<AppstoreOutlined />}
                      type={viewMode === 'grid' ? 'primary' : 'default'}
                      onClick={() => setViewMode('grid')}
                    />
                    <Button
                      icon={<BarsOutlined />}
                      type={viewMode === 'list' ? 'primary' : 'default'}
                      onClick={() => setViewMode('list')}
                    />
                  </Button.Group>
                </Space>
              </Col>
            )}
          </Row>
        </div>
      )}

      {/* 文档列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Empty
          description="没有找到文档"
          style={{ padding: '40px 0' }}
        />
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredDocuments.map(document => (
            <Col
              key={document.id}
              xs={24}
              sm={12}
              md={24 / columns}
              lg={24 / columns}
              xl={24 / columns}
            >
              {renderThumbnailCard(document)}
            </Col>
          ))}
        </Row>
      ) : (
        <div>
          {filteredDocuments.map(document => renderListItem(document))}
        </div>
      )}

      {/* 预览模态框 */}
      {previewDocument && (
        <Modal
          title={
            <Space>
              <EyeOutlined />
              <span>文档预览</span>
              <Text type="secondary">{previewDocument.title}</Text>
            </Space>
          }
          open={!!previewDocument}
          onCancel={() => setPreviewDocument(null)}
          width="90%"
          style={{ top: 20 }}
          footer={[
            <Button key="close" onClick={() => setPreviewDocument(null)}>
              关闭
            </Button>,
            <Button 
              key="edit" 
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                onDocumentEdit?.(previewDocument);
                setPreviewDocument(null);
              }}
            >
              编辑文档
            </Button>
          ]}
        >
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <DocumentPreview
              document={previewDocument}
              height="calc(100vh - 250px)"
              showTitle={true}
              showMetadata={true}
              showControls={true}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

// 获取文档类型颜色
const getDocumentTypeColor = (type: DocumentType): string => {
  const colorMap: Record<DocumentType, string> = {
    'markdown': 'blue',
    'html': 'green',
    'text': 'default',
    'json': 'purple',
    'code': 'cyan',
    'pdf': 'red',
    'word': 'blue',
    'excel': 'green',
    'image': 'orange'
  };
  return colorMap[type] || 'default';
};

export default DocumentThumbnailGallery;