/**
 * EnhancedCodeBlock - 增强的代码块组件
 * 
 * 特性:
 * - 语法高亮支持
 * - 行号显示
 * - 一键复制功能
 * - 多种主题支持
 * - 语言标签显示
 */

import React, { useState, useCallback } from 'react';
import { Button, message, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './EnhancedCodeBlock.css';

export interface EnhancedCodeBlockProps {
  children: string;
  language?: string;
  showLineNumbers?: boolean;
  theme?: 'dark' | 'light';
  compact?: boolean;
  maxHeight?: number;
  fileName?: string;
}

const EnhancedCodeBlock: React.FC<EnhancedCodeBlockProps> = ({
  children,
  language = 'text',
  showLineNumbers = true,
  theme = 'dark',
  compact = false,
  maxHeight,
  fileName
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 处理复制功能
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      message.success('代码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      message.error('复制失败，请手动复制');
    }
  }, [children]);

  // 获取语言显示名称
  const getLanguageLabel = (lang: string): string => {
    const langMap: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      jsx: 'JSX',
      tsx: 'TSX',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      swift: 'Swift',
      kotlin: 'Kotlin',
      scala: 'Scala',
      sql: 'SQL',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      less: 'LESS',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      yml: 'YAML',
      toml: 'TOML',
      markdown: 'Markdown',
      bash: 'Bash',
      sh: 'Shell',
      powershell: 'PowerShell',
      dockerfile: 'Dockerfile',
      nginx: 'Nginx',
      apache: 'Apache',
      text: 'Text'
    };
    return langMap[lang.toLowerCase()] || lang.toUpperCase();
  };

  const codeStyle = theme === 'dark' ? vscDarkPlus : vs;
  const shouldShowExpand = maxHeight && children.split('\n').length > (compact ? 15 : 20);
  const displayHeight = isExpanded ? undefined : maxHeight;

  return (
    <div className={`enhanced-code-block ${compact ? 'compact' : 'normal'}`}>
      {/* 代码块头部 */}
      <div className={`code-header ${theme}`}>
        <div className="code-header-left">
          {fileName && (
            <span className="file-name">{fileName}</span>
          )}
          <span className="language-label">
            {getLanguageLabel(language)}
          </span>
        </div>
        
        <div className="code-header-right">
          <Tooltip title={copied ? '已复制' : '复制代码'}>
            <Button 
              size="small"
              type="text"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
              className={`copy-button ${theme} ${copied ? 'copied' : ''}`}
            >
              {copied ? '已复制' : '复制'}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 代码内容 */}
      <div 
        className="code-content-wrapper"
        style={{ 
          maxHeight: displayHeight,
          overflow: displayHeight ? 'hidden' : 'auto'
        }}
      >
        <SyntaxHighlighter
          language={language}
          style={codeStyle}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            opacity: 0.6
          }}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: compact ? '12px' : '13px',
            lineHeight: compact ? '1.4' : '1.5',
            background: 'transparent'
          }}
          codeTagProps={{
            style: {
              fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace'
            }
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>

      {/* 展开/收起按钮 */}
      {shouldShowExpand && (
        <div className={`code-expand-button ${theme}`}>
          <Button
            size="small"
            type="text"
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-btn"
          >
            {isExpanded ? '收起' : `展开全部 (${children.split('\n').length} 行)`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedCodeBlock;