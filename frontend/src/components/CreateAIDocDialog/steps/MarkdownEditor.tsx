import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, Space, Statistic, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import MdEditor from 'react-markdown-editor-lite';
import MarkdownIt from 'markdown-it';
import 'react-markdown-editor-lite/lib/index.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

/**
 * Markdown编辑器组件
 *
 * 功能:
 * - 实时Markdown编辑
 * - 分屏预览
 * - 工具栏快捷操作
 * - 文档统计信息
 * - 快捷键支持
 */
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ content, onChange }) => {
  const editorRef = useRef<MdEditor | null>(null);

  // 初始化Markdown解析器
  const mdParser = useMemo(() => {
    return new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });
  }, []);

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
   * 处理编辑器内容变化
   */
  const handleEditorChange = useCallback(
    ({ text }: { text: string; html: string }) => {
      onChange(text);
    },
    [onChange]
  );

  /**
   * 处理图片上传
   */
  const handleImageUpload = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 简化实现: 使用FileReader转换为base64
      // 生产环境建议上传到服务器或OSS
      const reader = new FileReader();

      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve(base64);
        message.success('图片插入成功');
      };

      reader.onerror = () => {
        reject(new Error('图片读取失败'));
        message.error('图片上传失败');
      };

      reader.readAsDataURL(file);
    });
  }, []);

  // 设置编辑器初始内容
  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.setText(content);
    }
  }, []);

  return (
    <div>
      {/* 统计信息 */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '12px 16px' }}
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
      </Card>

      {/* Markdown编辑器 */}
      <Card bodyStyle={{ padding: 0 }}>
        <MdEditor
          ref={editorRef}
          value={content}
          style={{ height: '500px' }}
          renderHTML={(text) => mdParser.render(text)}
          onChange={handleEditorChange}
          onImageUpload={handleImageUpload}
          config={{
            view: {
              menu: true,
              md: true,
              html: true,
            },
            canView: {
              menu: true,
              md: true,
              html: true,
              fullScreen: true,
              hideMenu: true,
            },
            shortcuts: true,
            imageUrl: '',
            linkUrl: '',
            table: {
              maxRow: 10,
              maxCol: 10,
            },
            syncScrollMode: ['leftFollowRight', 'rightFollowLeft'],
          }}
          placeholder="在此编辑文档内容..."
        />
      </Card>

      {/* 提示信息 */}
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: '#8c8c8c',
          textAlign: 'center',
        }}
      >
        💡 提示: 支持快捷键 Ctrl+B(加粗)、Ctrl+I(斜体)、Ctrl+K(插入链接) 等
      </div>
    </div>
  );
};

export default MarkdownEditor;
