/**
 * 任务评论输入组件
 * Task Comment Input Component
 */

import React, { useState } from 'react';
import { Input, Button, Space, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { createComment } from '../../services/taskCommentService';
import { COMMENT_CONSTANTS } from '../../types/taskComment';

const { TextArea } = Input;

export interface CommentInputProps {
  taskId: number;
  placeholder?: string;
  onCommentAdded?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 评论输入组件
 */
const CommentInput: React.FC<CommentInputProps> = ({
  taskId,
  placeholder = '添加评论...',
  onCommentAdded,
  className = '',
  style = {}
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 字符计数
  const charCount = content.length;
  const maxLength = COMMENT_CONSTANTS.MAX_LENGTH;
  const isOverLimit = charCount > maxLength;

  /**
   * 提交评论
   */
  const handleSubmit = async () => {
    // 验证内容
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      message.warning('评论内容不能为空');
      return;
    }

    if (isOverLimit) {
      message.error(`评论内容不能超过${maxLength}个字符`);
      return;
    }

    setLoading(true);
    try {
      await createComment(taskId, trimmedContent);
      message.success('评论添加成功');
      setContent(''); // 清空输入框
      onCommentAdded?.(); // 通知父组件刷新评论列表
    } catch (error: any) {
      console.error('Failed to create comment:', error);
      message.error(error?.message || '添加评论失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理键盘事件 (Ctrl+Enter提交)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`comment-input ${className}`} style={style}>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoSize={{ minRows: 2, maxRows: 6 }}
        maxLength={maxLength + 1} // 允许输入超过限制以显示错误提示
        disabled={loading}
      />

      <div className="comment-input-footer" style={{
        marginTop: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '12px',
          color: isOverLimit ? '#ff4d4f' : '#8c8c8c'
        }}>
          {charCount} / {maxLength}
        </span>

        <Space>
          <Button
            size="small"
            onClick={() => setContent('')}
            disabled={!content || loading}
          >
            清空
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!content.trim() || isOverLimit}
          >
            评论 <span style={{ fontSize: '11px', opacity: 0.7 }}>(Ctrl+Enter)</span>
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default CommentInput;
