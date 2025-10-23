import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Tooltip, 
  Dropdown, 
  Switch, 
  Slider, 
  Typography,
  Affix,
  BackTop,
  Progress,
  message
} from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  TableOutlined,
  ReadOutlined,
  CopyOutlined,
  PrinterOutlined,
  DownloadOutlined,
  SettingOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons';
import { EnhancedMarkdownRenderer } from './';
import './EnhancedDocumentContent.css';

const { Text } = Typography;

export interface EnhancedDocumentContentProps {
  content: string;
  title?: string;
  readOnly?: boolean;
  initialTheme?: 'light' | 'dark';
  initialCompact?: boolean;
  showToolbar?: boolean;
  onContentChange?: (content: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface ViewSettings {
  theme: 'light' | 'dark';
  compact: boolean;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  showToc: boolean;
  enableMath: boolean;
  codeTheme: 'light' | 'dark';
}

const EnhancedDocumentContent: React.FC<EnhancedDocumentContentProps> = ({
  content,
  title,
  readOnly = true,
  initialTheme = 'light',
  initialCompact = false,
  showToolbar = true,
  onContentChange,
  className = '',
  style = {}
}) => {
  const [settings, setSettings] = useState<ViewSettings>({
    theme: initialTheme,
    compact: initialCompact,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 800,
    showToc: true,
    enableMath: true,
    codeTheme: initialTheme
  });

  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // 计算阅读时间（基于平均阅读速度200字/分钟）
  const calculateReadingTime = useCallback(() => {
    const wordCount = content.length;
    const minutes = Math.ceil(wordCount / 200);
    setReadingTime(minutes);
  }, [content]);

  useEffect(() => {
    calculateReadingTime();
  }, [calculateReadingTime]);

  // 监听滚动进度
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const element = contentRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      setScrollProgress(Math.min(100, Math.max(0, progress)));
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 字体大小调整
  const handleFontSizeChange = useCallback((size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  }, []);

  // 主题切换
  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
      codeTheme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  }, []);

  // 紧凑模式切换
  const toggleCompact = useCallback(() => {
    setSettings(prev => ({ ...prev, compact: !prev.compact }));
  }, []);

