import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  List,
  Button,
  Typography,
  Space,
  Tag,
  Modal,
  message,
  Badge,
  Grid,
  Drawer,
  FloatButton,
  Avatar,
  Tooltip,
  Row,
  Col
} from 'antd';
import '../styles/mobile-drag-drop.css';
import {
  FileOutlined,
  FolderOutlined,
  DragOutlined,
  MoreOutlined,
  UploadOutlined,
  SearchOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ShareAltOutlined,
  MenuOutlined,
  CloseOutlined,
  CheckOutlined,
  PlusOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { Document, DocumentFolder } from '../types/document';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

interface MobileDragDropProps {
  folderId?: number;
  documents: Document[];
  folders: DocumentFolder[];
  onDocumentMove?: (documentIds: number[], targetFolderId: number) => void;
  onFolderMove?: (folderId: number, targetFolderId: number) => void;
  onDocumentSelect?: (document: Document) => void;
  onFolderSelect?: (folder: DocumentFolder | null) => void;
  onUpload?: () => void;
  onSearch?: () => void;
  loading?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  elementId: number | null;
  elementType: 'document' | 'folder' | null;
}

interface DragPreview {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  type: 'document' | 'folder';
  count: number;
}

const MobileDragDrop: React.FC<MobileDragDropProps> = ({
  folderId,
  documents,
  folders,
  onDocumentMove,
  onFolderMove,
  onDocumentSelect,
  onFolderSelect,
  onUpload,
  onSearch,
  loading = false
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Touch and drag states
  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    elementId: null,
    elementType: null
  });

  const [dragPreview, setDragPreview] = useState<DragPreview>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    type: 'document',
    count: 1
  });

  // Selection states for multi-select
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [actionDrawerVisible, setActionDrawerVisible] = useState(false);
  const [dropTargets, setDropTargets] = useState<Set<number>>(new Set());

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // Touch event handlers
  const handleTouchStart = (event: React.TouchEvent, itemId: number, itemType: 'document' | 'folder') => {
    if (!isMobile) return;

    const touch = event.touches[0];
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: false,
      elementId: itemId,
      elementType: itemType
    });

    // Prevent default to avoid scrolling
    event.preventDefault();
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isMobile || !touchState.elementId) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchState.startX);
    const deltaY = Math.abs(touch.clientY - touchState.startY);
    const threshold = 10;

    // Start dragging if moved beyond threshold
    if (!touchState.isDragging && (deltaX > threshold || deltaY > threshold)) {
      const item = touchState.elementType === 'document' 
        ? documents.find(d => d.id === touchState.elementId)
        : folders.find(f => f.id === touchState.elementId);

      if (item) {
        setTouchState(prev => ({ ...prev, isDragging: true }));
        setDragPreview({
          visible: true,
          x: touch.clientX,
          y: touch.clientY,
          title: touchState.elementType === 'document' ? (item as Document).title : (item as DocumentFolder).name,
          type: touchState.elementType || 'document',
          count: selectedItems.has(touchState.elementId!) ? selectedItems.size : 1
        });

        // Enable haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }

    // Update drag preview position
    if (touchState.isDragging) {
      setTouchState(prev => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY
      }));
      setDragPreview(prev => ({
        ...prev,
        x: touch.clientX,
        y: touch.clientY
      }));

      // Update drop targets
      updateDropTargets(touch.clientX, touch.clientY);
    }

    event.preventDefault();
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!isMobile) return;

    if (touchState.isDragging) {
      // Handle drop
      const touch = event.changedTouches[0];
      handleDrop(touch.clientX, touch.clientY);
    } else if (touchState.elementId) {
      // Handle tap - toggle selection in selection mode or select item
      if (isSelectionMode) {
        toggleItemSelection(touchState.elementId);
      } else {
        // Regular tap - select the item
        const item = touchState.elementType === 'document' 
          ? documents.find(d => d.id === touchState.elementId)
          : folders.find(f => f.id === touchState.elementId);

        if (item) {
          if (touchState.elementType === 'document') {
            onDocumentSelect?.(item as Document);
          } else {
            onFolderSelect?.(item as DocumentFolder);
          }
        }
      }
    }

    // Reset states
    setTouchState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      elementId: null,
      elementType: null
    });
    setDragPreview(prev => ({ ...prev, visible: false }));
    setDropTargets(new Set());

    event.preventDefault();
  };

  // Update drop targets based on current touch position
  const updateDropTargets = (x: number, y: number) => {
    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll('[data-drop-target]');
    const newDropTargets = new Set<number>();

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        const targetId = parseInt(element.getAttribute('data-drop-target') || '0');
        if (targetId) {
          newDropTargets.add(targetId);
        }
      }
    });

    setDropTargets(newDropTargets);
  };

  // Handle drop operation
  const handleDrop = (x: number, y: number) => {
    if (!containerRef.current || !touchState.elementId) return;

    const elements = containerRef.current.querySelectorAll('[data-drop-target]');
    let targetFolderId: number | null = null;

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        targetFolderId = parseInt(element.getAttribute('data-drop-target') || '0');
      }
    });

    if (targetFolderId !== null) {
      if (touchState.elementType === 'document') {
        const documentIds = selectedItems.has(touchState.elementId) 
          ? Array.from(selectedItems)
          : [touchState.elementId];
        onDocumentMove?.(documentIds, targetFolderId);
        message.success(`移动了 ${documentIds.length} 个文档`);
      } else if (touchState.elementType === 'folder') {
        onFolderMove?.(touchState.elementId, targetFolderId);
        message.success('文件夹移动成功');
      }

      // Clear selection after move
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Enter/exit selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedItems(new Set());
    }
  };

  // Long press handler for entering selection mode
  const handleLongPress = (itemId: number) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedItems(new Set([itemId]));
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      message.info('已进入选择模式');
    }
  };

  // Get file type icon
  const getFileTypeIcon = (document: Document) => {
    const fileName = document.title.toLowerCase();
    if (fileName.endsWith('.pdf')) {
      return <FileOutlined style={{ color: '#ff4d4f' }} />;
    }
    if (fileName.includes('image') || fileName.endsWith('.png') || fileName.endsWith('.jpg')) {
      return <FileOutlined style={{ color: '#fa8c16' }} />;
    }
    return <FileOutlined style={{ color: '#1890ff' }} />;
  };

  // Render folder item
  const renderFolderItem = (folder: DocumentFolder) => {
    const isSelected = selectedItems.has(folder.id);
    const isDropTarget = dropTargets.has(folder.id);

    return (
      <List.Item
        key={folder.id}
        data-drop-target={folder.id}
        className={`mobile-drag-item ${isDropTarget ? 'drop-target' : ''} ${isSelected ? 'selected' : ''}`}
        style={{
          backgroundColor: isDropTarget ? '#e6f7ff' : isSelected ? '#f0f0f0' : 'transparent',
          border: isDropTarget ? '2px dashed #1890ff' : '1px solid #f0f0f0',
          borderRadius: 8,
          margin: '8px 0',
          padding: 12,
          position: 'relative'
        }}
        onTouchStart={(e) => handleTouchStart(e, folder.id, 'folder')}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <List.Item.Meta
          avatar={
            <div style={{ position: 'relative' }}>
              <Avatar 
                size="large" 
                style={{ backgroundColor: folder.color || '#1890ff' }}
                icon={<FolderOutlined />}
              />
              {isSelectionMode && (
                <div
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: isSelected ? '#52c41a' : '#d9d9d9',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                >
                  {isSelected ? <CheckOutlined /> : null}
                </div>
              )}
            </div>
          }
          title={
            <Space>
              <Text strong>{folder.name}</Text>
              <Badge count={folder.documents_count} size="small" />
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {folder.documents_count} 个文档 · {folder.subfolders_count} 个子文件夹
              </Text>
              <Space size={4}>
                <Tag color={folder.visibility === 'public' ? 'green' : 'blue'}>
                  {folder.visibility === 'public' ? '公开' : '团队'}
                </Tag>
              </Space>
            </Space>
          }
        />
      </List.Item>
    );
  };

  // Render document item
  const renderDocumentItem = (document: Document) => {
    const isSelected = selectedItems.has(document.id);

    return (
      <List.Item
        key={document.id}
        className={`mobile-drag-item ${isSelected ? 'selected' : ''}`}
        style={{
          backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          margin: '8px 0',
          padding: 12,
          position: 'relative'
        }}
        onTouchStart={(e) => handleTouchStart(e, document.id, 'document')}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <List.Item.Meta
          avatar={
            <div style={{ position: 'relative' }}>
              <Avatar 
                size="large" 
                style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                icon={getFileTypeIcon(document)}
              />
              {isSelectionMode && (
                <div
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: isSelected ? '#52c41a' : '#d9d9d9',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                >
                  {isSelected ? <CheckOutlined /> : null}
                </div>
              )}
            </div>
          }
          title={
            <Text strong ellipsis style={{ fontSize: 14 }}>
              {document.title}
            </Text>
          }
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                {document.description || '无描述'}
              </Text>
              <Space size={4}>
                <Tag color={document.status === 'published' ? 'green' : 'orange'}>
                  {document.status === 'published' ? '已发布' : '草稿'}
                </Tag>
                <Tag color="blue">
                  {document.type === 'markdown' ? 'MD' : document.type}
                </Tag>
              </Space>
            </Space>
          }
        />
      </List.Item>
    );
  };

  // Mobile-specific styles
  const mobileStyles = {
    container: {
      padding: isMobile ? '8px' : '16px',
      minHeight: '60vh'
    },
    header: {
      position: 'sticky' as const,
      top: 0,
      backgroundColor: 'white',
      zIndex: 10,
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0'
    },
    dragPreview: {
      position: 'fixed' as const,
      left: dragPreview.x - 40,
      top: dragPreview.y - 40,
      zIndex: 1000,
      pointerEvents: 'none' as const,
      transform: touchState.isDragging ? 'scale(1.1)' : 'scale(1)',
      transition: 'transform 0.2s ease',
    }
  };

  if (!isMobile) {
    // Return null or a desktop version
    return null;
  }

  return (
    <div ref={containerRef} style={mobileStyles.container}>
      {/* Mobile Header */}
      <div style={mobileStyles.header}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              {folderId && (
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => onFolderSelect?.(null)}
                />
              )}
              <Title level={5} style={{ margin: 0 }}>
                {folderId ? '文档列表' : '根目录'}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type={isSelectionMode ? 'primary' : 'text'}
                icon={isSelectionMode ? <CloseOutlined /> : <MenuOutlined />}
                onClick={toggleSelectionMode}
              />
              <Button
                type="text"
                icon={<MoreOutlined />}
                onClick={() => setActionDrawerVisible(true)}
              />
            </Space>
          </Col>
        </Row>

        {/* Selection mode toolbar */}
        {isSelectionMode && selectedItems.size > 0 && (
          <Row justify="space-between" align="middle" style={{ marginTop: 8 }}>
            <Col>
              <Text type="secondary">已选择 {selectedItems.size} 项</Text>
            </Col>
            <Col>
              <Space>
                <Button size="small" icon={<DeleteOutlined />} danger>
                  删除
                </Button>
                <Button size="small" icon={<ShareAltOutlined />}>
                  分享
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </div>

      {/* Content List */}
      <List
        loading={loading}
        dataSource={[...folders, ...documents]}
        renderItem={(item) => {
          if ('documents_count' in item) {
            return renderFolderItem(item as DocumentFolder);
          } else {
            return renderDocumentItem(item as Document);
          }
        }}
        style={{ marginTop: 16 }}
      />

      {/* Drag Preview */}
      {dragPreview.visible && (
        <div ref={dragPreviewRef} style={mobileStyles.dragPreview}>
          <Card
            size="small"
            style={{
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(24, 144, 255, 0.9)',
              color: 'white',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {dragPreview.type === 'document' ? <FileOutlined /> : <FolderOutlined />}
              <div style={{ fontSize: 10, marginTop: 4 }}>
                {dragPreview.count > 1 ? `${dragPreview.count} 项` : dragPreview.title.slice(0, 6) + '...'}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Action Buttons */}
      <FloatButton.Group
        trigger="hover"
        type="primary"
        style={{ right: 16, bottom: 16 }}
        icon={<PlusOutlined />}
      >
        <FloatButton
          icon={<UploadOutlined />}
          tooltip="上传文档"
          onClick={onUpload}
        />
        <FloatButton
          icon={<SearchOutlined />}
          tooltip="搜索"
          onClick={onSearch}
        />
        <FloatButton
          icon={<FolderOutlined />}
          tooltip="新建文件夹"
        />
      </FloatButton.Group>

      {/* Action Drawer */}
      <Drawer
        title="操作菜单"
        placement="bottom"
        open={actionDrawerVisible}
        onClose={() => setActionDrawerVisible(false)}
        height={300}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            block
            icon={<UploadOutlined />}
            onClick={() => {
              onUpload?.();
              setActionDrawerVisible(false);
            }}
          >
            上传文档
          </Button>
          <Button
            block
            icon={<SearchOutlined />}
            onClick={() => {
              onSearch?.();
              setActionDrawerVisible(false);
            }}
          >
            搜索文档
          </Button>
          <Button
            block
            icon={<FilterOutlined />}
          >
            筛选
          </Button>
          <Button
            block
            icon={<MenuOutlined />}
            onClick={() => {
              toggleSelectionMode();
              setActionDrawerVisible(false);
            }}
          >
            {isSelectionMode ? '退出选择' : '批量选择'}
          </Button>
        </Space>
      </Drawer>

      {/* CSS for mobile drag and drop */}
      <style>{`
        .mobile-drag-item {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          transition: all 0.2s ease;
        }
        
        .mobile-drag-item.selected {
          transform: scale(0.98);
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        }
        
        .mobile-drag-item.drop-target {
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        @media (max-width: 768px) {
          .ant-card {
            margin: 8px 0;
          }
          
          .ant-list-item {
            padding: 12px !important;
          }
          
          .ant-list-item-meta-avatar {
            margin-right: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileDragDrop;