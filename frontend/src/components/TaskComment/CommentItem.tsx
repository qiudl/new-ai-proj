/**
 * 任务评论项组件
 * Task Comment Item Component
 */

import React from 'react';
import { Avatar, Button, Popconfirm, Space, Typography, message } from 'antd';
import { UserOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { TaskComment } from '../../types/taskComment';
import { deleteComment } from '../../services/taskCommentService';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

export interface CommentItemProps {
  comment: TaskComment;
  taskId: number;
  onDeleted?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 评论项组件
 */
const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  taskId,
  onDeleted,
  className = '',
  style = {}
}) => {
  const [deleting, setDeleting] = React.useState(false);

  /**
   * 删除评论
   */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteComment(taskId, comment.id);
      message.success('评论已删除');
      onDeleted?.(); // 通知父组件刷新列表
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      message.error(error?.message || '删除评论失败');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 格式化时间
   */
  const formatTime = (timeStr: string) => {
    return dayjs(timeStr).fromNow();
  };

  return (
    <div
      className={`comment-item ${className}`}
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        ...style
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* 用户头像 */}
        <Avatar
          src={comment.user?.avatar}
          icon={<UserOutlined />}
          size="default"
        />

        {/* 评论内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 评论头部 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <Space size={8}>
              <Text strong>{comment.user?.name || '未知用户'}</Text>
              <Text
                type="secondary"
                style={{ fontSize: '12px' }}
              >
                {formatTime(comment.created_at)}
              </Text>
            </Space>

            {/* 删除按钮 (仅作者可见) */}
            {comment.can_delete && (
              <Popconfirm
                title="确定要删除这条评论吗?"
                description="删除后无法恢复"
                onConfirm={handleDelete}
                okText="确定"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  danger
                  style={{ opacity: 0.6 }}
                />
              </Popconfirm>
            )}
          </div>

          {/* 评论正文 */}
          <div style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#262626',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {comment.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
