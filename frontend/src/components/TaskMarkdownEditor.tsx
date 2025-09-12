import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { renderMermaidDiagram, createErrorContainer, createLoadingContainer } from '../utils/mermaidUtils';

// 修复 ReactMarkdown 代码组件类型定义
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Mermaid图表组件
interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const renderingRef = useRef(false); // 防止重复渲染

  useEffect(() => {
    const renderMermaid = async () => {
      // 始终渲染到同一个容器，避免加载态使用另一个元素导致 ref 不存在
      if (!ref.current || renderingRef.current) return;

      // 先显示加载占位内容
      ref.current.innerHTML = createLoadingContainer();
      setError(null);
      renderingRef.current = true;

      try {
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
        } else {
          throw new Error('未知的渲染结果');
        }
      } catch (err: any) {
        const errorMessage = err.message || '图表渲染失败';
        console.error('❌ [TaskMarkdownEditor] Mermaid 渲染错误:', errorMessage);
        setError(errorMessage);

        if (ref.current) {
          ref.current.innerHTML = createErrorContainer(errorMessage, chart);
        }
      } finally {
        renderingRef.current = false;
      }
    };

    renderMermaid();
  }, [chart, id]);

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

const { TextArea } = Input;

interface TaskMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  style?: React.CSSProperties;
}

const TaskMarkdownEditor: React.FC<TaskMarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入任务描述（支持Markdown格式）',
  disabled = false,
  rows = 4,
  style = {},
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const handleInsertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('.task-markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newValue);
    
    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const renderEditor = () => (
    <div>
      {/* 简化工具栏 */}
      <div style={{ 
        marginBottom: '8px', 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <Button.Group >
          <Button
            type={mode === 'edit' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => setMode('edit')}
          >
            编辑
          </Button>
          <Button
            type={mode === 'preview' ? 'primary' : 'default'}
            icon={<EyeOutlined />}
            onClick={() => setMode('preview')}
          >
            预览
          </Button>
        </Button.Group>
        
        {mode === 'edit' && !disabled && (
          <Button.Group >
            <Button
              onClick={() => handleInsertMarkdown('**', '**')}
              title="粗体"
            >
              <strong>B</strong>
            </Button>
            <Button
              onClick={() => handleInsertMarkdown('*', '*')}
              title="斜体"
            >
              <em>I</em>
            </Button>
            <Button
              onClick={() => handleInsertMarkdown('[', '](url)')}
              title="链接"
            >
              🔗
            </Button>
            <Button
              onClick={() => handleInsertMarkdown('- ')}
              title="列表"
            >
              •
            </Button>
            <Button
              onClick={() => handleInsertMarkdown('```\n', '\n```')}
              title="代码块"
            >
              {'</>'}
            </Button>
            <Button
              onClick={() => handleInsertMarkdown('```mermaid\n', '\n```')}
              title="Mermaid流程图"
            >
              📊
            </Button>
          </Button.Group>
        )}
      </div>

      {/* 编辑器内容 */}
      {mode === 'edit' ? (
        <TextArea
          className="task-markdown-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={{
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            // 当外层有flex: 1时，让TextArea也占满空间
            ...(style?.flex === 1 ? {
              height: '100%',
              minHeight: '400px',
              resize: 'none',
              overflow: 'auto' // 确保TextArea有滚动条
            } : {})
          }}
        />
      ) : (
        <div
          style={{
            minHeight: style?.flex === 1 ? '400px' : `${rows * 22}px`,
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            padding: '15px 50px',
            backgroundColor: '#fafafa',
            overflow: 'auto',
            zIndex: 1, // 预览区域只需要基础层级
            position: 'relative', // 需要设置position才能生效z-index
            // 全屏时让预览区域也占满空间
            ...(style?.flex === 1 ? {
              height: '100%',
              flex: 1
            } : {})
          }}
        >
          {value ? (
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
                <MermaidDiagram 
            chart={chartCode} 
            id={`preview-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                />
              );
            }
            
            // 处理其他代码块
            return !inline && match ? (
              <SyntaxHighlighter
                style={tomorrow as any}
                language={language}
                PreTag="div"
                customStyle={{ fontSize: '12px', margin: '8px 0' }}
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
            fontSize: '12px'
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
              style={{ color: '#1890ff' }}
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
                margin: '8px 0'
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
            <h1 style={{ fontSize: '18px', margin: '12px 0 8px 0', color: '#262626' }} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 style={{ fontSize: '16px', margin: '10px 0 6px 0', color: '#262626' }} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 style={{ fontSize: '14px', margin: '8px 0 4px 0', color: '#262626' }} {...props}>
              {children}
            </h3>
          ),
          ul: ({ children, ...props }) => (
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }} {...props}>
              {children}
            </ol>
          ),
          p: ({ children, ...props }) => (
            <p style={{ margin: '6px 0', lineHeight: '1.6' }} {...props}>
              {children}
            </p>
          ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <div style={{ 
              color: '#8c8c8c',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '16px 0'
            }}>
              开始编写内容，支持Markdown格式...
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={style}>
      {renderEditor()}
    </div>
  );
};

export default TaskMarkdownEditor;