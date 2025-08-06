import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { renderMermaidDiagram, createErrorContainer, createLoadingContainer } from '../utils/mermaidUtils';

// Mermaid图表组件
interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderingRef = useRef(false); // 防止重复渲染

  useEffect(() => {
    const renderMermaid = async () => {
      if (!ref.current || renderingRef.current) return;
      
      setIsLoading(true);
      setError(null);
      renderingRef.current = true;
      
      try {
        console.log('🎨 [MarkdownRenderer] 开始渲染 Mermaid 图表...');
        
        // 使用统一的渲染工具
        const result = await renderMermaidDiagram(chart, id);
        
        if (result.error) {
          // 渲染失败
          setError(result.error);
          if (ref.current) {
            ref.current.innerHTML = createErrorContainer(result.error, chart);
          }
        } else if (result.svg && ref.current) {
          // 渲染成功
          ref.current.innerHTML = result.svg;
          setError(null);
          console.log('✅ [MarkdownRenderer] Mermaid 图表渲染成功');
        } else {
          throw new Error('未知的渲染结果');
        }
      } catch (err: any) {
        const errorMessage = err.message || '图表渲染失败';
        console.error('❌ [MarkdownRenderer] Mermaid 渲染错误:', errorMessage);
        setError(errorMessage);
        
        if (ref.current) {
          ref.current.innerHTML = createErrorContainer(errorMessage, chart);
        }
      } finally {
        setIsLoading(false);
        renderingRef.current = false;
      }
    };

    renderMermaid();
  }, [chart, id]);

  if (isLoading) {
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: createLoadingContainer() }}
      />
    );
  }

  if (error) {
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: createErrorContainer(error, chart) }}
      />
    );
  }

  return (
    <div 
      ref={ref} 
      style={{
        textAlign: 'center',
        margin: '16px 0',
        padding: '10px',
        border: '1px solid #e8e8e8',
        borderRadius: '6px',
        background: '#fafafa',
        minHeight: '100px' // 确保有最小高度显示内容
      }}
    />
  );
};

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

  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // 处理Mermaid图表
            if (!inline && language === 'mermaid') {
              const chartCode = String(children).replace(/\n$/, '');
              return (
                <MermaidDiagram 
                  chart={chartCode} 
                  id={`renderer-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                />
              );
            }
            
            // 处理其他代码块
            return !inline && match ? (
              <SyntaxHighlighter
                style={tomorrow}
                language={language}
                PreTag="div"
                customStyle={{ 
                  fontSize: '12px', 
                  margin: '8px 0',
                  borderRadius: '4px'
                }}
                {...props}
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
          p: ({ children, ...props }) => (
            <p style={{ 
              margin: '8px 0', 
              lineHeight: '1.6',
              color: '#262626'
            }} {...props}>
              {children}
            </p>
          ),
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