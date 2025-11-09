/**
 * SmartContentRenderer - 智能内容渲染器
 * 自动检测内容格式并使用合适的渲染器
 * - Lexical JSON格式 -> LexicalViewer
 * - Markdown格式 -> MarkdownRenderer
 */

import React from 'react';
import { LexicalViewer } from './LexicalEditor';
import MarkdownRenderer from './MarkdownRenderer';

export interface SmartContentRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 检测内容是否为Lexical JSON格式
 */
function isLexicalContent(content: string): boolean {
  if (!content || !content.trim()) {
    return false;
  }

  try {
    const parsed = JSON.parse(content);
    // Lexical格式必须有root节点
    return parsed && typeof parsed === 'object' && parsed.root;
  } catch {
    return false;
  }
}

export default function SmartContentRenderer({
  content,
  className = '',
  style = {},
}: SmartContentRendererProps): JSX.Element {
  if (!content || !content.trim()) {
    return <div className={className} style={style}>暂无内容</div>;
  }

  // 检测是否为Lexical格式
  if (isLexicalContent(content)) {
    return (
      <LexicalViewer
        content={content}
        className={className}
        style={style}
      />
    );
  }

  // 默认使用Markdown渲染器
  return (
    <MarkdownRenderer
      content={content}
      className={className}
      style={style}
    />
  );
}
