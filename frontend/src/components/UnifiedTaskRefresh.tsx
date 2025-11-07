import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import RefreshWithCountdown from './RefreshWithCountdown';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';
import { enhancedCacheManager } from '../utils/enhancedCacheManager';
import { cacheEventSystem, CacheEvent } from '../utils/cacheEventSystem';

export interface RefreshContext {
  projectId?: number;
  taskId?: number;
  entityType?: 'task' | 'project' | 'user';
  operation?: 'refresh' | 'invalidate' | 'batch_refresh';
}

export interface RefreshResults {
  completionStats?: any;
  subtasks?: any;
  cacheEvents?: CacheEvent[];
  duration?: number;
  success: boolean;
}

export interface CacheConfig {
  /** 智能失效配置 */
  smartInvalidation?: {
    entityType: 'task' | 'project' | 'user';
    entityId: number;
    projectId?: number;
    changeType?: 'create' | 'update' | 'delete';
  };
  /** 批量刷新配置 */
  batchRefresh?: {
    keys?: string[];
    tags?: string[];
    patterns?: string[];
  };
  /** 性能监控 */
  enableMetrics?: boolean;
}

export interface UnifiedTaskRefreshProps {
  /** 刷新任务完成情况统计的函数 */
  onRefreshCompletionStats?: () => Promise<void> | void;
  /** 刷新子任务数据的函数 */
  onRefreshSubtasks?: () => Promise<void> | void;
  /** 是否显示进度环 */
  showProgress?: boolean;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义提示文本 */
  tooltip?: string;
  
  // 增强缓存功能
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
  /** 刷新开始回调 */
  onRefreshStart?: (context: RefreshContext) => void;
  /** 刷新完成回调 */
  onRefreshComplete?: (results: RefreshResults) => void;
  /** 刷新错误回调 */
  onRefreshError?: (error: Error, context: RefreshContext) => void;
  /** 缓存事件回调 */
  onCacheEvent?: (event: CacheEvent) => void;
}

