/**
 * DiffViewPanel - Diff视图面板组件
 * 显示两个版本之间的差异对比
 */

import React, { useMemo } from 'react';
import { Empty, Spin, Button } from 'antd';
import { DownloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { VersionInfo } from '../../services/versionHistoryService';
import { DiffCalculator, DiffLine as DiffLineType, DiffStats } from '../../utils/DiffCalculator';
import DiffHeader from './DiffHeader';
import DiffLine from './DiffLine';
import './DiffViewPanel.css';

export interface DiffViewPanelProps {
  /** 旧版本（基准版本） */
  oldVersion?: VersionInfo;
  /** 新版本（对比版本） */
  newVersion?: VersionInfo;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 回滚到版本的回调 */
  onRollback?: (version: VersionInfo) => void;
  /** 下载版本的回调 */
  onDownload?: (version: VersionInfo) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * DiffViewPanel组件
 */
const DiffViewPanel: React.FC<DiffViewPanelProps> = ({
  oldVersion,
  newVersion,
  loading = false,
  onRollback,
  onDownload,
  className = ''
}) => {
  // 计算Diff结果和统计
  const { diffs, stats } = useMemo<{ diffs: DiffLineType[]; stats: DiffStats }>(() => {
    if (!oldVersion || !newVersion) {
      return {
        diffs: [],
        stats: {
          added: 0,
          removed: 0,
          modified: 0,
          unchanged: 0,
          totalLines: 0
        }
      };
    }

    try {
      const calculator = new DiffCalculator();
      const diffResults = calculator.calculateLineDiff(
        oldVersion.content || '',
        newVersion.content || ''
      );
      const statsResults = calculator.calculateStats(diffResults);

      return {
        diffs: diffResults,
        stats: statsResults
      };
    } catch (error) {
      console.error('计算Diff失败:', error);
      return {
        diffs: [],
        stats: {
          added: 0,
          removed: 0,
          modified: 0,
          unchanged: 0,
          totalLines: 0
        }
      };
    }
  }, [oldVersion, newVersion]);

  // 渲染Diff内容
  const renderDiffContent = () => {
    if (loading) {
      return (
        <div className="diff-loading">
          <Spin tip="正在计算差异..." />
        </div>
      );
    }

    if (!oldVersion || !newVersion) {
      return (
        <div className="diff-empty">
          <Empty
            description="请选择版本查看变更"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    if (diffs.length === 0) {
      return (
        <div className="diff-empty">
          <Empty
            description="两个版本内容完全相同"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    return (
      <div className="diff-content">
        <div className="diff-lines">
          {diffs.map((diff, index) => (
            <DiffLine
              key={`${diff.lineNumber}-${index}`}
              diff={diff}
              showLineNumber={true}
            />
          ))}
        </div>
      </div>
    );
  };

  // 渲染操作按钮
  const renderActions = () => {
    if (!oldVersion || !newVersion) return null;

    return (
      <div className="diff-actions">
        {onRollback && (
          <Button
            icon={<RollbackOutlined />}
            onClick={() => onRollback(oldVersion)}
          >
            回滚到 {oldVersion.versionNumber}
          </Button>
        )}

        {onDownload && (
          <Button
            icon={<DownloadOutlined />}
            onClick={() => onDownload(newVersion)}
          >
            下载 {newVersion.versionNumber}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={`diff-view-panel ${className}`}>
      {/* Diff头部 */}
      <DiffHeader
        oldVersion={oldVersion}
        newVersion={newVersion}
        stats={stats}
      />

      {/* Diff内容 */}
      {renderDiffContent()}

      {/* 操作按钮 */}
      {renderActions()}
    </div>
  );
};

export default DiffViewPanel;
