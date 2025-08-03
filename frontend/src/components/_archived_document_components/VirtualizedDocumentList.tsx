/**
 * 虚拟化文档列表组件
 * 支持大量数据的高性能渲染
 */

import React, { useMemo, useRef, useCallback, useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Avatar,
  Tag,
  Badge,
  Button,
  Checkbox,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  StarFilled,
  MoreOutlined,
  CopyOutlined,
  FolderOutlined,
  ProjectOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import { Document, DocumentListItem } from '../types/document';
import { documentManagerPerf } from '../utils/documentManagerPerformance';
// import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';

// 临时类型定义，直到安装依赖包
interface ListChildComponentProps {
  index: number;
  style: React.CSSProperties;
  data?: any;
}

class List extends React.Component<any> {
  scrollToItem = (index: number, align?: string) => {
    // Mock implementation
    };
  
  scrollTo = (scrollOffset: number) => {
    // Mock implementation  
    };
  
  render() {
    return <div {...this.props}>{this.props.children}</div>;
  }
}
const AutoSizer = ({ children }: any) => children({ height: 400, width: 800 });

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

interface VirtualizedDocumentListProps {
  documents: (Document | DocumentListItem)[];
  loading: boolean;
  height: number;
  itemHeight: number;
  selectedDocuments?: number[];
  isSelectMode?: boolean;
  mode: 'simple' | 'advanced';
  showProject?: boolean;
  onDocumentSelect: (document: Document | DocumentListItem) => void;
  onDocumentEdit: (document: Document | DocumentListItem) => void;
  onDocumentDelete: (documentId: number) => void;
  onToggleSelection?: (documentId: number) => void;
  overscan?: number; // 预渲染项目数量
  
  // 高级功能
  enableVersionControl?: boolean;
  enableGoogleDocsIntegration?: boolean;
  onVersionControl?: (document: Document) => void;
  onExportToGoogleDocs?: (document: Document) => Promise<void>;
}

// 虚拟化列表项组件
const VirtualizedListItem: React.FC<ListChildComponentProps> = ({ index, style, data }) => {
  const {
    documents,
    selectedDocuments,
    isSelectMode,
    mode,
    showProject,
    onDocumentSelect,
    onDocumentEdit,
    onDocumentDelete,
    onToggleSelection
  } = data;

  const document = documents[index];
  const isSelected = selectedDocuments?.includes(document.id) || false;

  const handleClick = useCallback(() => {
    onDocumentSelect(document);
  }, [document, onDocumentSelect]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDocumentEdit(document);
  }, [document, onDocumentEdit]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDocumentDelete(document.id);
  }, [document.id, onDocumentDelete]);

  const handleToggleSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(document.id);
  }, [document.id, onToggleSelection]);

  // 简洁模式渲染
  if (mode === 'simple') {
    return (
      <div style={{ ...style, padding: '0 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
            cursor: 'pointer',
            backgroundColor: isSelected ? '#e6f7ff' : 'transparent'
          }}
          onClick={handleClick}
        >
          {isSelectMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleToggleSelection(e as unknown)}
              style={{ marginRight: 12 }}
            />
          )}
          
          <div style={{ marginRight: 12, fontSize: '18px' }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong ellipsis style={{ maxWidth: 300 }}>
                {document.title}
              </Text>
              {(document as Document).is_favorite && (
                <StarFilled style={{ color: '#faad14', fontSize: '14px' }} />
              )}
            </div>
            
            {showProject && 'project_name' in document && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                项目: {document.project_name || '未知项目'}
              </Text>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px', minWidth: 100 }}>
              {'creator_name' in document ? document.creator_name : (document as Document).owner_name}
            </Text>
            
            <Text type="secondary" style={{ fontSize: '12px', minWidth: 120 }}>
              {new Date(document.updated_at).toLocaleDateString()}
            </Text>
            
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={handleEdit}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              />
            </Space>
          </div>
        </div>
      </div>
    );
  }

  // 高级模式渲染
  const doc = document as Document;
  return (
    <div style={{ ...style, padding: '0 16px' }}>
      <Card
        size="small"
        style={{
          cursor: 'pointer',
          border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
          marginBottom: 8
        }}
        onClick={handleClick}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isSelectMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleToggleSelection(e as unknown)}
              style={{ marginRight: 12 }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          <div style={{ marginRight: 12, fontSize: '20px' }}>
            {DOCUMENT_TYPE_ICONS[doc.type] || DOCUMENT_TYPE_ICONS.text}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong ellipsis style={{ maxWidth: 250 }}>
                {doc.title}
              </Text>
              {doc.is_favorite && (
                <StarFilled style={{ color: '#faad14', fontSize: '14px' }} />
              )}
              {doc.is_template && (
                <Tag color="purple">模板</Tag>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Badge 
                status={DOCUMENT_STATUS[doc.status]?.color as unknown} 
                text={
                  <Text style={{ fontSize: '12px' }}>
                    {DOCUMENT_STATUS[doc.status]?.label}
                  </Text>
                }
              />
              {doc.folder_name && (
                <Tag color="green" style={{ fontSize: '11px' }}>
                  <FolderOutlined style={{ marginRight: 4 }} />
                  {doc.folder_name}
                </Tag>
              )}
              {doc.project_name && showProject && (
                <Tag color="blue" style={{ fontSize: '11px' }}>
                  <ProjectOutlined style={{ marginRight: 4 }} />
                  {doc.project_name}
                </Tag>
              )}
            </div>
            
            {doc.description && (
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {doc.description}
              </Text>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text style={{ fontSize: '12px' }}>{doc.owner_name}</Text>
            </div>
            
            <Text type="secondary" style={{ fontSize: '12px', minWidth: 80 }}>
              {new Date(doc.updated_at).toLocaleDateString()}
            </Text>
            
            <Space size="small">
              <Tooltip title="查看">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentSelect(doc);
                  }}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                />
              </Tooltip>
              <Tooltip title="复制">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 复制文档逻辑
                    }}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                />
              </Tooltip>
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Space>
          </div>
        </div>
      </Card>
    </div>
  );
};

