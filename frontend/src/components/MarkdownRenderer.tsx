import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import MermaidRenderer from './MermaidRenderer';

// 修复 ReactMarkdown 代码组件类型定义
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  style,
  className
}) => {
  if (!content) return null;

  /**
   * 处理文本节点中的@用户高亮
   */
  const renderTextWithMentions = (text: string): React.ReactNode => {
    // 匹配 @username 模式
    const mentionPattern = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      // 添加@之前的普通文本
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // 添加高亮的@用户
      parts.push(
        <span
          key={`mention-${match.index}`}
          style={{
            color: '#1890ff',
            backgroundColor: '#e6f7ff',
            padding: '2px 4px',
            borderRadius: '3px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          title={`提及用户: ${match[1]}`}
        >
          @{match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余的文本
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }: CodeComponentProps & any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // 处理Mermaid图表
            if (!inline && language === 'mermaid') {
              const chartCode = String(children).replace(/\n$/, '');
              return (
                <MermaidRenderer 
                  chart={chartCode} 
                  id={`renderer-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                />
              );
            }
            
            // 处理其他代码块
            return !inline && match ? (
              <SyntaxHighlighter
                style={tomorrow as any}
                language={language}
                PreTag="div"
                customStyle={{ 
                  fontSize: '12px', 
                  margin: '8px 0',
                  borderRadius: '4px'
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code 
                className={className} 
                style={{
                  background: '#f5f5f5',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ href, children, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#1890ff', textDecoration: 'none' }}
              {...props}
            >
              {children}
            </a>
          ),
          img: ({ src, alt, ...props }) => (
            <img 
              src={src} 
              alt={alt} 
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                borderRadius: '4px',
                margin: '8px 0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              {...props}
            />
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote 
              style={{ 
                borderLeft: '3px solid #1890ff',
                paddingLeft: '12px',
                margin: '8px 0',
                color: '#666',
                backgroundColor: '#f9f9f9',
                padding: '8px 12px',
                borderRadius: '0 4px 4px 0'
              }}
              {...props}
            >
              {children}
            </blockquote>
          ),
          h1: ({ children, ...props }) => (
            <h1 style={{ 
              fontSize: '20px', 
              margin: '16px 0 12px 0', 
              color: '#262626',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '8px'
            }} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 style={{ 
              fontSize: '18px', 
              margin: '14px 0 10px 0', 
              color: '#262626'
            }} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 style={{ 
              fontSize: '16px', 
              margin: '12px 0 8px 0', 
              color: '#262626'
            }} {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 style={{ 
              fontSize: '14px', 
              margin: '10px 0 6px 0', 
              color: '#262626'
            }} {...props}>
              {children}
            </h4>
          ),
          ul: ({ children, ...props }) => (
            <ul style={{ 
              margin: '8px 0', 
              paddingLeft: '20px',
              lineHeight: '1.6'
            }} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol style={{ 
              margin: '8px 0', 
              paddingLeft: '20px',
              lineHeight: '1.6'
            }} {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li style={{ margin: '4px 0' }} {...props}>
              {children}
            </li>
          ),
          p: ({ children, ...props }) => {
            // 处理段落中的@用户提及
            const processChildren = (children: React.ReactNode): React.ReactNode => {
              if (typeof children === 'string') {
                return renderTextWithMentions(children);
              }
              if (Array.isArray(children)) {
                return children.map((child, index) => {
                  if (typeof child === 'string') {
                    return <React.Fragment key={index}>{renderTextWithMentions(child)}</React.Fragment>;
                  }
                  return child;
                });
              }
              return children;
            };

            return (
              <p style={{
                margin: '8px 0',
                lineHeight: '1.6',
                color: '#262626'
              }} {...props}>
                {processChildren(children)}
              </p>
            );
          },
          table: ({ children, ...props }) => (
            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
              <table 
                style={{ 
                  borderCollapse: 'collapse',
                  width: '100%',
                  border: '1px solid #d9d9d9',
                  fontSize: '13px'
                }}
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th 
              style={{ 
                border: '1px solid #d9d9d9',
                padding: '6px 10px',
                backgroundColor: '#fafafa',
                textAlign: 'left',
                fontWeight: 500
              }}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td 
              style={{ 
                border: '1px solid #d9d9d9',
                padding: '6px 10px'
              }}
              {...props}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;