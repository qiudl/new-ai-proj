/**
 * 需求评论区域组件
 * Requirement Comment Section Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Empty, Spin, Badge, Typography, Divider, Pagination, Space, Tabs } from 'antd';
import { CommentOutlined, QuestionCircleOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';
import RequirementCommentInput from './RequirementCommentInput';
import RequirementCommentItem from './RequirementCommentItem';
import {
  listComments,
  getCommentStats,
  togglePin,
} from '../../services/requirementCommentService';
import {
  RequirementComment,
  RequirementCommentStats,
  RequirementCommentFilters,
  RequirementCommentType,
} from '../../types/requirementComment';

const { Text } = Typography;
const { TabPane } = Tabs;

export interface RequirementCommentSectionProps {
  requirementId: number;
  currentUserId?: number;
  currentUserType?: string;
  className?: string;
  style?: React.CSSProperties;
  showStats?: boolean;
  defaultPageSize?: number;
  enableTabs?: boolean; // 是否启用按类型分类的标签页
}

/**
 * 需求评论区域组件
 */
const RequirementCommentSection: React.FC<RequirementCommentSectionProps> = ({
  requirementId,
  currentUserId,
  currentUserType = 'client',
  className = '',
  style = {},
  showStats = true,
  defaultPageSize = 20,
  enableTabs = false,
}) => {
  const [comments, setComments] = useState<RequirementComment[]>([]);
  const [stats, setStats] = useState<RequirementCommentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [replyingTo, setReplyingTo] = useState<RequirementComment | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  /**
   * 加载评论列表
   */
  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const filters: RequirementCommentFilters = {
        requirement_id: requirementId,
        page,
        page_size: defaultPageSize,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      // 如果启用了标签页且不是"全部"，添加类型筛选
      if (enableTabs && activeTab !== 'all') {
        filters.comment_type = [activeTab as RequirementCommentType];
      }

      const response = await listComments(requirementId, filters);

      setComments(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to load comments:', error);
      setComments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [requirementId, page, defaultPageSize, activeTab, enableTabs]);

  /**
   * 加载评论统计
   */
  const loadStats = useCallback(async () => {
    if (!showStats) return;

    try {
      const statsData = await getCommentStats(requirementId);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load comment stats:', error);
      setStats(null);
    }
  }, [requirementId, showStats]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadComments();
    loadStats();
  }, [loadComments, loadStats]);

  /**
   * 评论添加后刷新
   */
  const handleCommentAdded = useCallback(() => {
    setPage(1);
    setReplyingTo(null); // 清空回复状态
    loadComments();
    loadStats();
  }, [loadComments, loadStats]);

  /**
   * 评论删除后刷新
   */
  const handleCommentDeleted = useCallback(() => {
    loadComments();
    loadStats();
  }, [loadComments, loadStats]);

  /**
   * 处理回复
   */
  const handleReply = useCallback((comment: RequirementComment) => {
    setReplyingTo(comment);
    // 滚动到输入框
    setTimeout(() => {
      const inputElement = document.querySelector('.requirement-comment-input');
      inputElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  /**
   * 取消回复
   */
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  /**
   * 处理置顶
   */
  const handleTogglePin = useCallback(
    async (commentId: number, isPinned: boolean) => {
      try {
        await togglePin(requirementId, commentId, isPinned);
        loadComments();
      } catch (error: any) {
        console.error('Failed to toggle pin:', error);
      }
    },
    [requirementId, loadComments]
  );

  /**
   * 分组评论（置顶的在前）
   */
  const groupedComments = useCallback(() => {
    const pinned = comments.filter((c) => c.is_pinned && !c.parent_comment_id);
    const normal = comments.filter((c) => !c.is_pinned && !c.parent_comment_id);
    return [...pinned, ...normal];
  }, [comments]);

  /**
   * 渲染统计信息
   */
  const renderStats = () => {
    if (!showStats || !stats || stats.total_comments === 0) return null;

    return (
      <div
        style={{
          marginBottom: '16px',
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: '4px',
        }}
      >
        <Space split={<Divider type="vertical" />}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            共 {stats.total_comments} 条评论
          </Text>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            今日 {stats.todays_comments} 条
          </Text>
          {stats.pinned_comments > 0 && (
            <Text type="secondary" style={{ fontSize: '13px' }}>
              置顶 {stats.pinned_comments} 条
            </Text>
          )}
        </Space>
      </div>
    );
  };

  /**
   * 渲染评论列表
   */
  const renderComments = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="加载评论中..." spinning={true}>
            <div style={{ minHeight: '100px' }} />
          </Spin>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无评论"
          style={{ padding: '40px 0' }}
        />
      );
    }

    return (
      <div className="comments-list">
        {groupedComments().map((comment) => (
          <RequirementCommentItem
            key={comment.id}
            comment={comment}
            requirementId={requirementId}
            currentUserId={currentUserId}
            currentUserType={currentUserType}
            onDeleted={handleCommentDeleted}
            onReply={handleReply}
            onTogglePin={handleTogglePin}
            showReplies={true}
          />
        ))}

        {/* 分页控制 */}
        {total > defaultPageSize && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Pagination
              current={page}
              pageSize={defaultPageSize}
              total={total}
              onChange={setPage}
              showSizeChanger={false}
              showTotal={(total) => `共 ${total} 条评论`}
            />
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染标签页内容
   */
  const renderTabContent = () => {
    if (!enableTabs) {
      return renderComments();
    }

    return (
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <CommentOutlined /> 全部
              {stats && <Badge count={stats.total_comments} style={{ marginLeft: 8 }} />}
            </span>
          }
          key="all"
        >
          {renderComments()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <QuestionCircleOutlined /> 提问
              {stats && (
                <Badge
                  count={stats.by_comment_type?.question || 0}
                  style={{ marginLeft: 8 }}
                />
              )}
            </span>
          }
          key="question"
        >
          {renderComments()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <BulbOutlined /> 建议
              {stats && (
                <Badge
                  count={stats.by_comment_type?.suggestion || 0}
                  style={{ marginLeft: 8 }}
                />
              )}
            </span>
          }
          key="suggestion"
        >
          {renderComments()}
        </TabPane>
        <TabPane
          tab={
            <span>
              <CheckCircleOutlined /> 批准
              {stats && (
                <Badge
                  count={stats.by_comment_type?.approval || 0}
                  style={{ marginLeft: 8 }}
                />
              )}
            </span>
          }
          key="approval"
        >
          {renderComments()}
        </TabPane>
      </Tabs>
    );
  };

  return (
    <Card
      className={`requirement-comment-section ${className}`}
      style={style}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CommentOutlined />
          <span>评论与反馈</span>
          {showStats && stats && stats.total_comments > 0 && (
            <Badge
              count={stats.total_comments}
              showZero
              style={{ backgroundColor: '#1890ff' }}
            />
          )}
        </div>
      }
    >
      {/* 统计信息 */}
      {renderStats()}

      {/* 回复提示 */}
      {replyingTo && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px 12px',
            background: '#e6f7ff',
            borderRadius: '4px',
            borderLeft: '3px solid #1890ff',
          }}
        >
          <Text style={{ fontSize: '13px' }}>
            回复 <Text strong>@{replyingTo.username}</Text>: {replyingTo.content.substring(0, 50)}
            {replyingTo.content.length > 50 && '...'}
          </Text>
        </div>
      )}

      {/* 评论输入框 */}
      <RequirementCommentInput
        requirementId={requirementId}
        parentCommentId={replyingTo?.id}
        placeholder={
          replyingTo
            ? `回复 @${replyingTo.username}...`
            : '添加评论，支持 @提及用户...'
        }
        onCommentAdded={handleCommentAdded}
        onCancel={replyingTo ? handleCancelReply : undefined}
        currentUserType={currentUserType}
        autoFocus={!!replyingTo}
        style={{ marginBottom: '16px' }}
      />

      <Divider style={{ margin: '16px 0' }} />

      {/* 评论列表或标签页 */}
      {renderTabContent()}
    </Card>
  );
};

export default RequirementCommentSection;
