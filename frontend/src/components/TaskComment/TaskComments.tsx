/**
 * 任务评论容器组件
 * Task Comments Container Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Empty, Spin, Badge, Typography, Divider } from 'antd';
import { CommentOutlined } from '@ant-design/icons';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';
import { listComments, getCommentStats } from '../../services/taskCommentService';
import { TaskComment, TaskCommentStats } from '../../types/taskComment';

const { Text } = Typography;

export interface TaskCommentsProps {
  taskId: number;
  className?: string;
  style?: React.CSSProperties;
  showStats?: boolean;
  defaultPageSize?: number;
}

/**
 * 任务评论容器组件
 */
const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  className = '',
  style = {},
  showStats = true,
  defaultPageSize = 20
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [stats, setStats] = useState<TaskCommentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  /**
   * 加载评论列表
   */
  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listComments(taskId, {
        page,
        limit: defaultPageSize
      });

      setComments(response.comments || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to load comments:', error);
      // 失败时显示空列表(service已经返回空数据)
      setComments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [taskId, page, defaultPageSize]);

  /**
   * 加载评论统计
   */
  const loadStats = useCallback(async () => {
    if (!showStats) return;

    try {
      const statsData = await getCommentStats(taskId);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load comment stats:', error);
      setStats(null);
    }
  }, [taskId, showStats]);

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
    setPage(1); // 重置到第一页
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

  return (
    <Card
      className={`task-comments ${className}`}
      style={style}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CommentOutlined />
          <span>评论</span>
          {showStats && stats && (
            <Badge
              count={stats.total_comments}
              showZero
              style={{ backgroundColor: '#1890ff' }}
            />
          )}
        </div>
      }
    >
      {/* 评论统计信息 */}
      {showStats && stats && stats.total_comments > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: '4px'
        }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            共 {stats.total_comments} 条评论
            {stats.participants > 0 && ` · ${stats.participants} 人参与`}
            {stats.last_comment_at && ` · 最新评论 ${new Date(stats.last_comment_at).toLocaleString('zh-CN')}`}
          </Text>
        </div>
      )}

      {/* 评论输入框 */}
      <CommentInput
        taskId={taskId}
        onCommentAdded={handleCommentAdded}
        style={{ marginBottom: '16px' }}
      />

      <Divider style={{ margin: '16px 0' }} />

      {/* 评论列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="加载评论中..." />
        </div>
      ) : comments.length > 0 ? (
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              taskId={taskId}
              onDeleted={handleCommentDeleted}
            />
          ))}

          {/* TODO: 分页控制 (当total > defaultPageSize时显示) */}
          {total > defaultPageSize && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              textAlign: 'center',
              background: '#fafafa',
              borderRadius: '4px'
            }}>
              <Text type="secondary">
                显示 {comments.length} / {total} 条评论
              </Text>
              {/* 可以添加分页组件 */}
            </div>
          )}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无评论"
          style={{ padding: '40px 0' }}
        />
      )}
    </Card>
  );
};

export default TaskComments;
