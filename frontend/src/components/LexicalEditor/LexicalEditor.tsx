/**
 * Lexical 富文本编辑器
 * 集成所有插件和节点的主组件
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary as LexicalErrorBoundaryType } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

import { ImageNode } from './nodes/ImageNode';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import ImagesPlugin, { INSERT_IMAGE_COMMAND, openImagePicker } from './plugins/ImagesPlugin';
import PasteImagePlugin from './plugins/PasteImagePlugin';
import theme from './themes/EditorTheme';

import './editor.css';
import { EditorState, $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

// 生成唯一ID的计数器
let editorIdCounter = 0;

export interface LexicalEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
  minHeight?: number;
  maxHeight?: number;
}

function onError(error: Error) {
  console.error('Lexical Editor Error:', error);
}

// 初始化插件 - 用于加载初始值
function InitialValuePlugin({ value }: { value?: string }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!value || !value.trim()) {
      return;
    }

    try {
      // 尝试解析为JSON
      const parsed = JSON.parse(value);

      // 如果是Lexical的EditorState JSON格式
      if (parsed && typeof parsed === 'object' && parsed.root) {
        const parsedState = editor.parseEditorState(value);
        editor.setEditorState(parsedState);
      } else {
        // 如果不是Lexical格式,当作纯文本处理
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(value));
          root.append(paragraph);
        });
      }
    } catch (e) {
      // 解析失败,当作纯文本处理
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(value));
        root.append(paragraph);
      });
    }
  }, [editor]); // 只在editor初始化时运行一次

  return null;
}

// 图片插入处理插件
function ImageInsertPlugin({
  editorId,
  onUploadImage
}: {
  editorId: string;
  onUploadImage?: (file: File) => Promise<string>;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        try {
          let src: string;

          // 如果提供了上传函数,尝试上传图片
          if (onUploadImage) {
            try {
              src = await onUploadImage(file);
            } catch (uploadError) {
              // 上传失败,静默降级为本地预览(不显示错误,因为功能仍可用)
              console.info('图片使用本地预览模式(上传服务不可用)');
              // 降级为本地预览
              const reader = new FileReader();
              src = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              });
            }
          } else {
            // 没有上传函数,直接使用本地预览
            const reader = new FileReader();
            src = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          }

          // 插入图片节点
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            src,
            altText: file.name,
          });

          // 如果使用的是base64本地预览,友好提示用户
          if (src.startsWith('data:')) {
            console.info('✓ 图片已插入(本地预览模式)');
          }
        } catch (error) {
          console.error('图片插入失败:', error);
        }
      }
    });

    input.click();
  }, [editor, onUploadImage]);

  // 使用命名空间映射存储每个编辑器的handleInsertImage
  useEffect(() => {
    // 初始化全局编辑器映射
    if (!(window as any).__lexicalEditors) {
      (window as any).__lexicalEditors = {};
    }

    // 存储当前编辑器的图片插入函数
    (window as any).__lexicalEditors[editorId] = handleInsertImage;

    return () => {
      // 清理时删除当前编辑器的映射
      if ((window as any).__lexicalEditors) {
        delete (window as any).__lexicalEditors[editorId];
      }
    };
  }, [editorId, handleInsertImage]);

  return <></>;
}

export default function LexicalEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  onUploadImage,
  minHeight = 200,
  maxHeight = 600,
}: LexicalEditorProps): JSX.Element {
  // 为每个编辑器实例生成唯一ID
  const editorId = useMemo(() => {
    editorIdCounter++;
    return `lexical-editor-${editorIdCounter}`;
  }, []);

  const initialConfig = {
    namespace: editorId, // 使用唯一ID作为namespace
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
    // 不设置 editorState,让 Lexical 自动创建默认状态
  };

  const handleChange = (editorState: EditorState, editor: any) => {
    if (onChange) {
      editorState.read(() => {
        const json = editorState.toJSON();
        onChange(JSON.stringify(json));
      });
    }
  };

  const handleInsertImage = () => {
    // 调用当前编辑器实例的图片插入函数
    if ((window as any).__lexicalEditors?.[editorId]) {
      (window as any).__lexicalEditors[editorId]();
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor-container" data-editor-id={editorId}>
        <ToolbarPlugin onInsertImage={handleInsertImage} />
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
            ErrorBoundary={LexicalErrorBoundaryType}
          />
          <InitialValuePlugin value={value} />
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <ImagesPlugin onUpload={onUploadImage} />
          <ImageInsertPlugin editorId={editorId} onUploadImage={onUploadImage} />
          <PasteImagePlugin onUpload={onUploadImage} />
        </div>
      </div>
    </LexicalComposer>
  );
}
