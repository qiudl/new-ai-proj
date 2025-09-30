import React, { useState, useCallback } from 'react';
import { Button, Tooltip, Tag } from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';
import { DocumentInfo } from './DocumentSidebar';

export interface DocumentCardProps {
  document: DocumentInfo;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  className?: string;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  isSelected,
  isLoading,
  onSelect,
  onEdit,
  onDelete,
  onPreview,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setShowActions(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // 延迟隐藏操作按钮，给用户时间点击
    setTimeout(() => setShowActions(false), 200);
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // 格式化更新时间
  const formatUpdateTime = useCallback((timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return '刚刚更新';
    if (diffHours < 24) return `${diffHours}小时前更新`;
    if (diffDays < 7) return `${diffDays}天前更新`;
    return updateTime.toLocaleDateString('zh-CN');
  }, []);

  // 获取文件图标
  const getFileIcon = useCallback((type: string) => {
    switch (type) {
      case 'markdown':
        return <FileMarkdownOutlined style={{ color: '#1890ff' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'text':
      default:
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
    }
  }, []);

  // 获取文件类型标签颜色
  const getTypeTagColor = useCallback((type: string) => {
    switch (type) {
      case 'markdown':
        return 'blue';
      case 'pdf':
        return 'red';
      case 'text':
      default:
        return 'green';
    }
  }, []);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSelect();
  }, [onSelect]);

  const handleActionClick = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  }, []);

  return (
    <div
      className={`document-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${className}`}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="document-card"
    >
      {/* 加载状态指示器 */}
      {isLoading && (
        <div className="document-card-loading">
          <div className="loading-bar" />
        </div>
      )}
      
      {/* 卡片头部 */}
      <div className="document-card-header">
        <div className="document-info">
          <span className="document-icon">
            {getFileIcon(document.type)}
          </span>
          <span className="document-title" title={document.title}>
            {document.title}
          </span>
        </div>
        <div className="document-status">
          {isSelected && <div className="status-indicator active" />}
        </div>
      </div>

      {/* 文档元信息 */}
      <div className="document-meta">
        <div className="meta-row">
          <Tag 
            color={getTypeTagColor(document.type)} 
            size="small"
            className="type-tag"
          >
            {document.type.toUpperCase()}
          </Tag>
          <span className="meta-item">
            <span className="meta-icon">💾</span>
            <span className="meta-text">{formatFileSize(document.size)}</span>
          </span>
        </div>
        <div className="meta-row">
          <span className="meta-item">
            <span className="meta-icon">📅</span>
            <span className="meta-text">{formatUpdateTime(document.updatedAt)}</span>
          </span>
          {document.author && (
            <span className="meta-item">
              <span className="meta-icon">👤</span>
              <span className="meta-text">{document.author}</span>
            </span>
          )}
        </div>
      </div>

      {/* 标签 */}
      {document.tags && document.tags.length > 0 && (
        <div className="document-tags">
          {document.tags.slice(0, 3).map((tag, index) => (
            <Tag key={index} size="small" className="document-tag">
              {tag}
            </Tag>
          ))}
          {document.tags.length > 3 && (
            <span className="more-tags">+{document.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* 内容预览 */}
      {document.content && (
        <div className="document-preview">
          <div className="preview-icon">📖</div>
          <div className="preview-text" title={document.content}>
            {document.content}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className={`document-actions ${showActions ? 'visible' : ''}`}>
        {onPreview && (
          <Tooltip title="快速预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => handleActionClick(e, onPreview)}
              className="action-button preview-button"
            />
          </Tooltip>
        )}
        {onEdit && (
          <Tooltip title="编辑文档">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => handleActionClick(e, onEdit)}
              className="action-button edit-button"
            />
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="删除文档">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => handleActionClick(e, onDelete)}
              className="action-button delete-button"
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;