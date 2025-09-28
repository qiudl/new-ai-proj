/**
 * 文档网格视图组件
 * 提供卡片式的文档展示，支持拖拽排序
 */

import React from 'react';
import {
  Card,
  Space,
  Tag,
  Badge,
  Button,
  Typography,
  Checkbox,
  Tooltip,
  Popconfirm,
  message
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  StarFilled,
  MoreOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
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
  rectSortingStrategy,

  useSortable} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Document } from '../types/document';

const { Text } = Typography;

// 文档类型图标配置
const DOCUMENT_TYPE_ICONS = {
  markdown: <FileMarkdownOutlined style={{ color: '#1890ff', fontSize: '24px' }} />,
  html: <FileTextOutlined style={{ color: '#52c41a', fontSize: '24px' }} />,
  text: <FileTextOutlined style={{ color: '#666', fontSize: '24px' }} />,
  json: <FileTextOutlined style={{ color: '#722ed1', fontSize: '24px' }} />,
  code: <FileTextOutlined style={{ color: '#13c2c2', fontSize: '24px' }} />,
  pdf: <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />,
  word: <FileWordOutlined style={{ color: '#1890ff', fontSize: '24px' }} />,
  excel: <FileTextOutlined style={{ color: '#52c41a', fontSize: '24px' }} />,
  image: <FileTextOutlined style={{ color: '#fa8c16', fontSize: '24px' }} />
};

// 文档类型配置
const DOCUMENT_TYPES = {
  markdown: { label: 'Markdown', color: 'blue', icon: '📝' },
  html: { label: 'HTML', color: 'green', icon: '🌐' },
  text: { label: 'Text', color: 'default', icon: '📄' },
  json: { label: 'JSON', color: 'purple', icon: '⚙️' },
  code: { label: 'Code', color: 'cyan', icon: '💻' },
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

// 可拖拽的文档卡片组件
interface SortableDocumentCardProps {
  document: Document;
  isSelected: boolean;
  isSelectMode: boolean;
  onSelect: (document: Document) => void;
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
  onToggleSelection: (documentId: number) => void;
}

const SortableDocumentCard: React.FC<SortableDocumentCardProps> = ({
  document,
  isSelected,
  isSelectMode,
  onSelect,
  onEdit,
  onDelete,
  onToggleSelection
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

  const handleCopyDocument = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 触发复制事件
    const event = new CustomEvent('copyDocument', { detail: document });
    window.dispatchEvent(event);
    message.success(`文档"${document.title}"复制成功`);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        hoverable
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          border: isDragging ? '2px dashed #1890ff' : isSelected ? '2px solid #1890ff' : undefined,
          position: 'relative',
        }}
        actions={[
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(document);
              }}
            />
          </Tooltip>,
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(document);
              }}
            />
          </Tooltip>,
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopyDocument}
            />
          </Tooltip>,
          <Tooltip title="删除">
            <Popconfirm
              title="确认删除"
              description={`确定要删除文档"${document.title}"吗？`}
              onConfirm={(e) => {
                e?.stopPropagation();
                onDelete(document);
              }}
              okText="删除"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        ]}
        {...listeners}
      >
        {/* 选择模式下的复选框 */}
        {isSelectMode && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10
          }}>
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection(document.id);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <Card.Meta
          avatar={
            <div style={{ fontSize: '24px' }}>
              {DOCUMENT_TYPE_ICONS[document.type] || DOCUMENT_TYPE_ICONS.text}
            </div>
          }
          title={
            <div style={{ paddingRight: isSelectMode ? 32 : 0 }}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text 
                    strong 
                    style={{ 
                      fontSize: '16px',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={document.title}
                  >
                    {document.title}
                  </Text>
                  {document.is_favorite && (
                    <StarFilled style={{ color: '#faad14', fontSize: '14px' }} />
                  )}
                </div>
                {document.is_template && (
                  <Tag color="purple">模板</Tag>
                )}
              </Space>
            </div>
          }
          description={
            <div>
              {document.description && (
                <div style={{ marginBottom: 8 }}>
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: '12px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {document.description}
                  </Text>
                </div>
              )}
              
              <div style={{ marginBottom: 8 }}>
                <Space wrap>
                  <Badge 
                    status={DOCUMENT_STATUS[document.status]?.color as unknown} 
                    text={
                      <Text style={{ fontSize: '12px' }}>
                        {DOCUMENT_STATUS[document.status]?.label}
                      </Text>
                    }
                  />
                  {document.folder_name && (
                    <Tag color="green" style={{ fontSize: '11px' }}>
                      📁 {document.folder_name}
                    </Tag>
                  )}
                  {document.project_name && (
                    <Tag color="blue" style={{ fontSize: '11px' }}>
                      🏗️ {document.project_name}
                    </Tag>
                  )}
                </Space>
              </div>
              
              {document.tags && document.tags.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <Space wrap>
                    {document.tags.slice(0, 3).map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {document.tags.length > 3 && (
                      <Tag>+{document.tags.length - 3}</Tag>
                    )}
                  </Space>
                </div>
              )}
              
              <div style={{ marginTop: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {document.owner_name || '未知'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {new Date(document.updated_at).toLocaleDateString()}
                  </Text>
                </Space>
              </div>
            </div>
          }
        />
      </Card>
    </div>
  );
};

interface DocumentGridViewProps {
  documents: Document[];
  selectedDocuments: number[];
  isSelectMode: boolean;
  onDocumentSelect: (document: Document) => void;
  onDocumentEdit: (document: Document) => void;
  onDocumentDelete: (documentId: number) => void;
  onToggleSelection: (documentId: number) => void;
  
  // 高级功能
  enableVersionControl?: boolean;
  enableGoogleDocsIntegration?: boolean;
  onVersionControl?: (document: Document) => void;
  onExportToGoogleDocs?: (document: Document) => Promise<void>;
}

const DocumentGridView: React.FC<DocumentGridViewProps> = ({
  documents,
  selectedDocuments,
  isSelectMode,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onToggleSelection
}) => {
  const [sortedDocuments, setSortedDocuments] = React.useState<Document[]>(documents);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 更新文档列表
  React.useEffect(() => {
    setSortedDocuments(documents);
  }, [documents]);

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSortedDocuments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 这里可以调用API保存新的排序
        ));
        
        return newItems;
      });
    }
  };

  const handleDeleteDocument = (document: Document) => {
    onDocumentDelete(document.id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedDocuments.map(doc => doc.id)}
        strategy={rectSortingStrategy}
      >
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 16,
          minHeight: '200px'
        }}>
          {sortedDocuments.map(doc => (
            <SortableDocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedDocuments.includes(doc.id)}
              isSelectMode={isSelectMode}
              onSelect={onDocumentSelect}
              onEdit={onDocumentEdit}
              onDelete={handleDeleteDocument}
              onToggleSelection={onToggleSelection}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DocumentGridView;