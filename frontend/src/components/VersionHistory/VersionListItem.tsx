/**
 * VersionListItem - 版本列表项组件
 * 显示单个版本的信息和变更统计
 */

import React from 'react';
import { List, Tag, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { VersionInfo } from '../../services/versionHistoryService';
import { DiffStats, DiffCalculator } from '../../utils/DiffCalculator';
import './VersionListItem.css';

export interface VersionListItemProps {
  /** 版本信息 */
  version: VersionInfo;
  /** 变更统计 */
  stats?: DiffStats;
  /** 是否选中 */
  isSelected?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * VersionListItem组件
 */
const VersionListItem: React.FC<VersionListItemProps> = ({
  version,
  stats,
  isSelected = false,
  onClick
}) => {
  const diffCalculator = new DiffCalculator();

  // 格式化时间
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化统计信息
  const formatStats = (): string => {
    if (!stats) return '';
    return diffCalculator.formatStats(stats);
  };

  // 获取统计标签的颜色
  const getStatsColor = (): string => {
    if (!stats) return 'default';

    const totalChanges = stats.added + stats.removed + stats.modified;
    if (totalChanges === 0) return 'default';
    if (totalChanges < 10) return 'green';
    if (totalChanges < 50) return 'orange';
    return 'red';
  };

  // 获取统计详情提示
  const getStatsTooltip = (): string => {
    if (!stats) return '';

    const parts: string[] = [];
    if (stats.added > 0) parts.push(`新增 ${stats.added} 行`);
    if (stats.removed > 0) parts.push(`删除 ${stats.removed} 行`);
    if (stats.modified > 0) parts.push(`修改 ${stats.modified} 行`);
    if (stats.unchanged > 0) parts.push(`未变更 ${stats.unchanged} 行`);

    return parts.length > 0 ? parts.join(', ') : '无变更';
  };

  const statsText = formatStats();
  const hasChanges = stats && (stats.added > 0 || stats.removed > 0 || stats.modified > 0);

  return (
    <List.Item
      className={`version-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="version-item-content">
        {/* 选中标识 */}
        {isSelected && (
          <div className="selected-indicator">
            <CheckCircleOutlined />
          </div>
        )}

        {/* 版本号 */}
        <div className="version-number">
          <strong>{version.versionNumber}</strong>
        </div>

        {/* 变更统计 */}
        {statsText && hasChanges && (
          <Tooltip title={getStatsTooltip()}>
            <Tag
              className="version-stats"
              color={getStatsColor()}
            >
              {statsText}
            </Tag>
          </Tooltip>
        )}

        {/* 版本描述 */}
        {version.description && (
          <div className="version-description">
            {version.description}
          </div>
        )}

        {/* 元信息 */}
        <div className="version-meta">
          <span className="meta-item">
            <ClockCircleOutlined />
            <span className="meta-text">{formatTime(version.createdAt)}</span>
          </span>

          {version.createdBy && (
            <span className="meta-item">
              <UserOutlined />
              <span className="meta-text">用户 {version.createdBy}</span>
            </span>
          )}

          {version.size && (
            <span className="meta-item">
              <span className="meta-text">{(version.size / 1024).toFixed(2)} KB</span>
            </span>
          )}
        </div>
      </div>
    </List.Item>
  );
};

export default VersionListItem;
