/**
 * EnhancedFullscreenDocumentModal - 增强的全屏文档预览模态框
 * 
 * 特性:
 * - 全屏显示优化
 * - 工具栏控制(字体大小、显示模式、目录开关)
 * - 紧凑/正常模式切换
 * - 目录导航
 * - 代码高亮和复制
 * - 响应式设计
 * - 键盘快捷键支持
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Modal, 
  Button, 
  Space, 
  Typography, 
  Divider, 
  Spin, 
  message, 
  Tooltip,
  Dropdown,
  Slider
} from 'antd';
import { 
  CloseOutlined,
  EyeOutlined,
  CompressOutlined,
  ExpandOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FontSizeOutlined,
  SettingOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  BookOutlined
} from '@ant-design/icons';
import EnhancedMarkdownRenderer from './EnhancedMarkdownRenderer';
import type { MenuProps } from 'antd';
import './EnhancedFullscreenDocumentModal.css';

const { Title } = Typography;

export interface DocumentData {
  id: number;
  title: string;
  content: string;
  file_type: string;
  created_at: string;
  updated_at: string;
  file_size?: number;
  tags?: string[];
}

export interface EnhancedFullscreenDocumentModalProps {
  visible: boolean;
  document: DocumentData | null;
  documents?: DocumentData[];
  projectId?: number;
  taskId?: number;
  onClose: () => void;
  onDownload?: (document: DocumentData) => void;
  onShare?: (document: DocumentData) => void;
  onDocumentSelect?: (document: DocumentData) => void;
  loading?: boolean;
}

const EnhancedFullscreenDocumentModal: React.FC<EnhancedFullscreenDocumentModalProps> = ({
  visible,
  document,
  documents = [],
  projectId,
  taskId,
  onClose,
  onDownload,
  onShare,
  onDocumentSelect,
  loading = false
}) => {
  // UI 状态
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal');
  const [editMode, setEditMode] = useState<'preview' | 'edit'>('preview');
  const [showToc, setShowToc] = useState(true);
  const [showSidebar, setShowSidebar] = useState(documents.length > 1);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const fullscreenRef = React.useRef<HTMLDivElement>(null);

  // 自动隐藏工具栏
  useEffect(() => {
    if (!visible) return;

    const hideTimer = setTimeout(() => {
      if (Date.now() - lastActivity > 3000) { // 3秒无活动则隐藏工具栏
        setToolbarVisible(false);
      }
    }, 3000);

    return () => clearTimeout(hideTimer);
  }, [lastActivity, visible]);

  // 鼠标活动监听
  useEffect(() => {
    if (!visible) return;

    const handleMouseMove = () => {
      setLastActivity(Date.now());
      setToolbarVisible(true);
    };

    const handleMouseLeave = () => {
      setTimeout(() => {
        setToolbarVisible(false);
      }, 1000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [visible]);

  // HTML5 Fullscreen API 支持
  const enterFullscreen = useCallback(async () => {
    const element = fullscreenRef.current;
    if (!element) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (error) {
      console.error('进入全屏失败:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.error('退出全屏失败:', error);
    }
  }, []);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!visible) return;

      // 任何键盘活动都显示工具栏
      setLastActivity(Date.now());
      setToolbarVisible(true);

      // Ctrl/Cmd + 快捷键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setFontSize(prev => Math.min(20, prev + 1));
            message.info(`字体大小: ${Math.min(20, fontSize + 1)}px`);
            break;
          case '-':
            e.preventDefault();
            setFontSize(prev => Math.max(12, prev - 1));
            message.info(`字体大小: ${Math.max(12, fontSize - 1)}px`);
            break;
          case '0':
            e.preventDefault();
            setFontSize(14);
            message.info('字体大小已重置为 14px');
            break;
          case 't':
            e.preventDefault();
            setShowToc(prev => !prev);
            message.info(showToc ? '隐藏目录' : '显示目录');
            break;
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          case 's':
            e.preventDefault();
            document && onShare?.(document);
            break;
          case 'd':
            e.preventDefault();
            document && onDownload?.(document);
            break;
          case 'h':
            e.preventDefault();
            setToolbarVisible(prev => !prev);
            message.info(toolbarVisible ? '隐藏工具栏' : '显示工具栏');
            break;
          case 'e':
            e.preventDefault();
            setEditMode(prev => prev === 'edit' ? 'preview' : 'edit');
            message.info(editMode === 'edit' ? '切换到预览模式' : '切换到编辑模式');
            break;
          case 'b':
            e.preventDefault();
            setShowSidebar(prev => !prev);
            message.info(showSidebar ? '隐藏侧边栏' : '显示侧边栏');
            break;
        }
      }
      
      // F11 全屏切换
      if (e.key === 'F11') {
        e.preventDefault();
        if (!isFullscreen) {
          enterFullscreen();
        } else {
          exitFullscreen();
        }
      }
      
      // Escape 键关闭
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [visible, document, onClose, onDownload, onShare, fontSize, showToc, toolbarVisible, isFullscreen, enterFullscreen, exitFullscreen]);

  // 处理打印
  const handlePrint = useCallback(() => {
    // 创建打印样式
    const printStyles = `
      <style>
        @media print {
          body { font-size: ${fontSize}px; }
          .enhanced-markdown-renderer { max-width: none; }
          .markdown-toc { display: none; }
          .enhanced-code-block { break-inside: avoid; }
        }
      </style>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow && document) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
            ${printStyles}
          </head>
          <body>
            <h1>${document.title}</h1>
            <div id="content"></div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [fontSize, document]);

  // 设置菜单项
  const settingsMenuItems: MenuProps['items'] = [
    {
      key: 'theme',
      label: '主题',
      children: [
        {
          key: 'light',
          label: '浅色主题',
          onClick: () => setTheme('light')
        },
        {
          key: 'dark', 
          label: '深色主题',
          onClick: () => setTheme('dark')
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      key: 'fullscreen',
      label: isFullscreen ? '退出全屏 (F11)' : '进入全屏 (F11)',
      icon: isFullscreen ? <CompressOutlined /> : <ExpandOutlined />,
      onClick: () => {
        if (!isFullscreen) {
          enterFullscreen();
        } else {
          exitFullscreen();
        }
      }
    }
  ];

  // 文档统计信息
  const docStats = useMemo(() => {
    if (!document?.content) return null;
    
    const lines = document.content.split('\n').length;
    const words = document.content.split(/\s+/).filter(word => word.length > 0).length;
    const chars = document.content.length;
    
    return { lines, words, chars };
  }, [document?.content]);

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="enhanced-document-toolbar">
      {/* 左侧 - 显示控制 */}
      <div className="toolbar-left">
        <Space size="middle">
          {documents.length > 1 && (
            <>
              <Tooltip title="切换侧边栏 (Ctrl+B)">
                <Button
                  size="small"
                  icon={showSidebar ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  文档列表
                </Button>
              </Tooltip>
              <Divider type="vertical" />
            </>
          )}
          
          <Button.Group size="small">
            <Tooltip title="预览模式">
              <Button 
                type={editMode === 'preview' ? 'primary' : 'default'}
                icon={<EyeOutlined />}
                onClick={() => setEditMode('preview')}
              >
                预览
              </Button>
            </Tooltip>
            <Tooltip title="编辑模式 (Ctrl+E)">
              <Button 
                type={editMode === 'edit' ? 'primary' : 'default'}
                icon={<EditOutlined />}
                onClick={() => setEditMode('edit')}
              >
                编辑
              </Button>
            </Tooltip>
          </Button.Group>
          
          <Divider type="vertical" />
          
          <Button.Group size="small">
            <Tooltip title="正常模式 (适合详细阅读)">
              <Button 
                type={viewMode === 'normal' ? 'primary' : 'default'}
                icon={<CompressOutlined />}
                onClick={() => setViewMode('normal')}
              >
                正常
              </Button>
            </Tooltip>
            <Tooltip title="紧凑模式 (提高信息密度)">
              <Button 
                type={viewMode === 'compact' ? 'primary' : 'default'}
                icon={<ExpandOutlined />}
                onClick={() => setViewMode('compact')}
              >
                紧凑
              </Button>
            </Tooltip>
          </Button.Group>
          
          <Divider type="vertical" />
          
          <Tooltip title="切换目录显示 (Ctrl+T)">
            <Button
              size="small"
              icon={showToc ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={() => setShowToc(!showToc)}
            >
              目录
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* 中间 - 文档标题和统计 */}
      <div className="toolbar-center">
        <div className="document-title-section">
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            <BookOutlined style={{ marginRight: 8 }} />
            {document?.title || '文档预览'}
          </Title>
          {docStats && (
            <div className="document-stats">
              <span>{docStats.lines} 行</span>
              <span>{docStats.words} 词</span>
              <span>{docStats.chars} 字符</span>
            </div>
          )}
        </div>
      </div>

      {/* 右侧 - 操作按钮 */}
      <div className="toolbar-right">
        <Space size="small">
          {/* 字体大小调节 */}
          <div className="font-size-control">
            <Tooltip title="字体大小">
              <FontSizeOutlined style={{ color: '#fff', marginRight: 8 }} />
            </Tooltip>
            <div style={{ width: 80 }}>
              <Slider
                min={12}
                max={20}
                value={fontSize}
                onChange={setFontSize}
                tooltip={{ formatter: (value) => `${value}px` }}
                size="small"
              />
            </div>
            <span style={{ color: '#fff', marginLeft: 8, fontSize: 12 }}>
              {fontSize}px
            </span>
          </div>
          
          <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
          
          {/* 功能按钮 */}
          <Tooltip title="下载文档 (Ctrl+D)">
            <Button 
              size="small"
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => document && onDownload?.(document)}
              style={{ color: '#fff' }}
            >
              下载
            </Button>
          </Tooltip>
          
          <Tooltip title="打印文档 (Ctrl+P)">
            <Button 
              size="small"
              type="text"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              style={{ color: '#fff' }}
            >
              打印
            </Button>
          </Tooltip>
          
          <Tooltip title="分享文档 (Ctrl+S)">
            <Button 
              size="small"
              type="text"
              icon={<ShareAltOutlined />}
              onClick={() => document && onShare?.(document)}
              style={{ color: '#fff' }}
            >
              分享
            </Button>
          </Tooltip>
          
          <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
          
          {/* 设置菜单 */}
          <Dropdown menu={{ items: settingsMenuItems }} trigger={['click']}>
            <Button 
              size="small"
              type="text"
              icon={<SettingOutlined />}
              style={{ color: '#fff' }}
            />
          </Dropdown>
          
          <Tooltip title="关闭 (ESC)">
            <Button 
              size="small"
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{ color: '#fff' }}
            >
              关闭
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );

  // 渲染侧边栏文档列表
  const renderSidebar = () => (
    <div className="document-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <BookOutlined style={{ marginRight: 8 }} />
          文档列表 ({documents.length})
        </div>
      </div>
      <div className="sidebar-content">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className={`document-item ${doc.id === document?.id ? 'active' : ''}`}
            onClick={() => onDocumentSelect?.(doc)}
          >
            <div className="document-item-header">
              <div className="document-title">{doc.title}</div>
              <div className="document-meta">
                {doc.file_type === 'markdown' && <span className="file-type">MD</span>}
                {doc.file_size && (
                  <span className="file-size">
                    {Math.round(doc.file_size / 1024)}KB
                  </span>
                )}
              </div>
            </div>
            <div className="document-preview">
              {doc.content?.substring(0, 100)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染文档内容
  const renderContent = () => {
    if (loading) {
      return (
        <div className="document-loading">
          <Spin size="large">
            <div style={{ marginTop: 16, color: '#666' }}>
              正在加载文档内容...
            </div>
          </Spin>
        </div>
      );
    }

    if (!document) {
      return (
        <div className="document-empty">
          <div style={{ textAlign: 'center', color: '#666' }}>
            <BookOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无文档内容</div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="document-content-area"
        style={{ fontSize: `${fontSize}px` }}
      >
        {editMode === 'edit' ? (
          <div className="markdown-editor-container">
            <textarea
              className="markdown-editor"
              value={document.content}
              placeholder="在此编写 Markdown 内容..."
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: `${fontSize}px`,
                fontFamily: 'Monaco, Menlo, monospace',
                padding: '20px',
                background: theme === 'dark' ? '#0d1117' : '#fff',
                color: theme === 'dark' ? '#f0f6fc' : '#24292f'
              }}
              onChange={(e) => {
                // 这里可以添加内容变更处理
                console.log('Content changed:', e.target.value);
              }}
            />
          </div>
        ) : (
          <EnhancedMarkdownRenderer
            content={document.content}
            compact={viewMode === 'compact'}
            theme={theme}
            showToc={showToc}
            className="fullscreen-markdown"
            onHeadingClick={(headingId) => {
              const element = document.getElementById ? document.getElementById(headingId) : null;
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="100vw"
      style={{ top: 0, paddingBottom: 0, maxWidth: 'none' }}
      bodyStyle={{
        padding: 0,
        height: '100vh',
        overflow: 'hidden',
        background: theme === 'dark' ? '#0d1117' : '#fff'
      }}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      destroyOnHidden
      centered={false}
      maskClosable={false}
      keyboard={false}
      className={`enhanced-fullscreen-document-modal ${theme}`}
      title={null}
      closable={false}
    >
      <div ref={fullscreenRef} className="enhanced-document-container">
        <div 
          className={`toolbar-container ${!toolbarVisible ? 'toolbar-hidden' : ''}`}
          onMouseEnter={() => {
            setToolbarVisible(true);
            setLastActivity(Date.now());
          }}
        >
          {renderToolbar()}
        </div>
        <div className="enhanced-document-body">
          <div className="document-layout">
            {showSidebar && documents.length > 1 && (
              <div className="document-sidebar-container">
                {renderSidebar()}
              </div>
            )}
            <div className="document-main-container">
              {renderContent()}
            </div>
          </div>
        </div>
        
        {/* 快捷键提示浮层 */}
        {!toolbarVisible && (
          <div className="keyboard-hint">
            <div className="hint-content">
              <span>移动鼠标或按任意键显示工具栏</span>
              <div className="hint-keys">
                <kbd>Ctrl+H</kbd> 切换工具栏
                <kbd>Ctrl+E</kbd> 编辑模式
                <kbd>Ctrl+B</kbd> 侧边栏
                <kbd>ESC</kbd> 关闭
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EnhancedFullscreenDocumentModal;