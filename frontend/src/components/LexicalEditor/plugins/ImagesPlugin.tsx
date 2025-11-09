/**
 * Lexical 图片插件
 * 处理图片上传和插入
 */

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { message } from 'antd';
import { $createImageNode, ImagePayload, ImageNode } from '../nodes/ImageNode';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand();

export interface ImagesPluginProps {
  onUpload?: (file: File) => Promise<string>;
}

export default function ImagesPlugin({ onUpload }: ImagesPluginProps): null {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editor.hasNodes([ImageNode as any])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  // 处理图片文件选择
  const handleImageUpload = async (file: File) => {
    try {
      // 显示上传中提示
      const hide = message.loading('正在上传图片...', 0);

      let imageUrl: string;

      if (onUpload) {
        // 使用自定义上传函数
        imageUrl = await onUpload(file);
      } else {
        // 默认：将图片转换为 Base64
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to read image'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      hide();

      // 插入图片到编辑器
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: imageUrl,
        altText: file.name,
      });

      message.success('图片上传成功');
    } catch (error: any) {
      console.error('Image upload error:', error);
      message.error(error?.message || '图片上传失败');
    }
  };

  // 创建文件输入元素
  useEffect(() => {
    if (!inputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          await handleImageUpload(file);
          // 清空input值，允许重复选择同一文件
          target.value = '';
        }
      });
      document.body.appendChild(input);
      inputRef.current = input;
    }

    return () => {
      if (inputRef.current) {
        document.body.removeChild(inputRef.current);
        inputRef.current = null;
      }
    };
  }, [editor, onUpload]);

  // 暴露打开文件选择器的方法
  useEffect(() => {
    // 注册一个自定义命令来触发文件选择
    const OPEN_IMAGE_PICKER = createCommand<void>();

    return editor.registerCommand(
      OPEN_IMAGE_PICKER,
      () => {
        inputRef.current?.click();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}

// 导出便捷函数
export function openImagePicker(editor: any) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.click();

  return new Promise<File>((resolve, reject) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    });
  });
}