const VirtualizedDocumentList: React.FC<VirtualizedDocumentListProps> = ({
  documents,
  loading,
  height,
  itemHeight,
  selectedDocuments = [],
  isSelectMode = false,
  mode,
  showProject = false,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onToggleSelection,
  overscan = 5
}) => {
  const listRef = useRef<List>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // 性能监控
  const renderStart = useRef<string>('');

  const itemData = useMemo(() => ({
    documents,
    selectedDocuments,
    isSelectMode,
    mode,
    showProject,
    onDocumentSelect,
    onDocumentEdit,
    onDocumentDelete,
    onToggleSelection
  }), [
    documents,
    selectedDocuments,
    isSelectMode,
    mode,
    showProject,
    onDocumentSelect,
    onDocumentEdit,
    onDocumentDelete,
    onToggleSelection
  ]);

  // 滚动到指定项目
  const scrollToItem = useCallback((index: number, align: 'auto' | 'smart' | 'center' | 'end' | 'start' = 'auto') => {
    listRef.current?.scrollToItem(index, align);
  }, []);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    listRef.current?.scrollTo(0);
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    setScrollOffset(scrollOffset);
  }, []);

  // 性能监控包装的渲染函数
  const renderList = useCallback(() => {
    return documentManagerPerf.measureDocumentListRender(
      () => (
        <AutoSizer>
          {({ height: autoHeight, width }: any) => (
            <List
              ref={listRef}
              height={autoHeight}
              width={width}
              itemCount={documents.length}
              itemSize={itemHeight}
              itemData={itemData}
              overscanCount={overscan}
              onScroll={handleScroll}
            >
              {VirtualizedListItem}
            </List>
          )}
        </AutoSizer>
      ),
      documents.length,
      mode
    );
  }, [documents.length, itemHeight, itemData, overscan, handleScroll, mode]);

  if (loading) {
    return (
      <div 
        style={{ 
          height, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>加载文档中...</Text>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div 
        style={{ 
          height, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        <Empty 
          description="暂无文档" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div style={{ height, position: 'relative' }}>
      {renderList()}
      
      {/* 滚动指示器 */}
      {documents.length > 50 && (
        <div 
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10
          }}
        >
          {Math.round((scrollOffset / (documents.length * itemHeight)) * 100)}%
        </div>
      )}
      
      {/* 快速回到顶部按钮 */}
      {scrollOffset > 1000 && (
        <Button
          type="primary"
          shape="circle"
          icon="↑"
          size="large"
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 10
          }}
          onClick={scrollToTop}
        />
      )}
      
      {/* 性能指示器（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            zIndex: 10
          }}
        >
          渲染: {documents.length} 项
        </div>
      )}
    </div>
  );
};

export default VirtualizedDocumentList;

// 导出相关工具函数
export { VirtualizedDocumentList };

// 预设配置
export const VIRTUALIZED_CONFIGS = {
  // 简洁模式配置
  simple: {
    itemHeight: 60,
    overscan: 5
  },
  // 高级模式配置
  advanced: {
    itemHeight: 120,
    overscan: 3
  },
  // 紧凑模式配置
  compact: {
    itemHeight: 40,
    overscan: 8
  }
};