/**
 * Lexical 图片粘贴插件
 * 支持从剪贴板直接粘贴图片（Ctrl+V / Cmd+V）
 *
 * 功能特性：
 * 1. 支持粘贴剪贴板中的图片文件
 * 2. 支持粘贴截图（Snipaste、QQ截图等）
 * 3. 支持从其他网页复制图片后粘贴
 * 4. 自动上传或转换为Base64
 */

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { message } from 'antd';
import { INSERT_IMAGE_COMMAND } from './ImagesPlugin';

export interface PasteImagePluginProps {
  onUpload?: (file: File) => Promise<string>;
  maxSize?: number; // 最大文件大小（字节），默认10MB
  acceptTypes?: string[]; // 接受的图片类型，默认所有图片
}

export default function PasteImagePlugin({
  onUpload,
  maxSize = 10 * 1024 * 1024, // 默认10MB
  acceptTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
}: PasteImagePluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // 监听粘贴事件
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const selection = $getSelection();

        // 只在有选区时处理
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const clipboardData = event.clipboardData;
        if (!clipboardData || !clipboardData.items) {
          return false;
        }

        // 查找剪贴板中的图片
        const items = Array.from(clipboardData.items);
        const imageItem = items.find(item => item.type.startsWith('image/'));

        if (!imageItem) {
          // 没有图片，让默认粘贴行为继续
          return false;
        }

        // 阻止默认粘贴行为
        event.preventDefault();

        // 获取图片文件
        const file = imageItem.getAsFile();
        if (!file) {
          return false;
        }

        // 验证文件类型
        if (!acceptTypes.includes(file.type)) {
          message.error(`不支持的图片格式: ${file.type}`);
          return true;
        }

        // 验证文件大小
        if (file.size > maxSize) {
          message.error(`图片大小超过限制 (最大 ${Math.round(maxSize / 1024 / 1024)}MB)`);
          return true;
        }

        // 处理图片插入
        handleImagePaste(file);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onUpload, maxSize, acceptTypes]);

  /**
   * 处理粘贴的图片
   */
  const handleImagePaste = async (file: File) => {
    try {
      // 显示上传中提示
      const hide = message.loading('正在处理粘贴的图片...', 0);

      let imageUrl: string;

      try {
        if (onUpload) {
          // 尝试上传图片到服务器
          imageUrl = await onUpload(file);
          console.info('✓ 图片已上传到服务器');
        } else {
          // 没有上传函数，使用Base64本地预览
          imageUrl = await convertToBase64(file);
          console.info('✓ 图片使用本地预览模式');
        }
      } catch (uploadError) {
        // 上传失败，降级为本地预览
        console.info('图片上传失败，降级为本地预览模式', uploadError);
        imageUrl = await convertToBase64(file);
      }

      hide();

      // 插入图片到编辑器
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: imageUrl,
        altText: file.name || '粘贴的图片',
      });

      // 友好提示
      if (imageUrl.startsWith('data:')) {
        message.success('图片已插入（本地预览模式）');
      } else {
        message.success('图片已插入');
      }
    } catch (error) {
      console.error('处理粘贴图片失败:', error);
      message.error('图片插入失败，请重试');
    }
  };

  /**
   * 将文件转换为Base64
   */
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to Base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  return null;
}