export const UnifiedTaskRefresh: React.FC<UnifiedTaskRefreshProps> = ({
  onRefreshCompletionStats,
  onRefreshSubtasks,
  showProgress = true,
  size = 'small',
  style,
  className,
  disabled = false,
  tooltip = "任务数据自动刷新",
  cacheConfig,
  onRefreshStart,
  onRefreshComplete,
  onRefreshError,
  onCacheEvent
}) => {
  const { config } = useRefreshConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleRefresh = useCallback(async () => {
    const startTime = Date.now();
    const refreshContext: RefreshContext = {
      projectId: cacheConfig?.smartInvalidation?.projectId,
      taskId: cacheConfig?.smartInvalidation?.entityId,
      entityType: cacheConfig?.smartInvalidation?.entityType || 'task',
      operation: cacheConfig?.batchRefresh ? 'batch_refresh' : 'refresh'
    };
    
    // 触发刷新开始回调
    onRefreshStart?.(refreshContext);
    
    try {
      setLoading(true);
      setError(false);
      
      const results: RefreshResults = {
        success: false,
        cacheEvents: []
      };
      
      // 智能缓存失效
      if (cacheConfig?.smartInvalidation) {
        const { entityType, entityId, projectId, changeType = 'update' } = cacheConfig.smartInvalidation;
        
        if (entityType === 'task' && projectId) {
          const event = await enhancedCacheManager.invalidateTask(projectId, entityId, changeType);
          // ✅ FIXED - Transform InvalidationEvent to CacheEvent (TS2345)
          results.cacheEvents?.push({
            type: 'invalidate',
            key: event.triggerKey,
            timestamp: event.timestamp,
            data: {
              invalidatedKeys: event.invalidatedKeys,
              reason: event.reason,
              cascadeDepth: event.cascadeDepth
            }
          });

          if (onCacheEvent) {
            onCacheEvent({
              type: 'invalidate',
              key: `task:${projectId}:${entityId}`,
              timestamp: Date.now(),
              source: 'UnifiedTaskRefresh',
              data: { changeType, cascadeDepth: event.cascadeDepth }
            });
          }
        } else if (entityType === 'user') {
          const events = await enhancedCacheManager.invalidateUserData(entityId, 'task');
          // ✅ FIXED - Transform InvalidationEvent[] to CacheEvent[] (TS2345)
          results.cacheEvents?.push(...events.map(e => ({
            type: 'invalidate' as const,
            key: e.triggerKey,
            timestamp: e.timestamp,
            data: {
              invalidatedKeys: e.invalidatedKeys,
              reason: e.reason,
              cascadeDepth: e.cascadeDepth
            }
          })));
        }
      }
      
      // 批量刷新处理
      if (cacheConfig?.batchRefresh) {
        const { keys = [], tags = [], patterns = [] } = cacheConfig.batchRefresh;
        
        // 并行执行失效操作
        const invalidationPromises = [
          ...keys.map(key => enhancedCacheManager.delete(key)),
          ...tags.map(tag => enhancedCacheManager.invalidateByTags([tag])),
          ...patterns.map(pattern => enhancedCacheManager.invalidateByPattern(pattern))
        ];
        
        await Promise.all(invalidationPromises);
        
        // 记录批量失效事件
        cacheEventSystem.emitInvalidate(
          [...keys, ...tags, ...patterns],
          'batch_refresh',
          1,
          'UnifiedTaskRefresh'
        );
      }
      
      // 执行传统刷新逻辑
      const refreshPromises: Promise<void>[] = [];
      
      if (onRefreshCompletionStats) {
        refreshPromises.push(
          Promise.resolve(onRefreshCompletionStats()).then(result => {
            results.completionStats = result;
          })
        );
      }
      
      if (onRefreshSubtasks) {
        refreshPromises.push(
          Promise.resolve(onRefreshSubtasks()).then(result => {
            results.subtasks = result;
          })
        );
      }
      
      // 等待所有刷新操作完成
      await Promise.all(refreshPromises);
      
      // 计算执行时间
      results.duration = Date.now() - startTime;
      results.success = true;
      
      // 触发完成回调
      onRefreshComplete?.(results);
      
      // 性能监控
      if (cacheConfig?.enableMetrics) {
        cacheEventSystem.emitCleanup(
          results.cacheEvents?.map(e => e.triggerKey || 'unknown') || [],
          0,
          'UnifiedTaskRefresh'
        );
      }
      
      if (config.enableDebugLogs) {
        console.log('Enhanced unified task refresh completed successfully', {
          duration: results.duration,
          cacheEvents: results.cacheEvents?.length || 0
        });
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown refresh error');
      console.error('Failed to refresh task data:', error);
      setError(true);
      
      // 触发错误回调
      onRefreshError?.(error, refreshContext);
      
      if (config.enableErrorNotifications) {
        message.error('刷新任务数据失败', config.errorNotificationDuration / 1000);
      }
      
      // 记录错误事件
      if (onCacheEvent) {
        onCacheEvent({
          type: 'get',
          key: 'refresh_operation',
          timestamp: Date.now(),
          error: error.message,
          source: 'UnifiedTaskRefresh'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    onRefreshCompletionStats, 
    onRefreshSubtasks, 
    config, 
    cacheConfig,
    onRefreshStart,
    onRefreshComplete,
    onRefreshError,
    onCacheEvent
  ]);

  return (
    <RefreshWithCountdown
      onRefresh={handleRefresh}
      interval={config.completionStatsInterval}
      tooltip={tooltip}
      size={size}
      disabled={disabled}
      showProgress={showProgress}
      style={style}
      className={className}
      enableVisibilityDetection={config.enableVisibilityDetection}
      loading={loading}
      error={error}
    />
  );
};

export default UnifiedTaskRefresh;