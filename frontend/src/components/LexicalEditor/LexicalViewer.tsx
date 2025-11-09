/**
 * Lexical 查看器 - 只读模式显示Lexical内容
 * 用于在详情页显示富文本内容
 */

import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary as LexicalErrorBoundaryType } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

import { ImageNode } from './nodes/ImageNode';
import theme from './themes/EditorTheme';

import './editor.css';

export interface LexicalViewerProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

function onError(error: Error) {
  console.error('Lexical Viewer Error:', error);
}

// 内容加载插件
function ContentLoaderPlugin({ content }: { content: string }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!content || !content.trim()) {
      return;
    }

    try {
      // 尝试解析为JSON
      const parsed = JSON.parse(content);

      // 如果是Lexical的EditorState JSON格式
      if (parsed && typeof parsed === 'object' && parsed.root) {
        const parsedState = editor.parseEditorState(content);
        editor.setEditorState(parsedState);
      } else {
        // 如果不是Lexical格式,当作纯文本处理
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(content));
          root.append(paragraph);
        });
      }
    } catch (e) {
      // 解析失败,当作纯文本处理
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(content));
        root.append(paragraph);
      });
    }
  }, [editor, content]);

  return null;
}

// 只读插件
function ReadOnlyPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(false);
  }, [editor]);

  return null;
}

export default function LexicalViewer({
  content,
  className = '',
  style = {},
}: LexicalViewerProps): JSX.Element {
  const initialConfig = {
    namespace: 'LexicalViewer',
    theme,
    onError,
    editable: false,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      LinkNode,
      AutoLinkNode,
      ImageNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={`lexical-viewer-container ${className}`}
        style={style}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="lexical-viewer-content"
            />
          }
          placeholder={<div />}
          ErrorBoundary={LexicalErrorBoundaryType}
        />
        <ContentLoaderPlugin content={content} />
        <ReadOnlyPlugin />
      </div>
    </LexicalComposer>
  );
}
