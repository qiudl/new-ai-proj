import React, { useState } from 'react';
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
  message
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
  CloseOutlined
} from '@ant-design/icons';
import { WorkNote, workNotesService } from '../services/workNotesService';
import type { MenuProps } from 'antd';

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
  const [loading, setLoading] = useState(false);

  if (!note) return null;

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
    const url = `${window.location.origin}/work-note?note=${note.id}`;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制到剪贴板');
    });
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
          {note.content ? (
            <Card
              
              style={{ 
                borderRadius: 8,
                background: '#fafafa',
                border: '1px solid #f0f0f0'
              }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.8,
                fontSize: 14,
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                color: '#262626',
                minHeight: 200
              }}>
                {note.content}
              </div>
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
    </Drawer>
  );
};

export default ModernWorkNoteViewer;