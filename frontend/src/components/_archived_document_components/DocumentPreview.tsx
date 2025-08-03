/**
 * 文档预览组件
 * 支持多种文档类型的预览和缩略图生成
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  Typography,
  Spin,
  Alert,
  Space,
  Button,
  Image,
  Tooltip,
  Tag,
  Divider,
  message
} from 'antd';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileMarkdownOutlined,
  EyeOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RedoOutlined
} from '@ant-design/icons';
import { Document, DocumentType } from '../types/document';

// Dynamic import for marked to handle missing dependency gracefully
let marked: unknown = null;
try {
  // @ts-ignore
  const markedModule = require('marked');
  marked = markedModule.marked || markedModule;
} catch (error) {
  console.warn('marked library not available, markdown rendering will be limited');
}

const { Title, Text, Paragraph } = Typography;

// Simple markdown renderer for fallback
const renderSimpleMarkdown = (content: string): string => {
  return content
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/# (.*)/g, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
};

interface DocumentPreviewProps {
  document: Document;
  width?: number | string;
  height?: number | string;
  showTitle?: boolean;
  showMetadata?: boolean;
  showControls?: boolean;
  thumbnailMode?: boolean;
  onPreviewError?: (error: Error) => void;
  onThumbnailGenerated?: (thumbnailUrl: string) => void;
}

interface PreviewState {
  loading: boolean;
  error: string | null;
  previewContent: string | null;
  thumbnailUrl: string | null;
  zoom: number;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  width = '100%',
  height = 400,
  showTitle = true,
  showMetadata = true,
  showControls = true,
  thumbnailMode = false,
  onPreviewError,
  onThumbnailGenerated
}) => {
  const [state, setState] = useState<PreviewState>({
    loading: true,
    error: null,
    previewContent: null,
    thumbnailUrl: null,
    zoom: 1
  });

  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 获取文档类型图标
  const getDocumentIcon = (type: DocumentType) => {
    const iconMap: Record<DocumentType, React.ReactElement> = {
      'markdown': <FileMarkdownOutlined style={{ color: '#1890ff' }} />,
      'html': <FileTextOutlined style={{ color: '#52c41a' }} />,
      'text': <FileTextOutlined style={{ color: '#666' }} />,
      'json': <FileTextOutlined style={{ color: '#722ed1' }} />,
      'code': <FileTextOutlined style={{ color: '#13c2c2' }} />,
      'pdf': <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
      'word': <FileWordOutlined style={{ color: '#1890ff' }} />,
      'excel': <FileExcelOutlined style={{ color: '#52c41a' }} />,
      'image': <FileImageOutlined style={{ color: '#fa8c16' }} />
    };
    return iconMap[type] || <FileTextOutlined />;
  };

  // 生成预览内容
  const generatePreviewContent = async (document: Document): Promise<string> => {
    const { type, content } = document;

    switch (type) {
      case 'markdown':
        try {
          if (!marked) {
            // 如果marked不可用，使用简单的markdown渲染
            return renderSimpleMarkdown(content || '');
          }
          // 配置marked选项
          if (marked.setOptions) {
            marked.setOptions({
              breaks: true,
              gfm: true,
              sanitize: false // 在实际应用中应该启用sanitize
            });
          }
          return marked(content || '');
        } catch (error) {
          // 如果marked失败，回退到简单渲染
          return renderSimpleMarkdown(content || '');
        }

      case 'html':
        // 简单的HTML内容清理
        return content || '';

      case 'text':
        // 纯文本转换为HTML，保留换行
        return `<pre style="white-space: pre-wrap; font-family: inherit;">${
          (content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }</pre>`;

      case 'json':
        try {
          const jsonData = JSON.parse(content || '{}');
          return `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto;">${
            JSON.stringify(jsonData, null, 2)
          }</pre>`;
        } catch {
          return `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto;">${content || ''}</pre>`;
        }

      case 'code':
        return `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto;"><code>${
          (content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }</code></pre>`;

      default:
        // 其他类型显示原始内容
        return `<div style="padding: 16px; background: #fafafa; border-radius: 6px;">
          <p style="margin: 0; color: #666;">无法预览此文档类型</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">
            文档类型: ${type} | 内容长度: ${content?.length || 0} 字符
          </p>
        </div>`;
    }
  };

  // 生成缩略图
  const generateThumbnail = async (previewElement: HTMLElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // 使用html2canvas库生成缩略图（需要安装）
        // 这里使用简化的方法
        const canvas = canvasRef.current;
        if (!canvas) {
          reject(new Error('Canvas元素未找到'));
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }

        // 设置缩略图尺寸
        const thumbnailWidth = 200;
        const thumbnailHeight = 150;
        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        // 绘制缩略图背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

        // 绘制文档类型图标和基本信息
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        
        // 绘制文档标题
        const title = document.title || '未命名文档';
        const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
        ctx.fillText(shortTitle, thumbnailWidth / 2, 30);

        // 绘制文档类型
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(`类型: ${document.type}`, thumbnailWidth / 2, 50);

        // 绘制内容预览（简化版本）
        const contentPreview = (document.content || '').substring(0, 100);
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        
        const lines = contentPreview.match(/.{1,25}/g) || [];
        lines.slice(0, 8).forEach((line, index) => {
          ctx.fillText(line, 10, 80 + index * 12);
        });

        // 转换为数据URL
        const thumbnailUrl = canvas.toDataURL('image/png');
        resolve(thumbnailUrl);
      } catch (error) {
        reject(error);
      }
    });
  };

  // 加载预览内容
  const loadPreview = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 生成预览内容
      const previewContent = await generatePreviewContent(document);
      setState(prev => ({ ...prev, previewContent, loading: false }));

      // 如果需要生成缩略图
      if (thumbnailMode && previewRef.current) {
        setTimeout(async () => {
          try {
            const thumbnailUrl = await generateThumbnail(previewRef.current!);
            setState(prev => ({ ...prev, thumbnailUrl }));
            onThumbnailGenerated?.(thumbnailUrl);
          } catch (error) {
            console.warn('缩略图生成失败:', error);
          }
        }, 100);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '预览加载失败';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      onPreviewError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  // 缩放控制
  const handleZoom = (factor: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3, prev.zoom * factor))
    }));
  };

  const resetZoom = () => {
    setState(prev => ({ ...prev, zoom: 1 }));
  };

  // 刷新预览
  const refreshPreview = () => {
    loadPreview();
  };

  // 下载预览内容
  const downloadPreview = () => {
    if (!state.previewContent) return;

    const blob = new Blob([state.previewContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title || 'preview'}.html`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('预览内容已下载');
  };

  // 全屏预览
  const openFullscreen = () => {
    if (previewRef.current && previewRef.current.requestFullscreen) {
      previewRef.current.requestFullscreen();
    }
  };

  // 组件挂载时加载预览
  useEffect(() => {
    loadPreview();
  }, [document.id, document.content, document.updated_at]);

  // 计算样式
  const previewStyle: React.CSSProperties = {
    width,
    height: thumbnailMode ? 150 : height,
    overflow: 'auto',
    transform: `scale(${state.zoom})`,
    transformOrigin: 'top left',
    border: '1px solid #f0f0f0',
    borderRadius: '6px',
    background: '#ffffff'
  };

  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width * state.zoom}px` : width,
    height: typeof height === 'number' ? `${height * state.zoom}px` : height,
    overflow: 'hidden'
  };

  // 缩略图模式渲染
  if (thumbnailMode) {
    return (
      <Card
        size="small"
        hoverable
        style={{ width: 200 }}
        cover={
          state.thumbnailUrl ? (
            <Image
              src={state.thumbnailUrl}
              alt={`${document.title} 缩略图`}
              style={{ height: 150, objectFit: 'cover' }}
              preview={false}
            />
          ) : (
            <div style={{ 
              height: 150, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#fafafa'
            }}>
              {state.loading ? (
                <Spin size="small" />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {getDocumentIcon(document.type)}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {document.type.toUpperCase()}
                  </Text>
                </div>
              )}
            </div>
          )
        }
      >
        <Card.Meta
          title={
            <Tooltip title={document.title}>
              <Text ellipsis style={{ fontSize: '14px' }}>
                {document.title || '未命名文档'}
              </Text>
            </Tooltip>
          }
          description={
            <Space direction="vertical" size={2}>
              <Tag color="blue">{document.type}</Tag>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {new Date(document.updated_at).toLocaleDateString()}
              </Text>
            </Space>
          }
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Card>
    );
  }

  // 完整预览模式渲染
  return (
    <div>
      {/* 标题和元数据 */}
      {(showTitle || showMetadata) && (
        <div style={{ marginBottom: '16px' }}>
          {showTitle && (
            <Title level={4} style={{ margin: '0 0 8px 0' }}>
              <Space>
                {getDocumentIcon(document.type)}
                {document.title || '未命名文档'}
              </Space>
            </Title>
          )}
          
          {showMetadata && (
            <Space split={<Divider type="vertical" />} wrap>
              <Tag color="blue">{document.type.toUpperCase()}</Tag>
              <Text type="secondary">
                更新于 {new Date(document.updated_at).toLocaleString()}
              </Text>
              <Text type="secondary">
                {document.content?.length || 0} 字符
              </Text>
            </Space>
          )}
        </div>
      )}

      {/* 控制栏 */}
      {showControls && (
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Tooltip title="刷新预览">
              <Button
                icon={<RedoOutlined />}
                size="small"
                onClick={refreshPreview}
                loading={state.loading}
              />
            </Tooltip>
            <Tooltip title="放大">
              <Button
                icon={<ZoomInOutlined />}
                size="small"
                onClick={() => handleZoom(1.2)}
                disabled={state.zoom >= 3}
              />
            </Tooltip>
            <Tooltip title="缩小">
              <Button
                icon={<ZoomOutOutlined />}
                size="small"
                onClick={() => handleZoom(0.8)}
                disabled={state.zoom <= 0.5}
              />
            </Tooltip>
            <Text type="secondary" style={{ fontSize: '12px', minWidth: '50px' }}>
              {Math.round(state.zoom * 100)}%
            </Text>
            <Tooltip title="重置缩放">
              <Button
                size="small"
                onClick={resetZoom}
                disabled={state.zoom === 1}
              >
                重置
              </Button>
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip title="全屏预览">
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={openFullscreen}
              />
            </Tooltip>
            <Tooltip title="下载预览">
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={downloadPreview}
                disabled={!state.previewContent}
              />
            </Tooltip>
          </Space>
        </div>
      )}

      {/* 预览内容 */}
      <div style={containerStyle}>
        {state.loading && (
          <div style={{ 
            ...previewStyle, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Spin size="large" />
          </div>
        )}

        {state.error && (
          <Alert
            message="预览加载失败"
            description={state.error}
            type="error"
            showIcon
            style={previewStyle}
            action={
              <Button size="small" onClick={refreshPreview}>
                重试
              </Button>
            }
          />
        )}

        {!state.loading && !state.error && state.previewContent && (
          <div
            ref={previewRef}
            style={previewStyle}
            dangerouslySetInnerHTML={{ __html: state.previewContent }}
          />
        )}
      </div>

      {/* 隐藏的Canvas用于生成缩略图 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default DocumentPreview;