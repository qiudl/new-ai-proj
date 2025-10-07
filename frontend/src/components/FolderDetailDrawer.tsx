import React from 'react';
import { Drawer, Descriptions, Tag, Space, Button, Divider } from 'antd';
import {
  FolderOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { WorkNoteFolder } from '../services/workNotesService';
import dayjs from 'dayjs';

export interface FolderDetailDrawerProps {
  /** 抽屉是否可见 */
  visible: boolean;

  /** 关闭抽屉回调 */
  onClose: () => void;

  /** 要显示的文件夹 */
  folder: WorkNoteFolder | null;

  /** 编辑回调 */
  onEdit?: (folder: WorkNoteFolder) => void;

  /** 删除回调 */
  onDelete?: (folder: WorkNoteFolder) => void;
}

/**
 * 文件夹详情抽屉组件
 *
 * 功能：
 * - 显示文件夹详细信息
 * - 名称、描述、路径、可见性
 * - 笔记数量、子文件夹数量
 * - 创建时间、更新时间
 * - 快捷操作按钮
 */
const FolderDetailDrawer: React.FC<FolderDetailDrawerProps> = ({
  visible,
  onClose,
  folder,
  onEdit,
  onDelete,
}) => {
  if (!folder) {
    return null;
  }

  // 可见性配置
  const getVisibilityConfig = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return { color: 'default', icon: '🔒', label: '私有' };
      case 'team':
        return { color: 'blue', icon: '👥', label: '团队可见' };
      case 'public':
        return { color: 'green', icon: '🌐', label: '公开' };
      default:
        return { color: 'default', icon: '❓', label: visibility };
    }
  };

  const visibilityConfig = getVisibilityConfig(folder.visibility);

  return (
    <Drawer
      title={
        <Space>
          <FolderOutlined />
          <span>文件夹详情</span>
        </Space>
      }
      placement="right"
      width={420}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          {onEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(folder)}
              size="small"
            >
              编辑
            </Button>
          )}
          {onDelete && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(folder)}
              size="small"
            >
              删除
            </Button>
          )}
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 文件夹预览 */}
        <div
          style={{
            padding: '16px',
            background: '#fafafa',
            borderRadius: 8,
            border: '1px solid #e8e8e8',
          }}
        >
          <Space size={12} align="center">
            <div style={{ fontSize: 32 }}>{folder.icon || '📁'}</div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: folder.color || '#000',
                  marginBottom: 4,
                }}
              >
                {folder.name}
              </div>
              {folder.description && (
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>
                  {folder.description}
                </div>
              )}
            </div>
          </Space>
        </div>

        {/* 基本信息 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            基本信息
          </div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="文件夹ID">
              <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>
                #{folder.id}
              </span>
            </Descriptions.Item>

            <Descriptions.Item label="路径">
              {folder.path || '根目录'}
            </Descriptions.Item>

            <Descriptions.Item label="可见性">
              <Tag color={visibilityConfig.color}>
                <Space size={4}>
                  <span>{visibilityConfig.icon}</span>
                  <span>{visibilityConfig.label}</span>
                </Space>
              </Tag>
            </Descriptions.Item>

            {folder.color && (
              <Descriptions.Item label="颜色">
                <Space>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: folder.color,
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                    }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {folder.color}
                  </span>
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>

        {/* 统计信息 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            统计信息
          </div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item
              label={
                <Space>
                  <FileTextOutlined />
                  <span>笔记数量</span>
                </Space>
              }
            >
              <Tag color={folder.notes_count > 0 ? 'blue' : 'default'}>
                {folder.notes_count || 0} 条
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <Space>
                  <FolderOutlined />
                  <span>子文件夹</span>
                </Space>
              }
            >
              <Tag color={folder.subfolders_count > 0 ? 'blue' : 'default'}>
                {folder.subfolders_count || 0} 个
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="排序权重">
              {folder.sort_order || 0}
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* 时间信息 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            时间信息
          </div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item
              label={
                <Space>
                  <ClockCircleOutlined />
                  <span>创建时间</span>
                </Space>
              }
            >
              {dayjs(folder.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <Space>
                  <ClockCircleOutlined />
                  <span>更新时间</span>
                </Space>
              }
            >
              {dayjs(folder.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>

            <Descriptions.Item label="最后更新">
              {dayjs(folder.updated_at).fromNow()}
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* 提示信息 */}
        <div
          style={{
            padding: '12px',
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 4,
            fontSize: 12,
            color: '#096dd9',
          }}
        >
          <Space>
            <EyeOutlined />
            <span>
              此文件夹的可见性设置为 <strong>{visibilityConfig.label}</strong>
            </span>
          </Space>
        </div>
      </Space>
    </Drawer>
  );
};

export default FolderDetailDrawer;
