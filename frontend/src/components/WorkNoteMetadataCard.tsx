import React from 'react';
import { Card, Row, Col, Space, Tag, Divider, Typography } from 'antd';
import {
  FolderOutlined,
  FileTextOutlined,
  PriorityHighOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  TagOutlined,
  FileWordOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CalendarOutlined,
  EditOutlined,
  UserOutlined,
  PushpinOutlined,
  StarOutlined
} from '@ant-design/icons';
import { WorkNote } from '../services/workNotesService';
import dayjs from 'dayjs';

const { Text } = Typography;

interface WorkNoteMetadataCardProps {
  note: WorkNote;
  folderName?: string;
}

/**
 * 工作笔记元信息卡片
 * 显示笔记的详细元数据，包括类型、优先级、可见性、统计信息等
 */
const WorkNoteMetadataCard: React.FC<WorkNoteMetadataCardProps> = ({
  note,
  folderName
}) => {
  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      general: '通用',
      meeting: '会议',
      idea: '想法',
      log: '日志',
      reference: '参考',
      template: '模板'
    };
    return typeMap[type] || type;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityMap: Record<string, { label: string; color: string }> = {
      critical: { label: '紧急', color: 'red' },
      urgent: { label: '紧急', color: 'red' },
      high: { label: '高', color: 'orange' },
      medium: { label: '中', color: 'blue' },
      low: { label: '低', color: 'default' }
    };
    return priorityMap[priority] || { label: priority, color: 'default' };
  };

  const getVisibilityConfig = (visibility: string) => {
    const visibilityMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      private: { icon: <LockOutlined />, label: '私有', color: 'red' },
      team: { icon: <TeamOutlined />, label: '团队', color: 'blue' },
      public: { icon: <GlobalOutlined />, label: '公开', color: 'green' }
    };
    return visibilityMap[visibility] || { icon: <LockOutlined />, label: visibility, color: 'default' };
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      draft: { label: '草稿', color: 'orange' },
      published: { label: '已发布', color: 'green' },
      archived: { label: '已归档', color: 'default' }
    };
    return statusMap[status] || { label: status, color: 'default' };
  };

  const MetadataRow = ({
    icon,
    label,
    value,
    valueColor
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    valueColor?: string;
  }) => (
    <Row style={{ marginBottom: 8 }}>
      <Col span={8}>
        <Space size={8}>
          <span style={{ color: '#8c8c8c', fontSize: 16 }}>{icon}</span>
          <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
        </Space>
      </Col>
      <Col span={16}>
        <Text style={{ color: valueColor, fontSize: 14 }}>{value}</Text>
      </Col>
    </Row>
  );

  const priorityConfig = getPriorityLabel(note.priority || 'medium');
  const visibilityConfig = getVisibilityConfig(note.visibility || 'private');
  const statusConfig = getStatusLabel(note.status || 'draft');

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          <span>笔记元信息</span>
        </Space>
      }
      style={{ marginBottom: 24 }}
      styles={{ body: { padding: 20 } }}
    >
      {/* 基本信息 */}
      <MetadataRow
        icon={<FolderOutlined />}
        label="文件夹"
        value={folderName || note.folder_name || '未分类'}
      />

      <MetadataRow
        icon={<FileTextOutlined />}
        label="类型"
        value={getTypeLabel(note.work_note_type || 'general')}
      />

      <MetadataRow
        icon={<PriorityHighOutlined />}
        label="优先级"
        value={
          <Tag color={priorityConfig.color}>
            {priorityConfig.label}
          </Tag>
        }
      />

      <MetadataRow
        icon={visibilityConfig.icon}
        label="可见性"
        value={
          <Tag color={visibilityConfig.color} icon={visibilityConfig.icon}>
            {visibilityConfig.label}
          </Tag>
        }
      />

      <MetadataRow
        icon={<InfoCircleOutlined />}
        label="状态"
        value={
          <Tag color={statusConfig.color}>
            {statusConfig.label}
          </Tag>
        }
      />

      {/* 标签 */}
      {note.tags && note.tags.length > 0 && (
        <MetadataRow
          icon={<TagOutlined />}
          label="标签"
          value={
            <Space size={[0, 8]} wrap>
              {note.tags.map((tag, index) => (
                <Tag key={index} color="blue">
                  {tag}
                </Tag>
              ))}
            </Space>
          }
        />
      )}

      <Divider style={{ margin: '16px 0' }} />

      {/* 统计信息 */}
      <MetadataRow
        icon={<FileWordOutlined />}
        label="字数"
        value={(note.word_count || 0).toString()}
      />

      <MetadataRow
        icon={<ClockCircleOutlined />}
        label="阅读时长"
        value={`${note.read_time || 0} 分钟`}
      />

      <MetadataRow
        icon={<EyeOutlined />}
        label="浏览次数"
        value={(note.view_count || 0).toString()}
      />

      <Divider style={{ margin: '16px 0' }} />

      {/* 时间信息 */}
      <MetadataRow
        icon={<CalendarOutlined />}
        label="创建时间"
        value={dayjs(note.created_at).isValid() ? dayjs(note.created_at).format('YYYY-MM-DD HH:mm:ss') : '未知'}
      />

      <MetadataRow
        icon={<EditOutlined />}
        label="更新时间"
        value={dayjs(note.updated_at).isValid() ? dayjs(note.updated_at).format('YYYY-MM-DD HH:mm:ss') : '未知'}
      />

      {note.last_read_at && (
        <MetadataRow
          icon={<ClockCircleOutlined />}
          label="最后阅读"
          value={dayjs(note.last_read_at).format('YYYY-MM-DD HH:mm:ss')}
        />
      )}

      {/* 作者信息 */}
      {note.owner_name && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <MetadataRow
            icon={<UserOutlined />}
            label="作者"
            value={note.owner_name}
          />
        </>
      )}

      {/* 特殊标记 */}
      {(note.is_pinned || note.is_bookmarked) && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Row>
            <Col span={24}>
              <Space size={8} wrap>
                {note.is_pinned && (
                  <Tag color="orange" icon={<PushpinOutlined />}>
                    已置顶
                  </Tag>
                )}
                {note.is_bookmarked && (
                  <Tag color="gold" icon={<StarOutlined />}>
                    已收藏
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

export default WorkNoteMetadataCard;