  // 复制内容
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('内容已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  }, [content]);

  // 打印文档
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title || '文档打印'}</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 40px;
                color: #333;
              }
              h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; }
              p { margin: 16px 0; }
              code { 
                background: #f5f5f5; 
                padding: 2px 4px; 
                border-radius: 3px; 
                font-size: 0.9em;
              }
              pre { 
                background: #f8f8f8; 
                padding: 16px; 
                border-radius: 6px; 
                overflow-x: auto; 
              }
              blockquote {
                border-left: 3px solid #1890ff;
                padding-left: 16px;
                margin: 16px 0;
                color: #666;
                background: #f9f9f9;
                padding: 12px 16px;
              }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                margin: 16px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px 12px; 
                text-align: left; 
              }
              th { background: #f5f5f5; }
              @media print {
                body { margin: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${title ? `<h1>${title}</h1>` : ''}
            <div>${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [content, title]);

  // 设置面板菜单项
  const settingsMenuItems = [
    {
      key: 'fontSize',
      label: (
        <div className="setting-item">
          <Text>字体大小</Text>
          <Slider
            min={12}
            max={20}
            value={settings.fontSize}
            onChange={handleFontSizeChange}
            style={{ width: 100, margin: '0 12px' }}
          />
        </div>
      )
    },
    {
      key: 'lineHeight',
      label: (
        <div className="setting-item">
          <Text>行高</Text>
          <Slider
            min={1.2}
            max={2.0}
            step={0.1}
            value={settings.lineHeight}
            onChange={(value) => setSettings(prev => ({ ...prev, lineHeight: value }))}
            style={{ width: 100, margin: '0 12px' }}
          />
        </div>
      )
    },
    {
      key: 'maxWidth',
      label: (
        <div className="setting-item">
          <Text>内容宽度</Text>
          <Slider
            min={600}
            max={1200}
            step={50}
            value={settings.maxWidth}
            onChange={(value) => setSettings(prev => ({ ...prev, maxWidth: value }))}
            style={{ width: 100, margin: '0 12px' }}
          />
        </div>
      )
    },
    { type: 'divider' },
    {
      key: 'showToc',
      label: (
        <div className="setting-item">
          <Text>显示目录</Text>
          <Switch
            size="small"
            checked={settings.showToc}
            onChange={(checked) => setSettings(prev => ({ ...prev, showToc: checked }))}
          />
        </div>
      )
    },
    {
      key: 'enableMath',
      label: (
        <div className="setting-item">
          <Text>数学公式</Text>
          <Switch
            size="small"
            checked={settings.enableMath}
            onChange={(checked) => setSettings(prev => ({ ...prev, enableMath: checked }))}
          />
        </div>
      )
    }
  ];

  // 文档样式
  const documentStyle = useMemo(() => ({
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    maxWidth: `${settings.maxWidth}px`,
    margin: '0 auto',
    padding: settings.compact ? '16px' : '24px',
    ...style
  }), [settings, style]);

  return (
    <div className={`enhanced-document-content ${settings.theme} ${className}`}>
      {/* 顶部工具栏 */}
      {showToolbar && (
        <Affix offsetTop={0}>
          <div className="document-toolbar">
            <div className="toolbar-left">
              <Space>
                <Text type="secondary">
                  预计阅读时间: {readingTime} 分钟
                </Text>
                {isScrolling && (
                  <div className="scroll-progress">
                    <Progress 
                      percent={scrollProgress} 
                      size="small" 
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                  </div>
                )}
              </Space>
            </div>
            
            <div className="toolbar-right">
              <Space>
                <Tooltip title="紧凑模式">
                  <Button
                    type={settings.compact ? 'primary' : 'default'}
                    icon={<TableOutlined />}
                    size="small"
                    onClick={toggleCompact}
                  />
                </Tooltip>
                
                <Tooltip title="深色主题">
                  <Button
                    type={settings.theme === 'dark' ? 'primary' : 'default'}
                    icon={<BgColorsOutlined />}
                    size="small"
                    onClick={toggleTheme}
                  />
                </Tooltip>
                
                <Tooltip title="复制内容">
                  <Button
                    icon={<CopyOutlined />}
                    size="small"
                    onClick={handleCopy}
                  />
                </Tooltip>
                
                <Tooltip title="打印文档">
                  <Button
                    icon={<PrinterOutlined />}
                    size="small"
                    onClick={handlePrint}
                  />
                </Tooltip>
                
                <Dropdown
                  menu={{ items: settingsMenuItems }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    icon={<SettingOutlined />}
                    size="small"
                  />
                </Dropdown>
              </Space>
            </div>
          </div>
        </Affix>
      )}

      {/* 文档内容区域 */}
      <div 
        ref={contentRef}
        className="document-content-area"
        style={documentStyle}
      >
        <Card
          className="document-card"
          styles={{
            body: {
              padding: 0,
              background: settings.theme === 'dark' ? '#1f1f1f' : '#fff'
            }
          }}
        >
          <EnhancedMarkdownRenderer
            content={content}
            compact={settings.compact}
            theme={settings.theme}
            showToc={settings.showToc}
            maxCodeHeight={400}
            enableMath={settings.enableMath}
            className="document-markdown"
          />
        </Card>
      </div>

      {/* 回到顶部按钮 */}
      <BackTop
        target={() => contentRef.current || window}
        visibilityHeight={200}
        style={{ right: 24, bottom: 24 }}
      >
        <div className="back-top-button">
          <VerticalAlignTopOutlined />
        </div>
      </BackTop>
    </div>
  );
};

export default EnhancedDocumentContent;