/**
 * VersionCard - 版本卡片组件
 *
 * 显示单个版本的详细信息
 */

import React from 'react';
import { Card, Space, Tag, Button, Typography, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  EyeOutlined,
  SwapOutlined,
  RollbackOutlined,
  CrownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { DocumentVersion } from '../../types/version';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;

export interface VersionCardProps {
  /** 版本信息 */
  version: DocumentVersion;
  /** 是否为当前版本 */
  isCurrent?: boolean;
  /** 查看详情回调 */
  onViewDetail?: (version: DocumentVersion) => void;
  /** 对比回调 */
  onCompare?: (version: DocumentVersion) => void;
  /** 恢复回调 */
  onRestore?: (version: DocumentVersion) => void;
}

/**
 * 版本卡片
 */
const VersionCard: React.FC<VersionCardProps> = ({
  version,
  isCurrent = false,
  onViewDetail,
  onCompare,
  onRestore
}) => {
  /**
   * 获取变更类型的颜色和文本
   */
  const getChangeTypeConfig = (changeType: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      create: { color: 'green', text: '创建' },
      update: { color: 'blue', text: '更新' },
      major: { color: 'red', text: '重大更新', icon: <CrownOutlined /> },
      minor: { color: 'orange', text: '次要更新' },
      patch: { color: 'default', text: '补丁' }
    };
    return configs[changeType] || configs.update;
  };

  const changeTypeConfig = getChangeTypeConfig(version.changeType);
  const createdTime = dayjs(version.createdAt);
  const relativeTimeText = createdTime.fromNow();
  const fullTimeText = createdTime.format('YYYY-MM-DD HH:mm:ss');

  return (
    <Card
      size="small"
      style={{
        marginBottom: '12px',
        borderLeft: isCurrent ? '3px solid #1890ff' : undefined,
        backgroundColor: isCurrent ? '#f0f7ff' : undefined
      }}
      styles={{ body: { padding: '12px' } }}
    >
      {/* 标题行 */}
      <div style={{ marginBottom: '8px' }}>
        <Space size="small">
          {isCurrent && (
            <Tag color="blue" icon={<CrownOutlined />}>
              最新
            </Tag>
          )}
          <Tag color={changeTypeConfig.color}>
            {changeTypeConfig.icon}
            {changeTypeConfig.text}
          </Tag>
          <Text strong>v{version.version}</Text>
        </Space>
      </div>

      {/* 时间和作者 */}
      <div style={{ marginBottom: '8px' }}>
        <Space size="middle" split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Tooltip title={fullTimeText}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <ClockCircleOutlined /> {relativeTimeText}
            </Text>
          </Tooltip>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <UserOutlined /> {version.createdByName || version.createdBy}
          </Text>
        </Space>
      </div>

      {/* 标题和摘要 */}
      {version.title && (
        <div style={{ marginBottom: '4px' }}>
          <Text strong style={{ fontSize: '13px' }}>
            <FileTextOutlined /> {version.title}
          </Text>
        </div>
      )}

      {version.summary && (
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ marginBottom: '8px', fontSize: '12px' }}
        >
          {version.summary}
        </Paragraph>
      )}

      {/* 元数据 */}
      {version.metadata && (
        <div style={{ marginBottom: '8px' }}>
          <Space size="small">
            {version.metadata.wordCount > 0 && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                字数: {version.metadata.wordCount}
              </Text>
            )}
            {version.metadata.changesCount > 0 && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                变更: +{version.metadata.linesAdded}/-{version.metadata.linesDeleted}
              </Text>
            )}
          </Space>
        </div>
      )}

      {/* 标签 */}
      {version.tags && version.tags.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <Space size={4}>
            {version.tags.map((tag) => (
              <Tag key={tag} style={{ fontSize: '11px' }}>
                {tag}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 操作按钮 */}
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail?.(version)}
        >
          详情
        </Button>
        <Button
          type="link"
          size="small"
          icon={<SwapOutlined />}
          onClick={() => onCompare?.(version)}
          disabled={isCurrent} // 当前版本无法对比
        >
          对比
        </Button>
        {!isCurrent && (
          <Button
            type="link"
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => onRestore?.(version)}
            danger
          >
            恢复
          </Button>
        )}
      </Space>
    </Card>
  );
};

VersionCard.displayName = 'VersionCard';

export default React.memo(VersionCard);
