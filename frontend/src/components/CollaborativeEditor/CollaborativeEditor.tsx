/**
 * CollaborativeEditor - 基于Yjs的协作富文本编辑器
 * 集成Lexical编辑器和Yjs CRDT实现实时协作
 */

import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import type { Provider } from '@lexical/yjs';

import { ImageNode } from '../LexicalEditor/nodes/ImageNode';
import ToolbarPlugin from '../LexicalEditor/plugins/ToolbarPlugin';
import ImagesPlugin from '../LexicalEditor/plugins/ImagesPlugin';
import theme from '../LexicalEditor/themes/EditorTheme';

import { useCollaboration } from '../../hooks/useCollaboration';
import ConnectionStatus from './ConnectionStatus';
import ActiveUsersPanel from './ActiveUsersPanel';

import './CollaborativeEditor.css';

export interface CollaborativeEditorProps {
  documentId: number;
  fieldName: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
  minHeight?: number;
  maxHeight?: number;
  enableCollaboration?: boolean;
}

function onError(error: Error) {
  console.error('Collaborative Editor Error:', error);
}

export default function CollaborativeEditor({
  documentId,
  fieldName,
  value,
  onChange,
  placeholder = '请输入内容...',
  onUploadImage,
  minHeight = 200,
  maxHeight = 600,
  enableCollaboration = true,
}: CollaborativeEditorProps): JSX.Element {
  // 使用协作Hook获取Yjs文档和WebSocket provider
  const { yDoc, provider, activeUsers, isConnected, isSynced, error } = useCollaboration({
    documentId,
    fieldName,
    enabled: enableCollaboration,
  });

  const initialConfig = {
    namespace: `CollaborativeEditor_${fieldName}`,
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      LinkNode,
      AutoLinkNode,
      ImageNode,
    ],
    editorState: null, // Yjs manages state
  };

  return (
    <div className="collaborative-editor-wrapper">
      {/* 协作状态栏 */}
      {enableCollaboration && (
        <div className="collaboration-header">
          <ConnectionStatus isConnected={isConnected} isSynced={isSynced} error={error} />
          <ActiveUsersPanel users={activeUsers} />
        </div>
      )}

      <LexicalComposer initialConfig={initialConfig}>
        <div className="lexical-editor-container">
          <ToolbarPlugin onInsertImage={() => {}} />
          <div className="lexical-editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="lexical-editor-input"
                  style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                  }}
                />
              }
              placeholder={
                <div className="lexical-editor-placeholder">{placeholder}</div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />

            {/* Yjs协作插件 */}
            {enableCollaboration && yDoc && provider && (
              <CollaborationPlugin
                id={`${documentId}_${fieldName}`}
                providerFactory={(id, yjsDocMap) => provider as unknown as Provider}
                shouldBootstrap={true}
              />
            )}

            <ListPlugin />
            <LinkPlugin />
            <ImagesPlugin onUpload={onUploadImage} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}
