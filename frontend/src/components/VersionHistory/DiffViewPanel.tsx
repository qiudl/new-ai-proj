/**
 * DiffViewPanel - Diff视图面板组件
 * 显示两个版本之间的差异对比
 * 性能优化：限制初始显示的diff行数，避免大文档卡顿
 */

import React, { useMemo, useState } from 'react';
import { Empty, Spin, Button, Alert } from 'antd';
import { DownloadOutlined, RollbackOutlined, EyeOutlined } from '@ant-design/icons';
import { VersionInfo } from '../../services/versionHistoryService';
import { DiffCalculator, DiffLine as DiffLineType, DiffStats } from '../../utils/DiffCalculator';
import DiffHeader from './DiffHeader';
import DiffLine from './DiffLine';
import './DiffViewPanel.css';

// 常量配置
const INITIAL_DIFF_LINES_LIMIT = 500; // 初始显示的最大diff行数
const LARGE_DIFF_WARNING_THRESHOLD = 1000; // 触发警告的diff行数阈值

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
  const [showAllLines, setShowAllLines] = useState(false);
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

  // 计算要显示的diff行
  const displayedDiffs = useMemo(() => {
    if (showAllLines || diffs.length <= INITIAL_DIFF_LINES_LIMIT) {
      return diffs;
    }
    return diffs.slice(0, INITIAL_DIFF_LINES_LIMIT);
  }, [diffs, showAllLines]);

  const hasMoreLines = diffs.length > INITIAL_DIFF_LINES_LIMIT;
  const isLargeDiff = diffs.length > LARGE_DIFF_WARNING_THRESHOLD;

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
        {/* 大diff警告 */}
        {isLargeDiff && !showAllLines && (
          <Alert
            message="大文档提醒"
            description={`此文档包含 ${diffs.length} 行差异，为了性能考虑，当前仅显示前 ${INITIAL_DIFF_LINES_LIMIT} 行。`}
            type="warning"
            showIcon
            style={{ margin: '12px 16px' }}
          />
        )}

        <div className="diff-lines">
          {displayedDiffs.map((diff, index) => (
            <DiffLine
              key={`${diff.lineNumber}-${index}`}
              diff={diff}
              showLineNumber={true}
            />
          ))}
        </div>

        {/* 显示更多按钮 */}
        {hasMoreLines && !showAllLines && (
          <div className="show-more-container">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => setShowAllLines(true)}
              size="large"
            >
              显示全部 {diffs.length} 行差异
            </Button>
            <p style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '12px' }}>
              剩余 {diffs.length - INITIAL_DIFF_LINES_LIMIT} 行未显示
            </p>
          </div>
        )}
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
