/**
 * VersionTimeline - 版本时间线组件
 *
 * 显示版本历史的时间线视图
 */

import React, { useState, useCallback } from 'react';
import { Timeline, Empty, Button, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import VersionCard from './VersionCard';
import type { DocumentVersion } from '../../types/version';

export interface VersionTimelineProps {
  /** 版本列表 */
  versions: DocumentVersion[];
  /** 当前版本号 */
  currentVersion: string;
  /** 查看详情回调 */
  onViewDetail?: (version: DocumentVersion) => void;
  /** 对比回调 - 传入待对比的版本，将与当前版本对比 */
  onCompare?: (fromVersion: DocumentVersion, toVersion: DocumentVersion) => void;
  /** 恢复回调 */
  onRestore?: (version: DocumentVersion) => void;
}

/**
 * 版本时间线
 */
const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  currentVersion,
  onViewDetail,
  onCompare,
  onRestore
}) => {
  const [displayCount, setDisplayCount] = useState(10);
  const [selectedForCompare, setSelectedForCompare] = useState<DocumentVersion | null>(null);

  /**
   * 加载更多版本
   */
  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + 10, versions.length));
  }, [versions.length]);

  /**
   * 处理对比操作
   */
  const handleCompareClick = useCallback((version: DocumentVersion) => {
    if (!selectedForCompare) {
      // 第一次点击，选择基准版本
      setSelectedForCompare(version);
    } else {
      // 第二次点击，执行对比
      onCompare?.(selectedForCompare, version);
      setSelectedForCompare(null);
    }
  }, [selectedForCompare, onCompare]);

  /**
   * 取消对比选择
   */
  const handleCancelCompare = useCallback(() => {
    setSelectedForCompare(null);
  }, []);

  if (versions.length === 0) {
    return (
      <Empty
        description="暂无版本历史"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // 显示的版本列表
  const displayedVersions = versions.slice(0, displayCount);
  const hasMore = displayCount < versions.length;

  // Timeline items
  const timelineItems = displayedVersions.map((version, index) => {
    const isCurrent = version.version === currentVersion || index === 0;
    const isSelected = selectedForCompare?.id === version.id;

    return {
      key: version.id,
      dot: isCurrent ? <ClockCircleOutlined style={{ fontSize: '16px', color: '#1890ff' }} /> : undefined,
      color: isCurrent ? 'blue' : isSelected ? 'orange' : 'gray',
      children: (
        <div
          style={{
            padding: '4px',
            border: isSelected ? '2px solid #faad14' : undefined,
            borderRadius: isSelected ? '4px' : undefined,
            transition: 'all 0.2s'
          }}
        >
          <VersionCard
            version={version}
            isCurrent={isCurrent}
            onViewDetail={onViewDetail}
            onCompare={handleCompareClick}
            onRestore={onRestore}
          />
        </div>
      )
    };
  });

  return (
    <div>
      {/* 对比模式提示 */}
      {selectedForCompare && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '4px'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              已选择版本 <strong>v{selectedForCompare.version}</strong> 作为对比基准，请选择另一个版本进行对比
            </div>
            <Button size="small" onClick={handleCancelCompare}>
              取消选择
            </Button>
          </Space>
        </div>
      )}

      {/* 时间线 */}
      <Timeline items={timelineItems} />

      {/* 加载更多按钮 */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button onClick={handleLoadMore}>
            加载更多 ({displayCount} / {versions.length})
          </Button>
        </div>
      )}
    </div>
  );
};

VersionTimeline.displayName = 'VersionTimeline';

export default React.memo(VersionTimeline);
