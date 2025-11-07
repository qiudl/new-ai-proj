/**
 * 需求评论输入组件
 * Requirement Comment Input Component
 */

import React, { useState } from 'react';
import { Button, Space, Select, Switch, message, Tooltip } from 'antd';
import { SendOutlined, LockOutlined } from '@ant-design/icons';
import {
  RequirementCommentType,
  COMMENT_TYPE_CONFIG,
  REQUIREMENT_COMMENT_CONSTANTS,
  CreateRequirementCommentRequest,
} from '../../types/requirementComment';
import { createComment } from '../../services/requirementCommentService';
import MentionInput from '../MentionInput';

const { Option } = Select;

export interface RequirementCommentInputProps {
  requirementId: number;
  parentCommentId?: number; // 如果是回复评论，传入父评论ID
  placeholder?: string;
  onCommentAdded?: () => void;
  onCancel?: () => void; // 取消回复
  currentUserType?: string; // 当前用户类型，用于判断是否显示内部评论开关
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 需求评论输入组件
 */
const RequirementCommentInput: React.FC<RequirementCommentInputProps> = ({
  requirementId,
  parentCommentId,
  placeholder = '添加评论...',
  onCommentAdded,
  onCancel,
  currentUserType = 'client',
  autoFocus = false,
  className = '',
  style = {},
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);
  const [commentType, setCommentType] = useState<RequirementCommentType>(
    RequirementCommentType.General
  );
  const [isInternal, setIsInternal] = useState(false);

  // 字符计数
  const charCount = content.length;
  const maxLength = REQUIREMENT_COMMENT_CONSTANTS.MAX_LENGTH;
  const isOverLimit = charCount > maxLength;

  // 是否是系统用户（可以使用内部评论）
  const isSystemUser = currentUserType === 'system';

  // 是否是回复
  const isReply = parentCommentId !== undefined;

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
      const request: CreateRequirementCommentRequest = {
        requirement_id: requirementId,
        content: trimmedContent,
        comment_type: commentType,
        mentioned_user_ids: mentionedUserIds,
        is_internal: isInternal,
      };

      // 如果是回复，添加父评论ID
      if (parentCommentId) {
        request.parent_comment_id = parentCommentId;
      }

      await createComment(requirementId, request);

      message.success(isReply ? '回复已添加' : '评论已添加');

      // 清空输入
      setContent('');
      setMentionedUserIds([]);
      setCommentType(RequirementCommentType.General);
      setIsInternal(false);

      // 通知父组件刷新评论列表
      onCommentAdded?.();
    } catch (error: any) {
      console.error('Failed to create comment:', error);
      message.error(error?.message || '添加评论失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理取消
   */
  const handleCancel = () => {
    setContent('');
    setMentionedUserIds([]);
    setCommentType(RequirementCommentType.General);
    setIsInternal(false);
    onCancel?.();
  };

  return (
    <div className={`requirement-comment-input ${className}`} style={style}>
      {/* 评论类型和内部评论开关 */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '8px',
          alignItems: 'center',
        }}
      >
        {/* 评论类型选择 */}
        <Select
          value={commentType}
          onChange={setCommentType}
          style={{ width: 120 }}
          size="small"
        >
          {Object.entries(COMMENT_TYPE_CONFIG).map(([type, config]) => (
            <Option key={type} value={type}>
              {config.icon} {config.label}
            </Option>
          ))}
        </Select>

        {/* 内部评论开关（仅系统用户可见） */}
        {isSystemUser && (
          <Tooltip title="内部评论仅系统用户可见，客户无法查看">
            <Space size={4}>
              <LockOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
              <Switch
                size="small"
                checked={isInternal}
                onChange={setIsInternal}
                checkedChildren="内部"
                unCheckedChildren="公开"
              />
            </Space>
          </Tooltip>
        )}
      </div>

      {/* 评论输入框 - 使用 MentionInput 支持 @用户 */}
      <MentionInput
        value={content}
        onChange={setContent}
        onMentionedUsersChange={setMentionedUserIds}
        placeholder={placeholder}
        autoSize={{ minRows: isReply ? 2 : 3, maxRows: 8 }}
        maxLength={maxLength}
        disabled={loading}
      />

      {/* 底部工具栏 */}
      <div
        className="comment-input-footer"
        style={{
          marginTop: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* 字符计数 */}
        <span
          style={{
            fontSize: '12px',
            color: isOverLimit ? '#ff4d4f' : '#8c8c8c',
          }}
        >
          {charCount} / {maxLength}
        </span>

        {/* 操作按钮 */}
        <Space>
          {/* 取消按钮（仅回复时显示） */}
          {isReply && onCancel && (
            <Button size="small" onClick={handleCancel} disabled={loading}>
              取消
            </Button>
          )}

          {/* 清空按钮 */}
          <Button
            size="small"
            onClick={() => {
              setContent('');
              setMentionedUserIds([]);
            }}
            disabled={!content || loading}
          >
            清空
          </Button>

          {/* 提交按钮 */}
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!content.trim() || isOverLimit}
          >
            {isReply ? '回复' : '评论'}
            <span style={{ fontSize: '11px', opacity: 0.7 }}>
              {' '}(Ctrl+Enter)
            </span>
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default RequirementCommentInput;
