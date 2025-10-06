import React, { useMemo } from 'react';
import { Card, Space, Statistic, Button, message } from 'antd';
import { CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocumentPreviewProps {
  content: string;
}

/**
 * 文档预览组件
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = ({ content }) => {
  // 统计信息
  const stats = useMemo(() => {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;

    return {
      lines,
      words,
      chars,
      chineseChars,
    };
  }, [content]);

  /**
   * 复制到剪贴板
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('已复制到剪贴板');
    } catch (err) {
      message.error('复制失败');
      console.error('复制失败:', err);
    }
  };

  return (
    <div>
      {/* 统计信息和操作 */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space size="large">
            <Statistic
              title="行数"
              value={stats.lines}
              valueStyle={{ fontSize: 16 }}
              prefix={<FileTextOutlined />}
            />
            <Statistic
              title="单词"
              value={stats.words}
              valueStyle={{ fontSize: 16 }}
            />
            <Statistic
              title="字符"
              value={stats.chars}
              valueStyle={{ fontSize: 16 }}
            />
            <Statistic
              title="中文字符"
              value={stats.chineseChars}
              valueStyle={{ fontSize: 16 }}
            />
          </Space>

          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            type="primary"
            ghost
          >
            复制文档
          </Button>
        </div>
      </Card>

      {/* Markdown渲染 */}
      <Card
        bodyStyle={{
          padding: '24px',
          maxHeight: '500px',
          overflowY: 'auto',
        }}
      >
        <div className="markdown-preview">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 代码块高亮
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // 表格样式
              table({ children }) {
                return (
                  <table
                    style={{
                      borderCollapse: 'collapse',
                      width: '100%',
                      marginTop: 16,
                      marginBottom: 16,
                    }}
                  >
                    {children}
                  </table>
                );
              },
              // 表头样式
              thead({ children }) {
                return (
                  <thead style={{ backgroundColor: '#fafafa' }}>
                    {children}
                  </thead>
                );
              },
              // 单元格样式
              th({ children }) {
                return (
                  <th
                    style={{
                      border: '1px solid #d9d9d9',
                      padding: '8px 12px',
                      textAlign: 'left',
                    }}
                  >
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td
                    style={{
                      border: '1px solid #d9d9d9',
                      padding: '8px 12px',
                    }}
                  >
                    {children}
                  </td>
                );
              },
              // 标题样式
              h1({ children }) {
                return (
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      marginTop: 24,
                      marginBottom: 16,
                      borderBottom: '1px solid #e8e8e8',
                      paddingBottom: 8,
                    }}
                  >
                    {children}
                  </h1>
                );
              },
              h2({ children }) {
                return (
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      marginTop: 20,
                      marginBottom: 12,
                      borderBottom: '1px solid #f0f0f0',
                      paddingBottom: 6,
                    }}
                  >
                    {children}
                  </h2>
                );
              },
              h3({ children }) {
                return (
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      marginTop: 16,
                      marginBottom: 10,
                    }}
                  >
                    {children}
                  </h3>
                );
              },
              // 段落样式
              p({ children }) {
                return (
                  <p
                    style={{
                      marginTop: 8,
                      marginBottom: 8,
                      lineHeight: 1.8,
                    }}
                  >
                    {children}
                  </p>
                );
              },
              // 列表样式
              ul({ children }) {
                return (
                  <ul
                    style={{
                      marginTop: 8,
                      marginBottom: 8,
                      paddingLeft: 24,
                    }}
                  >
                    {children}
                  </ul>
                );
              },
              ol({ children }) {
                return (
                  <ol
                    style={{
                      marginTop: 8,
                      marginBottom: 8,
                      paddingLeft: 24,
                    }}
                  >
                    {children}
                  </ol>
                );
              },
              // 链接样式
              a({ children, href }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff' }}
                  >
                    {children}
                  </a>
                );
              },
              // 引用样式
              blockquote({ children }) {
                return (
                  <blockquote
                    style={{
                      borderLeft: '4px solid #d9d9d9',
                      paddingLeft: 16,
                      marginLeft: 0,
                      marginRight: 0,
                      color: '#595959',
                      fontStyle: 'italic',
                    }}
                  >
                    {children}
                  </blockquote>
                );
              },
              // 内联代码样式
              inlineCode({ children }) {
                return (
                  <code
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: '0.9em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </Card>
    </div>
  );
};

export default DocumentPreview;
