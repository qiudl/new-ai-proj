/**
 * VersionDetailModal - 版本详情弹窗
 *
 * 显示版本的完整详情
 */

import React from 'react';
import { Modal, Descriptions, Tag, Space, Button, Typography } from 'antd';
import {
  SwapOutlined,
  RollbackOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DocumentVersion } from '../../types/version';

const { Paragraph, Text } = Typography;

export interface VersionDetailModalProps {
  /** 弹窗可见性 */
  visible: boolean;
  /** 版本信息 */
  version: DocumentVersion;
  /** 关闭回调 */
  onClose: () => void;
  /** 对比回调 */
  onCompare?: (version: DocumentVersion) => void;
  /** 恢复回调 */
  onRestore?: () => void;
}

/**
 * 版本详情弹窗
 */
const VersionDetailModal: React.FC<VersionDetailModalProps> = ({
  visible,
  version,
  onClose,
  onCompare,
  onRestore
}) => {
  // ✅ FIXED - Use snake_case property name (TS2551)
  const createdTime = dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss');

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>版本详情 - v{version.version}</span>
          {version.isCurrent && <Tag color="blue">当前版本</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          {onCompare && (
            <Button icon={<SwapOutlined />} onClick={() => onCompare(version)}>
              对比版本
            </Button>
          )}
          {!version.isCurrent && onRestore && (
            <Button type="primary" danger icon={<RollbackOutlined />} onClick={onRestore}>
              恢复此版本
            </Button>
          )}
        </Space>
      }
    >
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="版本号">
          <Text strong>v{version.version}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="变更类型">
          <Tag color={version.changeType === 'major' ? 'red' : 'blue'}>
            {version.changeType}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          <Space size="small">
            <ClockCircleOutlined />
            <Text>{createdTime}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="创建人">
          <Space size="small">
            <UserOutlined />
            {/* ✅ FIXED - Use snake_case property names (TS2551) */}
            <Text>{version.created_by_name || version.created_by}</Text>
          </Space>
        </Descriptions.Item>
        {version.size && (
          <Descriptions.Item label="大小">
            {Math.round(version.size / 1024)} KB
          </Descriptions.Item>
        )}
        {version.metadata && (
          <>
            {version.metadata.wordCount > 0 && (
              <Descriptions.Item label="字数">
                {version.metadata.wordCount} 字
              </Descriptions.Item>
            )}
            {version.metadata.changesCount > 0 && (
              <Descriptions.Item label="变更统计">
                <Space size="small">
                  <Text type="success">+{version.metadata.linesAdded}</Text>
                  <Text type="danger">-{version.metadata.linesDeleted}</Text>
                  <Text type="secondary">({version.metadata.changesCount} 处变更)</Text>
                </Space>
              </Descriptions.Item>
            )}
          </>
        )}
        {version.tags && version.tags.length > 0 && (
          <Descriptions.Item label="标签" span={2}>
            <Space size={4}>
              {version.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
        )}
        {version.title && (
          <Descriptions.Item label="标题" span={2}>
            <Text strong>{version.title}</Text>
          </Descriptions.Item>
        )}
        {version.summary && (
          <Descriptions.Item label="摘要" span={2}>
            <Paragraph type="secondary">{version.summary}</Paragraph>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 内容预览 */}
      {version.content && (
        <div style={{ marginTop: '16px' }}>
          <Text strong>内容预览</Text>
          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '13px',
              lineHeight: '1.6'
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {version.content}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );
};

VersionDetailModal.displayName = 'VersionDetailModal';

export default React.memo(VersionDetailModal);
