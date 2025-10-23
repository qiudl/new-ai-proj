/**
 * DiffHeader - Diff视图头部组件
 * 显示正在对比的版本信息和统计
 */

import React from 'react';
import { Tag, Tooltip } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { VersionInfo } from '../../services/versionHistoryService';
import { DiffStats, DiffCalculator } from '../../utils/DiffCalculator';
import './DiffHeader.css';

export interface DiffHeaderProps {
  /** 旧版本（基准版本） */
  oldVersion?: VersionInfo;
  /** 新版本（对比版本） */
  newVersion?: VersionInfo;
  /** Diff统计信息 */
  stats?: DiffStats;
}

/**
 * DiffHeader组件
 */
const DiffHeader: React.FC<DiffHeaderProps> = ({
  oldVersion,
  newVersion,
  stats
}) => {
  const diffCalculator = new DiffCalculator();

  // 格式化统计信息
  const formatStats = (): string => {
    if (!stats) return '无变更';
    return diffCalculator.formatStats(stats);
  };

  // 获取统计详情
  const getStatsTooltip = (): string => {
    if (!stats) return '';

    const parts: string[] = [];
    if (stats.added > 0) parts.push(`新增 ${stats.added} 行`);
    if (stats.removed > 0) parts.push(`删除 ${stats.removed} 行`);
    if (stats.modified > 0) parts.push(`修改 ${stats.modified} 行`);
    parts.push(`总计 ${stats.totalLines} 行`);

    return parts.join('\n');
  };

  // 获取统计标签颜色
  const getStatsColor = (): string => {
    if (!stats) return 'default';

    const totalChanges = stats.added + stats.removed + stats.modified;
    if (totalChanges === 0) return 'default';
    if (totalChanges < 10) return 'green';
    if (totalChanges < 50) return 'orange';
    return 'red';
  };

  return (
    <div className="diff-header">
      <div className="diff-header-content">
        {/* 版本对比信息 */}
        <div className="version-comparison">
          {oldVersion && (
            <div className="version-info old-version">
              <Tag color="blue">{oldVersion.versionNumber}</Tag>
              <span className="version-time">
                {oldVersion.createdAt.toLocaleDateString('zh-CN')}
              </span>
            </div>
          )}

          <div className="comparison-arrow">
            <SwapOutlined />
          </div>

          {newVersion && (
            <div className="version-info new-version">
              <Tag color="green">{newVersion.versionNumber}</Tag>
              <span className="version-time">
                {newVersion.createdAt.toLocaleDateString('zh-CN')}
              </span>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="diff-stats">
            <Tooltip title={<pre>{getStatsTooltip()}</pre>}>
              <Tag
                color={getStatsColor()}
                className="stats-tag"
              >
                {formatStats()}
              </Tag>
            </Tooltip>
          </div>
        )}
      </div>

      {/* 没有选择版本时的提示 */}
      {!oldVersion && !newVersion && (
        <div className="empty-hint">
          <span>请选择版本查看变更</span>
        </div>
      )}
    </div>
  );
};

export default DiffHeader;
