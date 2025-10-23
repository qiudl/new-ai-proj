/**
 * VersionListPanel - 版本列表面板组件
 * 显示文档版本历史列表，包含变更统计
 */

import React, { useMemo } from 'react';
import { List } from 'antd';
import { VersionInfo } from '../../services/versionHistoryService';
import { DiffCalculator, DiffStats } from '../../utils/DiffCalculator';
import VersionListItem from './VersionListItem';
import './VersionListPanel.css';

export interface VersionWithStats extends VersionInfo {
  stats?: DiffStats;
}

export interface VersionListPanelProps {
  /** 版本列表 */
  versions: VersionInfo[];
  /** 当前选中的版本ID */
  selectedVersionId?: number;
  /** 版本选择回调 */
  onVersionSelect?: (version: VersionInfo) => void;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * VersionListPanel组件
 */
const VersionListPanel: React.FC<VersionListPanelProps> = ({
  versions,
  selectedVersionId,
  onVersionSelect,
  loading = false,
  className = ''
}) => {
  // 计算每个版本的变更统计
  const versionsWithStats = useMemo<VersionWithStats[]>(() => {
    if (!versions || versions.length === 0) return [];

    const calculator = new DiffCalculator();
    const result: VersionWithStats[] = [];

    // 为每个版本计算相对于前一个版本的diff统计
    for (let i = 0; i < versions.length; i++) {
      const currentVersion = versions[i];
      const versionWithStats: VersionWithStats = { ...currentVersion };

      if (i < versions.length - 1) {
        // 与前一个版本对比
        const previousVersion = versions[i + 1];
        try {
          const diffs = calculator.calculateLineDiff(
            previousVersion.content || '',
            currentVersion.content || ''
          );
          versionWithStats.stats = calculator.calculateStats(diffs);
        } catch (error) {
          console.error(`计算版本 ${currentVersion.id} 统计失败:`, error);
          // 如果计算失败，提供默认统计
          versionWithStats.stats = {
            added: 0,
            removed: 0,
            modified: 0,
            unchanged: 0,
            totalLines: 0
          };
        }
      } else {
        // 第一个版本（最早的版本），没有前一个版本可比较
        // 计算相对于空内容的统计
        try {
          const diffs = calculator.calculateLineDiff('', currentVersion.content || '');
          versionWithStats.stats = calculator.calculateStats(diffs);
        } catch (error) {
          console.error(`计算初始版本 ${currentVersion.id} 统计失败:`, error);
          versionWithStats.stats = {
            added: 0,
            removed: 0,
            modified: 0,
            unchanged: 0,
            totalLines: 0
          };
        }
      }

      result.push(versionWithStats);
    }

    return result;
  }, [versions]);

  // 版本点击处理
  const handleVersionClick = (version: VersionInfo) => {
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  return (
    <div className={`version-list-panel ${className}`}>
      <div className="version-list-header">
        <h3>版本历史</h3>
        <span className="version-count">{versions.length} 个版本</span>
      </div>

      <List
        className="version-list"
        loading={loading}
        dataSource={versionsWithStats}
        renderItem={(version) => (
          <VersionListItem
            key={version.id}
            version={version}
            stats={version.stats}
            isSelected={version.id === selectedVersionId}
            onClick={() => handleVersionClick(version)}
          />
        )}
        locale={{
          emptyText: '暂无版本历史'
        }}
      />
    </div>
  );
};

export default VersionListPanel;
