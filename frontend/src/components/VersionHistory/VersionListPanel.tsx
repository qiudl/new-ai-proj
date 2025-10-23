/**
 * VersionListPanel - 版本列表面板组件
 * 显示文档版本历史列表，包含变更统计
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { List, Progress } from 'antd';
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

// 常量配置
const VIRTUAL_SCROLL_HEIGHT = 600; // 虚拟滚动高度
const LAZY_LOAD_THRESHOLD = 20; // 超过此数量启用懒加载

/**
 * VersionListPanel组件 - 性能优化版
 * - 虚拟滚动支持大列表
 * - 懒加载diff统计计算
 * - requestIdleCallback后台计算
 */
const VersionListPanel: React.FC<VersionListPanelProps> = ({
  versions,
  selectedVersionId,
  onVersionSelect,
  loading = false,
  className = ''
}) => {
  const [statsCache, setStatsCache] = useState<Map<number, DiffStats>>(new Map());
  const [calculatingProgress, setCalculatingProgress] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // 用于跟踪requestIdleCallback的handle，以便在cleanup时取消
  const idleCallbackHandle = useRef<number | null>(null);
  // 用于跟踪组件是否已挂载，防止卸载后setState
  const isMounted = useRef(true);

  // 懒加载统计信息
  const shouldLazyLoad = versions.length > LAZY_LOAD_THRESHOLD;

  // 组件卸载时清理
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (idleCallbackHandle.current !== null) {
        cancelIdleCallback(idleCallbackHandle.current);
        idleCallbackHandle.current = null;
      }
    };
  }, []);

  // 批量计算diff统计（后台计算，使用requestIdleCallback）
  useEffect(() => {
    if (!versions || versions.length === 0 || !shouldLazyLoad) return;

    // 如果已经全部计算完成，跳过
    if (statsCache.size >= versions.length) return;

    const calculator = new DiffCalculator();
    const newCache = new Map(statsCache);
    let calculated = 0;

    if (isMounted.current) {
      setIsCalculating(true);
    }

    // 使用 requestIdleCallback 在空闲时计算，不阻塞UI
    const calculateBatch = (deadline: IdleDeadline) => {
      while (deadline.timeRemaining() > 0 && calculated < versions.length) {
        const i = calculated;
        const currentVersion = versions[i];

        if (!newCache.has(currentVersion.id)) {
          try {
            let diffs;
            if (i < versions.length - 1) {
              const previousVersion = versions[i + 1];
              diffs = calculator.calculateLineDiff(
                previousVersion.content || '',
                currentVersion.content || ''
              );
            } else {
              diffs = calculator.calculateLineDiff('', currentVersion.content || '');
            }
            newCache.set(currentVersion.id, calculator.calculateStats(diffs));
          } catch (error) {
            console.error(`计算版本 ${currentVersion.id} 统计失败:`, error);
            newCache.set(currentVersion.id, {
              added: 0,
              removed: 0,
              modified: 0,
              unchanged: 0,
              totalLines: 0
            });
          }
        }

        calculated++;
        if (isMounted.current) {
          setCalculatingProgress(Math.round((calculated / versions.length) * 100));
        }
      }

      if (calculated < versions.length) {
        // 继续计算，保存handle以便后续取消
        idleCallbackHandle.current = requestIdleCallback(calculateBatch);
      } else {
        // 计算完成，更新状态（仅在组件仍挂载时）
        if (isMounted.current) {
          setStatsCache(newCache);
          setIsCalculating(false);
          setCalculatingProgress(100);
        }
        idleCallbackHandle.current = null;
      }
    };

    // 启动计算
    idleCallbackHandle.current = requestIdleCallback(calculateBatch);

    // Cleanup: 取消所有pending的requestIdleCallback
    return () => {
      if (idleCallbackHandle.current !== null) {
        cancelIdleCallback(idleCallbackHandle.current);
        idleCallbackHandle.current = null;
      }
    };
  }, [versions, shouldLazyLoad, statsCache]);

  // 计算每个版本的变更统计（优化版：小列表直接计算，大列表使用缓存）
  const versionsWithStats = useMemo<VersionWithStats[]>(() => {
    if (!versions || versions.length === 0) return [];

    // 如果版本数量较少，直接计算（同步，性能足够）
    if (!shouldLazyLoad) {
      const calculator = new DiffCalculator();
      const result: VersionWithStats[] = [];

      for (let i = 0; i < versions.length; i++) {
        const currentVersion = versions[i];
        const versionWithStats: VersionWithStats = { ...currentVersion };

        if (i < versions.length - 1) {
          const previousVersion = versions[i + 1];
          try {
            const diffs = calculator.calculateLineDiff(
              previousVersion.content || '',
              currentVersion.content || ''
            );
            versionWithStats.stats = calculator.calculateStats(diffs);
          } catch (error) {
            console.error(`计算版本 ${currentVersion.id} 统计失败:`, error);
            versionWithStats.stats = {
              added: 0,
              removed: 0,
              modified: 0,
              unchanged: 0,
              totalLines: 0
            };
          }
        } else {
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
    }

    // 大列表：使用缓存的统计信息（懒加载，异步计算）
    return versions.map(version => ({
      ...version,
      stats: statsCache.get(version.id)
    }));
  }, [versions, shouldLazyLoad, statsCache]);

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

      {/* 后台计算进度指示器 */}
      {isCalculating && shouldLazyLoad && (
        <div className="calculating-progress">
          <Progress
            percent={calculatingProgress}
            size="small"
            status="active"
            format={(percent) => `计算中 ${percent}%`}
          />
        </div>
      )}

      <List
        className="version-list"
        loading={loading}
        dataSource={versionsWithStats}
        // 启用虚拟滚动（大列表性能优化）
        virtual={shouldLazyLoad}
        // 虚拟滚动高度
        style={{ height: shouldLazyLoad ? VIRTUAL_SCROLL_HEIGHT : 'auto' }}
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
