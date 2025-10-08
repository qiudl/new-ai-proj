import React, { useCallback, useRef, useEffect } from 'react';
import { Button, Empty } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import DocumentCard from './DocumentCard';
import { DocumentInfo } from './DocumentSidebar';

export interface DocumentListProps {
  documents: DocumentInfo[];
  currentDocumentId?: string;
  onDocumentSelect: (documentId: string) => void;
  onDocumentEdit?: (documentId: string) => void;
  onDocumentDelete?: (documentId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  currentDocumentId,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onLoadMore,
  hasMore = false,
  loading = false,
  className = ''
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // 无限滚动检测
  const lastDocumentElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && onLoadMore) {
        onLoadMore();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, onLoadMore]);

  // 清理观察器
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 处理文档卡片选择
  const handleCardSelect = useCallback((documentId: string) => {
    onDocumentSelect(documentId);
  }, [onDocumentSelect]);

  // 处理文档编辑
  const handleCardEdit = useCallback((documentId: string) => {
    if (onDocumentEdit) {
      onDocumentEdit(documentId);
    }
  }, [onDocumentEdit]);

  // 处理文档删除
  const handleCardDelete = useCallback((documentId: string) => {
    if (onDocumentDelete) {
      onDocumentDelete(documentId);
    }
  }, [onDocumentDelete]);

  // 处理文档预览
  const handleCardPreview = useCallback((documentId: string) => {
    onDocumentSelect(documentId);
  }, [onDocumentSelect]);

  if (documents.length === 0 && !loading) {
    return (
      <div className="document-list empty">
        <Empty
          description="暂无文档"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className={`document-list ${className}`} ref={listRef}>
      {documents.map((document, index) => {
        const isLast = index === documents.length - 1;
        const isSelected = currentDocumentId === document.id;
        
        return (
          <div
            key={document.id}
            ref={isLast ? lastDocumentElementRef : undefined}
            className="document-list-item"
          >
            <DocumentCard
              document={document}
              isSelected={isSelected}
              isLoading={document.isLoading || false}
              onSelect={() => handleCardSelect(document.id)}
              onEdit={onDocumentEdit ? () => handleCardEdit(document.id) : undefined}
              onDelete={onDocumentDelete ? () => handleCardDelete(document.id) : undefined}
              onPreview={() => handleCardPreview(document.id)}
            />
          </div>
        );
      })}

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="load-more-container">
          <Button
            type="dashed"
            block
            icon={loading ? <LoadingOutlined /> : undefined}
            onClick={onLoadMore}
            disabled={loading}
            className="load-more-button"
          >
            {loading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}

      {/* 底部加载指示器 */}
      {loading && documents.length > 0 && (
        <div className="loading-indicator">
          <LoadingOutlined />
          <span>正在加载更多文档...</span>
        </div>
      )}
    </div>
  );
};

export default DocumentList;