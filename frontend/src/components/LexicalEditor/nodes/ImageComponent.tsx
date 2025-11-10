/**
 * Lexical 图片组件
 * 显示图片并支持交互操作
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from 'lexical';
import { $isImageNode } from './ImageNode';
import ImagePreviewModal from '../components/ImagePreviewModal';

export interface ImageComponentProps {
  src: string;
  altText: string;
  width: 'inherit' | number;
  height: 'inherit' | number;
  maxWidth: number;
  nodeKey: NodeKey;
}

export default function ImageComponent({
  src,
  altText,
  width,
  height,
  maxWidth,
  nodeKey,
}: ImageComponentProps): JSX.Element {
  const imageRef = useRef<null | HTMLImageElement>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.remove();
        }
        setSelected(false);
      }
      return false;
    },
    [isSelected, nodeKey, setSelected],
  );

  // 处理图片点击 - 单击预览，双击选中
  const handleImageClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 双击打开预览
    if (event.detail === 2) {
      setPreviewVisible(true);
      return true;
    }

    // 单击选中（用于删除等操作）
    if (!event.shiftKey) {
      clearSelection();
    }
    setSelected(!isSelected);
    return true;
  }, [isSelected, setSelected, clearSelection]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload;
          if (event.target === imageRef.current) {
            return handleImageClick(event);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected, handleImageClick]);

  return (
    <Suspense fallback={null}>
      <div style={{ display: 'inline-block', position: 'relative' }}>
        <img
          ref={imageRef}
          src={src}
          alt={altText}
          style={{
            maxWidth: maxWidth,
            width: width === 'inherit' ? 'auto' : width,
            height: height === 'inherit' ? 'auto' : height,
            cursor: 'pointer',
            border: isSelected ? '2px solid #1890ff' : 'none',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
          }}
          draggable="false"
          title="双击查看大图"
        />

        {/* 悬浮提示 */}
        {!isSelected && (
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              padding: '2px 6px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
              fontSize: '11px',
              borderRadius: '3px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
            }}
            className="image-hover-tip"
          >
            双击预览
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        visible={previewVisible}
        src={src}
        alt={altText}
        onClose={() => setPreviewVisible(false)}
      />

      <style>{`
        img:hover + .image-hover-tip,
        .image-hover-tip:hover {
          opacity: 1 !important;
        }
      `}</style>
    </Suspense>
  );
}
