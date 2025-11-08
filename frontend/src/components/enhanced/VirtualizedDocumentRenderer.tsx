import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// ✅ FIXED - react-window v2 uses List component (not VariableSizeList) (TS2305)
import { List } from 'react-window';
import { Skeleton, Typography, Alert, Progress, BackTop } from 'antd';
import { EnhancedMarkdownRenderer } from './';
import './VirtualizedDocumentRenderer.css';

const { Text } = Typography;

export interface VirtualizedDocumentRendererProps {
  content: string;
  windowHeight: number;
  itemHeight?: number;
  compact?: boolean;
  theme?: 'light' | 'dark';
  onScroll?: (scrollTop: number, scrollDirection: 'up' | 'down') => void;
  className?: string;
  style?: React.CSSProperties;
}

interface DocumentChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'text' | 'code' | 'table' | 'image';
  rendered?: React.ReactNode;
}

const VirtualizedDocumentRenderer: React.FC<VirtualizedDocumentRendererProps> = ({
  content,
  windowHeight,
  itemHeight = 30,
  compact = false,
  theme = 'light',
  onScroll,
  className = '',
  style = {}
}) => {
  // 状态管理
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  // Refs
  const listRef = useRef<any>(null);
  const lastScrollTop = useRef(0);
  const renderCache = useRef(new Map<string, React.ReactNode>());

  // 内容分块处理
  const processContent = useCallback(async (rawContent: string) => {
    setLoading(true);
    setError(null);
    setRenderProgress(0);

    try {
      const lines = rawContent.split('\n');
      const processedChunks: DocumentChunk[] = [];
      
      let currentChunk: string[] = [];
      let currentType: DocumentChunk['type'] = 'text';
      let chunkStartLine = 0;

      const flushChunk = () => {
        if (currentChunk.length > 0) {
          processedChunks.push({
            id: `chunk-${processedChunks.length}`,
            content: currentChunk.join('\n'),
            startLine: chunkStartLine,
            endLine: chunkStartLine + currentChunk.length - 1,
            type: currentType
          });
          currentChunk = [];
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测内容类型
        let lineType: DocumentChunk['type'] = 'text';
        
        if (line.startsWith('```')) {
          lineType = 'code';
        } else if (line.includes('|') && line.includes('-')) {
          lineType = 'table';
        } else if (line.startsWith('![')) {
          lineType = 'image';
        }

        // 如果类型变化或达到最大块大小，刷新当前块
        if (lineType !== currentType || currentChunk.length >= 50) {
          flushChunk();
          currentType = lineType;
          chunkStartLine = i;
        }

        currentChunk.push(line);
        
        // 更新进度
        setRenderProgress(Math.round((i / lines.length) * 100));
        
        // 每处理100行暂停一下，避免阻塞UI
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // 处理最后一个块
      flushChunk();

      setChunks(processedChunks);
      setRenderProgress(100);
    } catch (err: any) {
      console.error('文档处理失败:', err);
      setError(err.message || '文档处理失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理内容变化
  useEffect(() => {
    if (content) {
      // 清除缓存
      renderCache.current.clear();
      processContent(content);
    }
  }, [content, processContent]);

  // 渲染单个块的方法（带缓存）
  const renderChunk = useCallback((chunk: DocumentChunk): React.ReactNode => {
    // 检查缓存
    if (renderCache.current.has(chunk.id)) {
      return renderCache.current.get(chunk.id);
    }

    let rendered: React.ReactNode;

    try {
      // 根据块类型选择渲染方式
      switch (chunk.type) {
        case 'code':
          rendered = (
            <div className="chunk-code">
              <EnhancedMarkdownRenderer
                content={chunk.content}
                compact={compact}
                theme={theme}
                showToc={false}
                enableMath={false}
              />
            </div>
          );
          break;
          
        case 'table':
          rendered = (
            <div className="chunk-table">
              <EnhancedMarkdownRenderer
                content={chunk.content}
                compact={compact}
                theme={theme}
                showToc={false}
                enableMath={false}
              />
            </div>
          );
          break;
          
        case 'image':
          rendered = (
            <div className="chunk-image">
              <EnhancedMarkdownRenderer
                content={chunk.content}
                compact={compact}
                theme={theme}
                showToc={false}
                enableMath={false}
              />
            </div>
          );
          break;
          
        default:
          rendered = (
            <div className="chunk-text">
              <EnhancedMarkdownRenderer
                content={chunk.content}
                compact={compact}
                theme={theme}
                showToc={false}
                enableMath={false}
              />
            </div>
          );
      }
    } catch (error) {
      console.error('块渲染失败:', error);
      rendered = (
        <Alert
          message="渲染失败"
          description={`行 ${chunk.startLine + 1}-${chunk.endLine + 1}: 内容渲染出错`}
          type="error"
        />
      );
    }

    // 缓存渲染结果
    renderCache.current.set(chunk.id, rendered);
    return rendered;
  }, [compact, theme]);

  // 列表项渲染器 (react-window v2 API)
  const Row = ({ index, style, ariaAttributes }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => {
    const chunk = chunks[index];
    if (!chunk) {
      return (
        <div style={style} className="chunk-placeholder" {...ariaAttributes}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      );
    }

    // 只渲染可见区域附近的内容
    const isVisible = index >= visibleRange.start - 2 && index <= visibleRange.end + 2;

    return (
      <div
        style={style}
        className={`chunk-item chunk-${chunk.type} ${compact ? 'compact' : 'normal'}`}
        data-chunk-id={chunk.id}
        data-start-line={chunk.startLine}
        data-end-line={chunk.endLine}
        {...ariaAttributes}
      >
        {isVisible ? (
          renderChunk(chunk)
        ) : (
          <div className="chunk-placeholder">
            <Skeleton active paragraph={{ rows: 1 }} />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              行 {chunk.startLine + 1}-{chunk.endLine + 1}
            </Text>
          </div>
        )}
      </div>
    );
  };

  // 动态计算项目高度
  const getItemSize = useCallback((index: number) => {
    const chunk = chunks[index];
    if (!chunk) return itemHeight;

    // 根据内容类型调整高度
    const baseHeight = compact ? 25 : 30;
    const lineCount = chunk.content.split('\n').length;

    switch (chunk.type) {
      case 'code':
        return Math.max(baseHeight * 3, lineCount * 20 + 40);
      case 'table':
        return Math.max(baseHeight * 2, lineCount * 25 + 20);
      case 'image':
        return baseHeight * 8; // 固定图片高度
      default:
        return Math.max(baseHeight, lineCount * (compact ? 18 : 22));
    }
  }, [chunks, itemHeight, compact]);

  // 行可见性变化处理 (react-window v2 使用 onRowsRendered)
  const handleRowsRendered = useCallback((
    visibleRows: { startIndex: number; stopIndex: number },
    allRows: { startIndex: number; stopIndex: number }
  ) => {
    setVisibleRange({ start: visibleRows.startIndex, end: visibleRows.stopIndex });

    // 如果提供了 onScroll 回调,估算滚动位置并调用
    if (onScroll) {
      const estimatedScrollTop = Array.from({ length: visibleRows.startIndex })
        .reduce<number>((sum, _, idx) => sum + getItemSize(idx), 0);
      const direction = estimatedScrollTop > lastScrollTop.current ? 'down' : 'up';
      lastScrollTop.current = estimatedScrollTop;
      onScroll(estimatedScrollTop, direction);
    }
  }, [onScroll, getItemSize]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return chunks.reduce((total, _, index) => total + getItemSize(index), 0);
  }, [chunks, getItemSize]);

  // 错误状态
  if (error) {
    return (
      <div className={`virtualized-document-renderer error ${className}`} style={style}>
        <Alert
          message="文档加载失败"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div className={`virtualized-document-renderer loading ${className}`} style={style}>
        <div className="loading-container">
          <Progress
            type="line"
            percent={renderProgress}
            showInfo={true}
            format={(percent) => `处理中 ${percent}%`}
          />
          <Text type="secondary" style={{ marginTop: '8px' }}>
            正在分析文档结构...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={`virtualized-document-renderer ${theme} ${className}`} style={style}>
      {chunks.length > 0 ? (
        <>
          {/* ✅ FIXED - react-window v2 List API (TS2305, TS2322) */}
          <List
            listRef={listRef}
            rowComponent={Row}
            rowCount={chunks.length}
            rowHeight={getItemSize as any}
            rowProps={{}}
            onRowsRendered={handleRowsRendered}
            style={{ height: windowHeight, width: '100%' }}
            className="virtual-list"
            overscanCount={5}
          />
          
          {/* 性能信息显示 */}
          <div className="performance-info">
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {chunks.length} 个内容块 · 总高度 {Math.round(totalHeight)}px · 
              缓存 {renderCache.current.size} 项
            </Text>
          </div>
          
          {/* 回到顶部 */}
          <BackTop
            target={() => listRef.current?.querySelector('.virtual-list') as HTMLElement}
            visibilityHeight={200}
          />
        </>
      ) : (
        <div className="empty-content">
          <Text type="secondary">文档内容为空</Text>
        </div>
      )}
    </div>
  );
};

export default VirtualizedDocumentRenderer;