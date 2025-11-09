/**
 * EnhancedMarkdownRenderer - 增强的Markdown渲染器
 * 
 * 特性:
 * - 增强的代码块显示
 * - 响应式表格
 * - 紧凑/正常模式切换
 * - 目录导航支持
 * - 数学公式渲染
 * - 自定义组件支持
 */

import React, { useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Anchor, Typography } from 'antd';
import EnhancedCodeBlock from './EnhancedCodeBlock';
import './EnhancedMarkdownRenderer.css';

// ✅ FIXED - Commented unused destructured variables (ESLint)
/* const { Title, Text, Paragraph } = Typography; */
/* const { Link } = Anchor; */

export interface EnhancedMarkdownRendererProps {
  content: string;
  compact?: boolean;
  theme?: 'dark' | 'light';
  showToc?: boolean;
  maxCodeHeight?: number;
  enableMath?: boolean;
  className?: string;
  onHeadingClick?: (headingId: string, level: number) => void;
}

interface Heading {
  id: string;
  text: string;
  level: number;
  line: number;
}

const EnhancedMarkdownRenderer: React.FC<EnhancedMarkdownRendererProps> = ({
  content,
  compact = false,
  theme = 'light',
  showToc = false,
  maxCodeHeight = 400,
  enableMath: _enableMath = false, // ✅ FIXED - Added underscore to unused prop (ESLint)
  className = '',
  onHeadingClick
}) => {
  // 提取标题信息用于生成目录
  const headings = useMemo(() => {
    const lines = content.split('\n');
    const headingList: Heading[] = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        headingList.push({ id, text, level, line: index });
      }
    });
    
    return headingList;
  }, [content]);

  // 生成目录项
  const tocItems = useMemo(() => {
    return headings.map(heading => ({
      key: heading.id,
      href: `#${heading.id}`,
      title: heading.text,
      level: heading.level
    }));
  }, [headings]);

  // 响应式表格组件
  const ResponsiveTable = useCallback(({ children }: { children: React.ReactNode }) => {
    return (
      <div className={`responsive-table-container ${compact ? 'compact' : 'normal'}`}>
        <div className="table-wrapper">
          <table className={`enhanced-markdown-table ${theme}`}>
            {children}
          </table>
        </div>
      </div>
    );
  }, [compact, theme]);

  // 自定义渲染组件
  const components = useMemo(() => ({
    // 代码块渲染
    code: ({ node: _node, inline, className, children, ...props }: any) => { // ✅ FIXED - Added underscore to unused param (ESLint)
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      
      // Extract and exclude className from props spread
      const { className: _, ...restProps } = props;
      
      if (inline) {
        return (
          <code style={{
            backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
            color: theme === 'dark' ? '#d4d4d4' : '#d73a49',
            padding: compact ? '1px 3px' : '2px 4px',
            borderRadius: '3px',
            fontSize: compact ? '11px' : '12px',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            border: theme === 'dark' ? '1px solid #404040' : '1px solid #e1e4e8'
          }} {...restProps}>
            {children}
          </code>
        );
      }
      
      // 检查是否有文件名注释
      const codeString = String(children).replace(/\n$/, '');
      const fileNameMatch = codeString.match(/^\/\/ file: (.+)$/m);
      const fileName = fileNameMatch ? fileNameMatch[1] : undefined;
      const codeContent = fileName ? codeString.replace(/^\/\/ file: .+$/m, '').trim() : codeString;
      
      return (
        <EnhancedCodeBlock
          language={language}
          compact={compact}
          theme={theme}
          maxHeight={maxCodeHeight}
          fileName={fileName}
        >
          {codeContent}
        </EnhancedCodeBlock>
      );
    },
    
    // 标题渲染
    h1: ({ children, ...props }: any) => {
      const headingId = headings.find(h => h.text === children)?.id || 'heading-1';
      const { className: _className, ...restProps } = props; // ✅ FIXED - Added underscore to unused var (ESLint)
      return (
        <h1 
          id={headingId}
          style={{
            fontSize: compact ? '20px' : '24px',
            margin: compact ? '12px 0 8px 0' : '16px 0 12px 0',
            color: theme === 'dark' ? '#f0f0f0' : '#262626',
            fontWeight: 600,
            lineHeight: 1.4,
            borderBottom: theme === 'dark' ? '2px solid #404040' : '2px solid #f0f0f0',
            paddingBottom: '8px'
          }}
          onClick={() => onHeadingClick?.(headingId, 1)}
          {...restProps}
        >
          {children}
        </h1>
      );
    },
    
    h2: ({ children, ...props }: any) => {
      const headingId = headings.find(h => h.text === children)?.id || 'heading-2';
      const { className: _className, ...restProps } = props; // ✅ FIXED - Added underscore to unused var (ESLint)
      return (
        <h2 
          id={headingId}
          style={{
            fontSize: compact ? '18px' : '20px',
            margin: compact ? '10px 0 6px 0' : '14px 0 10px 0',
            color: theme === 'dark' ? '#f0f0f0' : '#262626',
            fontWeight: 600,
            lineHeight: 1.4
          }}
          onClick={() => onHeadingClick?.(headingId, 2)}
          {...restProps}
        >
          {children}
        </h2>
      );
    },
    
    h3: ({ children, ...props }: any) => {
      const headingId = headings.find(h => h.text === children)?.id || 'heading-3';
      const { className, ...restProps } = props;
      return (
        <h3 
          id={headingId}
          style={{
            fontSize: compact ? '16px' : '18px',
            margin: compact ? '8px 0 4px 0' : '12px 0 8px 0',
            color: theme === 'dark' ? '#f0f0f0' : '#262626',
            fontWeight: 600,
            lineHeight: 1.4
          }}
          onClick={() => onHeadingClick?.(headingId, 3)}
          {...restProps}
        >
          {children}
        </h3>
      );
    },
    
    h4: ({ children, ...props }: any) => {
      const headingId = headings.find(h => h.text === children)?.id || 'heading-4';
      const { className, ...restProps } = props;
      return (
        <h4 
          id={headingId}
          style={{
            fontSize: compact ? '14px' : '16px',
            margin: compact ? '6px 0 2px 0' : '10px 0 6px 0',
            color: theme === 'dark' ? '#f0f0f0' : '#262626',
            fontWeight: 600,
            lineHeight: 1.4
          }}
          onClick={() => onHeadingClick?.(headingId, 4)}
          {...restProps}
        >
          {children}
        </h4>
      );
    },
    
    h5: ({ children, ...props }: any) => {
      const headingId = headings.find(h => h.text === children)?.id || 'heading-5';
      const { className, ...restProps } = props;
      return (
        <h5 
          id={headingId}
          style={{
            fontSize: compact ? '13px' : '14px',
            margin: compact ? '4px 0 2px 0' : '8px 0 4px 0',
            color: theme === 'dark' ? '#f0f0f0' : '#262626',
            fontWeight: 600,
            lineHeight: 1.4
          }}
          onClick={() => onHeadingClick?.(headingId, 5)}
          {...restProps}
        >
          {children}
        </h5>
      );
    },
    
    h6: ({ children, ...props }: any) => {
      const headingId = headings.find(h => h.text === children)?.id || 'heading-6';
      const { className, ...restProps } = props;
      return (
        <h6 
          id={headingId}
          style={{
            fontSize: compact ? '12px' : '13px',
            margin: compact ? '4px 0 2px 0' : '6px 0 4px 0',
            color: theme === 'dark' ? '#d0d0d0' : '#595959',
            fontWeight: 600,
            lineHeight: 1.4
          }}
          onClick={() => onHeadingClick?.(headingId, 6)}
          {...restProps}
        >
          {children}
        </h6>
      );
    },
    
    // 段落渲染
    p: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <p 
          style={{
            margin: compact ? '4px 0' : '8px 0',
            lineHeight: compact ? '1.5' : '1.6',
            color: theme === 'dark' ? '#d0d0d0' : '#262626',
            fontSize: compact ? '13px' : '14px'
          }}
          {...restProps}
        >
          {children}
        </p>
      );
    },
    
    // 引用块渲染
    blockquote: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <blockquote 
          style={{
            borderLeft: theme === 'dark' ? '3px solid #555' : '3px solid #1890ff',
            paddingLeft: '12px',
            margin: compact ? '6px 0' : '8px 0',
            color: theme === 'dark' ? '#999' : '#666',
            backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f9f9f9',
            padding: compact ? '6px 12px' : '8px 12px',
            borderRadius: '0 4px 4px 0',
            fontStyle: 'italic'
          }}
          {...restProps}
        >
          {children}
        </blockquote>
      );
    },
    
    // 表格渲染
    table: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <div style={{ overflowX: 'auto', margin: compact ? '8px 0' : '12px 0' }}>
          <table 
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              border: theme === 'dark' ? '1px solid #404040' : '1px solid #d9d9d9',
              fontSize: compact ? '12px' : '13px'
            }}
            {...restProps}
          >
            {children}
          </table>
        </div>
      );
    },
    
    // 列表渲染
    ul: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <ul 
          style={{
            margin: compact ? '6px 0' : '8px 0',
            paddingLeft: compact ? '16px' : '20px',
            lineHeight: compact ? '1.4' : '1.6'
          }}
          {...restProps}
        >
          {children}
        </ul>
      );
    },
    
    ol: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <ol 
          style={{
            margin: compact ? '6px 0' : '8px 0',
            paddingLeft: compact ? '16px' : '20px',
            lineHeight: compact ? '1.4' : '1.6'
          }}
          {...restProps}
        >
          {children}
        </ol>
      );
    },
    
    // 分割线渲染
    hr: ({ ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <hr 
          style={{
            border: 'none',
            borderTop: theme === 'dark' ? '1px solid #404040' : '1px solid #e8e8e8',
            margin: compact ? '12px 0' : '16px 0',
            height: '1px'
          }}
          {...restProps}
        />
      );
    },
    
    // 链接渲染
    a: ({ children, href, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <a 
          href={href}
          style={{
            color: theme === 'dark' ? '#69b7ff' : '#1890ff',
            textDecoration: 'none'
          }}
          target="_blank"
          rel="noopener noreferrer"
          {...restProps}
        >
          {children}
        </a>
      );
    },
    
    // 图片渲染
    img: ({ src, alt, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <div style={{
          textAlign: 'center',
          margin: compact ? '8px 0' : '12px 0'
        }}>
          <img 
            src={src} 
            alt={alt}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
              display: 'block',
              margin: '0 auto',
              boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
            }}
            loading="lazy"
            {...restProps}
          />
          {alt && (
            <div style={{
              fontSize: compact ? '11px' : '12px',
              color: theme === 'dark' ? '#999' : '#666',
              fontStyle: 'italic',
              marginTop: '4px',
              textAlign: 'center'
            }}>
              {alt}
            </div>
          )}
        </div>
      );
    },
    
    // 强调文本
    strong: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <strong style={{
          fontWeight: 600,
          color: theme === 'dark' ? '#f0f0f0' : '#262626'
        }} {...restProps}>
          {children}
        </strong>
      );
    },
    
    em: ({ children, ...props }: any) => {
      const { className, ...restProps } = props;
      return (
        <em style={{
          fontStyle: 'italic',
          color: theme === 'dark' ? '#d0d0d0' : '#595959'
        }} {...restProps}>
          {children}
        </em>
      );
    }
    
  }), [compact, theme, maxCodeHeight, headings, onHeadingClick, ResponsiveTable]);

  return (
    <div className={`enhanced-markdown-renderer ${compact ? 'compact' : 'normal'} ${theme} ${className}`.trim()}>
      {showToc && tocItems.length > 0 && (
        <div className={`markdown-toc ${compact ? 'compact' : 'normal'}`}>
          <div className="toc-title">目录</div>
          <Anchor
            offsetTop={20}
            bounds={5}
            items={tocItems}
            className="toc-anchor"
          />
        </div>
      )}
      
      <div className={`markdown-content ${showToc ? 'with-toc' : 'no-toc'}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default EnhancedMarkdownRenderer;