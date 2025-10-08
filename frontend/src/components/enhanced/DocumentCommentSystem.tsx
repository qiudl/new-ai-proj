import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Tooltip,
  Dropdown,
  Modal,
  Form,
  Select,
  Badge,
  Empty,
  Spin,
  message,
  Popconfirm
} from 'antd';
import {
  CommentOutlined,
  SendOutlined,
  MoreOutlined,
  RollbackOutlined,
  HeartOutlined,
  HeartFilled,
  EditOutlined,
  DeleteOutlined,
  FlagOutlined,
  UserOutlined,
  CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './DocumentCommentSystem.css';

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Text } = Typography;

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  likes: number;
  isLiked: boolean;
  isResolved: boolean;
  position?: {
    line: number;
    column: number;
    selection?: string;
  };
  replies?: Comment[];
}

export interface DocumentCommentSystemProps {
  documentId: string;
  className?: string;
  style?: React.CSSProperties;
  onCommentAdd?: (comment: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'isLiked'>) => void;
  onCommentUpdate?: (commentId: string, content: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentLike?: (commentId: string, isLiked: boolean) => void;
  onCommentResolve?: (commentId: string, isResolved: boolean) => void;
}

const DocumentCommentSystem: React.FC<DocumentCommentSystemProps> = ({
  documentId,
  className = '',
  style = {},
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onCommentLike,
  onCommentResolve
}) => {
  // 状态管理
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  
  // 模拟当前用户
  const currentUser = {
    id: '1',
    name: '当前用户',
    avatar: ''
  };

  // 模拟评论数据
  const mockComments: Comment[] = [
    {
      id: '1',
      content: '这部分的逻辑可能需要优化，建议使用缓存机制来提高性能。',
      author: {
        id: '2',
        name: '张三',
        avatar: ''
      },
      createdAt: '2025-01-01T10:00:00Z',
      likes: 3,
      isLiked: false,
      isResolved: false,
      position: {
        line: 42,
        column: 10,
        selection: 'function calculateResult()'
      },
      replies: [
        {
          id: '2',
          content: '同意，我们可以考虑使用 React.memo 或者 useMemo 来优化。',
          author: {
            id: '3',
            name: '李四',
            avatar: ''
          },
          createdAt: '2025-01-01T10:30:00Z',
          parentId: '1',
          likes: 1,
          isLiked: true,
          isResolved: false
        }
      ]
    },
    {
      id: '3',
      content: '文档的这个示例很清晰，帮助理解了整个流程。',
      author: {
        id: '4',
        name: '王五',
        avatar: ''
      },
      createdAt: '2025-01-01T14:00:00Z',
      likes: 5,
      isLiked: true,
      isResolved: true
    }
  ];

  // 初始化加载评论
  useEffect(() => {
    setLoading(true);
    // 模拟异步加载
    setTimeout(() => {
      setComments(mockComments);
      setLoading(false);
    }, 500);
  }, [documentId]);

  // 过滤评论
  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      switch (filter) {
        case 'unresolved':
          return !comment.isResolved;
        case 'resolved':
          return comment.isResolved;
        default:
          return true;
      }
    });
  }, [comments, filter]);

  // 统计信息
  const stats = useMemo(() => {
    const total = comments.length;
    const resolved = comments.filter(c => c.isResolved).length;
    const unresolved = total - resolved;
    return { total, resolved, unresolved };
  }, [comments]);

  // 添加评论
  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: currentUser,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      isResolved: false,
      parentId: replyingTo || undefined
    };

    if (replyingTo) {
      // 添加回复
      setComments(prev => prev.map(c => {
        if (c.id === replyingTo) {
          return {
            ...c,
            replies: [...(c.replies || []), comment]
          };
        }
        return c;
      }));
    } else {
      // 添加新评论
      setComments(prev => [comment, ...prev]);
    }

    onCommentAdd?.(comment);
    setNewComment('');
    setReplyingTo(null);
    message.success('评论添加成功');
  }, [newComment, replyingTo, currentUser, onCommentAdd]);

  // 回复评论
  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
    setNewComment('');
  }, []);

  // 点赞评论
  const handleLike = useCallback((commentId: string, isReply = false, parentId?: string) => {
    if (isReply && parentId) {
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: c.replies?.map(r => {
              if (r.id === commentId) {
                const newIsLiked = !r.isLiked;
                return {
                  ...r,
                  isLiked: newIsLiked,
                  likes: r.likes + (newIsLiked ? 1 : -1)
                };
              }
              return r;
            })
          };
        }
        return c;
      }));
    } else {
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          const newIsLiked = !c.isLiked;
          return {
            ...c,
            isLiked: newIsLiked,
            likes: c.likes + (newIsLiked ? 1 : -1)
          };
        }
        return c;
      }));
    }

    onCommentLike?.(commentId, !comments.find(c => c.id === commentId)?.isLiked);
  }, [comments, onCommentLike]);

  // 解决评论
  const handleResolve = useCallback((commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const newIsResolved = !c.isResolved;
        onCommentResolve?.(commentId, newIsResolved);
        return { ...c, isResolved: newIsResolved };
      }
      return c;
    }));
    message.success('评论状态已更新');
  }, [onCommentResolve]);

  // 删除评论
  const handleDelete = useCallback((commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    onCommentDelete?.(commentId);
    message.success('评论已删除');
  }, [onCommentDelete]);

  // 编辑评论
  const handleEdit = useCallback((commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setEditingComment(commentId);
      setEditContent(comment.content);
    }
  }, [comments]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (!editContent.trim() || !editingComment) return;

    setComments(prev => prev.map(c => {
      if (c.id === editingComment) {
        return { ...c, content: editContent, updatedAt: new Date().toISOString() };
      }
      return c;
    }));

    onCommentUpdate?.(editingComment, editContent);
    setEditingComment(null);
    setEditContent('');
    message.success('评论已更新');
  }, [editContent, editingComment, onCommentUpdate]);

  // 渲染评论项
  const renderComment = (comment: Comment, isReply = false, parentId?: string) => {
    const isEditing = editingComment === comment.id;
    const canEdit = comment.author.id === currentUser.id;

    const actions = [
      <Button
        type="text"
        size="small"
        icon={comment.isLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
        onClick={() => handleLike(comment.id, isReply, parentId)}
      >
        {comment.likes}
      </Button>
    ];

    if (!isReply) {
      actions.push(
        <Button
          type="text"
          size="small"
          icon={<ReplyArrowOutlined />}
          onClick={() => handleReply(comment.id)}
        >
          回复
        </Button>
      );
    }

    if (canEdit) {
      actions.push(
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: () => handleEdit(comment.id)
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除',
                danger: true,
                onClick: () => handleDelete(comment.id)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      );
    }

    if (!isReply) {
      actions.push(
        <Button
          type="text"
          size="small"
          onClick={() => handleResolve(comment.id)}
          style={{ color: comment.isResolved ? '#52c41a' : '#8c8c8c' }}
        >
          {comment.isResolved ? '已解决' : '标记解决'}
        </Button>
      );
    }

    return (
      <List.Item key={comment.id} className={`comment-item ${isReply ? 'reply-item' : ''}`}>
        <List.Item.Meta
          avatar={
            <Avatar 
              src={comment.author.avatar} 
              icon={<UserOutlined />}
              size={isReply ? 'small' : 'default'}
            />
          }
          title={
            <div className="comment-header">
              <Space>
                <Text strong>{comment.author.name}</Text>
                {comment.position && (
                  <Tooltip title={`行 ${comment.position.line}, 列 ${comment.position.column}`}>
                    <Tag size="small" color="blue">
                      L{comment.position.line}
                    </Tag>
                  </Tooltip>
                )}
                {comment.isResolved && (
                  <Tag size="small" color="green">已解决</Tag>
                )}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(comment.createdAt).fromNow()}
                  {comment.updatedAt && ' · 已编辑'}
                </Text>
              </Space>
            </div>
          }
          description={
            <div className="comment-content">
              {isEditing ? (
                <div className="comment-edit">
                  <TextArea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    placeholder="编辑评论内容..."
                  />
                  <div className="edit-actions">
                    <Space>
                      <Button size="small" onClick={() => setEditingComment(null)}>
                        取消
                      </Button>
                      <Button type="primary" size="small" onClick={handleSaveEdit}>
                        保存
                      </Button>
                    </Space>
                  </div>
                </div>
              ) : (
                <>
                  <div className="comment-text">{comment.content}</div>
                  {comment.position?.selection && (
                    <div className="comment-selection">
                      <Text code>{comment.position.selection}</Text>
                    </div>
                  )}
                </>
              )}
            </div>
          }
        />
        <div className="comment-actions">
          <Space>{actions}</Space>
        </div>
        
        {/* 渲染回复 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map(reply => renderComment(reply, true, comment.id))}
          </div>
        )}
      </List.Item>
    );
  };

  return (
    <div className={`document-comment-system ${className}`} style={style}>
      {/* 评论统计和过滤 */}
      <div className="comment-header">
        <div className="comment-stats">
          <Space>
            <Badge count={stats.total} showZero>
              <CommentOutlined style={{ fontSize: '16px' }} />
            </Badge>
            <Text>共 {stats.total} 条评论</Text>
            <Text type="secondary">
              {stats.unresolved} 未解决 · {stats.resolved} 已解决
            </Text>
          </Space>
        </div>
        
        <Select
          value={filter}
          onChange={setFilter}
          size="small"
          style={{ width: 120 }}
          options={[
            { label: '全部', value: 'all' },
            { label: '未解决', value: 'unresolved' },
            { label: '已解决', value: 'resolved' }
          ]}
        />
      </div>

      {/* 新评论输入 */}
      <Card size="small" className="new-comment-card">
        <div className="new-comment-input">
          <TextArea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "回复评论..." : "添加评论..."}
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
          <div className="comment-input-actions">
            <Space>
              {replyingTo && (
                <Button 
                  size="small" 
                  icon={<CloseOutlined />}
                  onClick={() => setReplyingTo(null)}
                >
                  取消回复
                </Button>
              )}
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                {replyingTo ? '回复' : '评论'}
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {/* 评论列表 */}
      <div className="comment-list-container">
        {loading ? (
          <div className="comment-loading">
            <Spin size="large" />
          </div>
        ) : filteredComments.length > 0 ? (
          <List
            className="comment-list"
            dataSource={filteredComments}
            renderItem={(comment) => renderComment(comment)}
            pagination={filteredComments.length > 10 ? {
              pageSize: 10,
              size: 'small',
              showSizeChanger: false
            } : false}
          />
        ) : (
          <Empty
            description={filter === 'all' ? '暂无评论' : `暂无${filter === 'resolved' ? '已解决' : '未解决'}的评论`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentCommentSystem;