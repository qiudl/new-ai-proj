import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Button,
  Space,
  Typography,
  Tag,
  Divider,
  Avatar,
  Card,
  Row,
  Col,
  Tooltip,
  Dropdown,
  Menu,
  message,
  List
} from 'antd';
import {
  EditOutlined,
  StarOutlined,
  StarFilled,
  ShareAltOutlined,
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EyeOutlined,
  TagOutlined,
  FileMarkdownOutlined,
  CloseOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  FullscreenOutlined
} from '@ant-design/icons';
import { WorkNote, workNotesService, AssociatedTask } from '../services/workNotesService';
import type { MenuProps } from 'antd';
import WorkNoteMetadataCard from './WorkNoteMetadataCard';
import TaskAssociationManager from './TaskAssociationManager';
import MarkdownRenderer from './MarkdownRenderer';

const { Title, Text, Paragraph } = Typography;

interface ModernWorkNoteViewerProps {
  visible: boolean;
  note: WorkNote | null;
  onClose: () => void;
  onEdit: (note: WorkNote) => void;
}

const ModernWorkNoteViewer: React.FC<ModernWorkNoteViewerProps> = ({
  visible,
  note,
  onClose,
  onEdit
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [associatedTasks, setAssociatedTasks] = useState<AssociatedTask[]>([]);
  const [showTaskManager, setShowTaskManager] = useState(false);

  // 加载关联任务
  useEffect(() => {
    if (visible && note) {
      loadAssociatedTasks();
    }
  }, [visible, note]);

  // 必须在所有 Hooks 之后再做条件判断
  if (!note) return null;

  const loadAssociatedTasks = async () => {
    try {
      const tasks = await workNotesService.getAssociatedTasks(note.id);
      setAssociatedTasks(tasks);
    } catch (error) {
      console.error('Failed to load associated tasks:', error);
    }
  };

  // 处理收藏切换
  const handleToggleFavorite = async () => {
    try {
      setLoading(true);
      await workNotesService.toggleTemplate(note.id);
      message.success(note.is_template ? '已取消收藏' : '已添加到收藏');
      // 这里应该刷新笔记数据，但为了简化我们先不处理
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理复制
  const handleCopy = async () => {
    try {
      await workNotesService.copyWorkNote(note.id);
      message.success('复制成功');
    } catch (error) {
      message.error('复制失败');
    }
  };

  // 处理分享
  const handleShare = () => {
    // 复制链接到剪贴板
    const url = `${window.location.origin}/work-note/${note.id}`;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制链接失败');
    });
  };

  // 全屏查看
  const handleFullscreenView = () => {
    navigate(`/work-note/${note.id}?return=/work-note`);
  };

  // 渲染状态标签
  const renderStatusTag = (status: string) => {
    const statusConfig = {
      published: { color: 'green', text: '已发布' },
      draft: { color: 'orange', text: '草稿' },
      archived: { color: 'gray', text: '已归档' },
      template: { color: 'blue', text: '模板' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 渲染可见性标签
  const renderVisibilityTag = (visibility: string) => {
    const visibilityConfig = {
      public: { color: 'green', text: '公开', icon: <EyeOutlined /> },
      team: { color: 'blue', text: '团队', icon: <UserOutlined /> },
      private: { color: 'red', text: '私有', icon: <UserOutlined /> }
    };
    const config = visibilityConfig[visibility as keyof typeof visibilityConfig] || { color: 'default', text: visibility, icon: <EyeOutlined /> };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 渲染任务状态标签
  const renderTaskStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      todo: { color: 'default', text: '待办', icon: <ClockCircleOutlined /> },
      in_progress: { color: 'blue', text: '进行中', icon: <SyncOutlined spin /> },
      completed: { color: 'green', text: '已完成', icon: <CheckCircleOutlined /> },
      blocked: { color: 'red', text: '受阻', icon: <ExclamationCircleOutlined /> }
    };

    const config = statusConfig[status] || { color: 'default', text: status, icon: null };

    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 更多操作菜单（使用 menu API 替代 overlay）
  const moreMenuItems: MenuProps['items'] = [
    { key: 'favorite', icon: note.is_template ? <StarFilled /> : <StarOutlined />, label: note.is_template ? '取消收藏' : '添加收藏' },
    { key: 'copy', icon: <CopyOutlined />, label: '复制笔记' },
    { key: 'share', icon: <ShareAltOutlined />, label: '分享链接' },
    { type: 'divider' as const },
    { key: 'delete', icon: <DeleteOutlined />, label: '删除笔记', danger: true },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <FileMarkdownOutlined />
            <span>查看笔记</span>
          </Space>
        </div>
      }
      width={800}
      open={visible}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0 },
        header: { borderBottom: '1px solid #f0f0f0' }
      }}
      footer={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              创建于 {new Date(note.created_at).toLocaleString('zh-CN')}
            </Text>
            <Divider type="vertical" />
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              更新于 {new Date(note.updated_at).toLocaleString('zh-CN')}
            </Text>
            {note.version && (
              <>
                <Divider type="vertical" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  版本 v{note.version}
                </Text>
              </>
            )}
          </Space>
          
          <Space>
            <Tooltip title="全屏查看">
              <Button
                icon={<FullscreenOutlined />}
                onClick={handleFullscreenView}
              >
                全屏查看
              </Button>
            </Tooltip>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(note)}
            >
              编辑
            </Button>
            <Dropdown 
              menu={{
                items: moreMenuItems,
                onClick: ({ key }) => {
                  if (key === 'favorite') return handleToggleFavorite();
                  if (key === 'copy') return handleCopy();
                  if (key === 'share') return handleShare();
                  if (key === 'delete') return message.info('删除功能稍后提供');
                },
              }}
              trigger={['click']} 
              placement="topRight"
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>
      }
    >
      <div style={{ height: '100%' }}>
        {/* 头部信息 */}
        <Card 
           
          style={{ 
            margin: 0, 
            borderRadius: 0, 
            borderLeft: 0, 
            borderRight: 0, 
            borderTop: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Title level={2} style={{ color: 'white', marginBottom: 8 }}>
                {note.title}
                {note.is_template && (
                  <StarFilled style={{ color: '#faad14', marginLeft: 8, fontSize: '20px' }} />
                )}
              </Title>
              
              {note.description && (
                <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 16, fontSize: 16 }}>
                  {note.description}
                </Paragraph>
              )}
              
              <Space wrap>
                {renderStatusTag(note.status)}
                {renderVisibilityTag(note.visibility)}
                {note.tags?.map(tag => (
                  <Tag key={tag} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <TagOutlined style={{ marginRight: 4 }} />
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>
            
            <Avatar 
              size={64} 
              icon={<FileMarkdownOutlined />}
              style={{ 
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                marginLeft: 16
              }}
            />
          </div>
        </Card>

        {/* 内容区域 */}
        <div style={{ padding: 24 }}>
          {/* 元信息卡片 */}
          <WorkNoteMetadataCard note={note} folderName={note.folder_name} />

          {/* 关联任务 */}
          <Card
            title={
              <Space>
                <LinkOutlined />
                <span>关联任务 ({associatedTasks.length})</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => setShowTaskManager(true)}
              >
                管理关联
              </Button>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
            styles={{ body: { padding: 16 } }}
          >
            {associatedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                <LinkOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                <Typography.Text type="secondary">暂无关联任务</Typography.Text>
                <br />
                <Button
                  type="link"
                  onClick={() => setShowTaskManager(true)}
                  style={{ padding: 0, marginTop: 8 }}
                >
                  点击添加关联任务
                </Button>
              </div>
            ) : (
              <List
                dataSource={associatedTasks}
                renderItem={(task) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Typography.Text strong>#{task.id}</Typography.Text>
                          <Typography.Text>{task.title}</Typography.Text>
                        </Space>
                      }
                      description={
                        <Space size={8}>
                          {renderTaskStatusTag(task.status)}
                          {task.project_name && (
                            <Tag color="purple">{task.project_name}</Tag>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* 内容显示 */}
          {note.content ? (
            <Card
              style={{
                borderRadius: 8,
                background: '#fafafa',
                border: '1px solid #f0f0f0'
              }}
              styles={{ body: { padding: 24 } }}
            >
              <MarkdownRenderer
                content={note.content}
                style={{
                  minHeight: 200,
                  fontSize: 14,
                  lineHeight: 1.8
                }}
              />
            </Card>
          ) : (
            <Card

              style={{
                borderRadius: 8,
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                textAlign: 'center'
              }}
              styles={{ body: { padding: 48 } }}
            >
              <FileMarkdownOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <Text type="secondary" style={{ fontSize: 16 }}>
                这个笔记还没有内容
              </Text>
              <br />
              <Button
                type="link"
                onClick={() => onEdit(note)}
                style={{ fontSize: 14, marginTop: 8 }}
              >
                点击编辑添加内容
              </Button>
            </Card>
          )}
        </div>

        {/* 统计信息 */}
        <Card 
           
          title="笔记统计" 
          style={{ margin: '0 24px 24px 24px', borderRadius: 8 }}
          styles={{ body: { padding: 16 } }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                  {note.content ? note.content.replace(/\s/g, '').length : 0}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>字符数</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
                  {note.content ? note.content.split('\n').length : 0}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>行数</div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#722ed1' }}>
                  {note.tags?.length || 0}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>标签数</div>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* 任务关联管理对话框 */}
      <TaskAssociationManager
        visible={showTaskManager}
        noteId={note.id}
        onClose={() => setShowTaskManager(false)}
        onAssociationChange={loadAssociatedTasks}
      />
    </Drawer>
  );
};

export default ModernWorkNoteViewer;