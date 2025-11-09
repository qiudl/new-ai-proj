/**
 * 需求评论项组件
 * Requirement Comment Item Component
 */

import React, { useState } from 'react';
import { Avatar, Button, Popconfirm, Space, Tag, Typography, Tooltip, message } from 'antd';
import {
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  PushpinOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  RequirementComment,
  COMMENT_TYPE_CONFIG,
  RequirementCommentType,
} from '../../types/requirementComment';
import { deleteComment } from '../../services/requirementCommentService';
import MarkdownRenderer from '../MarkdownRenderer';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

export interface RequirementCommentItemProps {
  comment: RequirementComment;
  requirementId: number;
  currentUserId?: number;
  currentUserType?: string;
  onDeleted?: () => void;
  onReply?: (comment: RequirementComment) => void;
  onEdit?: (comment: RequirementComment) => void;
  onTogglePin?: (commentId: number, isPinned: boolean) => void;
  showReplies?: boolean;
  depth?: number; // 嵌套深度
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 需求评论项组件
 */
const RequirementCommentItem: React.FC<RequirementCommentItemProps> = ({
  comment,
  requirementId,
  currentUserId,
  currentUserType = 'client',
  onDeleted,
  onReply,
  onEdit,
  onTogglePin,
  showReplies = true,
  depth = 0,
  className = '',
  style = {},
}) => {
  const [deleting, setDeleting] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  // 判断是否是评论作者
  const isAuthor = currentUserId === comment.user_id;

  // 判断是否可以删除
  const canDelete = isAuthor || currentUserType === 'system';

  // 判断是否可以编辑
  const canEdit = isAuthor;

  // 判断是否可以置顶（仅系统用户）
  const canPin = currentUserType === 'system';

  // 判断是否可以查看（内部评论仅系统用户可见）
  const canView = !comment.is_internal || currentUserType === 'system';

  /**
   * 删除评论
   */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteComment(requirementId, comment.id);
      message.success('评论已删除');
      // 使用setTimeout避免与message.success的flushSync冲突
      setTimeout(() => {
        onDeleted?.();
      }, 0);
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

  /**
   * 获取评论类型配置
   */
  const getCommentTypeConfig = (type: string) => {
    return COMMENT_TYPE_CONFIG[type as RequirementCommentType] || COMMENT_TYPE_CONFIG[RequirementCommentType.General];
  };

  // 如果不可见，不渲染
  if (!canView) {
    return null;
  }

  const typeConfig = getCommentTypeConfig(comment.comment_type);

  return (
    <div
      className={`requirement-comment-item ${className}`}
      style={{
        padding: '12px 0',
        paddingLeft: depth > 0 ? `${depth * 24}px` : '0',
        borderBottom: depth === 0 ? '1px solid #f0f0f0' : 'none',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* 用户头像 */}
        <Avatar
          src={comment.user_avatar}
          icon={<UserOutlined />}
          size={depth > 0 ? 'small' : 'default'}
        />

        {/* 评论内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 评论头部 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}
          >
            <Space size={8} wrap>
              <Text strong>{comment.username || '未知用户'}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formatTime(comment.created_at)}
              </Text>

              {/* 评论类型标签 */}
              {comment.comment_type !== RequirementCommentType.General && (
                <Tag color={typeConfig.color} style={{ fontSize: '11px' }}>
                  {typeConfig.icon} {typeConfig.label}
                </Tag>
              )}

              {/* 置顶标记 */}
              {comment.is_pinned && (
                <Tag color="red" icon={<PushpinOutlined />} style={{ fontSize: '11px' }}>
                  置顶
                </Tag>
              )}

              {/* 内部评论标记 */}
              {comment.is_internal && (
                <Tag color="orange" icon={<LockOutlined />} style={{ fontSize: '11px' }}>
                  内部
                </Tag>
              )}

              {/* 已提及用户 */}
              {comment.mentioned_count > 0 && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  @{comment.mentioned_count}人
                </Text>
              )}
            </Space>

            {/* 操作按钮 */}
            <Space size={4}>
              {/* 回复按钮 */}
              <Tooltip title="回复">
                <Button
                  type="text"
                  size="small"
                  icon={<MessageOutlined />}
                  onClick={() => onReply?.(comment)}
                  style={{ opacity: 0.6 }}
                />
              </Tooltip>

              {/* 编辑按钮 */}
              {canEdit && (
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit?.(comment)}
                    style={{ opacity: 0.6 }}
                  />
                </Tooltip>
              )}

              {/* 置顶按钮 */}
              {canPin && (
                <Tooltip title={comment.is_pinned ? '取消置顶' : '置顶'}>
                  <Button
                    type="text"
                    size="small"
                    icon={<PushpinOutlined />}
                    onClick={() => onTogglePin?.(comment.id, !comment.is_pinned)}
                    style={{
                      opacity: 0.6,
                      color: comment.is_pinned ? '#ff4d4f' : undefined,
                    }}
                  />
                </Tooltip>
              )}

              {/* 删除按钮 */}
              {canDelete && (
                <Popconfirm
                  title="确定要删除这条评论吗?"
                  description="删除后无法恢复"
                  onConfirm={handleDelete}
                  okText="确定"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deleting}
                      danger
                      style={{ opacity: 0.6 }}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          </div>

          {/* 评论正文 - 使用 MarkdownRenderer 支持 @用户高亮 */}
          <div style={{ marginBottom: '8px' }}>
            <MarkdownRenderer
              content={comment.content}
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#262626',
              }}
            />
          </div>

          {/* 提及的用户列表 */}
          {comment.mentioned_users && comment.mentioned_users.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <Space size={4} wrap>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  提及:
                </Text>
                {comment.mentioned_users.map((user) => (
                  <Tag
                    key={user.user_id}
                    style={{ fontSize: '11px', margin: '0 2px' }}
                  >
                    @{user.username}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* 附件列表 */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Space size={8} wrap>
                {comment.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px' }}
                  >
                    📎 {attachment.name}
                  </a>
                ))}
              </Space>
            </div>
          )}

          {/* 回复列表 */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              {comment.replies.map((reply) => (
                <RequirementCommentItem
                  key={reply.id}
                  comment={reply}
                  requirementId={requirementId}
                  currentUserId={currentUserId}
                  currentUserType={currentUserType}
                  onDeleted={onDeleted}
                  onReply={onReply}
                  onEdit={onEdit}
                  onTogglePin={onTogglePin}
                  showReplies={true}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}

          {/* 回复计数 */}
          {comment.replies_count > 0 && (!comment.replies || comment.replies.length === 0) && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {comment.replies_count} 条回复
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequirementCommentItem;
